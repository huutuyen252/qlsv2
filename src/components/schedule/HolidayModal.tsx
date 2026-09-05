import React, { useState, useEffect } from 'react';
import { NghiLe } from '../../types';
import { apiService } from '../../services/apiService';
import { Sparkles, Calendar, Trash2, Edit3, X, CheckCircle2, Info, Plus } from 'lucide-react';

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
  { label: '🇻🇳 Lễ Quốc khánh 02/09', name: 'Nghỉ lễ Quốc khánh 02/09', days: 2, defaultMonthDay: '09-01' },
  { label: '🌸 Tết Nguyên Đán', name: 'Nghỉ Tết Nguyên Đán', days: 7 },
  { label: '🎆 Tết Dương lịch 01/01', name: 'Nghỉ Tết Dương lịch 01/01', days: 1, defaultMonthDay: '01-01' },
  { label: '🎖️ Lễ 30/4 & 01/05', name: 'Nghỉ lễ Giải phóng miền Nam 30/4 & Quốc tế Lao động 1/5', days: 2, defaultMonthDay: '04-30' },
  { label: '👑 Giỗ Tổ Hùng Vương (10/3 AL)', name: 'Nghỉ Giỗ Tổ Hùng Vương', days: 1 },
  { label: '🏖️ Nghỉ Hè / Giữa kỳ', name: 'Nghỉ Hè / Hoạt động ngoại khóa', days: 7 },
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
  const [holidays, setHolidays] = useState<NghiLe[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
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

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, editingHolidayItem]);

  const resetForm = () => {
    setEditingId(null);
    setDipLe('');
    setTuNgay(new Date().toISOString().split('T')[0]);
    setDenNgay(new Date().toISOString().split('T')[0]);
    setGhiChu('');
    setLop(currentClass || 'ALL');
    setHocKy(currentSemester !== 'ALL' ? currentSemester : 'ALL');
    setNamHoc(currentNamHoc !== 'ALL' ? currentNamHoc : 'ALL');
  };

  const handleApplyPreset = (preset: typeof COMMON_HOLIDAYS_PRESETS[0]) => {
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
    setGhiChu(`Sinh viên được nghỉ học dịp ${preset.name} theo kế hoạch đào tạo của Nhà trường.`);
  };

  // Calculate day count
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
      showToast('Vui lòng nhập tên dịp nghỉ lễ!');
      return;
    }
    if (!tuNgay || !denNgay) {
      showToast('Vui lòng chọn khoảng ngày nghỉ lễ!');
      return;
    }
    if (new Date(tuNgay) > new Date(denNgay)) {
      showToast('Ngày bắt đầu không được lớn hơn ngày kết thúc!');
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
        if (res.success) {
          showToast(`Đã cập nhật lịch nghỉ lễ "${dipLe}"!`);
        } else {
          showToast('Cập nhật nghỉ lễ thất bại');
        }
      } else {
        const res = await apiService.createHoliday(payload);
        if (res.success) {
          showToast(`Đã thêm mới lịch nghỉ lễ "${dipLe}"!`);
        } else {
          showToast('Thêm lịch nghỉ lễ thất bại');
        }
      }

      await loadHolidays();
      resetForm();
      if (onSuccess) onSuccess();
    } catch {
      showToast('Có lỗi xảy ra khi lưu lịch nghỉ lễ');
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

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lịch nghỉ lễ "${name}"?`)) return;
    try {
      const res = await apiService.deleteHoliday(id);
      if (res.success) {
        showToast(`Đã xóa lịch nghỉ lễ "${name}"!`);
        await loadHolidays();
        if (editingId === id) resetForm();
        if (onSuccess) onSuccess();
      } else {
        showToast('Xóa nghỉ lễ thất bại');
      }
    } catch {
      showToast('Không thể xóa lịch nghỉ lễ này');
    }
  };

  if (!isOpen) return null;

  const totalDays = calculateDays();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center p-4 pt-16 sm:pt-20 pb-6 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 mb-4 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              {editingId ? 'Chỉnh Sửa Lịch Nghỉ Lễ / Tết' : 'Thêm Lịch Nghỉ Lễ / Tết'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Cấu hình các dịp nghỉ lễ theo khoảng ngày (tự động áp dụng toàn bộ các tiết học)
            </p>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
          {/* Preset Chips */}
          <div>
            <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5 flex items-center gap-1.5">
              <span>Gợi ý nhanh dịp nghỉ lễ:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_HOLIDAYS_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <div>
              <label className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                Dịp nghỉ lễ / Tên kỳ nghỉ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dipLe}
                onChange={(e) => setDipLe(e.target.value)}
                placeholder="Ví dụ: Nghỉ lễ Quốc khánh 02/09, Nghỉ Tết Nguyên Đán Giáp Thìn..."
                className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                required
              />
            </div>

            {/* Date Range Selection */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Khoảng ngày nghỉ lễ (Không cần chọn tiết) <span className="text-red-500">*</span>:</span>
                </label>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  {totalDays} ngày nghỉ
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                    Từ ngày:
                  </label>
                  <input
                    type="date"
                    value={tuNgay}
                    onChange={(e) => {
                      setTuNgay(e.target.value);
                      if (new Date(e.target.value) > new Date(denNgay)) {
                        setDenNgay(e.target.value);
                      }
                    }}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                    Đến hết ngày:
                  </label>
                  <input
                    type="date"
                    value={denNgay}
                    min={tuNgay}
                    onChange={(e) => setDenNgay(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold text-xs"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 pt-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Nghỉ lễ áp dụng toàn bộ ngày (các tiết sáng và chiều đều nghỉ), không phải chọn từng tiết học.
                </span>
              </div>
            </div>

            {/* Scope: Class, Semester, Academic Year */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="font-semibold block mb-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                  Lớp áp dụng:
                </label>
                <select
                  value={lop}
                  onChange={(e) => setLop(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold"
                >
                  <option value="ALL">Toàn trường (Tất cả lớp)</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      Lớp {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                  Học kỳ:
                </label>
                <select
                  value={hocKy}
                  onChange={(e) => setHocKy(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold"
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
                <label className="font-semibold block mb-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                  Năm học:
                </label>
                <select
                  value={namHoc}
                  onChange={(e) => setNamHoc(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold"
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

            {/* Note */}
            <div>
              <label className="font-semibold block mb-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                Ghi chú / Thông báo cho sinh viên:
              </label>
              <textarea
                rows={2}
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="VD: Sinh viên toàn trường nghỉ học theo quy định. Chúc các đồng chí kỳ nghỉ lễ an toàn, vui vẻ!"
                className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy sửa
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {editingId ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu Cập Nhật Nghỉ Lễ</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Thêm Kỳ Nghỉ Lễ</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* List of holidays */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-800 dark:text-zinc-200">
                Danh sách các dịp nghỉ lễ đã thêm ({holidays.length}):
              </label>
            </div>

            {loading ? (
              <div className="text-center py-4 text-zinc-400">Đang tải dữ liệu nghỉ lễ...</div>
            ) : holidays.length === 0 ? (
              <div className="p-4 text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-800 italic">
                Chưa có lịch nghỉ lễ nào được lưu. Bạn có thể chọn gợi ý bên trên hoặc nhập thông tin để thêm mới.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-zinc-900 dark:text-white truncate">
                          🎉 {h.dipLe}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                          {h.tuNgay === h.denNgay ? h.tuNgay : `${h.tuNgay} → ${h.denNgay}`}
                        </span>
                        {h.lop && h.lop !== 'ALL' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                            Lớp {h.lop}
                          </span>
                        )}
                      </div>
                      {h.ghiChu && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {h.ghiChu}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditItem(h)}
                        title="Sửa kỳ nghỉ"
                        className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(h.id, h.dipLe)}
                        title="Xóa kỳ nghỉ"
                        className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg cursor-pointer transition-colors"
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

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
