-- =============================================================================
-- MIGRATION 12: EXPAND-ONLY INDEXES FOR STUDENT LIST SORTING & COMMUNE CASCADE
-- Nguyên tắc:
--   1. Chỉ CREATE INDEX IF NOT EXISTS (không DROP, không DELETE, không TRUNCATE).
--   2. Không thay đổi bảng/cột/khóa chính/khóa ngoại, không INSERT/UPSERT dữ liệu.
--   3. Tối ưu sắp xếp danh sách sinh viên và truy vấn cascade Xã/Phường theo Tỉnh/TP.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_sinh_vien_ho_ten
  ON sinh_vien(ho_ten);

CREATE INDEX IF NOT EXISTS idx_sinh_vien_lop
  ON sinh_vien(lop);

CREATE INDEX IF NOT EXISTS idx_sinh_vien_khoa
  ON sinh_vien(khoa);

CREATE INDEX IF NOT EXISTS idx_admin_units_communes_by_province
  ON administrative_units(parent_id, status, name)
  WHERE unit_level = 'COMMUNE';
