-- ============================================================================
-- File: scripts/migration/10_execute_approved_cleanup.sql
-- Purpose: Xóa các bản ghi dữ liệu tổng hợp đã được backup, chuyển quan hệ và archive
--          CHỈ CHẠY KHI ĐÃ CÓ PHÊ DUYỆT CỤ THỂ TỪ QUẢN TRỊ VIÊN
-- Database: PostgreSQL
-- Data modification: Yes (Xóa có kiểm soát theo danh sách ID xác nhận)
-- Rollback supported: Yes (Có thể phục hồi từ archived_ren_luyen hoặc backup)
-- Allowed environments: Development, Staging, Production (Sau phê duyệt)
-- ============================================================================

BEGIN;

-- 1. KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT (PRE-CONDITION CHECK)
-- Đảm bảo toàn bộ 5 bản ghi đều đã tồn tại trong kho lưu trữ archived_ren_luyen
DO $$
DECLARE
    v_archived_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_archived_count 
    FROM archived_ren_luyen 
    WHERE id IN (
        'rl-SV001-11-2026',
        'rl-SV002-11-2026',
        'rl-SV003-11-2026',
        'rl-SV004-11-2026',
        'rl-SV005-11-2026'
    );

    IF v_archived_count < 5 THEN
        RAISE EXCEPTION 'An toàn bị từ chối: Chưa đủ 5 bản ghi trong kho archived_ren_luyen (tìm thấy % bản ghi). Không được xóa!', v_archived_count;
    END IF;
END $$;

-- 2. ĐÁNH DẤU PHÊ DUYỆT VÀO BẢNG STAGING
INSERT INTO data_cleanup_approved (candidate_id, table_name, record_id, approved_action, approved_by)
SELECT 
    c.id, 
    c.table_name, 
    c.record_id, 
    'CLEANUP_AFTER_ARCHIVE', 
    'ADMIN_USER'
FROM data_cleanup_candidates c
WHERE c.table_name = 'ren_luyen' 
  AND c.record_id IN (
    'rl-SV001-11-2026',
    'rl-SV002-11-2026',
    'rl-SV003-11-2026',
    'rl-SV004-11-2026',
    'rl-SV005-11-2026'
  )
ON CONFLICT DO NOTHING;

-- 3. XÓA CÓ ĐIỀU KIỆN THEO DANH SÁCH ID ĐÃ DUYỆT (DELETE BY CONFIRMED IDS)
DELETE FROM ren_luyen
WHERE id IN (
    'rl-SV001-11-2026',
    'rl-SV002-11-2026',
    'rl-SV003-11-2026',
    'rl-SV004-11-2026',
    'rl-SV005-11-2026'
);

-- 4. GHI NHẬN NHẬT KÝ AUDIT LOG
INSERT INTO audit_logs (id, timestamp, "user", role, action, target, details, status, ip, created_at)
VALUES (
    'LOG-CLEANUP-' || EXTRACT(EPOCH FROM NOW())::bigint,
    TO_CHAR(NOW(), 'HH24:MI:SS DD/MM/YYYY'),
    'admin',
    'ADMIN',
    'CLEANUP_AGGREGATE_DATA',
    'Bảng ren_luyen (Dữ liệu tổng hợp cũ)',
    'Đã xóa 5 bản ghi rèn luyện cũ sau khi đã backup, chuyển quan hệ sang monthly_score_accounts và lưu trữ vĩnh viễn trong archived_ren_luyen',
    'SUCCESS',
    '127.0.0.1',
    NOW()::text
);

-- 5. ĐỐI CHIẾU SỐ LƯỢNG SAU KHI DỌN
SELECT 'ren_luyen_remaining_count' AS metric, COUNT(*) AS count FROM ren_luyen
UNION ALL
SELECT 'archived_ren_luyen_count', COUNT(*) FROM archived_ren_luyen
UNION ALL
SELECT 'monthly_score_accounts_count', COUNT(*) FROM monthly_score_accounts;

COMMIT;
