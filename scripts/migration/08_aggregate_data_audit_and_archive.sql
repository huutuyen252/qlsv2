-- ============================================================================
-- File: scripts/migration/08_aggregate_data_audit_and_archive.sql
-- Purpose: Quản lý vòng đời dữ liệu tổng hợp: Kiểm toán -> Lập danh sách ID -> 
--          Phân tích phụ thuộc -> Backup -> Chuyển quan hệ -> Archive -> Xóa sau phê duyệt
-- Database: PostgreSQL
-- Data modification: Yes (Trong transaction có kiểm soát chặt chẽ)
-- Rollback supported: Yes
-- Allowed environments: Development, Staging, Production
-- ============================================================================

BEGIN;

-- ============================================================================
-- BƯỚC 1: TẠO CÁC BẢNG STAGING & ARCHIVE PHỤC VỤ DỌN DẸP DỮ LIỆU
-- ============================================================================

-- Bảng 1: data_cleanup_candidates (Danh sách ứng viên cần xử lý)
CREATE TABLE IF NOT EXISTS data_cleanup_candidates (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(150) NOT NULL,
    classification VARCHAR(50) NOT NULL,
    confidence_reason TEXT NOT NULL,
    evidence_json JSONB,
    dependency_count INTEGER NOT NULL DEFAULT 0,
    proposed_action VARCHAR(50) NOT NULL DEFAULT 'ARCHIVE_AND_MAP',
    review_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cleanup_candidate UNIQUE (table_name, record_id)
);

