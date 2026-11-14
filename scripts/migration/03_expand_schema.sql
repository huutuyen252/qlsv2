-- ============================================================================
-- File: scripts/migration/03_expand_schema.sql
-- Purpose: Giai đoạn EXPAND - Thêm bảng phụ trợ id_mapping, log xung đột và các cột canonical mới
-- Database: PostgreSQL
-- Data modification: Yes (DDL - Thêm bảng và cột mới không phá hủy)
-- Rollback supported: Yes (Xem 07_rollback.sql)
-- Allowed environments: Development, Staging, Production
-- ============================================================================

BEGIN;

-- 1. Bảng id_mapping phục vụ lưu trữ ánh xạ định danh cũ -> định danh chuẩn
CREATE TABLE IF NOT EXISTS id_mapping (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    source_table VARCHAR(100) NOT NULL,
    source_id VARCHAR(150) NOT NULL,
    canonical_table VARCHAR(100) NOT NULL,
    canonical_id VARCHAR(150) NOT NULL,
    mapping_reason VARCHAR(255) NOT NULL,
    migration_status VARCHAR(50) NOT NULL DEFAULT 'MIGRATED',
    conflict_details TEXT,
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_id_mapping_entity_source UNIQUE (entity_type, source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_id_mapping_canonical ON id_mapping(canonical_table, canonical_id);

-- 2. Bảng migration_conflict_log ghi nhận các bản ghi không thể tự động map
CREATE TABLE IF NOT EXISTS migration_conflict_log (
    id SERIAL PRIMARY KEY,
    migration_batch VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(150) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    raw_value TEXT,
    expected_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Mở rộng bảng sinh_vien: Thêm cột canonical lop_id (chưa đặt NOT NULL trong pha Expand)
ALTER TABLE sinh_vien 
ADD COLUMN IF NOT EXISTS lop_id TEXT;

-- 4. Mở rộng bảng diem: Thêm các cột canonical FK và cột numeric thay thế double
ALTER TABLE diem 
ADD COLUMN IF NOT EXISTS hoc_ky_id TEXT,
ADD COLUMN IF NOT EXISTS nam_hoc_id TEXT,
ADD COLUMN IF NOT EXISTS diem_chuyen_can_num NUMERIC(4, 2),
ADD COLUMN IF NOT EXISTS diem_giua_ky_num NUMERIC(4, 2),
ADD COLUMN IF NOT EXISTS diem_cuoi_ky_num NUMERIC(4, 2),
ADD COLUMN IF NOT EXISTS diem_tong_ket_10_num NUMERIC(4, 2),
ADD COLUMN IF NOT EXISTS diem_thang_4_num NUMERIC(4, 2);

-- 5. Mở rộng bảng thi_lai_hoc_lai: Thêm các cột canonical FK
ALTER TABLE thi_lai_hoc_lai 
ADD COLUMN IF NOT EXISTS hoc_ky_id TEXT,
ADD COLUMN IF NOT EXISTS nam_hoc_id TEXT;

-- 6. Mở rộng bảng thoi_khoa_bieu: Đảm bảo các cột canonical FK tồn tại
ALTER TABLE thoi_khoa_bieu 
ADD COLUMN IF NOT EXISTS lop_id TEXT,
ADD COLUMN IF NOT EXISTS hoc_ky_id TEXT,
ADD COLUMN IF NOT EXISTS nam_hoc_id TEXT;

-- 7. Mở rộng bảng score_policies: Thêm cột nam_hoc_id liên kết với nam_hoc
ALTER TABLE score_policies 
ADD COLUMN IF NOT EXISTS nam_hoc_id TEXT;

-- 8. Mở rộng bảng monthly_score_accounts: Thêm cột canonical lop_id
ALTER TABLE monthly_score_accounts 
ADD COLUMN IF NOT EXISTS lop_id TEXT;

COMMIT;
