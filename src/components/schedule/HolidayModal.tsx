import React, { useState, useEffect, useId } from 'react';
import { NghiLe } from '../../types';
import { apiService } from '../../services/apiService';
import { Calendar, Trash2, Edit3, X, CheckCircle2, Plus } from 'lucide-react';
import { ConfirmDialog, EmptyState, LoadingState, StatusBadge } from '../common';

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableClasses?: string[];
  currentClass?: string;
  currentSemester?: string;
  currentNamHoc?: string;
  availableSemesters?: { id: string; name: string }[];
  availableNamHoc?: string[];
  onSuccess?: () => void;
  showToast: (msg: string) => void;
  editingHolidayItem?: NghiLe | null;
}

const COMMON_HOLIDAYS_PRESETS = [
  { label: 'Lễ Quốc khánh 02/09', name: 'Nghỉ lễ Quốc khánh 02/09', days: 2, defaultMonthDay: '09-01' },
  { label: 'Tết Nguyên Đán', name: 'Nghỉ Tết Nguyên Đán', days: 7 },
  { label: 'Tết Dương lịch 01/01', name: 'Nghỉ Tết Dương lịch 01/01', days: 1, defaultMonthDay: '01-01' },
  { label: 'Lễ 30/4 & 01/05', name: 'Nghỉ lễ 30/4 & 01/05', days: 2, defaultMonthDay: '04-30' },
  { label: 'Giỗ Tổ Hùng Vương', name: 'Nghỉ Giỗ Tổ Hùng Vương', days: 1 },
  { label: 'Nghỉ Hè / Giữa kỳ', name: 'Nghỉ Hè / Hoạt động ngoại khóa', days: 7 },
];

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  onClose,
  availableClasses = [],
  currentClass = 'ALL',
  currentSemester = 'ALL',
  currentNamHoc = 'ALL',
  availableSemesters = [],
  availableNamHoc = [],
  onSuccess,
  showToast,
  editingHolidayItem = null,
}) => {
  const titleId = useId();
  const [holidays, setHolidays] = useState<NghiLe[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NghiLe | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [dipLe, setDipLe] = useState('');
  const [tuNgay, setTuNgay] = useState(todayStr);
  const [denNgay, setDenNgay] = useState(todayStr);
  const [ghiChu, setGhiChu] = useState('');
  const [lop, setLop] = useState(currentClass || 'ALL');
  const [hocKy, setHocKy] = useState(currentSemester !== 'ALL' ? currentSemester : 'ALL');
  const [namHoc, setNamHoc] = useState(currentNamHoc !== 'ALL' ? currentNamHoc : 'ALL');

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const res = await apiService.getHolidays();
      if (res.success && Array.isArray(res.data)) {
        setHolidays(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDipLe('');
    const today = new Date().toISOString().split('T')[0];
    setTuNgay(today);
    setDenNgay(today);
    setGhiChu('');
    setLop(currentClass || 'ALL');
    setHocKy(currentSemester !== 'ALL' ? currentSemester : 'ALL');
    setNamHoc(currentNamHoc !== 'ALL' ? currentNamHoc : 'ALL');
  };

  useEffect(() => {
    if (!isOpen) return;
    loadHolidays();
    if (editingHolidayItem) {
      setEditingId(editingHolidayItem.id);
      setDipLe(editingHolidayItem.dipLe);
      setTuNgay(editingHolidayItem.tuNgay);
      setDenNgay(editingHolidayItem.denNgay);
      setGhiChu(editingHolidayItem.ghiChu || '');
      setLop(editingHolidayItem.lop || 'ALL');
      setHocKy(editingHolidayItem.hocKy || 'ALL');
      setNamHoc(editingHolidayItem.namHoc || 'ALL');
    } else {
      resetForm();
    }
  }, [isOpen, editingHolidayItem]);

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

  const handleApplyPreset = (preset: (typeof COMMON_HOLIDAYS_PRESETS)[0]) => {
    setDipLe(preset.name);
    const currentYear = new Date().getFullYear();
    if (preset.defaultMonthDay) {
      const start = `${currentYear}-${preset.defaultMonthDay}`;
      const startDate = new Date(start);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (preset.days - 1));
      setTuNgay(start);
      setDenNgay(endDate.toISOString().split('T')[0]);
    } else {
      const startDate = new Date(tuNgay || todayStr);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + (preset.days - 1));
      setDenNgay(endDate.toISOString().split('T')[0]);
    }
  };

  const calculateDays = () => {
    if (!tuNgay || !denNgay) return 1;
    const start = new Date(tuNgay);
    const end = new Date(denNgay);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dipLe.trim()) {
      showToast('Vui lòng nhập tên dịp nghỉ lễ.');
      return;
    }
    if (!tuNgay || !denNgay) {
      showToast('Vui lòng chọn khoảng ngày nghỉ lễ.');
      return;
    }
    if (new Date(tuNgay) > new Date(denNgay)) {
      showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    try {
      const payload: Partial<NghiLe> = {
        dipLe: dipLe.trim(),
        tuNgay: tuNgay.trim(),
        denNgay: denNgay.trim(),
        ghiChu: ghiChu.trim(),
        lop: lop || 'ALL',
        hocKy: hocKy || 'ALL',
        namHoc: namHoc || 'ALL',
      };

      if (editingId) {
        const res = await apiService.updateHoliday(editingId, payload);
        showToast(res.success ? `Đã cập nhật lịch nghỉ lễ "${dipLe}".` : 'Cập nhật nghỉ lễ thất bại.');
      } else {
        const res = await apiService.createHoliday(payload);
        showToast(res.success ? `Đã thêm lịch nghỉ lễ "${dipLe}".` : 'Thêm lịch nghỉ lễ thất bại.');
      }

      await loadHolidays();
      resetForm();
      if (onSuccess) onSuccess();
    } catch {
      showToast('Có lỗi xảy ra khi lưu lịch nghỉ lễ.');
    }
  };

  const handleEditItem = (item: NghiLe) => {
    setEditingId(item.id);
    setDipLe(item.dipLe);
    setTuNgay(item.tuNgay);
    setDenNgay(item.denNgay);
    setGhiChu(item.ghiChu || '');
    setLop(item.lop || 'ALL');
    setHocKy(item.hocKy || 'ALL');
    setNamHoc(item.namHoc || 'ALL');
  };

  const totalDays = calculateDays();

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 id={titleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {editingId ? 'Chỉnh sửa lịch nghỉ lễ' : 'Lịch nghỉ lễ'}
            </h3>
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

        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Mẫu dịp nghỉ lễ:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_HOLIDAYS_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-md border border-slate-200 dark:border-slate-800"
          >
            <div>
              <label htmlFor="holiday-name-input" className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                Tên dịp nghỉ lễ *
              </label>
              <input
                id="holiday-name-input"
                type="text"
                value={dipLe}
                onChange={(e) => setDipLe(e.target.value)}
                placeholder="Nhập tên dịp nghỉ lễ"
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                required
              />
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Khoảng ngày nghỉ *</span>
                <StatusBadge label={`${totalDays} ngày`} variant="success" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="holiday-from-date" className="font-medium block mb-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    Từ ngày
                  </label>
                  <input
                    id="holiday-from-date"
                    type="date"
                    value={tuNgay}
                    onChange={(e) => {
                      setTuNgay(e.target.value);
                      if (new Date(e.target.value) > new Date(denNgay)) {
                        setDenNgay(e.target.value);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="holiday-to-date" className="font-medium block mb-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    Đến ngày
                  </label>
                  <input
                    id="holiday-to-date"
                    type="date"
                    value={denNgay}
                    min={tuNgay}
                    onChange={(e) => setDenNgay(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="holiday-lop" className="font-medium block mb-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  Lớp áp dụng
                </label>
                <select
                  id="holiday-lop"
                  value={lop}
                  onChange={(e) => setLop(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                >
                  <option value="ALL">Tất cả lớp</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="holiday-hocky" className="font-medium block mb-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  Học kỳ
                </label>
                <select
                  id="holiday-hocky"
                  value={hocKy}
                  onChange={(e) => setHocKy(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                >
                  <option value="ALL">Tất cả học kỳ</option>
                  {availableSemesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="holiday-namhoc" className="font-medium block mb-1 text-slate-600 dark:text-slate-300 text-[11px]">
                  Năm học
                </label>
                <select
                  id="holiday-namhoc"
                  value={namHoc}
                  onChange={(e) => setNamHoc(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-slate-100"
                >
                  <option value="ALL">Tất cả năm học</option>
                  {availableNamHoc.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="holiday-ghichu" className="font-medium block mb-1 text-slate-600 dark:text-slate-300 text-[11px]">
                Ghi chú
              </label>
              <textarea
                id="holiday-ghichu"
                rows={2}
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded font-medium cursor-pointer"
                >
                  Hủy sửa
                </button>
              )}
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer"
              >
                {editingId ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lưu cập nhật</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm lịch nghỉ lễ</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 block">
              Danh sách nghỉ lễ ({holidays.length})
            </span>

            {loading ? (
              <LoadingState rows={3} />
            ) : holidays.length === 0 ? (
              <EmptyState message="Chưa có dữ liệu." />
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {h.dipLe}
                        </span>
                        <StatusBadge
                          label={h.tuNgay === h.denNgay ? h.tuNgay : `${h.tuNgay} → ${h.denNgay}`}
                          variant="success"
                        />
                        {h.lop && h.lop !== 'ALL' && <StatusBadge label={h.lop} variant="info" />}
                      </div>
                      {h.ghiChu && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{h.ghiChu}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditItem(h)}
                        aria-label={`Sửa ${h.dipLe}`}
                        title="Sửa"
                        className="p-1.5 text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(h)}
                        aria-label={`Xóa ${h.dipLe}`}
                        title="Xóa"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xác nhận xóa lịch nghỉ lễ"
        message={`Bạn có chắc chắn muốn xóa lịch nghỉ lễ "${deleteTarget?.dipLe || ''}"?`}
        confirmLabel="Xóa"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            const res = await apiService.deleteHoliday(deleteTarget.id);
            if (res.success) {
              showToast(`Đã xóa lịch nghỉ lễ "${deleteTarget.dipLe}".`);
              await loadHolidays();
              if (editingId === deleteTarget.id) resetForm();
              if (onSuccess) onSuccess();
            } else {
              showToast('Xóa nghỉ lễ thất bại.');
            }
          } catch {
            showToast('Không thể xóa lịch nghỉ lễ này.');
          } finally {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
