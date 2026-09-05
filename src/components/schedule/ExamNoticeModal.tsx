import React, { useEffect, useState } from 'react';
import { ThongBaoKiemTra, ThoiKhoaBieu, UserRole } from '../../types';
import {
  X,
  BellRing,
  Calendar,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';

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
  userRole = 'LECTURER',
  currentUserFullName = '',
  defaultMaMH = '',
  defaultNgayKiemTra = '',
  defaultThuKiemTra = 2,
  onSaveNotice,
  onDeleteNotice,
}) => {
  // Available unique subjects from schedule
  const availableSubjects = Array.from(
    new Set(schedule.map((s) => s.maMH))
  ).map((maMH) => {
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

  useEffect(() => {
    if (!isOpen) return;
    setFormMaMH(defaultMaMH || availableSubjects[0]?.maMH || '');
    setFormNgayKiemTra(defaultNgayKiemTra);
    setFormThuKiemTra(defaultThuKiemTra);
  }, [isOpen, defaultMaMH, defaultNgayKiemTra, defaultThuKiemTra, schedule]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaMH || !formTieuDe || !formNoiDung) {
      alert('Vui lòng nhập đầy đủ Mã môn học, Tiêu đề và Nội dung kiểm tra!');
      return;
    }

    const selectedMhObj = availableSubjects.find((s) => s.maMH === formMaMH);

    await onSaveNotice({
      maMH: formMaMH,
      tenMH: selectedMhObj?.tenMH || formMaMH,
      loai: formLoai,
      tieuDe: formTieuDe,
      noiDung: formNoiDung,
      ngayKiemTra: formNgayKiemTra,
      tuanKiemTra: Number(formTuanKiemTra) || 1,
      thuKiemTra: Number(formThuKiemTra) || 2,
      giangVienTao: currentUserFullName || 'Giảng viên bộ môn',
    });

    // Reset fields
    setFormTieuDe('');
    setFormNoiDung('');
    alert('Đăng thông báo kiểm tra lên thời khóa biểu thành công!');
  };

  const filteredNotices = examNotices.filter((n) => {
    if (formMaMH) return n.maMH === formMaMH;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-900 via-orange-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-400/30 text-amber-300">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Đăng Thông Báo Lịch Kiểm Tra Trên TKB</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create Form */}
          <form onSubmit={handleSubmit} className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" />
              Tạo Thông Báo Kiểm Tra Mới
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Môn Học Đảm Nhận <span className="text-red-500">*</span>
                </label>
                <select
                  value={formMaMH}
                  onChange={(e) => setFormMaMH(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Chọn Môn Học --</option>
                  {availableSubjects.map((s) => (
                    <option key={s.maMH} value={s.maMH}>
                      {s.maMH} - {s.tenMH}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Loại Bài Kiểm Tra <span className="text-red-500">*</span>
                </label>
                <select
                  value={formLoai}
                  onChange={(e) => setFormLoai(e.target.value as any)}
                  required
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-amber-500 font-semibold"
                >
                  <option value="15_PHUT">⚡ Kiểm Tra 15 Phút</option>
                  <option value="GIUA_KY">📝 Kiểm Tra Giữa Kỳ</option>
                  <option value="CUOI_KY">🎓 Kiểm Tra / Bài Thi Cuối Kỳ</option>
                  <option value="THONG_BAO">📌 Thông Báo Nhắc Nhở Bài Tập</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tiêu Đề Thông Báo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Kiểm tra 15 phút Chương 2: Ma Trận"
                value={formTieuDe}
                onChange={(e) => setFormTieuDe(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tuần Kiểm Tra <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  placeholder="Ví dụ: 1"
                  value={formTuanKiemTra}
                  onChange={(e) => setFormTuanKiemTra(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-amber-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thứ Kiểm Tra <span className="text-red-500">*</span>
                </label>
                <select
                    value={formThuKiemTra}
                  onChange={(e) => setFormThuKiemTra(Number(e.target.value))}
                    disabled={Boolean(defaultNgayKiemTra)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-amber-500 font-bold"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ngày Kiểm Tra (Cụ thể)
                </label>
                <input
                  type="date"
                  value={formNgayKiemTra}
                  onChange={(e) => setFormNgayKiemTra(e.target.value)}
                  readOnly={Boolean(defaultNgayKiemTra)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-amber-500 font-medium read-only:bg-slate-100 read-only:cursor-not-allowed dark:read-only:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nội Dung Chi Tiết & Yêu Cầu Chuẩn Bị <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Đề thi gồm 15 câu trắc nghiệm. Sinh viên mang theo máy tính Casio, không sử dụng tài liệu."
                value={formNoiDung}
                onChange={(e) => setFormNoiDung(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2"
              >
                <BellRing className="w-4 h-4" />
                Đăng Thông Báo Lên TKB
              </button>
            </div>
          </form>

          {/* List of Existing Notices */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              Danh Sách Thông Báo Kiểm Tra Đã Đăng ({filteredNotices.length})
            </h3>

            {filteredNotices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                Chưa có thông báo kiểm tra nào cho môn học này.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotices.map((notice) => {
                  const is15m = notice.loai === '15_PHUT';
                  const isGiuaKy = notice.loai === 'GIUA_KY';

                  return (
                    <div
                      key={notice.id}
                      className={`p-4 rounded-2xl border text-xs relative flex items-start justify-between gap-4 transition-all ${
                        is15m
                          ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                          : isGiuaKy
                          ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800'
                          : 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              is15m
                                ? 'bg-amber-500 text-white'
                                : isGiuaKy
                                ? 'bg-purple-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {is15m
                              ? '⚡ Kiểm tra 15 phút'
                              : isGiuaKy
                              ? '📝 Kiểm tra Giữa kỳ'
                              : notice.loai === 'CUOI_KY'
                              ? '🎓 Kiểm tra Cuối kỳ'
                              : '📌 Nhắc nhở'}
                          </span>

                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {notice.tieuDe}
                          </span>

                          <span className="text-slate-500 dark:text-slate-400 font-semibold">
                            ({notice.tenMH} - {notice.maMH})
                          </span>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                          {notice.noiDung}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          {notice.tuanKiemTra && (
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              Dự kiến: Tuần {notice.tuanKiemTra}
                            </span>
                          )}
                          {notice.ngayKiemTra && (
                            <span>Ngày kiểm tra: {notice.ngayKiemTra}</span>
                          )}
                          {notice.giangVienTao && (
                            <span>Tạo bởi: {notice.giangVienTao}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteNotice(notice.id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                        title="Xóa thông báo này khỏi thời khóa biểu"
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
    </div>
  );
};
