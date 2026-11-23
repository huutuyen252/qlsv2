-- =============================================================================
-- MIGRATION 11: EXPAND-ONLY INDEXES FOR UNIFIED PROFILE FILTER & INLINE EDIT
-- Nguyên tắc:
--   1. Chỉ CREATE INDEX IF NOT EXISTS (không DROP, không DELETE, không TRUNCATE).
--   2. Không thay đổi khóa chính, không làm mất khóa ngoại, không tự INSERT dữ liệu.
--   3. Tối ưu truy vấn lọc phẳng (AND) trên Danh sách sinh viên & kiểm tra trạng thái.
-- =============================================================================

-- 1. Tối ưu tra cứu địa chỉ hiện hành theo loại (CURRENT / PERMANENT / TEMPORARY)
CREATE INDEX IF NOT EXISTS idx_student_addresses_sv_type_active
  ON student_addresses(ma_sv, address_type, valid_to);

CREATE INDEX IF NOT EXISTS idx_student_addresses_current_lookup
  ON student_addresses(address_type, province_unit_id, commune_unit_id)
  WHERE valid_to IS NULL;

-- 2. Tối ưu lọc theo Dân tộc & Tôn giáo
CREATE INDEX IF NOT EXISTS idx_student_demographics_eth_rel
  ON student_demographics(ethnicity_id, religion_id);

-- 3. Tối ưu lọc theo Cấu trúc gia đình & Thành viên (Bố/Mẹ/Giám hộ/Khẩn cấp)
CREATE INDEX IF NOT EXISTS idx_family_profiles_structure
  ON student_family_profiles(family_structure_status, ma_sv);

CREATE INDEX IF NOT EXISTS idx_family_members_rel_sv
  ON student_family_members(ma_sv, relationship_type_id);

CREATE INDEX IF NOT EXISTS idx_family_member_contacts_member
  ON family_member_contacts(family_member_id, is_primary, contact_type);

-- 4. Tối ưu lọc theo Đoàn / Đảng & ngày tham gia
CREATE INDEX IF NOT EXISTS idx_student_org_sv_org_dates
  ON student_organization_memberships(ma_sv, organization_id, membership_status, join_date);

-- 5. Tối ưu hiển thị & lọc trường tùy biến đang kích hoạt
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_active_sort
  ON custom_field_definitions(is_active, sort_order, is_filterable);

CREATE INDEX IF NOT EXISTS idx_custom_field_vals_filter
  ON student_custom_field_values(field_id, value_text, value_date, value_boolean);
