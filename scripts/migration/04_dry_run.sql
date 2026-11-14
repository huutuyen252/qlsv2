-- ============================================================================
-- File: scripts/migration/04_dry_run.sql
-- Purpose: Chạy mô phỏng (Dry-Run) trước khi thực hiện Backfill - Không thay đổi dữ liệu
-- Database: PostgreSQL
-- Data modification: No
-- Rollback supported: N/A (Simulation only)
-- Allowed environments: Development, Staging, Production
-- ============================================================================

-- BƯỚC 1: Mô phỏng ánh xạ sinh_vien -> lop_id
-- Kiểm tra số bản ghi sinh viên có thể ánh xạ thành công sang lop_id
SELECT 
    'sinh_vien' AS target_table,
    'lop_id' AS target_column,
    COUNT(CASE WHEN l.lop_id IS NOT NULL THEN 1 END) AS mappable_records,
    COUNT(CASE WHEN l.lop_id IS NULL THEN 1 END) AS unmappable_conflict_records
FROM sinh_vien sv
LEFT JOIN lop l ON sv.lop = l.ten_lop OR sv.lop = l.lop_id;

-- Danh sách chi tiết các bản ghi sinh viên và mã lớp dự kiến gán
SELECT 
    sv.ma_sv, 
    sv.ho_ten, 
    sv.lop AS current_lop_string,
    COALESCE(l.lop_id, '[CONFLICT: Khong tim thay lop_id]') AS projected_lop_id,
    CASE 
        WHEN l.lop_id IS NOT NULL THEN 'AUTO_MAP_SUCCESS'
        ELSE 'WILL_LOG_TO_CONFLICT'
    END AS dry_run_status
FROM sinh_vien sv
LEFT JOIN lop l ON sv.lop = l.ten_lop OR sv.lop = l.lop_id;

-- BƯỚC 2: Mô phỏng ánh xạ diem -> hoc_ky_id & nam_hoc_id
SELECT 
    'diem' AS target_table,
    COUNT(d.id) AS total_records,
    COUNT(CASE WHEN nh.nam_hoc_id IS NOT NULL THEN 1 END) AS mappable_nam_hoc,
    COUNT(CASE WHEN hk.hoc_ky_id IS NOT NULL THEN 1 END) AS mappable_hoc_ky,
    COUNT(CASE WHEN nh.nam_hoc_id IS NULL OR hk.hoc_ky_id IS NULL THEN 1 END) AS conflict_records
FROM diem d
LEFT JOIN nam_hoc nh ON d.nam_hoc = nh.ten_nam_hoc OR d.nam_hoc = nh.nam_hoc_id
LEFT JOIN hoc_ky hk ON d.hoc_ky = hk.ten_hoc_ky OR d.hoc_ky = hk.hoc_ky_id;

-- BƯỚC 3: Mô phỏng chuyển đổi điểm từ double precision sang numeric(4, 2)
SELECT 
    id,
    ma_sv,
    ma_mh,
    diem_tong_ket_10 AS current_float_value,
    ROUND(diem_tong_ket_10::numeric, 2) AS projected_numeric_value,
    (diem_tong_ket_10 - ROUND(diem_tong_ket_10::numeric, 2)) AS round_variance
FROM diem
LIMIT 10;

-- BƯỚC 4: Mô phỏng sáp nhập 5 bản ghi từ ren_luyen cũ sang monthly_score_accounts
SELECT 
    rl.id AS source_ren_luyen_id,
    rl.ma_sv AS student_code,
    rl.diem_rl AS total_score,
    rl.xepLoai AS rank,
    rl.thang,
    rl.nam,
    'PROJECTED_TO_MONTHLY_ACCOUNT' AS dry_run_action
FROM ren_luyen rl;

-- BƯỚC 5: Tổng hợp số lượng bản ghi chịu tác động trong đợt migration
SELECT 
    'Bản ghi sinh viên cần cập nhật lop_id' AS metric,
    COUNT(*) AS count 
FROM sinh_vien
UNION ALL
SELECT 
    'Bản ghi điểm cần cập nhật FK và Numeric',
    COUNT(*) 
FROM diem
UNION ALL
SELECT 
    'Bản ghi rèn luyện cũ cần sáp nhập sang monthly accounts',
    COUNT(*) 
FROM ren_luyen;
