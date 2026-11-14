import React, { useEffect, useState, useId } from 'react';
import { ThongBaoKiemTra, ThoiKhoaBieu, UserRole } from '../../types';
import { X, BellRing, Plus, Trash2, FileText } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorBanner, StatusBadge } from '../common';

interface ExamNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  examNotices: ThongBaoKiemTra[];
  schedule: ThoiKhoaBieu[];
  userRole?: UserRole;
  currentUserFullName?: string;
  defaultMaMH?: string;
  defaultNgayKiemTra?: string;
  defaultThuKiemTra?: number;
  onSaveNotice: (notice: Partial<ThongBaoKiemTra>) => Promise<void> | void;
  onDeleteNotice: (id: string) => Promise<void> | void;
}

export const ExamNoticeModal: React.FC<ExamNoticeModalProps> = ({
  isOpen,
  onClose,
  examNotices,
  schedule,
  currentUserFullName = '',
  defaultMaMH = '',
  defaultNgayKiemTra = '',
  defaultThuKiemTra = 2,
  onSaveNotice,
  onDeleteNotice,
}) => {
  const titleId = useId();
  const availableSubjects = Array.from(new Set(schedule.map((s) => s.maMH))).map((maMH) => {
    const item = schedule.find((s) => s.maMH === maMH);
    return {
      maMH,
      tenMH: item?.tenMH || maMH,
      giangVien: item?.giangVien || '',
    };
  });

  const [formMaMH, setFormMaMH] = useState<string>(defaultMaMH || availableSubjects[0]?.maMH || '');
  const [formLoai, setFormLoai] = useState<'15_PHUT' | 'GIUA_KY' | 'CUOI_KY' | 'THONG_BAO'>('15_PHUT');
  const [formTieuDe, setFormTieuDe] = useState<string>('');
  const [formNoiDung, setFormNoiDung] = useState<string>('');
  const [formNgayKiemTra, setFormNgayKiemTra] = useState<string>('');
  const [formTuanKiemTra, setFormTuanKiemTra] = useState<number>(1);
  const [formThuKiemTra, setFormThuKiemTra] = useState<number>(2);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ThongBaoKiemTra | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormMaMH(defaultMaMH || availableSubjects[0]?.maMH || '');
    setFormNgayKiemTra(defaultNgayKiemTra);
    setFormThuKiemTra(defaultThuKiemTra);
    setFormError(null);
    setStatusMessage(null);
  }, [isOpen, defaultMaMH, defaultNgayKiemTra, defaultThuKiemTra, schedule]);

  useEffect(() => {
    if (!isOpen || deleteTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deleteTarget, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setStatusMessage(null);

    if (!formMaMH || !formTieuDe.trim() || !formNoiDung.trim()) {
      setFormError('Vui lòng nhập đầy đủ môn học, tiêu đề và nội dung kiểm tra.');
      return;
    }

    const selectedMhObj = availableSubjects.find((s) => s.maMH === formMaMH);

    await onSaveNotice({
      maMH: formMaMH,
      tenMH: selectedMhObj?.tenMH || formMaMH,
      loai: formLoai,
      tieuDe: formTieuDe.trim(),
      noiDung: formNoiDung.trim(),
      ngayKiemTra: formNgayKiemTra,
      tuanKiemTra: Number(formTuanKiemTra) || 1,
      thuKiemTra: Number(formThuKiemTra) || 2,
      giangVienTao: currentUserFullName || 'Giảng viên bộ môn',
    });

    setFormTieuDe('');
    setFormNoiDung('');
    setStatusMessage('Đã đăng thông báo kiểm tra lên thời khóa biểu.');
  };

  const filteredNotices = examNotices.filter((n) => {
    if (formMaMH) return n.maMH === formMaMH;
    return true;
  });

  const getNoticeBadge = (loai: ThongBaoKiemTra['loai']) => {
    switch (loai) {
      case '15_PHUT':
        return { label: 'Kiểm tra 15 phút', variant: 'warning' as const };
      case 'GIUA_KY':
        return { label: 'Kiểm tra Giữa kỳ', variant: 'info' as const };
      case 'CUOI_KY':
        return { label: 'Kiểm tra Cuối kỳ', variant: 'danger' as const };
      default:
        return { label: 'Thông báo', variant: 'neutral' as const };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 id={titleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Thông báo lịch kiểm tra
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {formError && <ErrorBanner message={formError} />}
          {statusMessage && (
            <div
              role="status"
              className="p-2.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-medium"
            >
              {statusMessage}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3"
          >
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Tạo thông báo mới</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="exam-notice-mamh" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Môn học *
                </label>
                <select
                  id="exam-notice-mamh"
                  value={formMaMH}
                  onChange={(e) => setFormMaMH(e.target.value)}
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 focus:border-blue-600 focus:outline-none"
                >
                  <option value="">-- Chọn môn học --</option>
                  {availableSubjects.map((s) => (
                    <option key={s.maMH} value={s.maMH}>
                      {s.maMH} - {s.tenMH}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="exam-notice-loai" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Loại kiểm tra *
                </label>
                <select
                  id="exam-notice-loai"
                  value={formLoai}
                  onChange={(e) => setFormLoai(e.target.value as any)}
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 font-medium focus:border-blue-600 focus:outline-none"
                >
                  <option value="15_PHUT">Kiểm tra 15 phút</option>
                  <option value="GIUA_KY">Kiểm tra Giữa kỳ</option>
                  <option value="CUOI_KY">Kiểm tra / Thi Cuối kỳ</option>
                  <option value="THONG_BAO">Thông báo bài tập</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="exam-notice-title" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Tiêu đề *
              </label>
              <input
                id="exam-notice-title"
                type="text"
                placeholder="Nhập tiêu đề thông báo"
                value={formTieuDe}
                onChange={(e) => setFormTieuDe(e.target.value)}
                required
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="exam-notice-tuan" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Tuần *
                </label>
                <input
                  id="exam-notice-tuan"
                  type="number"
                  min={1}
                  max={25}
                  value={formTuanKiemTra}
                  onChange={(e) => setFormTuanKiemTra(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 font-mono tabular-nums font-medium"
                  required
                />
              </div>

              <div>
                <label htmlFor="exam-notice-thu" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Thứ *
                </label>
                <select
                  id="exam-notice-thu"
                  value={formThuKiemTra}
                  onChange={(e) => setFormThuKiemTra(Number(e.target.value))}
                  disabled={Boolean(defaultNgayKiemTra)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 font-medium"
                  required
                >
                  <option value={2}>Thứ 2</option>
                  <option value={3}>Thứ 3</option>
                  <option value={4}>Thứ 4</option>
                  <option value={5}>Thứ 5</option>
                  <option value={6}>Thứ 6</option>
                  <option value={7}>Thứ 7</option>
                </select>
              </div>

              <div>
                <label htmlFor="exam-notice-ngay" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Ngày kiểm tra
                </label>
                <input
                  id="exam-notice-ngay"
                  type="date"
                  value={formNgayKiemTra}
                  onChange={(e) => setFormNgayKiemTra(e.target.value)}
                  readOnly={Boolean(defaultNgayKiemTra)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 font-mono read-only:bg-slate-100 read-only:cursor-not-allowed dark:read-only:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label htmlFor="exam-notice-noidung" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Nội dung *
              </label>
              <textarea
                id="exam-notice-noidung"
                rows={3}
                placeholder="Nhập nội dung kiểm tra và yêu cầu chuẩn bị"
                value={formNoiDung}
                onChange={(e) => setFormNoiDung(e.target.value)}
                required
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer inline-flex items-center gap-1.5"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Đăng thông báo</span>
              </button>
            </div>
          </form>

          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Danh sách thông báo ({filteredNotices.length})</span>
            </h3>

            {filteredNotices.length === 0 ? (
              <EmptyState message="Chưa có dữ liệu." />
            ) : (
              <div className="space-y-2">
                {filteredNotices.map((notice) => {
                  const badge = getNoticeBadge(notice.loai);
                  return (
                    <div
                      key={notice.id}
                      className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge label={badge.label} variant={badge.variant} />
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {notice.tieuDe}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {notice.maMH} - {notice.tenMH}
                          </span>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {notice.noiDung}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap">
                          {notice.tuanKiemTra && <span>Tuần {notice.tuanKiemTra}</span>}
                          {notice.ngayKiemTra && <span>{notice.ngayKiemTra}</span>}
                          {notice.giangVienTao && <span>{notice.giangVienTao}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(notice)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                        aria-label={`Xóa thông báo ${notice.tieuDe}`}
                        title="Xóa thông báo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xác nhận xóa thông báo kiểm tra"
        message={`Bạn có chắc chắn muốn xóa thông báo "${deleteTarget?.tieuDe || ''}" khỏi thời khóa biểu?`}
        confirmLabel="Xóa"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await onDeleteNotice(deleteTarget.id);
          setDeleteTarget(null);
          setStatusMessage('Đã xóa thông báo kiểm tra.');
        }}
      />
    </div>
  );
};
