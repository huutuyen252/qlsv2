import React, { useState, useMemo, useEffect, useId } from 'react';
import { ThoiKhoaBieu, MonHoc } from '../../types';
import { apiService } from '../../services/apiService';
import { isSubjectMatchingClass } from '../../utils/subjectHelper';
import { Calendar, Edit3, X, Check } from 'lucide-react';
import { StatusBadge } from '../common';

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
  const titleId = useId();
  const [form, setForm] = useState({
    tenMH: '',
    maMH: '',
    soTinChi: 3,
    giangVien: '',
    phongHoc: '',
    hocKy: '',
    namHoc: '',
    lop: '',
    tuanTu: 1,
    tuanDen: 15,
    thu: 2,
    tietBatDau: 1,
    soTiet: 3,
  });

  const [weekMode, setWeekMode] = useState<'range' | 'custom_list'>('range');
  const [selectedCustomWeeks, setSelectedCustomWeeks] = useState<number[]>([]);
  const [customWeekTextInput, setCustomWeekTextInput] = useState<string>('');
  const [customWeekMaxDisplay, setCustomWeekMaxDisplay] = useState<number>(30);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    const tuanTuVal = item.tuanTu || 1;
    const tuanDenVal = item.tuanDen || 15;
    const hasCustomList = Boolean(item.danhSachTuan && item.danhSachTuan.length > 0);
    const weekList = hasCustomList
      ? item.danhSachTuan!
      : Array.from(
          { length: Math.max(Number(tuanDenVal) - Number(tuanTuVal) + 1, 1) },
          (_, i) => Number(tuanTuVal) + i
        );

    setForm({
      tenMH: item.tenMH || '',
      maMH: item.maMH || '',
      soTinChi: item.soTinChi ?? 3,
      giangVien: item.giangVien || '',
      phongHoc: item.phongHoc || item.lichHoc?.[0]?.phong || '',
      hocKy: item.hocKy || '',
      namHoc: item.namHoc || '',
      lop: item.lop || '',
      tuanTu: tuanTuVal,
      tuanDen: tuanDenVal,
      thu: item.lichHoc && item.lichHoc[0] ? item.lichHoc[0].thu : item.thu || 2,
      tietBatDau: item.lichHoc && item.lichHoc[0] ? item.lichHoc[0].tietBatDau : item.tietBatDau || 1,
      soTiet: item.lichHoc && item.lichHoc[0] ? item.lichHoc[0].soTiet : item.soTiet || 3,
    });
    setWeekMode(hasCustomList ? 'custom_list' : 'range');
    setSelectedCustomWeeks(weekList);
    setCustomWeekTextInput(hasCustomList ? weekList.join(', ') : '');
    setShowAllSubjects(false);
    setIsSubmitting(false);
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const filteredSubjects = useMemo(() => {
    if (!item) return subjects;
    if (showAllSubjects) return subjects;
    return subjects.filter((s) => isSubjectMatchingClass(s, form.lop || item.lop));
  }, [subjects, form.lop, item, showAllSubjects]);

  if (!isOpen || !item) return null;

  const toggleCustomWeek = (w: number) => {
    setSelectedCustomWeeks((prev) => {
      const next = prev.includes(w)
        ? prev.filter((itemW) => itemW !== w)
        : [...prev, w].sort((a, b) => a - b);
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
            coSo: item.lichHoc?.[0]?.coSo || '',
          },
        ],
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
    } catch {
      showToast('Cập nhật thời khóa biểu thất bại');
      setIsSubmitting(false);
    }
  };

  const isChaoCo = form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ');

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <h3 id={titleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Chỉnh sửa môn học trong thời khóa biểu
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
          {subjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-1.5">
                <label htmlFor="edit-tkb-subject-select" className="font-semibold text-slate-700 dark:text-slate-200">
                  Môn học từ danh mục ({filteredSubjects.length})
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
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
                      }))
                    }
                    className="px-2 py-0.5 text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800 cursor-pointer"
                  >
                    Chào cờ Tiểu đoàn (1T)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
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
                      }))
                    }
                    className="px-2 py-0.5 text-[11px] font-medium bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800 cursor-pointer"
                  >
                    Chào cờ Nhà trường (2T)
                  </button>
                  {subjects.length > filteredSubjects.length && (
                    <button
                      type="button"
                      onClick={() => setShowAllSubjects(!showAllSubjects)}
                      className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {showAllSubjects ? `Lọc theo lớp ${form.lop || item.lop}` : `Hiện tất cả (${subjects.length})`}
                    </button>
                  )}
                </div>
              </div>
              <select
                id="edit-tkb-subject-select"
                onChange={(e) => handleSelectSubject(e.target.value)}
                value={form.maMH}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs cursor-pointer focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              >
                <option value="">-- Chọn môn học --</option>
                {filteredSubjects.map((s) => (
                  <option key={s.maMH} value={s.maMH}>
                    {s.maMH} - {s.tenMH} ({s.soTinChi} TC)
                    {s.hocKy || s.namHoc ? ` [${[s.hocKy, s.namHoc].filter(Boolean).join(' ')}]` : ''}
                    {s.lop && s.lop !== 'ALL' ? ` (${s.lop})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label htmlFor="edit-tkb-mamh" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Mã MH *
              </label>
              <input
                id="edit-tkb-mamh"
                type="text"
                value={form.maMH}
                onChange={(e) => handleMaMHChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono font-semibold text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                required
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="edit-tkb-tenmh" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Tên môn học *
              </label>
              <input
                id="edit-tkb-tenmh"
                type="text"
                value={form.tenMH}
                onChange={(e) => setForm({ ...form, tenMH: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-medium text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="edit-tkb-stc" className="font-semibold text-slate-700 dark:text-slate-200">
                  Số tín chỉ
                </label>
                {matchedSub && <StatusBadge label={`${matchedSub.soTinChi} TC`} variant="success" />}
              </div>
              <input
                id="edit-tkb-stc"
                type="number"
                min={0}
                max={10}
                disabled={isChaoCo}
                value={isChaoCo ? 0 : form.soTinChi}
                onChange={(e) => setForm({ ...form, soTinChi: Number(e.target.value) })}
                className={`w-full px-2.5 py-1.5 border rounded font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none ${
                  isChaoCo
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    : matchedSub
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                }`}
              />
            </div>
            <div>
              <label htmlFor="edit-tkb-phong" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Phòng học
              </label>
              <input
                id="edit-tkb-phong"
                type="text"
                value={form.phongHoc}
                onChange={(e) => setForm({ ...form, phongHoc: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-tkb-gv" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Giảng viên
              </label>
              <input
                id="edit-tkb-gv"
                type="text"
                value={form.giangVien}
                onChange={(e) => setForm({ ...form, giangVien: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Tuần học *</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="editWeekMode"
                    checked={weekMode === 'range'}
                    onChange={() => setWeekMode('range')}
                    className="text-blue-700"
                  />
                  <span>Theo khoảng tuần</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="editWeekMode"
                    checked={weekMode === 'custom_list'}
                    onChange={() => setWeekMode('custom_list')}
                    className="text-blue-700"
                  />
                  <span>Chọn từng tuần</span>
                </label>
              </div>
            </div>

            {weekMode === 'range' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="edit-tkb-tuantu" className="font-medium block mb-1 text-slate-700 dark:text-slate-300">
                    Tuần bắt đầu *
                  </label>
                  <input
                    id="edit-tkb-tuantu"
                    type="number"
                    min={1}
                    value={form.tuanTu}
                    onChange={(e) => setForm({ ...form, tuanTu: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-tkb-tuanden" className="font-medium block mb-1 text-slate-700 dark:text-slate-300">
                    Tuần kết thúc *
                  </label>
                  <input
                    id="edit-tkb-tuanden"
                    type="number"
                    min={1}
                    value={form.tuanDen}
                    onChange={(e) => setForm({ ...form, tuanDen: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-end">
                  <div className="w-full px-2.5 py-1.5 text-[11px] font-mono tabular-nums font-medium text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{Math.max(Number(form.tuanDen) - Number(form.tuanTu) + 1, 1)} tuần</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Chọn nhanh:</span>
                  <div className="flex items-center gap-1">
                    {[15, 20, 30].map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => {
                          const list = Array.from({ length: len }, (_, i) => i + 1);
                          setSelectedCustomWeeks(list);
                          setCustomWeekTextInput(list.join(', '));
                        }}
                        className="px-1.5 py-0.5 font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        1-{len}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomWeeks([]);
                        setCustomWeekTextInput('');
                      }}
                      className="px-1.5 py-0.5 font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded border border-rose-200 dark:border-rose-800 hover:bg-rose-100 cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700">
                  {Array.from({ length: customWeekMaxDisplay }, (_, i) => i + 1).map((w) => {
                    const isSel = selectedCustomWeeks.includes(w);
                    return (
                      <button
                        type="button"
                        key={w}
                        onClick={() => toggleCustomWeek(w)}
                        className={`p-1 text-[11px] font-mono font-semibold rounded border transition-colors cursor-pointer ${
                          isSel
                            ? 'bg-blue-700 text-white border-blue-700'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        T{w}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <label htmlFor="edit-tkb-weeklist" className="text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
                    Danh sách:
                  </label>
                  <input
                    id="edit-tkb-weeklist"
                    type="text"
                    placeholder="1, 2, 3, 5, 8..."
                    value={customWeekTextInput}
                    onChange={(e) => handleCustomWeekInput(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <span className="font-mono tabular-nums">Đã chọn {selectedCustomWeeks.length} tuần</span>
                  <button
                    type="button"
                    onClick={() => setCustomWeekMaxDisplay((prev) => (prev <= 30 ? 52 : 30))}
                    className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {customWeekMaxDisplay <= 30 ? 'Hiện 52 tuần' : 'Thu gọn'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-800">
            <div>
              <label htmlFor="edit-tkb-thu" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Thứ
              </label>
              <select
                id="edit-tkb-thu"
                value={form.thu}
                onChange={(e) => setForm({ ...form, thu: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
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
              <label htmlFor="edit-tkb-tietbd" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Tiết bắt đầu
              </label>
              <select
                id="edit-tkb-tietbd"
                value={form.tietBatDau}
                onChange={(e) => setForm({ ...form, tietBatDau: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
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
                ].map((opt) => (
                  <option key={opt.tiet} value={opt.tiet}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-tkb-sotiet" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Số tiết
              </label>
              <input
                id="edit-tkb-sotiet"
                type="number"
                min={1}
                max={10}
                value={form.soTiet}
                onChange={(e) => setForm({ ...form, soTiet: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono tabular-nums text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium rounded cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
