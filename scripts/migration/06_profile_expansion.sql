-- =============================================================================
-- PHASE 2 MIGRATION: MỞ RỘNG HỒ SƠ SINH VIÊN & QUẢN LÝ HỒ SƠ (EXPAND-ONLY)
-- Quy tắc:
--   1. Chỉ mở rộng bảng mới & cột phụ, KHÔNG xóa dữ liệu cũ.
--   2. Địa chỉ hai cấp: CHỈ CÓ PROVINCE và COMMUNE (cấm DISTRICT).
--   3. Bảo vệ tính toàn vẹn: commune.parent_id = province_unit_id.
--   4. Không xóa đơn vị hành chính nếu đã có hồ sơ tham chiếu.
-- =============================================================================

-- 1. Sửa lỗi chính tả tên cột nếu tồn tại từ bản cũ
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diem_danh' AND column_name = 'so_tiet_nghỉi'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diem_danh' AND column_name = 'so_tiet_nghi'
  ) THEN
    ALTER TABLE diem_danh RENAME COLUMN "so_tiet_nghỉi" TO "so_tiet_nghi";
  END IF;
END $$;

-- 2. Cơ cấu tổ chức (Faculties, Majors, Cohorts, Enrollments)
CREATE TABLE IF NOT EXISTS faculties (
  id text PRIMARY KEY NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at text,
  updated_at text
);

