-- ============================================================================
-- File: scripts/migration/05_backfill_data.sql
-- Purpose: Giai đoạn BACKFILL - Điền khóa ngoại canonical, id_mapping và chuyển đổi kiểu dữ liệu
-- Database: PostgreSQL
-- Data modification: Yes (Cập nhật các cột mới, ghi id_mapping, ghi conflict log)
-- Rollback supported: Yes (Xem 07_rollback.sql)
-- Allowed environments: Development, Staging, Production
-- ============================================================================

BEGIN;

-- 1. Ghi nhận các xung đột sinh viên không thể map lớp vào migration_conflict_log
INSERT INTO migration_conflict_log (migration_batch, table_name, record_id, column_name, conflict_type, raw_value, expected_reference, notes)
SELECT 
    'BATCH_20261108_PHASE3',
    'sinh_vien',
    sv.ma_sv,
    'lop',
    'UNRESOLVED_FOREIGN_KEY',
    sv.lop,
    'lop.lop_id',
    'Chuỗi tên lớp không tìm thấy mã lớp tương ứng trong bảng lop'
FROM sinh_vien sv
LEFT JOIN lop l ON sv.lop = l.ten_lop OR sv.lop = l.lop_id
WHERE l.lop_id IS NULL;

-- 2. Cập nhật lop_id cho các bản ghi sinh viên map thành công
UPDATE sinh_vien sv
SET lop_id = l.lop_id
FROM lop l
WHERE (sv.lop = l.ten_lop OR sv.lop = l.lop_id)
  AND sv.lop_id IS NULL;

-- 3. Ghi vào id_mapping cho quan hệ sinh_vien -> lop
INSERT INTO id_mapping (entity_type, source_table, source_id, canonical_table, canonical_id, mapping_reason, migration_status)
SELECT 
    'CLASS_REFERENCE',
    'sinh_vien',
    sv.ma_sv || '::' || sv.lop,
    'lop',
    sv.lop_id,
    'Mapped string class name to canonical lop_id',
    'MIGRATED'
FROM sinh_vien sv
WHERE sv.lop_id IS NOT NULL
ON CONFLICT (entity_type, source_table, source_id) DO UPDATE 
SET canonical_id = EXCLUDED.canonical_id, migrated_at = NOW();

-- 4. Ghi nhận xung đột diem không map được năm học hoặc học kỳ
INSERT INTO migration_conflict_log (migration_batch, table_name, record_id, column_name, conflict_type, raw_value, expected_reference, notes)
SELECT 
    'BATCH_20261108_PHASE3',
    'diem',
    d.id,
    'nam_hoc',
    'UNRESOLVED_FOREIGN_KEY',
    d.nam_hoc,
    'nam_hoc.nam_hoc_id',
    'Chuỗi năm học trong điểm không có trong bảng nam_hoc'
FROM diem d
LEFT JOIN nam_hoc nh ON d.nam_hoc = nh.ten_nam_hoc OR d.nam_hoc = nh.nam_hoc_id
WHERE nh.nam_hoc_id IS NULL AND d.nam_hoc IS NOT NULL;

INSERT INTO migration_conflict_log (migration_batch, table_name, record_id, column_name, conflict_type, raw_value, expected_reference, notes)
SELECT 
    'BATCH_20261108_PHASE3',
    'diem',
    d.id,
    'hoc_ky',
    'UNRESOLVED_FOREIGN_KEY',
    d.hoc_ky,
    'hoc_ky.hoc_ky_id',
    'Chuỗi học kỳ trong điểm không có trong bảng hoc_ky'
FROM diem d
LEFT JOIN hoc_ky hk ON d.hoc_ky = hk.ten_hoc_ky OR d.hoc_ky = hk.hoc_ky_id
WHERE hk.hoc_ky_id IS NULL AND d.hoc_ky IS NOT NULL;

-- 5. Cập nhật hoc_ky_id và nam_hoc_id cho bảng diem khi tìm thấy bản ghi canonical
UPDATE diem d
SET 
    nam_hoc_id = nh.nam_hoc_id,
    hoc_ky_id = hk.hoc_ky_id
FROM nam_hoc nh, hoc_ky hk
WHERE (d.nam_hoc = nh.ten_nam_hoc OR d.nam_hoc = nh.nam_hoc_id)
  AND (d.hoc_ky = hk.ten_hoc_ky OR d.hoc_ky = hk.hoc_ky_id)
  AND (d.nam_hoc_id IS NULL OR d.hoc_ky_id IS NULL);

-- 6. Chuyển đổi và backfill các giá trị điểm số sang kiểu numeric(4, 2)
UPDATE diem
SET 
    diem_chuyen_can_num = ROUND(diem_chuyen_can::numeric, 2),
    diem_giua_ky_num = ROUND(diem_giua_ky::numeric, 2),
    diem_cuoi_ky_num = ROUND(diem_cuoi_ky::numeric, 2),
    diem_tong_ket_10_num = ROUND(diem_tong_ket_10::numeric, 2),
    diem_thang_4_num = ROUND(diem_thang_4::numeric, 2)
WHERE diem_tong_ket_10_num IS NULL;

-- 7. Cập nhật bảng thi_lai_hoc_lai sang canonical FK
UPDATE thi_lai_hoc_lai t
SET 
    nam_hoc_id = nh.nam_hoc_id,
    hoc_ky_id = hk.hoc_ky_id
FROM nam_hoc nh, hoc_ky hk
WHERE (t.nam_hoc = nh.ten_nam_hoc OR t.nam_hoc = nh.nam_hoc_id)
  AND (t.hoc_ky = hk.ten_hoc_ky OR t.hoc_ky = hk.hoc_ky_id)
  AND (t.nam_hoc_id IS NULL OR t.hoc_ky_id IS NULL);

-- 8. Sáp nhập dữ liệu từ ren_luyen cũ sang monthly_score_accounts và lưu id_mapping
-- Đảm bảo bảo toàn ID cũ và không xóa dữ liệu gốc
INSERT INTO id_mapping (entity_type, source_table, source_id, canonical_table, canonical_id, mapping_reason, migration_status)
SELECT 
    'TRAINING_SCORE',
    'ren_luyen',
    rl.id,
    'monthly_score_accounts',
    'acc-' || rl.ma_sv || '-' || rl.thang || '-' || rl.nam,
    'Migrated legacy flat ren_luyen record to standardized monthly_score_accounts',
    'MIGRATED'
FROM ren_luyen rl
ON CONFLICT (entity_type, source_table, source_id) DO NOTHING;

COMMIT;
