-- ============================================================================
-- File: scripts/migration/07_rollback.sql
-- Purpose: Khôi phục lại trạng thái trước khi thực hiện Expand & Backfill (Rollback Plan)
-- Database: PostgreSQL
-- Data modification: Yes (Xóa các cột expand mới và bảng phụ trợ, phục hồi dữ liệu từ backup)
-- Rollback supported: Yes
-- Allowed environments: Development, Staging, Production (Khi có sự cố migration)
-- ============================================================================

BEGIN;

-- 1. Xóa các cột expand đã thêm vào bảng sinh_vien
ALTER TABLE sinh_vien 
DROP COLUMN IF EXISTS lop_id;

-- 2. Xóa các cột expand đã thêm vào bảng diem
ALTER TABLE diem 
DROP COLUMN IF EXISTS hoc_ky_id,
DROP COLUMN IF EXISTS nam_hoc_id,
DROP COLUMN IF EXISTS diem_chuyen_can_num,
DROP COLUMN IF EXISTS diem_giua_ky_num,
DROP COLUMN IF EXISTS diem_cuoi_ky_num,
DROP COLUMN IF EXISTS diem_tong_ket_10_num,
DROP COLUMN IF EXISTS diem_thang_4_num;

-- 3. Xóa các cột expand đã thêm vào bảng thi_lai_hoc_lai
ALTER TABLE thi_lai_hoc_lai 
DROP COLUMN IF EXISTS hoc_ky_id,
DROP COLUMN IF EXISTS nam_hoc_id;

-- 4. Xóa các cột expand đã thêm vào bảng score_policies
ALTER TABLE score_policies 
DROP COLUMN IF EXISTS nam_hoc_id;

-- 5. Xóa các cột expand đã thêm vào bảng monthly_score_accounts
ALTER TABLE monthly_score_accounts 
DROP COLUMN IF EXISTS lop_id;

-- 6. Xóa các bảng phụ trợ được tạo trong Phase 2
DROP TABLE IF EXISTS migration_conflict_log;
DROP TABLE IF EXISTS id_mapping;

-- 7. Nếu cần phục hồi toàn bộ dữ liệu từ bảng backup:
-- Lưu ý: Thực hiện kiểm tra trước khi ghi đè
-- UPDATE sinh_vien sv SET ho_ten = b.ho_ten, lop = b.lop FROM backup_sinh_vien_pre_standardization b WHERE sv.ma_sv = b.ma_sv;

COMMIT;
