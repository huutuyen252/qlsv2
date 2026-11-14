import React, { useState, useMemo, useEffect, useId, useRef } from 'react';
import { Diem, SinhVien, MonHoc, SemesterGpaSummary, YearGpaSummary } from '../../types';
import {
  calculateSemesterSummary,
  calculateYearSummary,
  calculateCumulativeSummary,
  exportTranscriptExcel,
} from '../../utils/gradeHelper';
import { triggerPrintWithFallback, downloadPrintableHtml } from '../../utils/printHelper';
import {
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  DataToolbar,
  EmptyState,
  FilteredEmptyState,
  MetricStrip,
  StatusBadge,
} from '../common';

interface StudentGradeViewProps {
  grades: Diem[];
  student: SinhVien | null | undefined;
  subjects?: MonHoc[];
  onOpenRetakeRegister?: (maMH: string) => void;
}

export const StudentGradeView: React.FC<StudentGradeViewProps> = ({
  grades,
  student,
  onOpenRetakeRegister,
}) => {
  const [activeTab, setActiveTab] = useState<'SEMESTER' | 'CUMULATIVE' | 'ANALYTICS'>('SEMESTER');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [cumulativeViewStyle, setCumulativeViewStyle] = useState<'GROUPED' | 'UNIFIED'>('GROUPED');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const printModalRef = useRef<HTMLDivElement>(null);

  const printTitleId = useId();
  const yearFilterId = useId();
  const semFilterId = useId();
  const statusFilterId = useId();

  useEffect(() => {
    if (!isPrintModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPrintModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrintModalOpen]);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(grades.map((g) => g.namHoc?.trim()).filter(Boolean)));
    return (years as string[]).sort().reverse();
  }, [grades]);

  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || '');

  useEffect(() => {
    if (availableYears.length > 0) {
      if (!selectedYear || !availableYears.includes(selectedYear)) {
        setSelectedYear(availableYears[0]);
      }
    } else {
      setSelectedYear('');
    }
  }, [availableYears, selectedYear]);

  const availableSemestersInYear = useMemo(() => {
    if (!selectedYear) return [];
    const semSet = new Set(
      grades
        .filter((g) => g.namHoc?.trim() === selectedYear.trim())
        .map((g) => g.hocKy?.trim())
        .filter(Boolean)
    );
    return (Array.from(semSet) as string[]).sort();
  }, [grades, selectedYear]);

  const cumulativeSummary = useMemo(() => {
    return calculateCumulativeSummary(
      grades,
      student
        ? {
            maSV: student.maSV,
            hoTen: student.hoTen,
            lop: student.lop,
          }
        : undefined
    );
  }, [grades, student]);

  const totalRegisteredCredits = useMemo(() => {
    return grades.reduce((sum, g) => sum + (g.soTinChi && g.soTinChi > 0 ? g.soTinChi : 3), 0);
  }, [grades]);

  const yearSummary: YearGpaSummary = useMemo(() => {
    return calculateYearSummary(grades, selectedYear);
  }, [grades, selectedYear]);

  const currentSemesterSummary: SemesterGpaSummary | null = useMemo(() => {
    if (selectedSemester === 'ALL' || !selectedYear) return null;
    return calculateSemesterSummary(grades, selectedSemester, selectedYear);
  }, [grades, selectedSemester, selectedYear]);

  const currentViewGrades = useMemo(() => {
    let list: Diem[] = [];
    if (activeTab === 'SEMESTER') {
      if (selectedSemester === 'ALL') {
        list = grades.filter((g) => g.namHoc?.trim() === selectedYear.trim());
      } else {
        list = grades.filter(
          (g) =>
            g.namHoc?.trim() === selectedYear.trim() &&
            g.hocKy?.trim() === selectedSemester.trim()
        );
      }
    } else {
      list = [...grades];
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.maMH.toLowerCase().includes(q) ||
          (g.tenMH && g.tenMH.toLowerCase().includes(q)) ||
          g.hocKy.toLowerCase().includes(q) ||
          g.namHoc.toLowerCase().includes(q)
      );
    }

    if (filterStatus === 'PASSED') {
      list = list.filter((g) => g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0);
    } else if (filterStatus === 'FAILED') {
      list = list.filter((g) => g.trangThai === 'FAILED' || (g.diemTongKet10 || 0) < 4.0);
    }

    return list;
  }, [activeTab, grades, selectedYear, selectedSemester, searchTerm, filterStatus]);

  const hasActiveFilters = Boolean(searchTerm.trim() || filterStatus !== 'ALL');

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
  };

  const handleExportExcel = () => {
    if (grades.length === 0) return;
    const title =
      activeTab === 'SEMESTER'
        ? selectedSemester === 'ALL'
          ? `BangDiem_Nam_${selectedYear}`
          : `BangDiem_${selectedSemester}_${selectedYear}`
        : 'BangDiem_TongHop_ToanKhoa';
    exportTranscriptExcel(
      currentViewGrades.length > 0 ? currentViewGrades : grades,
      student,
      title,
      title
    );
  };

  const renderLetterGrade = (diemChu: string, trangThai: string) => {
    const label = diemChu === 'A+' ? 'A' : diemChu || 'F';
    let variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' = 'neutral';
    if (trangThai === 'FAILED' || label === 'F') variant = 'danger';
    else if (label === 'A') variant = 'success';
    else if (label === 'B+' || label === 'B') variant = 'info';
    else if (label === 'C+' || label === 'C') variant = 'warning';

    return <StatusBadge label={label} variant={variant} className="font-mono font-bold" />;
  };

  const renderPassBadge = (trangThai: string, tk10: number) => {
    const isPass = trangThai === 'PASSED' || tk10 >= 4.0;
    return (
      <StatusBadge
        label={isPass ? 'Đạt' : 'Chưa đạt'}
        variant={isPass ? 'success' : 'danger'}
        dot
      />
    );
  };

  const renderGradeRows = (rows: Diem[], includeTermColumn = false) => (
    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
      {rows.map((g) => (
        <tr key={g.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors">
          {includeTermColumn && (
            <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
              {g.hocKy} · {g.namHoc}
            </td>
          )}
          <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
            {g.maMH}
          </td>
          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
            {g.tenMH || g.maMH}
          </td>
          <td className="py-2.5 px-3 text-center font-mono tabular-nums">{g.soTinChi || 3}</td>
          <td className="py-2.5 px-3 text-center font-mono tabular-nums">{g.diemChuyenCan}</td>
          <td className="py-2.5 px-3 text-center font-mono tabular-nums">{g.diemGiuaKy}</td>
          <td className="py-2.5 px-3 text-center font-mono tabular-nums">{g.diemCuoiKy}</td>
          <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
            {g.diemTongKet10}
          </td>
          <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-blue-700 dark:text-blue-400">
            {g.diemThang4}
          </td>
          <td className="py-2.5 px-3 text-center">{renderLetterGrade(g.diemChu, g.trangThai)}</td>
          <td className="py-2.5 px-3 text-center whitespace-nowrap">
            {renderPassBadge(g.trangThai, g.diemTongKet10)}
          </td>
        </tr>
      ))}
    </tbody>
  );

  const studentDisplayName = student?.hoTen || grades[0]?.hoTenSV || 'Chưa cập nhật';
  const studentDisplayCode = student?.maSV || grades[0]?.maSV || 'Chưa cập nhật';

  return (
    <div className="space-y-4">
      {/* Student Profile & Cumulative Academic Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                  {studentDisplayName}
                </h2>
                <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {studentDisplayCode}
                </span>
                {student?.trangThai && (
                  <StatusBadge
                    label={student.trangThai}
                    variant={
                      student.trangThai === 'Đang học'
                        ? 'success'
                        : student.trangThai === 'Bảo lưu'
                        ? 'warning'
                        : 'neutral'
                    }
                    dot
                  />
                )}
              </div>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                <span>
                  Lớp: <strong className="text-slate-900 dark:text-slate-100 font-medium">{student?.lop || 'Chưa cập nhật'}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Khoa: <strong className="text-slate-900 dark:text-slate-100 font-medium">{student?.khoa || 'Chưa cập nhật'}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Số môn đã học: <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{grades.length}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={grades.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={grades.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xem & In bảng điểm</span>
            </button>
          </div>
        </div>

        <MetricStrip
          metrics={[
            {
              label: 'GPA tích lũy (Hệ 4)',
              value: grades.length > 0 ? cumulativeSummary.diemTBTichLuyThang4.toFixed(2) : '—',
              dotColor: 'blue',
            },
            {
              label: 'Điểm TB (Hệ 10)',
              value: grades.length > 0 ? cumulativeSummary.diemTBTichLuyThang10.toFixed(2) : '—',
              dotColor: 'slate',
            },
            {
              label: 'Tín chỉ tích lũy',
              value: `${cumulativeSummary.tongTinChiTichLuy} / ${totalRegisteredCredits}`,
              dotColor: 'emerald',
            },
            {
              label: 'Học lực',
              value: cumulativeSummary.xepLoaiHocLuc,
              dotColor: cumulativeSummary.soMonNoTinChi > 0 ? 'amber' : 'emerald',
              isMono: false,
            },
          ]}
        />
      </div>

      {/* Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Chế độ xem bảng điểm"
        className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-x-auto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'SEMESTER'}
          onClick={() => setActiveTab('SEMESTER')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'SEMESTER'
              ? 'bg-blue-700 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Bảng điểm theo học kỳ</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'CUMULATIVE'}
          onClick={() => setActiveTab('CUMULATIVE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'CUMULATIVE'
              ? 'bg-blue-700 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Bảng điểm toàn khóa</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ANALYTICS'}
          onClick={() => setActiveTab('ANALYTICS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'ANALYTICS'
              ? 'bg-blue-700 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Tiến trình & Thống kê GPA</span>
        </button>
      </div>

      {/* TAB 1: SEMESTER */}
      {activeTab === 'SEMESTER' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-md border border-slate-200 dark:border-slate-800">
            <DataToolbar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Tìm theo mã môn hoặc tên môn..."
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              filters={
                <>
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={yearFilterId} className="sr-only">
                      Năm học
                    </label>
                    <select
                      id={yearFilterId}
                      value={selectedYear}
                      disabled={availableYears.length === 0}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setSelectedSemester('ALL');
                      }}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer disabled:opacity-50"
                    >
                      {availableYears.length > 0 ? (
                        availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            Năm học {yr}
                          </option>
                        ))
                      ) : (
                        <option value="">Chưa có năm học</option>
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label htmlFor={semFilterId} className="sr-only">
                      Học kỳ
                    </label>
                    <select
                      id={semFilterId}
                      value={selectedSemester}
                      disabled={availableSemestersInYear.length === 0}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer disabled:opacity-50"
                    >
                      {availableSemestersInYear.length > 0 ? (
                        <>
                          <option value="ALL">Tất cả học kỳ ({selectedYear})</option>
                          {availableSemestersInYear.map((sem) => (
                            <option key={sem} value={sem}>
                              Học kỳ {sem}
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value="ALL">Chưa có học kỳ</option>
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label htmlFor={statusFilterId} className="sr-only">
                      Kết quả
                    </label>
                    <select
                      id={statusFilterId}
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'PASSED' | 'FAILED')}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                    >
                      <option value="ALL">Tất cả kết quả</option>
                      <option value="PASSED">Đạt</option>
                      <option value="FAILED">Chưa đạt</option>
                    </select>
                  </div>
                </>
              }
            />
          </div>

          {availableYears.length === 0 ? (
            <EmptyState message="Chưa có dữ liệu." />
          ) : (
            <>
              {selectedSemester === 'ALL' ? (
                <MetricStrip
                  metrics={[
                    { label: `Năm học ${selectedYear}`, value: `${availableSemestersInYear.length} học kỳ`, dotColor: 'blue' },
                    { label: 'GPA năm (Hệ 4)', value: yearSummary.diemTBNamHocThang4.toFixed(2), dotColor: 'blue' },
                    { label: 'Điểm TB (Hệ 10)', value: yearSummary.diemTBNamHocThang10.toFixed(2), dotColor: 'slate' },
                    {
                      label: 'Tín chỉ năm',
                      value: `${yearSummary.tongTinChiTichLuy} / ${yearSummary.tongTinChiDangKy}`,
                      dotColor: 'emerald',
                    },
                    { label: 'Xếp loại năm', value: yearSummary.xepLoaiNamHoc, dotColor: 'emerald', isMono: false },
                  ]}
                />
              ) : currentSemesterSummary ? (
                <MetricStrip
                  metrics={[
                    { label: `${selectedSemester} · ${selectedYear}`, value: `${currentSemesterSummary.soMonHoc} môn`, dotColor: 'blue' },
                    { label: 'GPA HK (Hệ 4)', value: currentSemesterSummary.diemTBHocKyThang4.toFixed(2), dotColor: 'blue' },
                    { label: 'Điểm TB (Hệ 10)', value: currentSemesterSummary.diemTBHocKyThang10.toFixed(2), dotColor: 'slate' },
                    {
                      label: 'Tín chỉ kỳ',
                      value: `${currentSemesterSummary.tongTinChiTichLuy} / ${currentSemesterSummary.tongTinChiDangKy}`,
                      dotColor: 'emerald',
                    },
                    { label: 'Xếp loại HK', value: currentSemesterSummary.xepLoaiHocKy, dotColor: 'emerald', isMono: false },
                  ]}
                />
              ) : null}

              {currentViewGrades.length === 0 ? (
                <FilteredEmptyState onClearFilters={clearFilters} />
              ) : selectedSemester === 'ALL' ? (
                <div className="space-y-4">
                  {availableSemestersInYear.map((sem) => {
                    const semGrades = currentViewGrades.filter(
                      (g) => g.hocKy?.trim() === sem.trim()
                    );
                    if (semGrades.length === 0) return null;
                    const semSummary = calculateSemesterSummary(grades, sem, selectedYear);
                    return (
                      <div
                        key={sem}
                        className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden"
                      >
                        <div className="bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                            <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-mono text-[11px]">
                              {sem}
                            </span>
                            <span>Học kỳ {sem} · {selectedYear}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 font-mono tabular-nums flex-wrap">
                            <span>
                              GPA: <strong className="text-blue-700 dark:text-blue-400">{semSummary.diemTBHocKyThang4.toFixed(2)}</strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Hệ 10: <strong className="text-slate-900 dark:text-slate-100">{semSummary.diemTBHocKyThang10.toFixed(2)}</strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              TC: <strong className="text-slate-900 dark:text-slate-100">{semSummary.tongTinChiTichLuy}/{semSummary.tongTinChiDangKy}</strong>
                            </span>
                            <StatusBadge label={semSummary.xepLoaiHocKy} variant="info" />
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">Mã MH</th>
                                <th className="py-2.5 px-3">Tên môn học</th>
                                <th className="py-2.5 px-3 text-center">TC</th>
                                <th className="py-2.5 px-3 text-center">CC (10%)</th>
                                <th className="py-2.5 px-3 text-center">GK (30%)</th>
                                <th className="py-2.5 px-3 text-center">CK (60%)</th>
                                <th className="py-2.5 px-3 text-center">Hệ 10</th>
                                <th className="py-2.5 px-3 text-center">Hệ 4</th>
                                <th className="py-2.5 px-3 text-center">Điểm chữ</th>
                                <th className="py-2.5 px-3 text-center">Kết quả</th>
                              </tr>
                            </thead>
                            {renderGradeRows(semGrades)}
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Mã MH</th>
                          <th className="py-2.5 px-3">Tên môn học</th>
                          <th className="py-2.5 px-3 text-center">TC</th>
                          <th className="py-2.5 px-3 text-center">CC (10%)</th>
                          <th className="py-2.5 px-3 text-center">GK (30%)</th>
                          <th className="py-2.5 px-3 text-center">CK (60%)</th>
                          <th className="py-2.5 px-3 text-center">Hệ 10</th>
                          <th className="py-2.5 px-3 text-center">Hệ 4</th>
                          <th className="py-2.5 px-3 text-center">Điểm chữ</th>
                          <th className="py-2.5 px-3 text-center">Kết quả</th>
                        </tr>
                      </thead>
                      {renderGradeRows(currentViewGrades)}
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: CUMULATIVE */}
      {activeTab === 'CUMULATIVE' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-md border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <GraduationCap className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>Bảng điểm toàn khóa</span>
              </div>
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCumulativeViewStyle('GROUPED')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    cumulativeViewStyle === 'GROUPED'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-600'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Theo năm học</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCumulativeViewStyle('UNIFIED')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    cumulativeViewStyle === 'UNIFIED'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-600'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Danh sách hợp nhất</span>
                </button>
              </div>
            </div>

            <DataToolbar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Tìm theo mã môn, tên môn, học kỳ..."
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              filters={
                <select
                  aria-label="Lọc theo kết quả môn học"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'PASSED' | 'FAILED')}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="ALL">Tất cả ({grades.length})</option>
                  <option value="PASSED">
                    Đạt ({grades.filter((g) => g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0).length})
                  </option>
                  <option value="FAILED">Chưa đạt ({cumulativeSummary.soMonNoTinChi})</option>
                </select>
              }
            />
          </div>

          {availableYears.length === 0 ? (
            <EmptyState message="Chưa có dữ liệu." />
          ) : currentViewGrades.length === 0 ? (
            <FilteredEmptyState onClearFilters={clearFilters} />
          ) : cumulativeViewStyle === 'GROUPED' ? (
            <div className="space-y-4">
              {availableYears.map((yr) => {
                const yearGrades = currentViewGrades.filter((g) => g.namHoc?.trim() === yr.trim());
                if (yearGrades.length === 0) return null;
                const yrSummary = calculateYearSummary(grades, yr);
                const yrSemesters = (
                  Array.from(new Set(yearGrades.map((g) => g.hocKy?.trim()).filter(Boolean))) as string[]
                ).sort();

                return (
                  <div key={yr} className="space-y-2.5">
                    <div className="bg-slate-100 dark:bg-slate-900 px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                        <span>Năm học {yr}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300 flex-wrap">
                        <span>
                          GPA năm: <strong className="text-blue-700 dark:text-blue-400">{yrSummary.diemTBNamHocThang4.toFixed(2)}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Hệ 10: <strong className="text-slate-900 dark:text-slate-100">{yrSummary.diemTBNamHocThang10.toFixed(2)}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          TC đạt: <strong className="text-slate-900 dark:text-slate-100">{yrSummary.tongTinChiTichLuy}/{yrSummary.tongTinChiDangKy}</strong>
                        </span>
                        <StatusBadge label={yrSummary.xepLoaiNamHoc} variant="info" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {yrSemesters.map((sem) => {
                        const semGrades = yearGrades.filter((g) => g.hocKy?.trim() === sem.trim());
                        const semSummary = calculateSemesterSummary(grades, sem, yr);
                        return (
                          <div
                            key={sem}
                            className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden"
                          >
                            <div className="bg-slate-50 dark:bg-slate-900 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono text-[11px]">
                                  {sem}
                                </span>
                                <span>Học kỳ {sem}</span>
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-3 font-mono tabular-nums">
                                <span>
                                  GPA HK: <strong className="text-blue-700 dark:text-blue-400">{semSummary.diemTBHocKyThang4.toFixed(2)}</strong>
                                </span>
                                <span>
                                  TC: <strong className="text-slate-900 dark:text-slate-100">{semSummary.tongTinChiTichLuy}/{semSummary.tongTinChiDangKy}</strong>
                                </span>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                                  <tr>
                                    <th className="py-2 px-3">Mã MH</th>
                                    <th className="py-2 px-3">Tên môn học</th>
                                    <th className="py-2 px-3 text-center">TC</th>
                                    <th className="py-2 px-3 text-center">CC</th>
                                    <th className="py-2 px-3 text-center">GK</th>
                                    <th className="py-2 px-3 text-center">CK</th>
                                    <th className="py-2 px-3 text-center">Hệ 10</th>
                                    <th className="py-2 px-3 text-center">Hệ 4</th>
                                    <th className="py-2 px-3 text-center">Điểm chữ</th>
                                    <th className="py-2 px-3 text-center">Kết quả</th>
                                  </tr>
                                </thead>
                                {renderGradeRows(semGrades)}
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Học kỳ / Năm</th>
                      <th className="py-2.5 px-3">Mã MH</th>
                      <th className="py-2.5 px-3">Tên môn học</th>
                      <th className="py-2.5 px-3 text-center">TC</th>
                      <th className="py-2.5 px-3 text-center">CC (10%)</th>
                      <th className="py-2.5 px-3 text-center">GK (30%)</th>
                      <th className="py-2.5 px-3 text-center">CK (60%)</th>
                      <th className="py-2.5 px-3 text-center">Hệ 10</th>
                      <th className="py-2.5 px-3 text-center">Hệ 4</th>
                      <th className="py-2.5 px-3 text-center">Điểm chữ</th>
                      <th className="py-2.5 px-3 text-center">Kết quả</th>
                    </tr>
                  </thead>
                  {renderGradeRows(currentViewGrades, true)}
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        availableYears.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu." />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tỷ lệ tín chỉ đạt
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                    {cumulativeSummary.tongTinChiTichLuy}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    / {totalRegisteredCredits} TC đã đăng ký
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all"
                    style={{
                      width: `${
                        totalRegisteredCredits > 0
                          ? Math.min(100, (cumulativeSummary.tongTinChiTichLuy / totalRegisteredCredits) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Xếp loại học lực
                </span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl font-bold text-blue-700 dark:text-blue-400">
                    {cumulativeSummary.xepLoaiHocLuc}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                    GPA {cumulativeSummary.diemTBTichLuyThang4.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Hệ 10: {cumulativeSummary.diemTBTichLuyThang10.toFixed(2)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Môn chưa đạt
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      cumulativeSummary.soMonNoTinChi > 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {cumulativeSummary.soMonNoTinChi}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">môn</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <StatusBadge
                    label={cumulativeSummary.soMonNoTinChi === 0 ? 'Không nợ môn' : 'Cần học/thi lại'}
                    variant={cumulativeSummary.soMonNoTinChi === 0 ? 'success' : 'danger'}
                    dot
                  />
                  {cumulativeSummary.soMonNoTinChi > 0 && onOpenRetakeRegister && (
                    <button
                      type="button"
                      onClick={() => onOpenRetakeRegister('')}
                      className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-0.5"
                    >
                      <span>Đăng ký thi lại</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Thống kê GPA theo học kỳ
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Học kỳ</th>
                      <th className="py-2.5 px-3">Năm học</th>
                      <th className="py-2.5 px-3 text-center">Số môn</th>
                      <th className="py-2.5 px-3 text-center">TC đăng ký</th>
                      <th className="py-2.5 px-3 text-center">TC đạt</th>
                      <th className="py-2.5 px-3 text-center">GPA HK (Hệ 4)</th>
                      <th className="py-2.5 px-3 text-center">Điểm TB (Hệ 10)</th>
                      <th className="py-2.5 px-3 text-center">Xếp loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {availableYears.map((yr) => {
                      const yrGrades = grades.filter((g) => g.namHoc?.trim() === yr.trim());
                      const sems = (
                        Array.from(new Set(yrGrades.map((g) => g.hocKy?.trim()).filter(Boolean))) as string[]
                      ).sort();
                      return sems.map((sem) => {
                        const semSummary = calculateSemesterSummary(grades, sem, yr);
                        return (
                          <tr
                            key={`${yr}-${sem}`}
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {sem}
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums">{yr}</td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">{semSummary.soMonHoc}</td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">{semSummary.tongTinChiDangKy}</td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                              {semSummary.tongTinChiTichLuy}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-blue-700 dark:text-blue-400">
                              {semSummary.diemTBHocKyThang4.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                              {semSummary.diemTBHocKyThang10.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <StatusBadge label={semSummary.xepLoaiHocKy} variant="info" />
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* Print Preview Modal */}
      {isPrintModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby={printTitleId}
          onClick={() => setIsPrintModalOpen(false)}
        >
          <div
            ref={printModalRef}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-4xl w-full p-6 shadow-lg relative my-6 max-h-[90vh] overflow-y-auto space-y-4 print-page"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="text-center flex-1">
                <div className="text-[11px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                  Trường Đại học Trần Đại Nghĩa
                </div>
                <h2
                  id={printTitleId}
                  className="text-base font-bold uppercase text-slate-900 dark:text-slate-100 mt-0.5"
                >
                  Bảng điểm kết quả học tập toàn khóa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                aria-label="Đóng bản xem trước"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer no-print"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Họ và tên</span>
                <strong className="text-slate-900 dark:text-slate-100">{studentDisplayName}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Mã sinh viên</span>
                <strong className="text-blue-700 dark:text-blue-400 font-mono">{studentDisplayCode}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Lớp</span>
                <strong className="text-slate-900 dark:text-slate-100">{student?.lop || 'Chưa cập nhật'}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Khoa</span>
                <strong className="text-slate-900 dark:text-slate-100">{student?.khoa || 'Chưa cập nhật'}</strong>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-2.5">STT</th>
                    <th className="py-2 px-2.5">Học kỳ / Năm</th>
                    <th className="py-2 px-2.5">Mã MH</th>
                    <th className="py-2 px-2.5">Tên môn học</th>
                    <th className="py-2 px-2.5 text-center">TC</th>
                    <th className="py-2 px-2.5 text-center">Hệ 10</th>
                    <th className="py-2 px-2.5 text-center">Hệ 4</th>
                    <th className="py-2 px-2.5 text-center">Điểm chữ</th>
                    <th className="py-2 px-2.5 text-center">Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {grades.map((g, idx) => (
                    <tr key={g.id}>
                      <td className="py-2 px-2.5 font-mono tabular-nums text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-2.5 font-mono tabular-nums whitespace-nowrap">
                        {g.hocKy} ({g.namHoc})
                      </td>
                      <td className="py-2 px-2.5 font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {g.maMH}
                      </td>
                      <td className="py-2 px-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {g.tenMH || g.maMH}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono tabular-nums">{g.soTinChi || 3}</td>
                      <td className="py-2 px-2.5 text-center font-mono tabular-nums font-semibold">{g.diemTongKet10}</td>
                      <td className="py-2 px-2.5 text-center font-mono tabular-nums font-semibold">{g.diemThang4}</td>
                      <td className="py-2 px-2.5 text-center font-mono font-bold">
                        {g.diemChu === 'A+' ? 'A' : g.diemChu}
                      </td>
                      <td className="py-2 px-2.5 text-center font-medium">
                        {g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0 ? 'Đạt' : 'Chưa đạt'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <MetricStrip
              metrics={[
                { label: 'Tổng tín chỉ tích lũy', value: `${cumulativeSummary.tongTinChiTichLuy} TC`, dotColor: 'emerald' },
                { label: 'GPA tích lũy (Hệ 4)', value: cumulativeSummary.diemTBTichLuyThang4.toFixed(2), dotColor: 'blue' },
                { label: 'Điểm TB tích lũy (Hệ 10)', value: cumulativeSummary.diemTBTichLuyThang10.toFixed(2), dotColor: 'slate' },
                { label: 'Xếp loại học lực', value: cumulativeSummary.xepLoaiHocLuc, dotColor: 'emerald', isMono: false },
              ]}
            />

            {printNotice && (
              <div
                role="status"
                className="no-print p-2.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-xs text-blue-900 dark:text-blue-200"
              >
                {printNotice}
              </div>
            )}

            <div className="pt-2 flex flex-wrap justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => {
                  setPrintNotice(null);
                  setIsPrintModalOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Xuất Excel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const ok = downloadPrintableHtml(printModalRef.current, {
                    title: `Bảng điểm ${studentDisplayName} (${studentDisplayCode})`,
                    filename: `TDNU_BangDiem_${studentDisplayCode}.html`,
                  });
                  if (ok) {
                    setPrintNotice('Đã tải xuống tệp bản in (.html). Mở tệp và nhấn Ctrl+P để in hoặc lưu PDF.');
                  }
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Tải bản in (HTML)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrintNotice(null);
                  triggerPrintWithFallback({
                    element: printModalRef.current,
                    title: `Bảng điểm ${studentDisplayName} (${studentDisplayCode})`,
                    filename: `TDNU_BangDiem_${studentDisplayCode}.html`,
                    onFallback: () => {
                      setPrintNotice(
                        'Khung xem trước đang chặn hộp thoại in trực tiếp. Đã tự động tải xuống tệp bản in (.html) — mở tệp và nhấn Ctrl+P để in hoặc lưu PDF.'
                      );
                    },
                  });
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In bảng điểm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