CREATE TABLE IF NOT EXISTS majors (
  id text PRIMARY KEY NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  faculty_id text NOT NULL REFERENCES faculties(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at text,
  updated_at text
);

CREATE TABLE IF NOT EXISTS cohorts (
  id text PRIMARY KEY NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  intake_year integer NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at text,
  updated_at text
);

ALTER TABLE lop ADD COLUMN IF NOT EXISTS faculty_id text;
ALTER TABLE lop ADD COLUMN IF NOT EXISTS major_id text;
ALTER TABLE lop ADD COLUMN IF NOT EXISTS cohort_id text;
ALTER TABLE lop ADD COLUMN IF NOT EXISTS advisor_user_id text;

CREATE TABLE IF NOT EXISTS student_enrollments (
  id text PRIMARY KEY NOT NULL,
  ma_sv text NOT NULL REFERENCES sinh_vien(ma_sv) ON DELETE CASCADE,
  lop_id text NOT NULL REFERENCES lop(lop_id) ON DELETE RESTRICT,
  cohort_id text REFERENCES cohorts(id) ON DELETE RESTRICT,
  enrollment_type text NOT NULL DEFAULT 'REGULAR',
  effective_from text NOT NULL,
  effective_to text,
  status text NOT NULL DEFAULT 'ACTIVE',
  is_primary boolean NOT NULL DEFAULT true,
  created_by text,
  updated_by text,
  created_at text,
  updated_at text
);

-- 3. Đơn vị hành chính hai cấp (CHỈ PROVINCE & COMMUNE)
CREATE TABLE IF NOT EXISTS administrative_units (
  id text PRIMARY KEY NOT NULL,
  official_code text NOT NULL,
  unit_level text NOT NULL CHECK (unit_level IN ('PROVINCE', 'COMMUNE')),
  name text NOT NULL,
  short_name text,
  unit_type text NOT NULL,
  parent_id text REFERENCES administrative_units(id) ON DELETE RESTRICT,
  effective_from text NOT NULL,
  effective_to text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MERGED', 'INACTIVE')),
  successor_unit_id text REFERENCES administrative_units(id) ON DELETE RESTRICT,
  created_at text,
  updated_at text,
  CONSTRAINT chk_admin_unit_parent_level CHECK (
    (unit_level = 'PROVINCE' AND parent_id IS NULL) OR
    (unit_level = 'COMMUNE' AND parent_id IS NOT NULL)
  ),
  CONSTRAINT uq_admin_unit_code_effective UNIQUE (official_code, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_admin_units_level_parent ON administrative_units(unit_level, parent_id, status);

CREATE TABLE IF NOT EXISTS administrative_unit_history (
  id text PRIMARY KEY NOT NULL,
  source_unit_id text NOT NULL REFERENCES administrative_units(id) ON DELETE RESTRICT,
  target_unit_id text REFERENCES administrative_units(id) ON DELETE RESTRICT,
  change_type text NOT NULL CHECK (change_type IN ('MERGED', 'SPLIT', 'RENAMED', 'BOUNDARY_ADJUSTED', 'DEACTIVATED')),
  resolution_no text,
  effective_date text NOT NULL,
  notes text,
  created_by text,
  created_at text
);

-- 4. Địa chỉ sinh viên (Thường trú, Hiện tại, Tạm trú)
CREATE TABLE IF NOT EXISTS student_addresses (
  id text PRIMARY KEY NOT NULL,
  ma_sv text NOT NULL REFERENCES sinh_vien(ma_sv) ON DELETE CASCADE,
  address_type text NOT NULL CHECK (address_type IN ('PERMANENT', 'CURRENT', 'TEMPORARY')),
  province_unit_id text NOT NULL REFERENCES administrative_units(id) ON DELETE RESTRICT,
  commune_unit_id text NOT NULL REFERENCES administrative_units(id) ON DELETE RESTRICT,
  address_detail text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  valid_from text NOT NULL,
  valid_to text,
  verification_status text NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED')),
  verified_by text,
  verified_at text,
  source text NOT NULL DEFAULT 'STAFF_ENTRY',
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_addresses_sv_type ON student_addresses(ma_sv, address_type);
CREATE INDEX IF NOT EXISTS idx_student_addresses_location ON student_addresses(address_type, province_unit_id, commune_unit_id);

-- Trigger bảo vệ: commune.parent_id = province_unit_id và cấp hành chính hợp lệ
CREATE OR REPLACE FUNCTION fn_validate_student_address_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  v_prov_level text;
  v_comm_level text;
  v_comm_parent text;
BEGIN
  SELECT unit_level INTO v_prov_level FROM administrative_units WHERE id = NEW.province_unit_id;
  IF v_prov_level IS DISTINCT FROM 'PROVINCE' THEN
    RAISE EXCEPTION 'province_unit_id (%) không phải cấp PROVINCE', NEW.province_unit_id;
  END IF;

  SELECT unit_level, parent_id INTO v_comm_level, v_comm_parent FROM administrative_units WHERE id = NEW.commune_unit_id;
  IF v_comm_level IS DISTINCT FROM 'COMMUNE' THEN
    RAISE EXCEPTION 'commune_unit_id (%) không phải cấp COMMUNE', NEW.commune_unit_id;
  END IF;
  IF v_comm_parent IS DISTINCT FROM NEW.province_unit_id THEN
    RAISE EXCEPTION 'commune_unit_id (%) không trực thuộc province_unit_id (%)', NEW.commune_unit_id, NEW.province_unit_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_student_address_hierarchy ON student_addresses;
CREATE TRIGGER trg_validate_student_address_hierarchy
  BEFORE INSERT OR UPDATE ON student_addresses
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_student_address_hierarchy();

-- 5. Dân tộc & Tôn giáo
CREATE TABLE IF NOT EXISTS ethnicities (
  id text PRIMARY KEY NOT NULL,
  official_code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS religions (
  id text PRIMARY KEY NOT NULL,
  official_code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS student_demographics (
  ma_sv text PRIMARY KEY NOT NULL REFERENCES sinh_vien(ma_sv) ON DELETE CASCADE,
  ethnicity_id text REFERENCES ethnicities(id) ON DELETE RESTRICT,
  ethnicity_status text NOT NULL DEFAULT 'NOT_DECLARED' CHECK (ethnicity_status IN ('DECLARED', 'NOT_DECLARED')),
  religion_id text REFERENCES religions(id) ON DELETE RESTRICT,
  religion_status text NOT NULL DEFAULT 'NOT_DECLARED' CHECK (religion_status IN ('DECLARED', 'CONFIRMED_NONE', 'NOT_DECLARED')),
  verification_status text NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED')),
  verified_by text,
  verified_at text,
  source text NOT NULL DEFAULT 'STAFF_ENTRY',
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

-- 6. Gia đình & Liên hệ khẩn cấp
CREATE TABLE IF NOT EXISTS relationship_types (
  id text PRIMARY KEY NOT NULL,
  code text NOT NULL UNIQUE,
  label_vi text NOT NULL,
  is_parental boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS student_family_profiles (
  id text PRIMARY KEY NOT NULL,
  ma_sv text NOT NULL UNIQUE REFERENCES sinh_vien(ma_sv) ON DELETE CASCADE,
  family_structure_status text NOT NULL DEFAULT 'NOT_DECLARED'
    CHECK (family_structure_status IN ('BOTH_PARENTS', 'FATHER_ONLY', 'MOTHER_ONLY', 'GUARDIAN_ONLY', 'OTHER', 'NOT_DECLARED')),
  data_completeness_state text NOT NULL DEFAULT 'NOT_ENTERED'
    CHECK (data_completeness_state IN ('NOT_ENTERED', 'PARTIAL', 'CONFIRMED_NO_INFO', 'COMPLETE')),
  verification_status text NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED')),
  verified_by text,
  verified_at text,
  notes text,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS student_family_members (
  id text PRIMARY KEY NOT NULL,
  family_profile_id text NOT NULL REFERENCES student_family_profiles(id) ON DELETE CASCADE,
  ma_sv text NOT NULL REFERENCES sinh_vien(ma_sv) ON DELETE CASCADE,
  relationship_type_id text NOT NULL REFERENCES relationship_types(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  birth_year integer,
  is_deceased boolean NOT NULL DEFAULT false,
  occupation text,
  workplace text,
  province_unit_id text REFERENCES administrative_units(id) ON DELETE RESTRICT,
  commune_unit_id text REFERENCES administrative_units(id) ON DELETE RESTRICT,
  address_detail text,
  is_guardian boolean NOT NULL DEFAULT false,
  is_primary_contact boolean NOT NULL DEFAULT false,
  is_emergency_contact boolean NOT NULL DEFAULT false,
  notes text,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_family_members_sv ON student_family_members(ma_sv, is_emergency_contact, is_guardian);

CREATE TABLE IF NOT EXISTS family_member_contacts (
  id text PRIMARY KEY NOT NULL,
  family_member_id text NOT NULL REFERENCES student_family_members(id) ON DELETE CASCADE,
  contact_type text NOT NULL CHECK (contact_type IN ('PHONE', 'ZALO', 'EMAIL', 'OTHER')),
  contact_value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_emergency boolean NOT NULL DEFAULT false,
  can_receive_sms boolean NOT NULL DEFAULT true,
  verification_status text NOT NULL DEFAULT 'UNVERIFIED',
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

-- 7. Tổ chức Đoàn / Đảng
CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS student_organization_memberships (
  id text PRIMARY KEY NOT NULL,
  ma_sv text NOT NULL REFERENCES sinh_vien(ma_sv) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  membership_status text NOT NULL DEFAULT 'NOT_MEMBER'
    CHECK (membership_status IN ('NOT_MEMBER', 'CANDIDATE', 'PROBATIONARY', 'OFFICIAL', 'TRANSFERRED', 'LEFT')),
  join_date text,
  official_date text,
  membership_code text,
  unit_name text,
  evidence_file_url text,
  verification_status text NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED')),
  verified_by text,
  verified_at text,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  CONSTRAINT uq_sv_organization UNIQUE (ma_sv, organization_id)
);

-- 8. Trường tùy biến do Admin cấu hình
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id text PRIMARY KEY NOT NULL,
  field_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  section_group text NOT NULL DEFAULT 'ADDITIONAL'
    CHECK (section_group IN ('PERSONAL', 'ADDRESS', 'FAMILY', 'ORGANIZATION', 'ADDITIONAL')),
  data_type text NOT NULL
    CHECK (data_type IN ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'URL', 'PHONE', 'EMAIL')),
  is_required boolean NOT NULL DEFAULT false,
  is_filterable boolean NOT NULL DEFAULT true,
  is_reportable boolean NOT NULL DEFAULT true,
  is_sensitive boolean NOT NULL DEFAULT false,
  validation_rules jsonb,
  visibility_roles jsonb NOT NULL DEFAULT '["ADMIN","LECTURER","STUDENT"]'::jsonb,
  editable_roles jsonb NOT NULL DEFAULT '["ADMIN"]'::jsonb,
  effective_from text,
  effective_to text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_field_options (
  id text PRIMARY KEY NOT NULL,
  field_id text NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  option_value text NOT NULL,
  option_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT uq_custom_field_option UNIQUE (field_id, option_value)
);

CREATE TABLE IF NOT EXISTS student_custom_field_values (
  id text PRIMARY KEY NOT NULL,
  ma_sv text NOT NULL REFERENCES sinh_vien(ma_sv) ON DELETE CASCADE,
  field_id text NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value_text text,
  value_number double precision,
  value_date text,
  value_boolean boolean,
  value_json jsonb,
  verification_status text NOT NULL DEFAULT 'UNVERIFIED',
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  CONSTRAINT uq_sv_custom_field UNIQUE (ma_sv, field_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_vals_field ON student_custom_field_values(field_id, ma_sv);

-- 9. Bộ lọc đã lưu & Audit Logs mở rộng
CREATE TABLE IF NOT EXISTS saved_filter_presets (
  id text PRIMARY KEY NOT NULL,
  owner_user_id text NOT NULL,
  owner_name text,
  name text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'ROLE_SHARED', 'SYSTEM')),
  target_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  filter_ast jsonb NOT NULL,
  selected_columns jsonb NOT NULL,
  sort_config jsonb,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_json jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_json jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_sensitive_read boolean DEFAULT false;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason text;
