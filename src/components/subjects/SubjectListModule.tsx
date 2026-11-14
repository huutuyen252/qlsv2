import React, { useEffect, useState, useMemo } from 'react';
import { HocKy, MonHoc, NamHoc, SinhVien, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { isSubjectMatchingClass } from '../../utils/subjectHelper';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Download,
  Upload,
  X,
  AlertCircle,
  Layers,
  Table as TableIcon,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  PageHeader,
  MetricStrip,
  DataToolbar,
  StatusBadge,
  PaginationBar,
  ConfirmDialog,
  LoadingState,
  EmptyState,
  FilteredEmptyState,
  ErrorBanner,
  ErrorState,
} from '../common';

interface SubjectListModuleProps {
  subjects: MonHoc[];
  students?: SinhVien[];
  userRole?: UserRole;
  studentClass?: string;
  semesters?: HocKy[];
  academicYears?: NamHoc[];
  isLoading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}

export const SubjectListModule: React.FC<SubjectListModuleProps> = ({
  subjects,
  students = [],
  userRole = 'ADMIN',
  studentClass,
  semesters: semestersProp = [],
  academicYears: academicYearsProp = [],
  isLoading = false,
  loadError = null,
  onRetryLoad,
  onRefreshData,
  showToast,
}) => {
  const isAdminOrLecturer = userRole === 'ADMIN' || userRole === 'LECTURER';

  // Dynamic class list from students and subjects
  const classList = useMemo(() => {
    const studentClasses = students
      .map((s) => s.lop?.trim())
      .filter((l): l is string => Boolean(l));
    const subjectClasses = subjects
      .map((s) => s.lop?.trim())
      .filter((l): l is string => Boolean(l) && l !== 'ALL');
    return Array.from(new Set([...studentClasses, ...subjectClasses])).sort();
  }, [students, subjects]);

  // Dynamic semesters and academic years (DB masters + existing subjects)
  const semesters = useMemo(() => {
    const set = new Set<string>();
    semestersProp.forEach((hk) => hk.hocKyID?.trim() && set.add(hk.hocKyID.trim()));
    subjects.forEach((s) => s.hocKy?.trim() && set.add(s.hocKy.trim()));
    return Array.from(set);
  }, [semestersProp, subjects]);

  const academicYears = useMemo(() => {
    const set = new Set<string>();
    academicYearsProp.forEach((yr) => {
      const val = (yr.tenNamHoc || yr.namHocID || '').trim();
      if (val) set.add(val);
    });
    subjects.forEach((s) => s.namHoc?.trim() && set.add(s.namHoc.trim()));
    return Array.from(set);
  }, [academicYearsProp, subjects]);

  // Dynamic faculty list
  const facultyList = useMemo(
    () =>
      Array.from(
        new Set(
          subjects
            .map((s) => s.khoaPhuTrach?.trim())
            .filter((f): f is string => Boolean(f))
        )
      ).sort(),
    [subjects]
  );

  // Dynamic subject types
  const loaiMonList = useMemo(() => {
    const set = new Set<string>(['Bắt buộc', 'Tự chọn']);
    subjects.forEach((s) => s.loaiMon?.trim() && set.add(s.loaiMon.trim()));
    return Array.from(set);
  }, [subjects]);

  // Component state
  const [viewMode, setViewMode] = useState<'DATAGRID' | 'ROADMAP'>('DATAGRID');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('ALL');
  const [selectedLoaiMon, setSelectedLoaiMon] = useState<string>('ALL');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Student scope lock
  const effectiveClass = userRole === 'STUDENT' ? (studentClass || 'ALL') : selectedClass;

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.maMH.toLowerCase().includes(q) ||
        s.tenMH.toLowerCase().includes(q) ||
        (s.khoaPhuTrach && s.khoaPhuTrach.toLowerCase().includes(q)) ||
        (s.lop && s.lop.toLowerCase().includes(q));

      const matchesClass = isSubjectMatchingClass(s, effectiveClass);

      const matchesSemester =
        selectedSemester === 'ALL' ||
        !s.hocKy ||
        s.hocKy.toLowerCase() === selectedSemester.toLowerCase();

      const matchesAcademicYear =
        selectedAcademicYear === 'ALL' ||
        !s.namHoc ||
        s.namHoc.toLowerCase() === selectedAcademicYear.toLowerCase();

      const matchesLoaiMon =
        selectedLoaiMon === 'ALL' ||
        (s.loaiMon && s.loaiMon.toLowerCase() === selectedLoaiMon.toLowerCase());

      const matchesFaculty =
        selectedFaculty === 'ALL' ||
        (s.khoaPhuTrach && s.khoaPhuTrach.toLowerCase() === selectedFaculty.toLowerCase());

      return (
        matchesSearch &&
        matchesClass &&
        matchesSemester &&
        matchesAcademicYear &&
        matchesLoaiMon &&
        matchesFaculty
      );
    });
  }, [
    subjects,
    searchTerm,
    effectiveClass,
    selectedSemester,
    selectedAcademicYear,
    selectedLoaiMon,
    selectedFaculty,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, effectiveClass, selectedSemester, selectedAcademicYear, selectedLoaiMon, selectedFaculty]);

  const paginatedSubjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubjects.slice(start, start + pageSize);
  }, [filteredSubjects, currentPage, pageSize]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    selectedClass !== 'ALL' ||
    selectedSemester !== 'ALL' ||
    selectedAcademicYear !== 'ALL' ||
    selectedLoaiMon !== 'ALL' ||
    selectedFaculty !== 'ALL';

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedClass('ALL');
    setSelectedSemester('ALL');
    setSelectedAcademicYear('ALL');
    setSelectedLoaiMon('ALL');
    setSelectedFaculty('ALL');
  };

  // Aggregate metrics
  const totalCredits = useMemo(
    () => filteredSubjects.reduce((sum, s) => sum + (s.soTinChi || 0), 0),
    [filteredSubjects]
  );
  const compulsoryCount = useMemo(
    () =>
      filteredSubjects.filter(
        (s) => !s.loaiMon || s.loaiMon.toLowerCase().includes('bắt buộc')
      ).length,
    [filteredSubjects]
  );
  const electiveCount = filteredSubjects.length - compulsoryCount;

  // Grouped by semester for Curriculum Roadmap View
  const groupedBySemester = useMemo(() => {
    const groups: { [key: string]: MonHoc[] } = {};
    filteredSubjects.forEach((s) => {
      const semKey = s.hocKy ? s.hocKy : 'Chưa phân kỳ';
      if (!groups[semKey]) groups[semKey] = [];
      groups[semKey].push(s);
    });
    return groups;
  }, [filteredSubjects]);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<MonHoc | null>(null);
  const [form, setForm] = useState({
    id: '',
    maMH: '',
    tenMH: '',
    soTinChi: 3,
    khoaPhuTrach: '',
    loaiMon: 'Bắt buộc',
    hocKy: '',
    namHoc: '',
    lop: 'ALL',
  });
  const [customLop, setCustomLop] = useState('');
  const [modalError, setModalError] = useState('');

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<MonHoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close Add/Edit modal on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isModalOpen]);

  // Handlers
  const handleOpenAddModal = () => {
    setEditingSubject(null);
    setForm({
      id: '',
      maMH: '',
      tenMH: '',
      soTinChi: 3,
      khoaPhuTrach: facultyList[0] || '',
      loaiMon: 'Bắt buộc',
      hocKy: selectedSemester !== 'ALL' ? selectedSemester : (semesters[0] || ''),
      namHoc: selectedAcademicYear !== 'ALL' ? selectedAcademicYear : (academicYears[0] || ''),
      lop: selectedClass !== 'ALL' ? selectedClass : 'ALL',
    });
    setCustomLop('');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (subject: MonHoc) => {
    setEditingSubject(subject);
    const subjectLop = subject.lop || 'ALL';
    const isCustom = subjectLop !== 'ALL' && !classList.includes(subjectLop);

    setForm({
      id: subject.id || '',
      maMH: subject.maMH,
      tenMH: subject.tenMH,
      soTinChi: subject.soTinChi,
      khoaPhuTrach: subject.khoaPhuTrach || '',
      loaiMon: subject.loaiMon || 'Bắt buộc',
      hocKy: subject.hocKy || '',
      namHoc: subject.namHoc || '',
      lop: isCustom ? 'CUSTOM' : subjectLop,
    });
    setCustomLop(isCustom ? subjectLop : '');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrLecturer) {
      setModalError('Bạn không có quyền thực hiện thao tác này.');
      return;
    }
    if (!form.maMH.trim() || !form.tenMH.trim()) {
      setModalError('Vui lòng nhập đầy đủ Mã môn học và Tên môn học.');
      return;
    }

    const finalLop = form.lop === 'CUSTOM' ? customLop.trim() : form.lop;
    if (!finalLop) {
      setModalError('Vui lòng chọn hoặc nhập Lớp áp dụng môn học.');
      return;
    }

    if (editingSubject) {
      const res = await apiService.updateSubject(editingSubject.maMH, {
        id: editingSubject.id,
        tenMH: form.tenMH.trim(),
        soTinChi: Number(form.soTinChi) || 1,
        khoaPhuTrach: form.khoaPhuTrach.trim(),
        loaiMon: form.loaiMon,
        hocKy: form.hocKy.trim(),
        namHoc: form.namHoc.trim(),
        lop: finalLop,
      });
      if (res.success) {
        showToast(res.message);
        setIsModalOpen(false);
        onRefreshData();
      } else {
        setModalError(res.message);
      }
    } else {
      const res = await apiService.addSubject({
        maMH: form.maMH.trim(),
        tenMH: form.tenMH.trim(),
        soTinChi: Number(form.soTinChi) || 1,
        khoaPhuTrach: form.khoaPhuTrach.trim(),
        loaiMon: form.loaiMon,
        hocKy: form.hocKy.trim(),
        namHoc: form.namHoc.trim(),
        lop: finalLop,
      });
      if (res.success) {
        showToast(res.message);
        setIsModalOpen(false);
        onRefreshData();
      } else {
        setModalError(res.message);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await apiService.deleteSubject(
        deleteTarget.maMH,
        deleteTarget.id,
        deleteTarget.lop
      );
      showToast(res.message);
      setDeleteTarget(null);
      onRefreshData();
    } catch {
      showToast('Đã xảy ra lỗi khi xóa môn học.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Mã Môn Học': 'CNTT101',
        'Tên Môn Học': 'Lập trình Hướng đối tượng',
        'Số Tín Chỉ': 3,
        'Lớp Áp Dụng': 'ALL',
        'Học Kỳ': semesters[0] || 'HK1',
        'Năm Học': academicYears[0] || '',
        'Khoa / Bộ Môn Phụ Trách': facultyList[0] || 'Khoa Công nghệ thông tin',
        'Loại Môn': 'Bắt buộc',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MauMonHoc');
    XLSX.writeFile(wb, 'Mau_Import_Mon_Hoc_TDNU.xlsx');
    showToast('Đã tải xuống file mẫu Excel.');
  };

  const handleExportExcel = () => {
    if (filteredSubjects.length === 0) {
      showToast('Không có dữ liệu môn học để xuất Excel.');
      return;
    }
    const exportData = filteredSubjects.map((s, idx) => ({
      STT: idx + 1,
      'Mã Môn Học': s.maMH,
      'Tên Môn Học': s.tenMH,
      'Số Tín Chỉ': s.soTinChi,
      'Lớp Áp Dụng': s.lop && s.lop !== 'ALL' ? s.lop : 'Tất cả các lớp',
      'Học Kỳ': s.hocKy || '',
      'Năm Học': s.namHoc || '',
      'Khoa / Bộ Môn Phụ Trách': s.khoaPhuTrach || '',
      'Loại Môn': s.loaiMon || 'Bắt buộc',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MonHocHocPhan');
    XLSX.writeFile(
      workbook,
      `Danh_Sach_Mon_Hoc_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast('Đã xuất file Excel danh sách môn học.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          showToast('File Excel không có dữ liệu.');
          return;
        }

        const parsedSubjects: Partial<MonHoc>[] = data
          .map((row) => ({
            maMH: String(
              row['Mã Môn Học'] ||
                row['maMH'] ||
                row['MÃ MÔN HỌC'] ||
                row['Mã môn'] ||
                ''
            ).trim(),
            tenMH: String(
              row['Tên Môn Học'] ||
                row['tenMH'] ||
                row['TÊN MÔN HỌC'] ||
                row['Tên môn'] ||
                ''
            ).trim(),
            soTinChi: Number(
              row['Số Tín Chỉ'] ||
                row['soTinChi'] ||
                row['SỐ TÍN CHỈ'] ||
                row['Tín chỉ'] ||
                3
            ),
            lop: String(
              row['Lớp Áp Dụng'] ||
                row['Lớp'] ||
                row['Lop'] ||
                row['lop'] ||
                row['Mã Lớp'] ||
                'ALL'
            ).trim(),
            hocKy: String(
              row['Học Kỳ'] ||
                row['hocKy'] ||
                row['HỌC KỲ'] ||
                row['Học kì'] ||
                ''
            ).trim(),
            namHoc: String(
              row['Năm Học'] ||
                row['namHoc'] ||
                row['NĂM HỌC'] ||
                row['Năm'] ||
                ''
            ).trim(),
            khoaPhuTrach: String(
              row['Khoa / Bộ Môn Phụ Trách'] ||
                row['khoaPhuTrach'] ||
                row['Khoa'] ||
                ''
            ).trim(),
            loaiMon: String(row['Loại Môn'] || row['loaiMon'] || 'Bắt buộc').trim(),
          }))
          .filter((s) => s.maMH && s.tenMH);

        if (parsedSubjects.length === 0) {
          showToast('Không tìm thấy cột Mã Môn Học và Tên Môn Học hợp lệ trong file Excel.');
          return;
        }

        const res = await apiService.importSubjects(parsedSubjects);
        showToast(res.message);
        onRefreshData();
      } catch {
        showToast('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  if (isLoading && subjects.length === 0) {
    return (
      <div id="subject-list-module" className="space-y-4">
        <PageHeader title="Môn Học & Học Phần" icon={BookOpen} />
        <LoadingState rows={6} />
      </div>
    );
  }

  if (loadError && subjects.length === 0) {
    return (
      <div id="subject-list-module" className="space-y-4">
        <PageHeader title="Môn Học & Học Phần" icon={BookOpen} />
        <ErrorState type="error" message={loadError} onRetry={onRetryLoad} />
      </div>
    );
  }

  const metricItems = [
    {
      label: 'Môn học',
      value: `${filteredSubjects.length} / ${subjects.length}`,
      dotColor: 'blue' as const,
    },
    {
      label: 'Tổng tín chỉ',
      value: totalCredits,
      dotColor: 'amber' as const,
    },
    {
      label: 'Bắt buộc',
      value: compulsoryCount,
      dotColor: 'emerald' as const,
    },
    {
      label: 'Tự chọn',
      value: electiveCount,
      dotColor: 'slate' as const,
    },
    ...(userRole === 'STUDENT' && studentClass
      ? [
          {
            label: 'Lớp sinh hoạt',
            value: studentClass,
            dotColor: 'blue' as const,
          },
        ]
      : []),
  ];

  return (
    <div id="subject-list-module" className="space-y-4">
      <PageHeader
        title="Môn Học & Học Phần"
        icon={BookOpen}
        actions={
          <>
            {isAdminOrLecturer && (
              <button
                id="btn-add-subject"
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Môn Học</span>
              </button>
            )}

            {isAdminOrLecturer && (
              <button
                id="btn-download-subject-template"
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mẫu Excel</span>
              </button>
            )}

            {isAdminOrLecturer && (
              <label
                htmlFor="input-import-subjects-excel"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Import Excel</span>
                <input
                  id="input-import-subjects-excel"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            <button
              id="btn-export-subjects-excel"
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Xuất Excel</span>
            </button>
          </>
        }
      />

      {loadError && <ErrorBanner message={loadError} onRetry={onRetryLoad} />}

      <MetricStrip metrics={metricItems} />

      <div className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800">
        <DataToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Tìm theo mã môn, tên môn học, khoa..."
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          filters={
            <>
              {userRole !== 'STUDENT' && (
                <select
                  id="select-class-filter"
                  aria-label="Lọc theo lớp"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="ALL">Tất cả lớp</option>
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      Lớp {c}
                    </option>
                  ))}
                </select>
              )}

              <select
                id="select-semester-filter"
                aria-label="Lọc theo học kỳ"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value="ALL">Tất cả học kỳ</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>

              <select
                id="select-year-filter"
                aria-label="Lọc theo năm học"
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value="ALL">Tất cả năm học</option>
                {academicYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              <select
                id="select-loaimon-filter"
                aria-label="Lọc theo loại môn"
                value={selectedLoaiMon}
                onChange={(e) => setSelectedLoaiMon(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value="ALL">Tất cả loại môn</option>
                {loaiMonList.map((lm) => (
                  <option key={lm} value={lm}>
                    {lm}
                  </option>
                ))}
              </select>

              {facultyList.length > 0 && (
                <select
                  id="select-faculty-filter"
                  aria-label="Lọc theo khoa phụ trách"
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer max-w-[160px] truncate"
                >
                  <option value="ALL">Tất cả khoa</option>
                  {facultyList.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              )}
            </>
          }
          actions={
            <div
              role="tablist"
              aria-label="Chế độ hiển thị môn học"
              className="inline-flex items-center p-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-medium"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'DATAGRID'}
                onClick={() => setViewMode('DATAGRID')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'DATAGRID'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-semibold border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Bảng dữ liệu</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'ROADMAP'}
                onClick={() => setViewMode('ROADMAP')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'ROADMAP'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-semibold border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Theo học kỳ</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Main Content View */}
      {subjects.length === 0 ? (
        <EmptyState
          message="Chưa có dữ liệu môn học."
          action={
            isAdminOrLecturer ? (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Môn Học</span>
              </button>
            ) : undefined
          }
        />
      ) : filteredSubjects.length === 0 ? (
        <FilteredEmptyState onClearFilters={handleClearFilters} />
      ) : viewMode === 'DATAGRID' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <tr>
                  <th scope="col" className="px-3 py-2.5 w-12 text-center">
                    STT
                  </th>
                  <th scope="col" className="px-3 py-2.5 w-28">
                    Mã môn
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Tên môn học & Học phần
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center w-20">
                    Tín chỉ
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center w-28">
                    Loại môn
                  </th>
                  <th scope="col" className="px-3 py-2.5 w-32">
                    Lớp áp dụng
                  </th>
                  <th scope="col" className="px-3 py-2.5 w-36">
                    Học kỳ / Năm học
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Khoa / Bộ môn
                  </th>
                  {isAdminOrLecturer && (
                    <th scope="col" className="px-3 py-2.5 text-right w-24">
                      Thao tác
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {paginatedSubjects.map((subject, idx) => {
                  const isSpecificClass = subject.lop && subject.lop !== 'ALL';
                  const isCompulsory =
                    !subject.loaiMon ||
                    subject.loaiMon.toLowerCase().includes('bắt buộc');
                  const rowIndex = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={subject.id || `${subject.maMH}_${subject.lop || 'all'}_${rowIndex}`}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-center text-slate-500 dark:text-slate-400 font-mono tabular-nums text-[11px]">
                        {rowIndex}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-blue-700 dark:text-blue-400">
                        {subject.maMH}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {subject.tenMH}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono tabular-nums font-semibold">
                        {subject.soTinChi}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <StatusBadge
                          label={subject.loaiMon || 'Bắt buộc'}
                          variant={isCompulsory ? 'info' : 'warning'}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {isSpecificClass ? (
                          <StatusBadge label={subject.lop || ''} variant="neutral" className="font-mono" />
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Chung
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                        {subject.hocKy || '—'}
                        {subject.namHoc ? ` · ${subject.namHoc}` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                        {subject.khoaPhuTrach || '—'}
                      </td>
                      {isAdminOrLecturer && (
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              id={`btn-edit-subject-${subject.maMH}`}
                              onClick={() => handleOpenEditModal(subject)}
                              aria-label={`Chỉnh sửa môn ${subject.tenMH}`}
                              title="Chỉnh sửa môn học"
                              className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              id={`btn-delete-subject-${subject.maMH}`}
                              onClick={() => setDeleteTarget(subject)}
                              aria-label={`Xóa môn ${subject.tenMH}`}
                              title="Xóa môn học"
                              className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredSubjects.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedBySemester).map(([semName, semSubjects]) => {
            const semCredits = semSubjects.reduce(
              (sum, s) => sum + (s.soTinChi || 0),
              0
            );

            return (
              <div
                key={semName}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden"
              >
                <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                      {semName}
                    </h2>
                    <StatusBadge label={`${semSubjects.length} môn`} variant="neutral" />
                  </div>
                  <div className="text-xs font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                    Tổng: <strong className="text-blue-700 dark:text-blue-400">{semCredits}</strong> tín chỉ
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-2 w-10 text-center">STT</th>
                        <th className="px-3 py-2 w-28">Mã môn</th>
                        <th className="px-3 py-2">Tên môn học</th>
                        <th className="px-3 py-2 text-center w-20">Tín chỉ</th>
                        <th className="px-3 py-2 text-center w-28">Loại môn</th>
                        <th className="px-3 py-2 w-32">Lớp áp dụng</th>
                        <th className="px-3 py-2">Khoa phụ trách</th>
                        {isAdminOrLecturer && (
                          <th className="px-3 py-2 text-right w-24">Thao tác</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {semSubjects.map((subject, idx) => {
                        const isCompulsory =
                          !subject.loaiMon ||
                          subject.loaiMon.toLowerCase().includes('bắt buộc');

                        return (
                          <tr
                            key={subject.id || `${subject.maMH}_${idx}`}
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                          >
                            <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400 font-mono tabular-nums text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-mono font-semibold text-blue-700 dark:text-blue-400">
                              {subject.maMH}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                              {subject.tenMH}
                            </td>
                            <td className="px-3 py-2 text-center font-mono tabular-nums font-semibold">
                              {subject.soTinChi}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <StatusBadge
                                label={subject.loaiMon || 'Bắt buộc'}
                                variant={isCompulsory ? 'info' : 'warning'}
                              />
                            </td>
                            <td className="px-3 py-2 text-[11px]">
                              {subject.lop && subject.lop !== 'ALL' ? (
                                <StatusBadge label={subject.lop} variant="neutral" className="font-mono" />
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400">Chung</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                              {subject.khoaPhuTrach || '—'}
                            </td>
                            {isAdminOrLecturer && (
                              <td className="px-3 py-2 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(subject)}
                                    aria-label={`Chỉnh sửa môn ${subject.tenMH}`}
                                    title="Chỉnh sửa môn học"
                                    className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(subject)}
                                    aria-label={`Xóa môn ${subject.tenMH}`}
                                    title="Xóa môn học"
                                    className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT SUBJECT */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-lg w-full overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingSubject ? 'Chỉnh Sửa Môn Học' : 'Thêm Môn Học Mới'}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thoại"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto text-xs">
              {modalError && (
                <div role="alert" className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="subject-form-maMH" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã môn học <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="subject-form-maMH"
                    type="text"
                    required
                    disabled={Boolean(editingSubject)}
                    value={form.maMH}
                    onChange={(e) => setForm({ ...form, maMH: e.target.value })}
                    placeholder="VD: CNTT101"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="subject-form-tenMH" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên môn học & học phần <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="subject-form-tenMH"
                    type="text"
                    required
                    value={form.tenMH}
                    onChange={(e) => setForm({ ...form, tenMH: e.target.value })}
                    placeholder="VD: Lập trình Hướng đối tượng"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="subject-form-credits" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số tín chỉ
                  </label>
                  <input
                    id="subject-form-credits"
                    type="number"
                    min={1}
                    max={15}
                    value={form.soTinChi}
                    onChange={(e) =>
                      setForm({ ...form, soTinChi: Number(e.target.value) || 1 })
                    }
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono tabular-nums font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="subject-form-type" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Loại môn học
                  </label>
                  <select
                    id="subject-form-type"
                    value={form.loaiMon}
                    onChange={(e) => setForm({ ...form, loaiMon: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    {loaiMonList.map((lm) => (
                      <option key={lm} value={lm}>{lm}</option>
                    ))}
                    <option value="Đồ án / Khóa luận">Đồ án / Khóa luận</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="subject-form-lop" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lớp học áp dụng <span className="text-rose-600">*</span>
                </label>
                <select
                  id="subject-form-lop"
                  value={form.lop}
                  onChange={(e) => setForm({ ...form, lop: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="ALL">Tất cả các lớp (Áp dụng chung)</option>
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      Lớp {c}
                    </option>
                  ))}
                  <option value="CUSTOM">Tự nhập mã lớp khác...</option>
                </select>
                {form.lop === 'CUSTOM' && (
                  <input
                    id="subject-form-custom-lop"
                    type="text"
                    required
                    aria-label="Nhập mã lớp khác"
                    value={customLop}
                    onChange={(e) => setCustomLop(e.target.value)}
                    placeholder="Nhập mã lớp..."
                    className="w-full p-2 mt-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="subject-form-hocky" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Học kỳ
                  </label>
                  <input
                    id="subject-form-hocky"
                    type="text"
                    list="datalist-form-semesters"
                    value={form.hocKy}
                    onChange={(e) => setForm({ ...form, hocKy: e.target.value })}
                    placeholder="VD: HK1"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
                  />
                  <datalist id="datalist-form-semesters">
                    {semesters.map((sem) => (
                      <option key={sem} value={sem} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="subject-form-namhoc" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Năm học
                  </label>
                  <input
                    id="subject-form-namhoc"
                    type="text"
                    list="datalist-form-academic-years"
                    value={form.namHoc}
                    onChange={(e) => setForm({ ...form, namHoc: e.target.value })}
                    placeholder="VD: 2025-2026"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
                  />
                  <datalist id="datalist-form-academic-years">
                    {academicYears.map((yr) => (
                      <option key={yr} value={yr} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label htmlFor="subject-form-faculty" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Khoa / Bộ môn phụ trách
                </label>
                {facultyList.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      aria-label="Chọn khoa phụ trách"
                      value={
                        facultyList.includes(form.khoaPhuTrach)
                          ? form.khoaPhuTrach
                          : 'OTHER'
                      }
                      onChange={(e) => {
                        if (e.target.value !== 'OTHER') {
                          setForm({ ...form, khoaPhuTrach: e.target.value });
                        }
                      }}
                      className="w-1/2 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="">Chọn khoa</option>
                      {facultyList.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                      <option value="OTHER">Tự nhập khác...</option>
                    </select>
                    <input
                      id="subject-form-faculty"
                      type="text"
                      value={form.khoaPhuTrach}
                      onChange={(e) =>
                        setForm({ ...form, khoaPhuTrach: e.target.value })
                      }
                      placeholder="Tên khoa/bộ môn..."
                      className="w-1/2 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
                    />
                  </div>
                ) : (
                  <input
                    id="subject-form-faculty"
                    type="text"
                    value={form.khoaPhuTrach}
                    onChange={(e) =>
                      setForm({ ...form, khoaPhuTrach: e.target.value })
                    }
                    placeholder="Tên khoa/bộ môn..."
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
                  />
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold transition-colors cursor-pointer"
                >
                  {editingSubject ? 'Lưu Thay Đổi' : 'Tạo Môn Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xác Nhận Xóa Môn Học"
        message={
          deleteTarget
            ? `Bạn có chắc chắn muốn xóa môn học "${deleteTarget.tenMH}" (${deleteTarget.maMH})?`
            : ''
        }
        confirmLabel="Xóa Môn Học"
        variant="danger"
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
};
