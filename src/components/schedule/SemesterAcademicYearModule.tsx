import React, { useState, useMemo, useEffect, useId } from 'react';
import { HocKy, NamHoc, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { getAcademicPeriod } from '../../utils/academicCalendar';
import { Calendar, Layers, Plus, Trash2, Edit3, X } from 'lucide-react';
import {
  ConfirmDialog,
  DataToolbar,
  EmptyState,
  FilteredEmptyState,
  MetricStrip,
  PageHeader,
  StatusBadge,
} from '../common';

interface SemesterAcademicYearModuleProps {
  semesters: HocKy[];
  academicYears: NamHoc[];
  userRole?: UserRole;
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}

export const SemesterAcademicYearModule: React.FC<SemesterAcademicYearModuleProps> = ({
  semesters,
  academicYears,
  userRole = 'ADMIN',
  onRefreshData,
  showToast,
}) => {
  const isAdmin = userRole === 'ADMIN';
  const yearTitleId = useId();
  const semTitleId = useId();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('');

  const [isNamHocModalOpen, setIsNamHocModalOpen] = useState(false);
  const [editingNamHoc, setEditingNamHoc] = useState<NamHoc | null>(null);
  const [namHocForm, setNamHocForm] = useState({ namHocID: '', tenNamHoc: '' });

  const [isHocKyModalOpen, setIsHocKyModalOpen] = useState(false);
  const [editingHocKy, setEditingHocKy] = useState<HocKy | null>(null);
  const [hocKyForm, setHocKyForm] = useState({
    hocKyID: '',
    tenHocKy: '',
    namHocID: '',
    ngayBatDau: '',
    ngayKetThuc: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'NAM_HOC' | 'HOC_KY';
    id: string;
    name: string;
    linkedCount?: number;
  } | null>(null);

  useEffect(() => {
    if (!isNamHocModalOpen && !isHocKyModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNamHocModalOpen) setIsNamHocModalOpen(false);
        if (isHocKyModalOpen) setIsHocKyModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNamHocModalOpen, isHocKyModalOpen]);

  const activePeriod = useMemo(() => {
    return getAcademicPeriod(new Date(), semesters, academicYears);
  }, [semesters, academicYears]);

  const filteredYears = useMemo(() => {
    return academicYears.filter((ny) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        ny.namHocID.toLowerCase().includes(term) ||
        ny.tenNamHoc.toLowerCase().includes(term)
      );
    });
  }, [academicYears, searchTerm]);

  const filteredSemesters = useMemo(() => {
    return semesters.filter((sem) => {
      const matchYear = !selectedYearFilter || sem.namHocID === selectedYearFilter;
      if (!matchYear) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const linkedYear = academicYears.find((y) => y.namHocID === sem.namHocID)?.tenNamHoc || '';
      return (
        sem.hocKyID.toLowerCase().includes(term) ||
        sem.tenHocKy.toLowerCase().includes(term) ||
        sem.namHocID.toLowerCase().includes(term) ||
        linkedYear.toLowerCase().includes(term)
      );
    });
  }, [semesters, selectedYearFilter, searchTerm, academicYears]);

  const handleOpenAddNamHoc = () => {
    setEditingNamHoc(null);
    setNamHocForm({ namHocID: '', tenNamHoc: '' });
    setIsNamHocModalOpen(true);
  };

  const handleOpenEditNamHoc = (ny: NamHoc) => {
    setEditingNamHoc(ny);
    setNamHocForm({ namHocID: ny.namHocID, tenNamHoc: ny.tenNamHoc });
    setIsNamHocModalOpen(true);
  };

  const handleNamHocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = namHocForm.tenNamHoc.trim();
    if (!cleanName) {
      showToast('Vui lòng nhập tên năm học.');
      return;
    }

    if (editingNamHoc) {
      const res = await apiService.updateAcademicYear(editingNamHoc.namHocID, {
        tenNamHoc: cleanName,
      });
      showToast(res.message || 'Đã cập nhật năm học.');
    } else {
      const cleanId = namHocForm.namHocID.trim() || `NH${cleanName.replace(/[^a-zA-Z0-9]/g, '')}`;
      const res = await apiService.addAcademicYear({
        namHocID: cleanId,
        tenNamHoc: cleanName,
      });
      showToast(res.message || 'Đã thêm năm học.');
    }

    setIsNamHocModalOpen(false);
    setEditingNamHoc(null);
    setNamHocForm({ namHocID: '', tenNamHoc: '' });
    onRefreshData();
  };

  const handleOpenAddHocKy = () => {
    setEditingHocKy(null);
    const defaultYear = selectedYearFilter || academicYears[0]?.namHocID || '';
    setHocKyForm({
      hocKyID: '',
      tenHocKy: '',
      namHocID: defaultYear,
      ngayBatDau: '',
      ngayKetThuc: '',
    });
    setIsHocKyModalOpen(true);
  };

  const handleOpenEditHocKy = (sem: HocKy) => {
    setEditingHocKy(sem);
    setHocKyForm({
      hocKyID: sem.hocKyID,
      tenHocKy: sem.tenHocKy,
      namHocID: sem.namHocID,
      ngayBatDau: sem.ngayBatDau || '',
      ngayKetThuc: sem.ngayKetThuc || '',
    });
    setIsHocKyModalOpen(true);
  };

  const handleHocKySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTen = hocKyForm.tenHocKy.trim();
    const cleanNam = hocKyForm.namHocID.trim();

    if (!cleanTen || !cleanNam) {
      showToast('Vui lòng nhập tên học kỳ và chọn năm học.');
      return;
    }

    if (hocKyForm.ngayBatDau && hocKyForm.ngayKetThuc && hocKyForm.ngayBatDau > hocKyForm.ngayKetThuc) {
      showToast('Ngày bắt đầu không thể sau ngày kết thúc.');
      return;
    }

    if (editingHocKy) {
      const res = await apiService.updateSemester(editingHocKy.hocKyID, {
        tenHocKy: cleanTen,
        namHocID: cleanNam,
        ngayBatDau: hocKyForm.ngayBatDau,
        ngayKetThuc: hocKyForm.ngayKetThuc,
      });
      showToast(res.message || 'Đã cập nhật học kỳ.');
    } else {
      const cleanId = hocKyForm.hocKyID.trim() || `HK${Date.now().toString().slice(-4)}`;
      const res = await apiService.addSemester({
        hocKyID: cleanId,
        tenHocKy: cleanTen,
        namHocID: cleanNam,
        ngayBatDau: hocKyForm.ngayBatDau,
        ngayKetThuc: hocKyForm.ngayKetThuc,
      });
      showToast(res.message || 'Đã thêm học kỳ.');
    }

    setIsHocKyModalOpen(false);
    setEditingHocKy(null);
    setHocKyForm({
      hocKyID: '',
      tenHocKy: '',
      namHocID: '',
      ngayBatDau: '',
      ngayKetThuc: '',
    });
    onRefreshData();
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, name } = deleteConfirm;

    if (type === 'NAM_HOC') {
      const res = await apiService.deleteAcademicYear(id);
      showToast(res.message || `Đã xóa năm học "${name}".`);
    } else {
      const res = await apiService.deleteSemester(id);
      showToast(res.message || `Đã xóa học kỳ "${name}".`);
    }

    setDeleteConfirm(null);
    onRefreshData();
  };

  const calculateWeeks = (start?: string, end?: string): string => {
    if (!start || !end) return '—';
    try {
      const d1 = new Date(start);
      const d2 = new Date(end);
      const diffMs = d2.getTime() - d1.getTime();
      if (diffMs <= 0) return '—';
      const weeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
      return `${weeks} tuần`;
    } catch {
      return '—';
    }
  };

  const hasActiveFilters = Boolean(searchTerm.trim() || selectedYearFilter);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Năm học & Học kỳ"
        icon={Calendar}
        actions={
          isAdmin ? (
            <>
              <button
                id="btn-add-nam-hoc"
                type="button"
                onClick={handleOpenAddNamHoc}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Thêm năm học</span>
              </button>
              <button
                id="btn-add-hoc-ky"
                type="button"
                onClick={handleOpenAddHocKy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm học kỳ</span>
              </button>
            </>
          ) : null
        }
      />

      <MetricStrip
        metrics={[
          { label: 'Tổng năm học', value: academicYears.length, dotColor: 'blue' },
          { label: 'Tổng học kỳ', value: semesters.length, dotColor: 'slate' },
          { label: 'Kỳ hiện hành', value: activePeriod.code || '—', dotColor: 'emerald' },
          { label: 'Niên khóa', value: activePeriod.academicYear || '—', dotColor: 'amber' },
        ]}
      />

      <DataToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Tìm theo mã hoặc tên năm học, học kỳ..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearchTerm('');
          setSelectedYearFilter('');
        }}
        filters={
          <select
            id="filter-semester-year-select"
            value={selectedYearFilter}
            onChange={(e) => setSelectedYearFilter(e.target.value)}
            aria-label="Lọc học kỳ theo năm học"
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="">Tất cả năm học ({academicYears.length})</option>
            {academicYears.map((y) => (
              <option key={y.namHocID} value={y.namHocID}>
                Năm học {y.tenNamHoc}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Danh mục năm học ({filteredYears.length})</span>
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            {academicYears.length === 0 ? (
              <EmptyState message="Chưa có dữ liệu." className="border-0 rounded-none" />
            ) : filteredYears.length === 0 ? (
              <FilteredEmptyState
                onClearFilters={() => setSearchTerm('')}
                className="border-0 rounded-none"
              />
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3">Mã năm học</th>
                    <th className="py-2.5 px-3">Tên năm học</th>
                    <th className="py-2.5 px-3 text-center">Số HK</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    {isAdmin && <th className="py-2.5 px-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredYears.map((ny, idx) => {
                    const semesterCount = semesters.filter((s) => s.namHocID === ny.namHocID).length;
                    const isActiveYear = activePeriod.academicYear.includes(ny.tenNamHoc);
                    return (
                      <tr key={ny.namHocID} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                          {ny.namHocID}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {ny.tenNamHoc}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                          {semesterCount}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <StatusBadge
                            label={isActiveYear ? 'Hiện hành' : 'Lưu trữ'}
                            variant={isActiveYear ? 'success' : 'neutral'}
                            dot
                          />
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditNamHoc(ny)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                              aria-label={`Sửa năm học ${ny.tenNamHoc}`}
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'NAM_HOC',
                                  id: ny.namHocID,
                                  name: ny.tenNamHoc,
                                  linkedCount: semesterCount,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                              aria-label={`Xóa năm học ${ny.tenNamHoc}`}
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Danh mục học kỳ ({filteredSemesters.length})</span>
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            {semesters.length === 0 ? (
              <EmptyState message="Chưa có dữ liệu." className="border-0 rounded-none" />
            ) : filteredSemesters.length === 0 ? (
              <FilteredEmptyState
                onClearFilters={() => {
                  setSearchTerm('');
                  setSelectedYearFilter('');
                }}
                className="border-0 rounded-none"
              />
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3">Mã HK</th>
                    <th className="py-2.5 px-3">Tên học kỳ</th>
                    <th className="py-2.5 px-3">Năm học</th>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3 text-center">Số tuần</th>
                    {isAdmin && <th className="py-2.5 px-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredSemesters.map((sem, idx) => {
                    const linkedYear = academicYears.find((y) => y.namHocID === sem.namHocID);
                    const isCurrentSem =
                      activePeriod.code.includes(sem.hocKyID) ||
                      (activePeriod.semester === 'HK1' && sem.tenHocKy.includes('1')) ||
                      (activePeriod.semester === 'HK2' && sem.tenHocKy.includes('2'));
                    return (
                      <tr key={sem.hocKyID} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                          {sem.hocKyID}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {sem.tenHocKy}
                            </span>
                            {isCurrentSem && <StatusBadge label="Đang học" variant="success" />}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {linkedYear ? linkedYear.tenNamHoc : sem.namHocID}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {sem.ngayBatDau && sem.ngayKetThuc
                            ? `${sem.ngayBatDau} → ${sem.ngayKetThuc}`
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums text-[11px]">
                          {calculateWeeks(sem.ngayBatDau, sem.ngayKetThuc)}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditHocKy(sem)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                              aria-label={`Sửa học kỳ ${sem.tenHocKy}`}
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'HOC_KY',
                                  id: sem.hocKyID,
                                  name: sem.tenHocKy,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                              aria-label={`Xóa học kỳ ${sem.tenHocKy}`}
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {isNamHocModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={yearTitleId}
          onClick={() => setIsNamHocModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-md w-full p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h3 id={yearTitleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingNamHoc ? 'Chỉnh sửa năm học' : 'Thêm năm học'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNamHocModalOpen(false)}
                aria-label="Đóng hộp thoại"
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleNamHocSubmit} className="space-y-3 text-xs">
              {!editingNamHoc && (
                <div>
                  <label htmlFor="nh-id-input" className="font-medium block mb-1 text-slate-700 dark:text-slate-200">
                    Mã năm học
                  </label>
                  <input
                    id="nh-id-input"
                    type="text"
                    placeholder="NH2025-2026"
                    value={namHocForm.namHocID}
                    onChange={(e) => setNamHocForm({ ...namHocForm, namHocID: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div>
                <label htmlFor="nh-name-input" className="font-medium block mb-1 text-slate-700 dark:text-slate-200">
                  Tên năm học *
                </label>
                <input
                  id="nh-name-input"
                  type="text"
                  placeholder="2025-2026"
                  value={namHocForm.tenNamHoc}
                  onChange={(e) => setNamHocForm({ ...namHocForm, tenNamHoc: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 font-medium"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNamHocModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs cursor-pointer"
                >
                  {editingNamHoc ? 'Lưu thay đổi' : 'Thêm năm học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isHocKyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={semTitleId}
          onClick={() => setIsHocKyModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-md w-full p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h3 id={semTitleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingHocKy ? 'Chỉnh sửa học kỳ' : 'Thêm học kỳ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHocKyModalOpen(false)}
                aria-label="Đóng hộp thoại"
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleHocKySubmit} className="space-y-3 text-xs">
              {!editingHocKy && (
                <div>
                  <label htmlFor="hk-id-input" className="font-medium block mb-1 text-slate-700 dark:text-slate-200">
                    Mã học kỳ
                  </label>
                  <input
                    id="hk-id-input"
                    type="text"
                    placeholder="HK1-2025-2026"
                    value={hocKyForm.hocKyID}
                    onChange={(e) => setHocKyForm({ ...hocKyForm, hocKyID: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div>
                <label htmlFor="hk-name-input" className="font-medium block mb-1 text-slate-700 dark:text-slate-200">
                  Tên học kỳ *
                </label>
                <input
                  id="hk-name-input"
                  type="text"
                  placeholder="Học kỳ 1"
                  value={hocKyForm.tenHocKy}
                  onChange={(e) => setHocKyForm({ ...hocKyForm, tenHocKy: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 font-medium"
                  required
                />
              </div>

              <div>
                <label htmlFor="hk-nam-select" className="font-medium block mb-1 text-slate-700 dark:text-slate-200">
                  Năm học *
                </label>
                <select
                  id="hk-nam-select"
                  value={hocKyForm.namHocID}
                  onChange={(e) => setHocKyForm({ ...hocKyForm, namHocID: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 cursor-pointer"
                  required
                >
                  <option value="">-- Chọn năm học --</option>
                  {academicYears.map((y) => (
                    <option key={y.namHocID} value={y.namHocID}>
                      {y.tenNamHoc} ({y.namHocID})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="hk-start-date" className="font-medium block mb-1 text-slate-700 dark:text-slate-200">
                    Ngày bắt đầu
                  </label>
                  <input
                    id="hk-start-date"
                    type="date"
                    value={hocKyForm.ngayBatDau}
                    onChange={(e) => setHocKyForm({ ...hocKyForm, ngayBatDau: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="hk-end-date" className="font-medium block mb-1 text-slate-700 dark:text-slate-200">
                    Ngày kết thúc
                  </label>
                  <input
                    id="hk-end-date"
                    type="date"
                    value={hocKyForm.ngayKetThuc}
                    onChange={(e) => setHocKyForm({ ...hocKyForm, ngayKetThuc: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsHocKyModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs cursor-pointer"
                >
                  {editingHocKy ? 'Lưu thay đổi' : 'Thêm học kỳ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title={`Xác nhận xóa ${deleteConfirm?.type === 'NAM_HOC' ? 'năm học' : 'học kỳ'}`}
        message={`Bạn có chắc chắn muốn xóa ${deleteConfirm?.type === 'NAM_HOC' ? 'năm học' : 'học kỳ'} "${deleteConfirm?.name || ''}" (${deleteConfirm?.id || ''})?`}
        details={
          deleteConfirm?.linkedCount && deleteConfirm.linkedCount > 0 ? (
            <span>Hiện có {deleteConfirm.linkedCount} học kỳ liên kết với năm học này.</span>
          ) : undefined
        }
        confirmLabel="Xóa"
        variant="danger"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleExecuteDelete}
      />
    </div>
  );
};
