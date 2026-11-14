-- ============================================================================
-- File: scripts/migration/02_backup_plan.sql
-- Purpose: Kế hoạch và script sao lưu (Backup Plan) các bảng trước khi thực hiện migration
-- Database: PostgreSQL
-- Data modification: Yes (Tạo các bảng backup snapshot, KHÔNG sửa đổi bảng gốc)
-- Rollback supported: Yes (Có thể DROP TABLE backup_* nếu cần dọn dẹp)
-- Allowed environments: Development, Staging, Production
-- ============================================================================

BEGIN;

-- 1. Tạo bảng lưu trữ thông tin kiểm toán đợt backup
CREATE TABLE IF NOT EXISTS migration_backup_metadata (
    id SERIAL PRIMARY KEY,
    backup_tag VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    backup_table_name VARCHAR(120) NOT NULL,
    row_count INTEGER NOT NULL,
    checksum TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Sao lưu an toàn bảng users
DROP TABLE IF EXISTS backup_users_pre_standardization;
CREATE TABLE backup_users_pre_standardization AS 
SELECT * FROM users;

INSERT INTO migration_backup_metadata (backup_tag, table_name, backup_table_name, row_count)
VALUES ('STANDARD_PHASE2_20261108', 'users', 'backup_users_pre_standardization', (SELECT COUNT(*) FROM users));

-- 3. Sao lưu an toàn bảng sinh_vien
DROP TABLE IF EXISTS backup_sinh_vien_pre_standardization;
CREATE TABLE backup_sinh_vien_pre_standardization AS 
SELECT * FROM sinh_vien;

INSERT INTO migration_backup_metadata (backup_tag, table_name, backup_table_name, row_count)
VALUES ('STANDARD_PHASE2_20261108', 'sinh_vien', 'backup_sinh_vien_pre_standardization', (SELECT COUNT(*) FROM sinh_vien));

-- 4. Sao lưu an toàn bảng diem
DROP TABLE IF EXISTS backup_diem_pre_standardization;
CREATE TABLE backup_diem_pre_standardization AS 
SELECT * FROM diem;

INSERT INTO migration_backup_metadata (backup_tag, table_name, backup_table_name, row_count)
VALUES ('STANDARD_PHASE2_20261108', 'diem', 'backup_diem_pre_standardization', (SELECT COUNT(*) FROM diem));

-- 5. Sao lưu an toàn bảng ren_luyen
DROP TABLE IF EXISTS backup_ren_luyen_pre_standardization;
CREATE TABLE backup_ren_luyen_pre_standardization AS 
SELECT * FROM ren_luyen;

INSERT INTO migration_backup_metadata (backup_tag, table_name, backup_table_name, row_count)
VALUES ('STANDARD_PHASE2_20261108', 'ren_luyen', 'backup_ren_luyen_pre_standardization', (SELECT COUNT(*) FROM ren_luyen));

-- 6. Sao lưu an toàn bảng thoi_khoa_bieu
DROP TABLE IF EXISTS backup_thoi_khoa_bieu_pre_standardization;
CREATE TABLE backup_thoi_khoa_bieu_pre_standardization AS 
SELECT * FROM thoi_khoa_bieu;

INSERT INTO migration_backup_metadata (backup_tag, table_name, backup_table_name, row_count)
VALUES ('STANDARD_PHASE2_20261108', 'thoi_khoa_bieu', 'backup_thoi_khoa_bieu_pre_standardization', (SELECT COUNT(*) FROM thoi_khoa_bieu));

-- 7. Sao lưu an toàn bảng thi_lai_hoc_lai
DROP TABLE IF EXISTS backup_thi_lai_hoc_lai_pre_standardization;
CREATE TABLE backup_thi_lai_hoc_lai_pre_standardization AS 
SELECT * FROM thi_lai_hoc_lai;

INSERT INTO migration_backup_metadata (backup_tag, table_name, backup_table_name, row_count)
VALUES ('STANDARD_PHASE2_20261108', 'thi_lai_hoc_lai', 'backup_thi_lai_hoc_lai_pre_standardization', (SELECT COUNT(*) FROM thi_lai_hoc_lai));

-- 8. Kiểm tra lại bản ghi metadata
SELECT * FROM migration_backup_metadata WHERE backup_tag = 'STANDARD_PHASE2_20261108';

COMMIT;