-- Bảng 2: data_cleanup_approved (Danh sách bản ghi đã được phê duyệt xử lý)
CREATE TABLE IF NOT EXISTS data_cleanup_approved (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES data_cleanup_candidates(id),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(150) NOT NULL,
    approved_action VARCHAR(50) NOT NULL,
    approved_by VARCHAR(100) NOT NULL,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng 3: archived_ren_luyen (Bảng lưu trữ vĩnh viễn các bản ghi rèn luyện cũ trước khi dọn)
CREATE TABLE IF NOT EXISTS archived_ren_luyen (
    id TEXT PRIMARY KEY,
    ma_sv TEXT NOT NULL,
    ho_ten_sv TEXT,
    lop TEXT,
    thang INTEGER NOT NULL,
    nam INTEGER NOT NULL,
    nam_hoc TEXT,
    diem_rl INTEGER NOT NULL,
    xep_loai TEXT NOT NULL,
    nhan_xet TEXT,
    nguoi_danh_gia TEXT,
    ngay_danh_gia TEXT,
    diem_muc_1 INTEGER,
    diem_muc_2 INTEGER,
    diem_muc_3 INTEGER,
    hoc_ky TEXT,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archive_reason TEXT NOT NULL DEFAULT 'Sáp nhập sang phân hệ chuẩn monthly_score_accounts'
);

-- Bảng 4: backup_aggregate_records_20261108 (Snapshot backup cô lập)
CREATE TABLE IF NOT EXISTS backup_aggregate_records_20261108 AS 
SELECT * FROM ren_luyen;

-- ============================================================================
-- BƯỚC 2: NẠP DANH SÁCH ID DỮ LIỆU TỔNG HỢP VỚI BẰNG CHỨNG KIỂM TOÁN CỤ THỂ
-- ============================================================================

INSERT INTO data_cleanup_candidates (
    entity_type,
    table_name,
    record_id,
    classification,
    confidence_reason,
    evidence_json,
    dependency_count,
    proposed_action,
    review_status
)
SELECT 
    'TRAINING_AGGREGATE',
    'ren_luyen',
    rl.id,
    'AGGREGATE_SNAPSHOT_DATA',
    'Bản ghi dữ liệu tổng hợp phái sinh do tiến trình đánh giá tự động sinh ra, trùng lặp với phân hệ monthly_score_accounts',
    jsonb_build_object(
        'source', 'ren_luyen',
        'nguoiDanhGia', rl.nguoi_danh_gia,
        'ngayDanhGia', rl.ngay_danh_gia,
        'nhanXet', rl.nhan_xet,
        'diemRL', rl.diem_rl,
        'thang', rl.thang,
        'nam', rl.nam
    ),
    -- Đếm số lượng quan hệ phụ thuộc trong audit_logs hoặc sinh_vien
    (SELECT COUNT(*) FROM audit_logs al WHERE al.details ILIKE '%' || rl.id || '%' OR al.target ILIKE '%' || rl.ma_sv || '%'),
    'TRANSFER_RELATION_THEN_ARCHIVE',
    'PENDING_REVIEW'
FROM ren_luyen rl
WHERE rl.nguoi_danh_gia = 'Hệ thống Quản lý Rèn luyện TDNU'
   OR rl.id LIKE 'rl-SV%'
ON CONFLICT (table_name, record_id) DO UPDATE 
SET evidence_json = EXCLUDED.evidence_json;

-- ============================================================================
-- BƯỚC 3: CHUYỂN QUAN HỆ SANG NGUỒN CHUẨN (DEPENDENCY REMAPPING)
-- ============================================================================

-- Ghi nhận ánh xạ quan hệ vào id_mapping để bảo toàn khả năng truy vết
INSERT INTO id_mapping (
    entity_type,
    source_table,
    source_id,
    canonical_table,
    canonical_id,
    mapping_reason,
    migration_status
)
SELECT 
    'TRAINING_SCORE',
    'ren_luyen',
    rl.id,
    'monthly_score_accounts',
    'acc-' || rl.ma_sv || '-' || rl.thang || '-' || rl.nam,
    'Chuyển quan hệ từ bản ghi tổng hợp cũ sang tài khoản điểm tháng chuẩn',
    'MIGRATED'
FROM ren_luyen rl
ON CONFLICT (entity_type, source_table, source_id) DO UPDATE
SET canonical_id = EXCLUDED.canonical_id, migrated_at = NOW();

-- Chuyển dữ liệu điểm rèn luyện sang phân hệ canonical monthly_score_accounts nếu chưa tồn tại
INSERT INTO monthly_score_accounts (
    id,
    student_code,
    student_name,
    class_name,
    month_id,
    total_score,
    status
)
SELECT 
    'acc-' || rl.ma_sv || '-' || rl.thang || '-' || rl.nam,
    rl.ma_sv,
    rl.ho_ten_sv,
    rl.lop,
    'm-' || rl.nam || '-' || LPAD(rl.thang::text, 2, '0'),
    rl.diem_rl,
    'LOCKED'
FROM ren_luyen rl
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BƯỚC 4: ARCHIVE BẢN GHI SANG BẢNG LƯU TRỮ TRƯỚC KHI THỰC HIỆN XÓA
-- ============================================================================

INSERT INTO archived_ren_luyen (
    id, ma_sv, ho_ten_sv, lop, thang, nam, nam_hoc,
    diem_rl, xep_loai, nhan_xet, nguoi_danh_gia, ngay_danh_gia,
    diem_muc_1, diem_muc_2, diem_muc_3, hoc_ky, archive_reason
)
SELECT 
    rl.id, rl.ma_sv, rl.ho_ten_sv, rl.lop, rl.thang, rl.nam, rl.nam_hoc,
    rl.diem_rl, rl.xep_loai, rl.nhan_xet, rl.nguoi_danh_gia, rl.ngay_danh_gia,
    rl.diem_muc_1, rl.diem_muc_2, rl.diem_muc_3, rl.hoc_ky,
    'Đã chuyển quan hệ sang monthly_score_accounts và lưu trữ bảo tồn'
FROM ren_luyen rl
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BƯỚC 5: TRUY VẤN XÓA CÓ ĐIỀU KIỆN (CHỈ CHẠY KHI ĐƯỢC PHÊ DUYỆT)
-- LƯU Ý QUAN TRỌNG: Câu lệnh DELETE bên dưới chỉ được kích hoạt khi:
-- 1. Bản ghi đã được sao lưu vào archived_ren_luyen
-- 2. Bản ghi đã được duyệt trong data_cleanup_approved
-- ============================================================================

-- BƯỚC NÀY TẠM THỜI ĐỂ LẠI Ở TRẠNG THÁI KIỂM KÊ VÀ BẢO TỒN.
-- DELETE FROM ren_luyen 
-- WHERE id IN (SELECT record_id FROM data_cleanup_approved WHERE table_name = 'ren_luyen' AND approved_action = 'DELETE');

COMMIT;
