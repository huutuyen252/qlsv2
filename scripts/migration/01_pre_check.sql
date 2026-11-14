-- ============================================================================
-- File: scripts/migration/01_pre_check.sql
-- Purpose: Kiểm tra an toàn trước khi chạy migration (Pre-check chỉ đọc)
-- Database: PostgreSQL
-- Data modification: No
-- Rollback supported: N/A (Read-only)
-- Allowed environments: Development, Staging, Production
-- ============================================================================

-- 1. Kiểm tra số lượng bản ghi hiện có ở các bảng chính
SELECT 'users' AS table_name, COUNT(*) AS total_records FROM users
UNION ALL
SELECT 'sinh_vien', COUNT(*) FROM sinh_vien
UNION ALL
SELECT 'lop', COUNT(*) FROM lop
UNION ALL
SELECT 'nam_hoc', COUNT(*) FROM nam_hoc
UNION ALL
SELECT 'hoc_ky', COUNT(*) FROM hoc_ky
UNION ALL
SELECT 'mon_hoc', COUNT(*) FROM mon_hoc
UNION ALL
SELECT 'diem', COUNT(*) FROM diem
UNION ALL
SELECT 'ren_luyen', COUNT(*) FROM ren_luyen
UNION ALL
SELECT 'thoi_khoa_bieu', COUNT(*) FROM thoi_khoa_bieu
UNION ALL
SELECT 'thi_lai_hoc_lai', COUNT(*) FROM thi_lai_hoc_lai;

-- 2. Kiểm tra các bản ghi sinh viên có chuỗi lớp chưa tồn tại trong bảng lop
SELECT 
    sv.ma_sv, 
    sv.ho_ten, 
    sv.lop AS unmapped_class_string
FROM sinh_vien sv
LEFT JOIN lop l ON sv.lop = l.ten_lop OR sv.lop = l.lop_id
WHERE l.lop_id IS NULL;

-- 3. Kiểm tra các bản ghi điểm có mã môn học không tồn tại trong mon_hoc
SELECT 
    d.id AS diem_id, 
    d.ma_sv, 
    d.ma_mh, 
    d.ten_mh
FROM diem d
LEFT JOIN mon_hoc mh ON d.ma_mh = mh.ma_mh
WHERE mh.ma_mh IS NULL;

-- 4. Kiểm tra các bản ghi điểm có mã sinh viên không tồn tại trong sinh_vien
SELECT 
    d.id AS diem_id, 
    d.ma_sv, 
    d.ho_ten_sv
FROM diem d
LEFT JOIN sinh_vien sv ON d.ma_sv = sv.ma_sv
WHERE sv.ma_sv IS NULL;

-- 5. Kiểm tra các chuỗi năm học và học kỳ trong điểm xem có bản ghi mồ côi nào không
SELECT DISTINCT 
    d.nam_hoc AS raw_nam_hoc, 
    d.hoc_ky AS raw_hoc_ky,
    nh.nam_hoc_id,
    hk.hoc_ky_id
FROM diem d
LEFT JOIN nam_hoc nh ON d.nam_hoc = nh.ten_nam_hoc OR d.nam_hoc = nh.nam_hoc_id
LEFT JOIN hoc_ky hk ON d.hoc_ky = hk.ten_hoc_ky OR d.hoc_ky = hk.hoc_ky_id;
