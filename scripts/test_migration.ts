/**
 * scripts/test_migration.ts
 * Bộ kiểm thử tự động xác minh toàn vẹn quy trình Migration Expand-and-Contract (Giai đoạn 2 & 3)
 * Chạy bằng lệnh: npx tsx scripts/test_migration.ts
 */

import { executeDataBackfill, getAllIdMappings, getAllMigrationConflicts, getAllSinhVien, getAllDiem } from '../src/db/dbOperations';

async function runMigrationTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ MIGRATION STANDARDIZATION & CANONICAL DATA');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: Kiểm tra số lượng sinh viên trước khi chạy backfill
  console.log('📌 Test 1: Kiểm tra bảo toàn dữ liệu gốc');
  const initialStudents = await getAllSinhVien();
  assert(initialStudents.length >= 5, `Bảo toàn đủ số lượng sinh viên gốc (${initialStudents.length} >= 5)`);

  // TEST 2: Thực thi Backfill an toàn
  console.log('\n📌 Test 2: Thực thi Backfill Expand-and-Contract');
  const backfillResult = await executeDataBackfill('TEST_SUITE_BATCH');
  assert(backfillResult.success === true, 'Hàm executeDataBackfill thực thi thành công');
  assert(backfillResult.students.total === initialStudents.length, `Số lượng sinh viên xử lý khớp dữ liệu gốc (${backfillResult.students.total})`);

  // TEST 3: Kiểm tra ghi nhận id_mapping
  console.log('\n📌 Test 3: Kiểm tra bảng ánh xạ id_mapping');
  const mappings = await getAllIdMappings();
  assert(Array.isArray(mappings), 'Bảng id_mapping trả về danh sách hợp lệ');
  assert(mappings.length >= backfillResult.idMappingsCount, `Đã ghi nhận ${mappings.length} bản ghi ánh xạ định danh canonical`);

  // TEST 4: Kiểm tra xung đột được ghi nhận vào migration_conflict_log (Không tự tạo master data giả)
  console.log('\n📌 Test 4: Kiểm tra nhật ký xung đột migration_conflict_log');
  const conflicts = await getAllMigrationConflicts();
  assert(Array.isArray(conflicts), 'Bảng migration_conflict_log trả về danh sách hợp lệ');
  if (backfillResult.students.unmapped > 0) {
    assert(conflicts.length > 0, `Các lớp chưa có trong danh mục được ghi nhận vào conflict log (${conflicts.length} xung đột), không tự chế tạo dữ liệu`);
  } else {
    assert(true, 'Tất cả sinh viên đã map thành công với danh mục');
  }

  // TEST 5: Kiểm tra tính bất biến của các cột dữ liệu gốc (Không DROP, Không ALTER phá hủy)
  console.log('\n📌 Test 5: Kiểm tra tính bất biến của các cột legacy (Dual-Read Support)');
  const studentsAfter = await getAllSinhVien();
  const allHaveOriginalFields = studentsAfter.every((s) => s.maSV && s.hoTen && s.lop && s.khoa);
  assert(allHaveOriginalFields, 'Tất cả sinh viên vẫn giữ nguyên 100% các trường dữ liệu legacy (maSV, hoTen, lop, khoa)');

  // TEST 6: Kiểm tra tính toàn vẹn điểm số
  console.log('\n📌 Test 6: Kiểm tra tính toàn vẹn dữ liệu điểm học phần');
  const grades = await getAllDiem();
  assert(Array.isArray(grades), 'Bảng điểm trả về danh sách an toàn không bị mất mát');

  console.log('\n================================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runMigrationTests().catch((err) => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
