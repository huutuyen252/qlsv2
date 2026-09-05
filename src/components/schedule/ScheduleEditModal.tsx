import React, { useState, useMemo } from 'react';
import { ThoiKhoaBieu, MonHoc } from '../../types';
import { apiService } from '../../services/apiService';
import { isSubjectMatchingClass } from '../../utils/subjectHelper';
import { Calendar, Edit3, X, Check } from 'lucide-react';
interface ScheduleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ThoiKhoaBieu | null;
  subjects?: MonHoc[];
  onSuccess: (updatedData?: Partial<ThoiKhoaBieu>) => void;
  showToast: (msg: string) => void;
}
export const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({
  isOpen,
  onClose,
  item,
  subjects = [],
  onSuccess,
  showToast,
}) => {
  if (!isOpen || !item) return null;
  const [form, setForm] = useState({
    tenMH: item.tenMH || '',
    maMH: item.maMH || '',
    soTinChi: item.soTinChi || 3,
    giangVien: item.giangVien || '',
    phongHoc: item.phongHoc || '',
    hocKy: item.hocKy || 'HK1',
    namHoc: item.namHoc || '2025-2026',
    lop: item.lop || '',
    tuanTu: item.tuanTu || 1,
    tuanDen: item.tuanDen || 15,
    thu: item.lichHoc && item.lichHoc[0] ? item.lichHoc[0].thu : 2,
    tietBatDau: item.lichHoc && item.lichHoc[0] ? item.lichHoc[0].tietBatDau : 1,
    soTiet: item.lichHoc && item.lichHoc[0] ? item.lichHoc[0].soTiet : 3,
  });

  const [weekMode, setWeekMode] = useState<'range' | 'custom_list'>(
    item.danhSachTuan && item.danhSachTuan.length > 0 ? 'custom_list' : 'range'
  );
  const [selectedCustomWeeks, setSelectedCustomWeeks] = useState<number[]>(
    item.danhSachTuan && item.danhSachTuan.length > 0
      ? item.danhSachTuan
      : Array.from({ length: Math.max(Number(item.tuanDen || 15) - Number(item.tuanTu || 1) + 1, 1) }, (_, i) => Number(item.tuanTu || 1) + i)
  );
  const [customWeekTextInput, setCustomWeekTextInput] = useState<string>(
    item.danhSachTuan && item.danhSachTuan.length > 0 ? item.danhSachTuan.join(', ') : ''
  );
  const [customWeekMaxDisplay, setCustomWeekMaxDisplay] = useState<number>(30);

  const toggleCustomWeek = (w: number) => {
    setSelectedCustomWeeks((prev) => {
      const next = prev.includes(w) ? prev.filter((itemW) => itemW !== w) : [...prev, w].sort((a, b) => a - b);
      setCustomWeekTextInput(next.join(', '));
      return next;
    });
  };

  const handleCustomWeekInput = (val: string) => {
    setCustomWeekTextInput(val);
    const parsed = val
      .split(/[,;\s]+/)
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
    const unique = Array.from(new Set(parsed)).sort((a, b) => a - b);
    setSelectedCustomWeeks(unique);
  };

  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const filteredSubjects = useMemo(() => {
    if (showAllSubjects) return subjects;
    return subjects.filter((s) => isSubjectMatchingClass(s, form.lop || item.lop));
  }, [subjects, form.lop, item.lop, showAllSubjects]);

  const matchedSub = subjects.find(
    (s) => s.maMH.trim().toLowerCase() === form.maMH.trim().toLowerCase()
  );
  const handleMaMHChange = (val: string) => {
    const found = subjects.find((s) => s.maMH.trim().toLowerCase() === val.trim().toLowerCase());
    if (found) {
      setForm((prev) => ({
        ...prev,
        maMH: val,
        tenMH: found.tenMH,
        soTinChi: found.soTinChi !== undefined ? found.soTinChi : prev.soTinChi,
        hocKy: found.hocKy?.trim() ? found.hocKy.trim() : prev.hocKy,
        namHoc: found.namHoc?.trim() ? found.namHoc.trim() : prev.namHoc,
      }));
    } else {
      setForm((prev) => ({ ...prev, maMH: val }));
    }
  };
  const handleSelectSubject = (maMH: string) => {
    const found = subjects.find((s) => s.maMH === maMH);
    if (found) {
      setForm((prev) => ({
        ...prev,
        maMH: found.maMH,
        tenMH: found.tenMH,
        soTinChi: found.soTinChi !== undefined ? found.soTinChi : prev.soTinChi,
        hocKy: found.hocKy?.trim() ? found.hocKy.trim() : prev.hocKy,
        namHoc: found.namHoc?.trim() ? found.namHoc.trim() : prev.namHoc,
      }));
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalWeekList: number[] = [];
      let finalTuanTu = Number(form.tuanTu) || 1;
      let finalTuanDen = Number(form.tuanDen) || 15;

      if (weekMode === 'custom_list') {
        finalWeekList = [...selectedCustomWeeks].sort((a, b) => a - b);
        finalTuanTu = finalWeekList[0] || 1;
        finalTuanDen = finalWeekList[finalWeekList.length - 1] || 15;
      } else {
        const startW = Math.min(finalTuanTu, finalTuanDen);
        const endW = Math.max(finalTuanTu, finalTuanDen);
        for (let w = startW; w <= endW; w++) {
          finalWeekList.push(w);
        }
        finalTuanTu = startW;
        finalTuanDen = endW;
      }

      const updatedPayload: Partial<ThoiKhoaBieu> = {
        tenMH: form.tenMH,
        maMH: form.maMH,
        soTinChi: Number(form.soTinChi),
        giangVien: form.giangVien,
        phongHoc: form.phongHoc,
        hocKy: form.hocKy,
        namHoc: form.namHoc,
        lop: form.lop,
        tuanTu: finalTuanTu,
        tuanDen: finalTuanDen,
        danhSachTuan: finalWeekList,
        lichHoc: [
          {
            thu: Number(form.thu),
            tietBatDau: Number(form.tietBatDau),
            soTiet: Number(form.soTiet),
            phong: form.phongHoc,
            coSo: 'Cơ sở chính',
          }
        ]
      };
      let res;
      if (item.id && !item.id.startsWith('chao_co') && !item.id.startsWith('chao-co') && !item.id.startsWith('virtual')) {
        res = await apiService.updateSchedule(item.id, updatedPayload);
        if (!res.success) {
          res = await apiService.addSchedule({
            ...updatedPayload,
            lop: form.lop || item.lop || 'ALL',
            applyToClass: true,
          });
        }
      } else {
        res = await apiService.addSchedule({
          ...updatedPayload,
          lop: form.lop || item.lop || 'ALL',
          applyToClass: true,
        });
      }
      showToast(res.message || 'Cập nhật thời khóa biểu thành công');
      setIsSubmitting(false);
      onSuccess(updatedPayload);
      onClose();
    } catch (err) {
      showToast('Cập nhật thời khóa biểu thất bại');
      setIsSubmitting(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center p-4 pt-20 sm:pt-24 pb-6 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg p-6 shadow-2xl relative max-h-[calc(100vh-7rem)] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <Edit3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Chỉnh Sửa Môn Học Trong Thời Khóa Biểu
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
          {subjects && subjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                <label className="font-semibold block text-blue-600 dark:text-blue-400">
                  Chọn môn học từ Danh mục môn học ({filteredSubjects.length} môn):
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        maMH: 'CHAO_CO',
                        tenMH: 'Chào cờ Tiểu đoàn',
                        soTinChi: 0,
                        giangVien: 'Chỉ huy Tiểu đoàn',
                        phongHoc: '',
                        thu: 2,
                        tietBatDau: 1,
                        soTiet: 1,
                      }));
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-900 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Điền nhanh tiết Chào cờ Tiểu đoàn (1 tiết)"
                  >
                    <span>★ Chào cờ Tiểu đoàn (1T)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        maMH: 'CHAO_CO',
                        tenMH: 'Chào cờ Nhà trường',
                        soTinChi: 0,
                        giangVien: 'Ban Giám hiệu / Nhà trường',
                        phongHoc: 'Sân chào cờ',
                        thu: 2,
                        tietBatDau: 1,
                        soTiet: 2,
                      }));
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-950/80 hover:bg-red-200 text-red-900 dark:text-red-200 rounded border border-red-300 dark:border-red-700 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Điền nhanh tiết Chào cờ Nhà trường (2 tiết)"
                  >
                    <span>🏫 Chào cờ Nhà trường (2T)</span>
                  </button>
                  {subjects.length > filteredSubjects.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllSubjects(!showAllSubjects)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {showAllSubjects ? `Chỉ hiện môn lớp ${form.lop || item.lop}` : `Hiện tất cả (${subjects.length} môn)`}
                    </button>
                  )}
                </div>
              </div>
              <select
                onChange={(e) => handleSelectSubject(e.target.value)}
                value={form.maMH}
                className="w-full p-2 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg font-bold text-xs cursor-pointer"
              >
                <option value="">-- Chọn môn học từ danh mục môn học --</option>
                {filteredSubjects.map((s) => (
                  <option key={s.maMH} value={s.maMH}>
                    {s.maMH} - {s.tenMH} ({s.soTinChi} TC){(s.hocKy || s.namHoc) ? ` [${[s.hocKy, s.namHoc].filter(Boolean).join('  ')}]` : ''}{s.lop && s.lop !== 'ALL' ? ` (${s.lop})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-semibold block mb-1">Mã MH *</label>
              <input
                type="text"
                value={form.maMH}
                onChange={(e) => handleMaMHChange(e.target.value)}
                className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="font-semibold block mb-1">Tên Môn Học *</label>
              <input
                type="text"
                value={form.tenMH}
                onChange={(e) => setForm({ ...form, tenMH: e.target.value })}
                className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-bold"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold block">Số Tín Chỉ</label>
                {matchedSub ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ Đã khớp ({matchedSub.soTinChi} TC)
                  </span>
                ) : null}
              </div>
              <input
                type="number"
                min={0}
                max={10}
                disabled={form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ')}
                value={form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ') ? 0 : form.soTinChi}
                onChange={(e) => setForm({ ...form, soTinChi: Number(e.target.value) })}
                className={`w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-bold ${
                  form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ')
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    : matchedSub
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : ''
                }`}
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Phòng Học</label>
              <input
                type="text"
                value={form.phongHoc}
                onChange={(e) => setForm({ ...form, phongHoc: e.target.value })}
                className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Giảng Viên</label>
              <input
                type="text"
                value={form.giangVien}
                onChange={(e) => setForm({ ...form, giangVien: e.target.value })}
                className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-bold"
              />
            </div>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-blue-950 dark:text-blue-100">
                Cấu hình tuần học *
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="editWeekMode"
                    checked={weekMode === 'range'}
                    onChange={() => setWeekMode('range')}
                    className="text-blue-600"
                  />
                  <span>Theo khoảng tuần</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="editWeekMode"
                    checked={weekMode === 'custom_list'}
                    onChange={() => setWeekMode('custom_list')}
                    className="text-blue-600"
                  />
                  <span>Chọn từng tuần</span>
                </label>
              </div>
            </div>

            {weekMode === 'range' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Tuần bắt đầu *</label>
                    <input
                      type="number"
                      min={1}
                      value={form.tuanTu}
                      onChange={(e) => setForm({ ...form, tuanTu: Math.max(1, Number(e.target.value)) })}
                      className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Tuần kết thúc *</label>
                    <input
                      type="number"
                      min={1}
                      value={form.tuanDen}
                      onChange={(e) => setForm({ ...form, tuanDen: Math.max(1, Number(e.target.value)) })}
                      className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
                      required
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/40 p-2 rounded-lg flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Tổng: {Math.max(Number(form.tuanDen) - Number(form.tuanTu) + 1, 1)} tuần
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                    Tích chọn các tuần:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const list = Array.from({ length: 15 }, (_, i) => i + 1);
                        setSelectedCustomWeeks(list);
                        setCustomWeekTextInput(list.join(', '));
                      }}
                      className="px-1.5 py-0.5 font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border hover:bg-zinc-200 cursor-pointer"
                    >
                      1-15
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const list = Array.from({ length: 20 }, (_, i) => i + 1);
                        setSelectedCustomWeeks(list);
                        setCustomWeekTextInput(list.join(', '));
                      }}
                      className="px-1.5 py-0.5 font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border hover:bg-zinc-200 cursor-pointer"
                    >
                      1-20
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const list = Array.from({ length: 30 }, (_, i) => i + 1);
                        setSelectedCustomWeeks(list);
                        setCustomWeekTextInput(list.join(', '));
                      }}
                      className="px-1.5 py-0.5 font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border hover:bg-zinc-200 cursor-pointer"
                    >
                      1-30
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomWeeks([]);
                        setCustomWeekTextInput('');
                      }}
                      className="px-1.5 py-0.5 font-bold bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 max-h-36 overflow-y-auto p-1 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  {Array.from({ length: customWeekMaxDisplay }, (_, i) => i + 1).map((w) => {
                    const isSel = selectedCustomWeeks.includes(w);
                    return (
                      <button
                        type="button"
                        key={w}
                        onClick={() => toggleCustomWeek(w)}
                        className={`p-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        T{w}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-zinc-500 shrink-0">Nhập tuần:</span>
                  <input
                    type="text"
                    placeholder="VD: 1, 2, 3, 5, 8, 25, 30"
                    value={customWeekTextInput}
                    onChange={(e) => handleCustomWeekInput(e.target.value)}
                    className="w-full p-1 bg-white dark:bg-zinc-900 border rounded text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  <span>
                    Đã chọn {selectedCustomWeeks.length} tuần
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomWeekMaxDisplay((prev) => (prev === 20 ? 52 : prev === 30 ? 52 : 20))}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {customWeekMaxDisplay <= 20 ? '+ Hiện 52 tuần' : 'Thu gọn'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900">
            <div>
              <label className="font-semibold block mb-1">Thứ Mấy</label>
              <select
                value={form.thu}
                onChange={(e) => setForm({ ...form, thu: Number(e.target.value) })}
                className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
              >
                <option value={2}>Thứ 2</option>
                <option value={3}>Thứ 3</option>
                <option value={4}>Thứ 4</option>
                <option value={5}>Thứ 5</option>
                <option value={6}>Thứ 6</option>
                <option value={7}>Thứ 7</option>
                <option value={8}>Chủ nhật</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Tiết Bắt Đầu</label>
              <select
                value={form.tietBatDau}
                onChange={(e) => setForm({ ...form, tietBatDau: Number(e.target.value) })}
                className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
              >
                {[
                  { tiet: 1, label: 'Tiết 1 (07:00 - 07:45)' },
                  { tiet: 2, label: 'Tiết 2 (07:50 - 08:35)' },
                  { tiet: 3, label: 'Tiết 3 (08:35 - 09:20)' },
                  { tiet: 4, label: 'Tiết 4 (09:30 - 10:15)' },
                  { tiet: 5, label: 'Tiết 5 (10:15 - 11:00)' },
                  { tiet: 6, label: 'Tiết 6 (11:00 - 11:45)' },
                  { tiet: 7, label: 'Tiết 7 (13:30 - 14:15)' },
                  { tiet: 8, label: 'Tiết 8 (14:20 - 15:05)' },
                  { tiet: 9, label: 'Tiết 9 (15:15 - 16:00)' },
                  { tiet: 10, label: 'Tiết 10 (16:05 - 16:50)' },
                  { tiet: 11, label: 'Tiết 11 (16:55 - 17:40)' },
                  { tiet: 12, label: 'Tiết 12 (17:45 - 18:30)' },
                ].map((item) => (
                  <option key={item.tiet} value={item.tiet}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Số Tiết</label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.soTiet}
                onChange={(e) => setForm({ ...form, soTiet: Number(e.target.value) })}
                className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-md flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

