-- ============================================================================
-- File: scripts/migration/06_post_validation.sql
-- Purpose: Kiểm tra và đối chiếu dữ liệu sau migration (Validation sau migration)
-- Database: PostgreSQL
-- Data modification: No
-- Rollback supported: N/A (Read-only)
-- Allowed environments: Development, Staging, Production
-- ============================================================================

-- 1. Kiểm tra đối chiếu số lượng bản ghi so với bản ghi lưu trữ tại metadata backup
SELECT 
    b.table_name,
    b.row_count AS count_before_migration,
    curr.current_count,
    CASE 
        WHEN b.row_count = curr.current_count THEN 'PASSED: Matched exact count'
        ELSE 'WARNING: Row count changed'
    END AS validation_status
FROM migration_backup_metadata b
JOIN (
    SELECT 'users' AS table_name, COUNT(*) AS current_count FROM users
    UNION ALL
    SELECT 'sinh_vien', COUNT(*) FROM sinh_vien
    UNION ALL
    SELECT 'diem', COUNT(*) FROM diem
    UNION ALL
    SELECT 'ren_luyen', COUNT(*) FROM ren_luyen
    UNION ALL
    SELECT 'thoi_khoa_bieu', COUNT(*) FROM thoi_khoa_bieu
    UNION ALL
    SELECT 'thi_lai_hoc_lai', COUNT(*) FROM thi_lai_hoc_lai
) curr ON b.table_name = curr.table_name
WHERE b.backup_tag = 'STANDARD_PHASE2_20261108';

-- 2. Kiểm tra tổng số bản ghi đã được ghi nhận trong id_mapping
SELECT 
    entity_type, 
    canonical_table, 
    COUNT(*) AS mapped_records_count 
FROM id_mapping
GROUP BY entity_type, canonical_table;

-- 3. Kiểm tra danh sách xung đột phát hiện trong quá trình backfill
SELECT 
    migration_batch,
    table_name,
    column_name,
    conflict_type,
    COUNT(*) AS total_conflicts
FROM migration_conflict_log
GROUP BY migration_batch, table_name, column_name, conflict_type;

-- 4. Xác minh các cột cũ vẫn được bảo toàn nguyên vẹn 100% (Không drop)
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns
WHERE table_name IN ('sinh_vien', 'diem', 'ren_luyen')
  AND column_name IN ('lop', 'ho_ten_sv', 'ten_mh', 'so_tin_chi', 'diem_rl', 'diem_tong_ket_10')
ORDER BY table_name, column_name;

-- 5. Kiểm tra tính toàn vẹn của cột numeric mới trong bảng diem
SELECT 
    COUNT(*) AS total_numeric_grades,
    COUNT(CASE WHEN diem_tong_ket_10_num IS NOT NULL THEN 1 END) AS valid_numeric_grades,
    MIN(diem_tong_ket_10_num) AS min_grade,
    MAX(diem_tong_ket_10_num) AS max_grade
FROM diem;
