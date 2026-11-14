/**
 * scripts/migration/09_execute_aggregate_workflow.ts
 * Quy trình thực thi kiểm toán dữ liệu tổng hợp:
 * 1. Nhận diện dữ liệu tổng hợp theo bằng chứng
 * 2. Lập danh sách ID chính xác
 * 3. Phân tích quan hệ phụ thuộc
 * 4. Tạo bản sao lưu backup snapshot
 * 5. Chuyển đổi quan hệ sang canonical store (monthly_score_accounts & id_mapping)
 * 6. Lưu trữ vào bảng archive (archived_ren_luyen)
 * 7. Kiểm soát điều kiện phê duyệt trước khi xóa
 */

import fs from 'fs';
import path from 'path';

interface CleanupCandidate {
  id: string;
  entityType: string;
  tableName: string;
  recordId: string;
  classification: 'AGGREGATE_SNAPSHOT_DATA' | 'VERIFIED_SYNTHETIC' | 'SUSPECTED_SYNTHETIC';
  confidenceReason: string;
  evidence: Record<string, any>;
  dependencyCount: number;
  dependencies: string[];
  proposedAction: string;
  reviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
}

async function runAggregateWorkflow() {
  console.log('================================================================');
  console.log('🔍 BẮT ĐẦU KIỂM TOÁN VÀ XỬ LÝ DỮ LIỆU TỔNG HỢP / PHÁI SINH');
  console.log('================================================================\n');

  const appDataPath = path.join(process.cwd(), '.app_data_storage.json');
  const trainingPath = path.join(process.cwd(), '.training_point_storage.json');

  if (!fs.existsSync(appDataPath)) {
    console.error('❌ Không tìm thấy tệp .app_data_storage.json');
    process.exit(1);
  }

  const appData = JSON.parse(fs.readFileSync(appDataPath, 'utf-8'));
  const trainingData = fs.existsSync(trainingPath) ? JSON.parse(fs.readFileSync(trainingPath, 'utf-8')) : {};

  // 1. TÌM DỮ LIỆU CÓ BẰNG CHỨNG LÀ DỮ LIỆU TỔNG HỢP
  console.log('📌 BƯỚC 1 & 2: Nhận diện dữ liệu tổng hợp và lập danh sách ID');
  const candidates: CleanupCandidate[] = [];

  const rawRenLuyen = appData.memoryRenLuyen || [];
  const auditLogs = appData.memoryAuditLogs || [];

  for (const rl of rawRenLuyen) {
    const isAutoCalculated =
      rl.nguoiDanhGia === 'Hệ thống Quản lý Rèn luyện TDNU' ||
      (rl.nhanXet && rl.nhanXet.includes('Đánh giá rèn luyện tự động')) ||
      rl.id.startsWith('rl-SV');

    if (isAutoCalculated) {
      // 3. XÁC ĐỊNH PHỤ THUỘC (DEPENDENCIES)
      const deps: string[] = [];
      const relatedLogs = auditLogs.filter(
        (log: any) =>
          (log.details && log.details.includes(rl.id)) ||
          (log.target && log.target.includes(rl.maSV))
      );
      if (relatedLogs.length > 0) {
        deps.push(`${relatedLogs.length} sự kiện audit log liên quan`);
      }
      deps.push(`Hồ sơ sinh viên gốc [${rl.maSV}]`);

      candidates.push({
        id: `cand-${candidates.length + 1}`,
        entityType: 'TRAINING_AGGREGATE',
        tableName: 'ren_luyen',
        recordId: rl.id,
        classification: 'AGGREGATE_SNAPSHOT_DATA',
        confidenceReason: 'Bản ghi dữ liệu tổng hợp phái sinh do tiến trình đánh giá rèn luyện tự động sinh ra',
        evidence: {
          nguoiDanhGia: rl.nguoiDanhGia,
          ngayDanhGia: rl.ngayDanhGia,
          nhanXet: rl.nhanXet,
          diemRL: rl.diemRL,
          diemMuc1: rl.diemMuc1,
          diemMuc2: rl.diemMuc2,
          diemMuc3: rl.diemMuc3,
          thang: rl.thang,
          nam: rl.nam,
        },
        dependencyCount: deps.length,
        dependencies: deps,
        proposedAction: 'TRANSFER_TO_CANONICAL_THEN_ARCHIVE',
        reviewStatus: 'PENDING_REVIEW',
      });
    }
  }

  console.log(`  -> Tìm thấy ${candidates.length} bản ghi dữ liệu tổng hợp có bằng chứng xác thực.`);
  for (const c of candidates) {
    console.log(`    • ID: ${c.recordId} | SV: ${c.evidence.maSV || c.recordId.split('-')[1]} | Điểm: ${c.evidence.diemRL} | Phụ thuộc: ${c.dependencies.join(', ')}`);
  }

  // 4. SAO LƯU BACKUP RIÊNG
  console.log('\n📌 BƯỚC 4: Tạo bản sao lưu Backup Snapshot độc lập');
  const backupPath = path.join(process.cwd(), '.backup_aggregate_records_20261108.json');
  fs.writeFileSync(backupPath, JSON.stringify(rawRenLuyen, null, 2), 'utf-8');
  console.log(`  -> Đã tạo bản sao lưu an toàn tại: ${backupPath} (${rawRenLuyen.length} bản ghi)`);

  // 5. CHUYỂN QUAN HỆ SANG NGUỒN CHUẨN (id_mapping & monthly_score_accounts)
  console.log('\n📌 BƯỚC 5: Chuyển quan hệ sang canonical ID (Dependency Remap)');
  let idMappings = appData.memoryIdMapping || [];
  let monthlyAccounts = trainingData.monthlyAccounts || [];

  for (const c of candidates) {
    const rl = rawRenLuyen.find((r: any) => r.id === c.recordId);
    if (!rl) continue;

    const canonicalAccId = `acc-${rl.maSV}-${rl.thang}-${rl.nam}`;

    // Ghi nhận vào id_mapping
    const mapExists = idMappings.some((m: any) => m.sourceTable === 'ren_luyen' && m.sourceId === rl.id);
    if (!mapExists) {
      idMappings.push({
        id: `map-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        entityType: 'TRAINING_SCORE',
        sourceTable: 'ren_luyen',
        sourceId: rl.id,
        canonicalTable: 'monthly_score_accounts',
        canonicalId: canonicalAccId,
        mappingReason: 'Chuyển quan hệ từ bản ghi tổng hợp cũ sang tài khoản điểm tháng chuẩn',
        migrationStatus: 'MIGRATED',
        migratedAt: new Date().toISOString(),
      });
    }

    // Đảm bảo monthly_score_accounts có tài khoản tương ứng
    const accExists = monthlyAccounts.some((a: any) => a.id === canonicalAccId);
    if (!accExists) {
      monthlyAccounts.push({
        id: canonicalAccId,
        studentCode: rl.maSV,
        studentName: rl.hoTenSV,
        className: rl.lop,
        monthId: `m-${rl.nam}-${String(rl.thang).padStart(2, '0')}`,
        month: rl.thang,
        year: rl.nam,
        policyId: 'POL-2025-2026',
        totalScore: rl.diemRL,
        rank: rl.xepLoai,
        status: 'LOCKED',
        createdAt: rl.ngayDanhGia ? new Date(rl.ngayDanhGia).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  trainingData.monthlyAccounts = monthlyAccounts;
  appData.memoryIdMapping = idMappings;

  // 6. ARCHIVE CÁC BẢN GHI VÀO BẢNG LƯU TRỮ
  console.log('\n📌 BƯỚC 6: Lưu trữ vào tệp Archive (archived_ren_luyen)');
  let archivedRenLuyen = appData.memoryArchivedRenLuyen || [];
  for (const c of candidates) {
    const rl = rawRenLuyen.find((r: any) => r.id === c.recordId);
    if (rl && !archivedRenLuyen.some((a: any) => a.id === rl.id)) {
      archivedRenLuyen.push({
        ...rl,
        archivedAt: new Date().toISOString(),
        archiveReason: 'Đã chuyển quan hệ sang monthly_score_accounts và lưu trữ bảo tồn vĩnh viễn',
      });
    }
  }
  appData.memoryArchivedRenLuyen = archivedRenLuyen;
  appData.memoryDataCleanupCandidates = candidates;

  // Lưu lại các cập nhật vào đĩa
  fs.writeFileSync(appDataPath, JSON.stringify(appData, null, 2), 'utf-8');
  fs.writeFileSync(trainingPath, JSON.stringify(trainingData, null, 2), 'utf-8');

  console.log(`  -> Đã lưu trữ ${archivedRenLuyen.length} bản ghi vào kho archive an toàn.`);
  console.log(`  -> Đã đồng bộ ${monthlyAccounts.length} tài khoản điểm tháng canonical.`);
  console.log(`  -> Đã ghi nhận ${idMappings.length} bản ghi ánh xạ trong id_mapping.`);

  // 7. TRẠNG THÁI CHỜ PHÊ DUYỆT TRƯỚC KHI XÓA
  console.log('\n================================================================');
  console.log('⏸️  BƯỚC 7: TRẠNG THÁI DỪNG LẠI CHỜ PHÊ DUYỆT (AWAITING APPROVAL)');
  console.log('================================================================');
  console.log('Các bản ghi đã được backup, chuyển quan hệ và đưa vào kho Archive.');
  console.log('Tuyệt đối KHÔNG xóa khỏi bảng gốc cho đến khi Quản trị viên duyệt.');
}

runAggregateWorkflow().catch((err) => {
  console.error('Lỗi khi chạy aggregate workflow:', err);
  process.exit(1);
});
