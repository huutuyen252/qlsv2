import React, { useState, useEffect, useMemo, useId } from 'react';
import { Diem, SinhVien, MonHoc, UserRole, GpaSummary, User } from '../../types';
import { StudentGradeView } from './StudentGradeView';
import { StudentTranscriptModal } from './StudentTranscriptModal';
import {
  Award,
  Upload,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Folder,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Users,
  Layers,
  GraduationCap,
  Trash2,
  Plus,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ConfirmDialog,
  DataToolbar,
  EmptyState,
  ErrorBanner,
  ErrorState,
  FilteredEmptyState,
  LoadingState,
  MetricStrip,
  PageHeader,
  PaginationBar,
  StatusBadge,
} from '../common';

interface GradeManagementModuleProps {
  grades: Diem[];
  students: SinhVien[];
  subjects?: MonHoc[];
  userRole: UserRole;
  currentStudentCode?: string;
  currentUser?: User | null;
  onSaveGrade: (grade: Partial<Diem>) => void;
  onImportExcel: (grades: Partial<Diem>[]) => void;
  onCalculateGpa?: (maSV: string) => Promise<GpaSummary | null>;
  onDeleteGrade?: (id: string) => Promise<void>;
  onOpenRetakeRegister?: (maMH: string) => void;
  isLoading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
}

interface GradeFormState {
  maSV: string;
  maMH: string;
  tenMH: string;
  soTinChi: string;
  hocKy: string;
  namHoc: string;
  diemChuyenCan: string;
  diemGiuaKy: string;
  diemCuoiKy: string;
}

const INITIAL_GRADE_FORM: GradeFormState = {
  maSV: '',
  maMH: '',
  tenMH: '',
  soTinChi: '',
  hocKy: '',
  namHoc: '',
  diemChuyenCan: '',
  diemGiuaKy: '',
  diemCuoiKy: '',
};

export const GradeManagementModule: React.FC<GradeManagementModuleProps> = ({
  grades,
  students,
  subjects = [],
  userRole,
  currentStudentCode,
  currentUser,
  onSaveGrade,
  onImportExcel,
  onDeleteGrade,
  onOpenRetakeRegister,
  isLoading = false,
  loadError = null,
  onRetryLoad,
}) => {
  const isStudent = userRole === 'STUDENT';
  const isAdminOrLecturer = userRole === 'ADMIN' || userRole === 'LECTURER';

  const activeStudentCode = useMemo(() => {
    return (
      currentStudentCode ||
      currentUser?.studentCode ||
      currentUser?.username ||
      ''
    )
      .trim()
      .toLowerCase();
  }, [currentStudentCode, currentUser]);

  const currentStudentObj = useMemo(() => {
    if (!isStudent || !activeStudentCode) return null;
    return students.find((s) => s.maSV.toLowerCase() === activeStudentCode) || null;
  }, [isStudent, activeStudentCode, students]);

  const ownStudentGrades = useMemo(() => {
    if (!isStudent) return [];
    if (!activeStudentCode) return [];
    return grades.filter((g) => g.maSV.toLowerCase() === activeStudentCode);
  }, [isStudent, activeStudentCode, grades]);

  const [selectedStudentForModal, setSelectedStudentForModal] = useState<SinhVien | null>(null);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [viewMode, setViewMode] = useState<'HIERARCHICAL' | 'FLAT'>('HIERARCHICAL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeFormState>(INITIAL_GRADE_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [gradeToDelete, setGradeToDelete] = useState<Diem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const modalTitleId = useId();
  const fieldMaSVId = useId();
  const fieldMaMHId = useId();
  const fieldHocKyId = useId();
  const fieldNamHocId = useId();
  const fieldCCId = useId();
  const fieldGKId = useId();
  const fieldCKId = useId();
  const filterCourseId = useId();
  const filterSemId = useId();
  const filterYearId = useId();

  useEffect(() => {
    if (!isGradeModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsGradeModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGradeModalOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, searchTerm, selectedCourse, selectedSemester, selectedYear, viewMode]);

  const availableClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.lop).filter(Boolean))).sort(),
    [students]
  );

  const subjectsForSelectedClass = useMemo(() => {
    if (!selectedClass) return subjects || [];
    return (subjects || []).filter((subject) => {
      if (!subject.lop?.trim()) return false;
      return subject.lop.trim().toLowerCase() === selectedClass.trim().toLowerCase();
    });
  }, [subjects, selectedClass]);

  const classStudentIds = useMemo(() => {
    const list = selectedClass ? students.filter((s) => s.lop === selectedClass) : students;
    return new Set(list.map((s) => s.maSV.toLowerCase()));
  }, [students, selectedClass]);

  const availableSemesters = useMemo(() => {
    const fromGrades = grades.map((g) => g.hocKy).filter(Boolean);
    const fromSubjects = subjects.map((s) => s.hocKy).filter(Boolean) as string[];
    return Array.from(new Set([...fromGrades, ...fromSubjects])).sort();
  }, [grades, subjects]);

  const availableYears = useMemo(() => {
    const fromGrades = grades.map((g) => g.namHoc).filter(Boolean);
    const fromSubjects = subjects.map((s) => s.namHoc).filter(Boolean) as string[];
    return Array.from(new Set([...fromGrades, ...fromSubjects])).sort().reverse();
  }, [grades, subjects]);

  const filteredGrades = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return grades.filter((g) => {
      const matchesClass = !selectedClass || classStudentIds.has(g.maSV.toLowerCase());
      const matchesSearch =
        !q ||
        g.maSV.toLowerCase().includes(q) ||
        (g.hoTenSV && g.hoTenSV.toLowerCase().includes(q)) ||
        g.maMH.toLowerCase().includes(q) ||
        (g.tenMH && g.tenMH.toLowerCase().includes(q));
      const matchesCourse = !selectedCourse || g.maMH === selectedCourse;
      const matchesSemester = !selectedSemester || g.hocKy === selectedSemester;
      const matchesYear = !selectedYear || g.namHoc === selectedYear;
      return matchesClass && matchesSearch && matchesCourse && matchesSemester && matchesYear;
    });
  }, [grades, selectedClass, classStudentIds, searchTerm, selectedCourse, selectedSemester, selectedYear]);

  const paginatedGrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGrades.slice(start, start + pageSize);
  }, [filteredGrades, currentPage, pageSize]);

  const gradeStats = useMemo(() => {
    const total = grades.length;
    const passed = grades.filter(
      (g) => g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0
    ).length;
    const failed = total - passed;
    return {
      total,
      passed,
      failed,
      classCount: availableClasses.length,
    };
  }, [grades, availableClasses]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      selectedSemester ||
      selectedYear ||
      (viewMode === 'FLAT' && selectedCourse)
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedSemester('');
    setSelectedYear('');
    if (viewMode === 'FLAT') {
      setSelectedCourse('');
    }
  };

  if (isStudent) {
    return (
      <div className="space-y-4">
        <PageHeader title="Bảng điểm & GPA" icon={Award} />
        {loadError && <ErrorBanner message={loadError} onRetry={onRetryLoad} />}
        {isLoading && grades.length === 0 ? (
          <LoadingState rows={6} />
        ) : (
          <StudentGradeView
            grades={ownStudentGrades}
            student={currentStudentObj}
            subjects={subjects}
            onOpenRetakeRegister={onOpenRetakeRegister}
          />
        )}
      </div>
    );
  }

  if (!isAdminOrLecturer) {
    return (
      <ErrorState
        type="403"
        message="Bạn không có quyền truy cập chức năng quản lý bảng điểm."
      />
    );
  }

  const handleExportExcel = () => {
    if (filteredGrades.length === 0) {
      setActionError('Chưa có dữ liệu điểm để xuất file Excel.');
      return;
    }
    setActionError(null);
    const exportData = filteredGrades.map((g, idx) => ({
      STT: idx + 1,
      'Mã Sinh Viên': g.maSV,
      'Họ và Tên': g.hoTenSV || '',
      'Mã Môn Học': g.maMH,
      'Tên Môn Học': g.tenMH || '',
      'Số Tín Chỉ': g.soTinChi || 3,
      'Học Kỳ': g.hocKy,
      'Năm Học': g.namHoc,
      'Điểm Chuyên Cần (10%)': g.diemChuyenCan,
      'Điểm Giữa Kỳ (30%)': g.diemGiuaKy,
      'Điểm Cuối Kỳ (60%)': g.diemCuoiKy,
      'Điểm Tổng Kết (10)': g.diemTongKet10,
      'Điểm Thang 4': g.diemThang4,
      'Điểm Chữ': g.diemChu,
      'Trạng Thái': g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0 ? 'Đạt' : 'Chưa đạt',
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangDiem');
    XLSX.writeFile(workbook, `BangDiem_SinhVien_${Date.now()}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      [
        'maSV',
        'hoTenSV',
        'maMH',
        'tenMH',
        'soTinChi',
        'hocKy',
        'namHoc',
        'diemChuyenCan',
        'diemGiuaKy',
        'diemCuoiKy',
      ],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MauImportDiem');
    XLSX.writeFile(workbook, 'Mau_Import_Diem_SinhVien.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionError(null);
    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
        if (!data || data.length === 0) {
          setActionError('Tệp Excel không có dữ liệu hợp lệ.');
          return;
        }
        const normalized: Partial<Diem>[] = [];
        for (const row of data) {
          const maSV = String(row.maSV || row['Mã Sinh Viên'] || row['MaSV'] || '').trim();
          const maMH = String(row.maMH || row['Mã Môn Học'] || row['MaMH'] || selectedCourse || '').trim();
          if (!maSV || !maMH) continue;

          const matchedSubject = (subjects || []).find(
            (m) => m?.maMH?.toLowerCase() === maMH.toLowerCase()
          );
          const hocKy = matchedSubject?.hocKy || String(row.hocKy || row['Học Kỳ'] || '').trim();
          const namHoc = matchedSubject?.namHoc || String(row.namHoc || row['Năm Học'] || '').trim();
          const tenMH = matchedSubject?.tenMH || String(row.tenMH || row['Tên Môn Học'] || row['TenMH'] || '').trim();
          const soTinChi = matchedSubject?.soTinChi || Number(row.soTinChi || row['Số Tín Chỉ'] || 3);

          normalized.push({
            maSV,
            hoTenSV: String(row.hoTenSV || row['Họ và Tên'] || row['HoTen'] || '').trim(),
            maMH,
            tenMH,
            soTinChi,
            hocKy,
            namHoc,
            diemChuyenCan: Number(row.diemChuyenCan ?? row['Điểm Chuyên Cần (10%)'] ?? row['CC'] ?? 0),
            diemGiuaKy: Number(row.diemGiuaKy ?? row['Điểm Giữa Kỳ (30%)'] ?? row['GK'] ?? 0),
            diemCuoiKy: Number(row.diemCuoiKy ?? row['Điểm Cuối Kỳ (60%)'] ?? row['CK'] ?? 0),
          });
        }

        if (normalized.length === 0) {
          setActionError('Không tìm thấy dòng nào có đầy đủ Mã sinh viên và Mã môn học.');
          return;
        }

        onImportExcel(normalized);
        setImportStatus(`Đã đọc và nhập ${normalized.length} bản ghi điểm từ tệp Excel.`);
      } catch {
        setActionError('Lỗi đọc tệp Excel. Vui lòng kiểm tra định dạng đúng theo mẫu chuẩn.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleOpenStudentTranscript = (maSV: string) => {
    const matched = students.find((s) => s.maSV.toLowerCase() === maSV.toLowerCase());
    const gradeMeta = grades.find((g) => g.maSV.toLowerCase() === maSV.toLowerCase());
    const fallbackStudent: SinhVien = matched || {
      maSV,
      hoTen: gradeMeta?.hoTenSV || maSV,
      lop: selectedClass || 'Chưa cập nhật',
      khoa: 'Chưa cập nhật',
      ngaySinh: '',
      gioiTinh: 'Nam',
      soDienThoai: '',
      email: '',
      diaChi: '',
      ngayNhapHoc: '',
      trangThai: 'Đang học',
    };
    setSelectedStudentForModal(fallbackStudent);
    setIsTranscriptModalOpen(true);
  };

  const handleOpenGradeModal = () => {
    setFormError(null);
    const matchedCourse = selectedCourse
      ? subjects.find((m) => m.maMH === selectedCourse)
      : undefined;
    setGradeForm({
      ...INITIAL_GRADE_FORM,
      maMH: matchedCourse?.maMH || '',
      tenMH: matchedCourse?.tenMH || '',
      soTinChi: matchedCourse?.soTinChi ? String(matchedCourse.soTinChi) : '',
      hocKy: matchedCourse?.hocKy || '',
      namHoc: matchedCourse?.namHoc || '',
    });
    setIsGradeModalOpen(true);
  };

  const handleSaveGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!gradeForm.maSV || !gradeForm.maMH) {
      setFormError('Vui lòng chọn sinh viên và môn học.');
      return;
    }

    const cc = Number(gradeForm.diemChuyenCan);
    const gk = Number(gradeForm.diemGiuaKy);
    const ck = Number(gradeForm.diemCuoiKy);

    if (
      gradeForm.diemChuyenCan.trim() === '' ||
      gradeForm.diemGiuaKy.trim() === '' ||
      gradeForm.diemCuoiKy.trim() === '' ||
      Number.isNaN(cc) ||
      Number.isNaN(gk) ||
      Number.isNaN(ck) ||
      cc < 0 ||
      cc > 10 ||
      gk < 0 ||
      gk > 10 ||
      ck < 0 ||
      ck > 10
    ) {
      setFormError('Vui lòng nhập đầy đủ điểm Chuyên cần, Giữa kỳ và Cuối kỳ hợp lệ (từ 0 đến 10).');
      return;
    }

    const course = (subjects || []).find((m) => m?.maMH === gradeForm.maMH);
    const finalHocKy = (course?.hocKy || gradeForm.hocKy || '').trim();
    const finalNamHoc = (course?.namHoc || gradeForm.namHoc || '').trim();

    if (!finalHocKy || !finalNamHoc) {
      setFormError('Vui lòng nhập Học kỳ và Năm học cho bản ghi điểm.');
      return;
    }

    const tk10 = Math.round((cc * 0.1 + gk * 0.3 + ck * 0.6) * 10) / 10;
    let thang4 = 0;
    let chu = 'F';
    let trangThai: 'PASSED' | 'FAILED' = 'FAILED';
    if (tk10 >= 8.5) { thang4 = 4.0; chu = 'A'; trangThai = 'PASSED'; }
    else if (tk10 >= 8.0) { thang4 = 3.5; chu = 'B+'; trangThai = 'PASSED'; }
    else if (tk10 >= 7.0) { thang4 = 3.0; chu = 'B'; trangThai = 'PASSED'; }
    else if (tk10 >= 6.5) { thang4 = 2.5; chu = 'C+'; trangThai = 'PASSED'; }
    else if (tk10 >= 5.5) { thang4 = 2.0; chu = 'C'; trangThai = 'PASSED'; }
    else if (tk10 >= 5.0) { thang4 = 1.5; chu = 'D+'; trangThai = 'PASSED'; }
    else if (tk10 >= 4.0) { thang4 = 1.0; chu = 'D'; trangThai = 'PASSED'; }

    const stu = students.find((s) => s.maSV === gradeForm.maSV);
    onSaveGrade({
      maSV: gradeForm.maSV,
      maMH: gradeForm.maMH,
      diemChuyenCan: cc,
      diemGiuaKy: gk,
      diemCuoiKy: ck,
      hoTenSV: stu ? stu.hoTen : undefined,
      diemTongKet10: tk10,
      diemThang4: thang4,
      diemChu: chu,
      trangThai,
      hocKy: finalHocKy,
      namHoc: finalNamHoc,
      soTinChi: course ? course.soTinChi : Number(gradeForm.soTinChi) || 3,
      tenMH: course ? course.tenMH : gradeForm.maMH,
    });
    setIsGradeModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bảng điểm & GPA"
        icon={Award}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'HIERARCHICAL') {
                  setViewMode('FLAT');
                } else {
                  setViewMode('HIERARCHICAL');
                  setSelectedClass(null);
                  setSelectedCourse('');
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>{viewMode === 'HIERARCHICAL' ? 'Danh sách tất cả' : 'Phân cấp theo lớp'}</span>
            </button>

            <button
              id="btn-download-excel-template"
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Mẫu Excel</span>
            </button>

            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors whitespace-nowrap">
              <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Import Excel</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              id="btn-export-excel"
              type="button"
              onClick={handleExportExcel}
              disabled={filteredGrades.length === 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Xuất Excel</span>
            </button>

            <button
              id="btn-add-grade"
              type="button"
              onClick={handleOpenGradeModal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nhập điểm</span>
            </button>
          </>
        }
      />

      <MetricStrip
        metrics={[
          { label: 'Tổng bản ghi điểm', value: gradeStats.total, dotColor: 'blue' },
          { label: 'Đạt', value: gradeStats.passed, dotColor: 'emerald' },
          { label: 'Chưa đạt', value: gradeStats.failed, dotColor: gradeStats.failed > 0 ? 'rose' : 'slate' },
          { label: 'Số lớp', value: gradeStats.classCount, dotColor: 'slate' },
        ]}
      />

      {loadError && <ErrorBanner message={loadError} onRetry={onRetryLoad} />}

      {actionError && (
        <ErrorBanner message={actionError} />
      )}

      {importStatus && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 text-xs rounded border border-emerald-300 dark:border-emerald-800"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{importStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportStatus(null)}
            aria-label="Đóng thông báo"
            className="p-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isLoading && grades.length === 0 ? (
        <LoadingState rows={6} />
      ) : (
        <>
          {/* Hierarchical Breadcrumb */}
          {viewMode === 'HIERARCHICAL' && (
            <nav
              aria-label="Phân cấp lớp và môn học"
              className="bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-800 flex items-center flex-wrap gap-1.5 text-xs"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedClass(null);
                  setSelectedCourse('');
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  selectedClass === null
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Tất cả lớp</span>
              </button>

              {selectedClass && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <button
                    type="button"
                    onClick={() => setSelectedCourse('')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      !selectedCourse
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Lớp {selectedClass}</span>
                  </button>
                </>
              )}

              {selectedClass && selectedCourse && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-700 text-white font-medium">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      {(subjects || []).find((m) => m?.maMH === selectedCourse)?.tenMH || selectedCourse}
                    </span>
                  </span>
                </>
              )}
            </nav>
          )}

          {/* Level 1: Class Selection */}
          {viewMode === 'HIERARCHICAL' && selectedClass === null && (
            availableClasses.length === 0 ? (
              <EmptyState message="Chưa có dữ liệu." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableClasses.map((lopName) => {
                  const studentsInLop = students.filter((s) => s.lop === lopName);
                  const lopIds = new Set(studentsInLop.map((s) => s.maSV.toLowerCase()));
                  const lopGradesCount = grades.filter((g) => lopIds.has(g.maSV.toLowerCase())).length;
                  const faculty = studentsInLop[0]?.khoa || 'Chưa cập nhật';
                  return (
                    <button
                      key={lopName}
                      type="button"
                      onClick={() => setSelectedClass(lopName)}
                      className="text-left group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 hover:border-blue-600 dark:hover:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge label={faculty} variant="info" />
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400 shrink-0" />
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                          {lopName}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums w-full">
                        <span>{studentsInLop.length} sinh viên</span>
                        <span>{lopGradesCount} đầu điểm</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {/* Level 2: Subject Selection */}
          {viewMode === 'HIERARCHICAL' && selectedClass !== null && !selectedCourse && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Môn học lớp {selectedClass}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedClass(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại</span>
                </button>
              </div>

              {subjectsForSelectedClass.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjectsForSelectedClass.map((m) => {
                    const gradesCount = grades.filter(
                      (g) => g.maMH === m.maMH && classStudentIds.has(g.maSV.toLowerCase())
                    ).length;
                    return (
                      <button
                        key={m.maMH}
                        type="button"
                        onClick={() => setSelectedCourse(m.maMH)}
                        className="text-left group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 hover:border-blue-600 dark:hover:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-2 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {m.maMH}
                            </span>
                            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {m.soTinChi} TC
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                            {m.tenMH}
                          </div>
                        </div>
                        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 w-full">
                          <span className="font-mono tabular-nums">{gradesCount} đầu điểm</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Level 3 / Flat List: Grades Table */}
          {(viewMode === 'FLAT' || (selectedClass !== null && selectedCourse !== '')) && (
            <div className="space-y-3">
              {viewMode === 'HIERARCHICAL' && selectedClass && selectedCourse && (
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100 min-w-0">
                    <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                    <span className="truncate">
                      {(subjects || []).find((m) => m?.maMH === selectedCourse)?.tenMH || selectedCourse}{' '}
                      <span className="font-mono text-slate-500 dark:text-slate-400">({selectedCourse})</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCourse('')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Đổi môn học</span>
                  </button>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-md border border-slate-200 dark:border-slate-800">
                <DataToolbar
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Tìm theo mã SV, họ tên, mã/tên môn..."
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={handleClearFilters}
                  filters={
                    <>
                      {viewMode === 'FLAT' && (
                        <div>
                          <label htmlFor={filterCourseId} className="sr-only">
                            Lọc theo môn học
                          </label>
                          <select
                            id={filterCourseId}
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer max-w-[220px]"
                          >
                            <option value="">Tất cả môn học</option>
                            {subjects.map((m) => (
                              <option key={m.maMH} value={m.maMH}>
                                {m.maMH} - {m.tenMH}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label htmlFor={filterSemId} className="sr-only">
                          Lọc theo học kỳ
                        </label>
                        <select
                          id={filterSemId}
                          value={selectedSemester}
                          onChange={(e) => setSelectedSemester(e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                        >
                          <option value="">Tất cả học kỳ</option>
                          {availableSemesters.map((hk) => (
                            <option key={hk} value={hk}>
                              Học kỳ {hk}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={filterYearId} className="sr-only">
                          Lọc theo năm học
                        </label>
                        <select
                          id={filterYearId}
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                        >
                          <option value="">Tất cả năm học</option>
                          {availableYears.map((yr) => (
                            <option key={yr} value={yr}>
                              Năm học {yr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  }
                />
              </div>

              {grades.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : filteredGrades.length === 0 ? (
                <FilteredEmptyState onClearFilters={handleClearFilters} />
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Sinh viên</th>
                          <th className="py-2.5 px-3">Môn học</th>
                          <th className="py-2.5 px-3">Kỳ / Năm</th>
                          <th className="py-2.5 px-3 text-center">CC (10%)</th>
                          <th className="py-2.5 px-3 text-center">GK (30%)</th>
                          <th className="py-2.5 px-3 text-center">CK (60%)</th>
                          <th className="py-2.5 px-3 text-center">Hệ 10</th>
                          <th className="py-2.5 px-3 text-center">Hệ 4</th>
                          <th className="py-2.5 px-3 text-center">Điểm chữ</th>
                          <th className="py-2.5 px-3 text-center">Kết quả</th>
                          <th className="py-2.5 px-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {paginatedGrades.map((g) => {
                          const isPass = g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0;
                          const letter = g.diemChu === 'A+' ? 'A' : g.diemChu || 'F';
                          return (
                            <tr
                              key={g.id}
                              className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                            >
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">
                                  {g.hoTenSV || 'Chưa cập nhật'}
                                </div>
                                <div className="text-[11px] font-mono tabular-nums text-blue-700 dark:text-blue-400">
                                  {g.maSV}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {g.tenMH || g.maMH}
                                </div>
                                <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                  {g.maMH} · {g.soTinChi || 3} TC
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                                {g.hocKy} · {g.namHoc}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                {g.diemChuyenCan}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                {g.diemGiuaKy}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                {g.diemCuoiKy}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                                {g.diemTongKet10}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-blue-700 dark:text-blue-400">
                                {g.diemThang4}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <StatusBadge
                                  label={letter}
                                  variant={
                                    !isPass || letter === 'F'
                                      ? 'danger'
                                      : letter === 'A'
                                      ? 'success'
                                      : letter === 'B+' || letter === 'B'
                                      ? 'info'
                                      : 'warning'
                                  }
                                  className="font-mono font-bold"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <StatusBadge
                                  label={isPass ? 'Đạt' : 'Chưa đạt'}
                                  variant={isPass ? 'success' : 'danger'}
                                  dot
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStudentTranscript(g.maSV)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors"
                                    title="Xem bảng điểm cá nhân"
                                  >
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    <span>Bảng điểm</span>
                                  </button>
                                  {onDeleteGrade && (
                                    <button
                                      type="button"
                                      onClick={() => setGradeToDelete(g)}
                                      aria-label={`Xóa điểm môn ${g.tenMH || g.maMH} của ${g.maSV}`}
                                      className="p-1.5 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                                      title="Xóa bản ghi điểm"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <PaginationBar
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={filteredGrades.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Grade Modal */}
      {isGradeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          onClick={() => setIsGradeModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-md w-full overflow-hidden shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3
                id={modalTitleId}
                className="text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                Nhập / Cập nhật điểm môn học
              </h3>
              <button
                type="button"
                onClick={() => setIsGradeModalOpen(false)}
                aria-label="Đóng biểu mẫu"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGradeSubmit} className="p-4 space-y-3 text-xs">
              {formError && <ErrorBanner message={formError} />}

              <div>
                <label
                  htmlFor={fieldMaSVId}
                  className="font-semibold block mb-1 text-slate-700 dark:text-slate-200"
                >
                  Sinh viên <span className="text-rose-600">*</span>
                </label>
                <select
                  id={fieldMaSVId}
                  value={gradeForm.maSV}
                  onChange={(e) => setGradeForm({ ...gradeForm, maSV: e.target.value })}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                >
                  <option value="">-- Chọn sinh viên --</option>
                  {students.map((s) => (
                    <option key={s.maSV} value={s.maSV}>
                      {s.maSV} - {s.hoTen} ({s.lop})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={fieldMaMHId}
                  className="font-semibold block mb-1 text-slate-700 dark:text-slate-200"
                >
                  Môn học <span className="text-rose-600">*</span>
                </label>
                <select
                  id={fieldMaMHId}
                  value={gradeForm.maMH}
                  onChange={(e) => {
                    const chosenMaMH = e.target.value;
                    const course = (subjects || []).find((m) => m?.maMH === chosenMaMH);
                    setGradeForm({
                      ...gradeForm,
                      maMH: chosenMaMH,
                      tenMH: course?.tenMH || '',
                      soTinChi: course?.soTinChi ? String(course.soTinChi) : '',
                      hocKy: course?.hocKy || gradeForm.hocKy,
                      namHoc: course?.namHoc || gradeForm.namHoc,
                    });
                  }}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                >
                  <option value="">-- Chọn môn học --</option>
                  {(subjects || []).map((m) => (
                    <option key={m.maMH} value={m.maMH}>
                      {m.maMH} - {m.tenMH} ({m.soTinChi} TC{m.hocKy ? ` - ${m.hocKy}` : ''}{m.namHoc ? ` ${m.namHoc}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={fieldHocKyId}
                    className="font-semibold block mb-1 text-slate-700 dark:text-slate-200"
                  >
                    Học kỳ <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id={fieldHocKyId}
                    type="text"
                    value={gradeForm.hocKy}
                    onChange={(e) => setGradeForm({ ...gradeForm, hocKy: e.target.value })}
                    placeholder="HK1"
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border rounded border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor={fieldNamHocId}
                    className="font-semibold block mb-1 text-slate-700 dark:text-slate-200"
                  >
                    Năm học <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id={fieldNamHocId}
                    type="text"
                    value={gradeForm.namHoc}
                    onChange={(e) => setGradeForm({ ...gradeForm, namHoc: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border rounded border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label
                    htmlFor={fieldCCId}
                    className="font-semibold block mb-1 text-slate-700 dark:text-slate-200"
                  >
                    Chuyên cần (10%)
                  </label>
                  <input
                    id={fieldCCId}
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={gradeForm.diemChuyenCan}
                    onChange={(e) => setGradeForm({ ...gradeForm, diemChuyenCan: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border rounded font-mono tabular-nums border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor={fieldGKId}
                    className="font-semibold block mb-1 text-slate-700 dark:text-slate-200"
                  >
                    Giữa kỳ (30%)
                  </label>
                  <input
                    id={fieldGKId}
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={gradeForm.diemGiuaKy}
                    onChange={(e) => setGradeForm({ ...gradeForm, diemGiuaKy: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border rounded font-mono tabular-nums border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor={fieldCKId}
                    className="font-semibold block mb-1 text-slate-700 dark:text-slate-200"
                  >
                    Cuối kỳ (60%)
                  </label>
                  <input
                    id={fieldCKId}
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={gradeForm.diemCuoiKy}
                    onChange={(e) => setGradeForm({ ...gradeForm, diemCuoiKy: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border rounded font-mono tabular-nums border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer transition-colors"
                >
                  Lưu điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Grade Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(gradeToDelete)}
        title="Xác nhận xóa bản ghi điểm"
        message="Bản ghi điểm này sẽ bị xóa khỏi hệ thống."
        confirmLabel="Xóa điểm"
        variant="danger"
        isSubmitting={isDeleting}
        onCancel={() => {
          if (!isDeleting) setGradeToDelete(null);
        }}
        details={
          gradeToDelete && (
            <div className="space-y-1">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Môn học: </span>
                <strong className="text-slate-900 dark:text-slate-100">
                  {gradeToDelete.tenMH || gradeToDelete.maMH}
                </strong>{' '}
                <span className="font-mono text-blue-700 dark:text-blue-400">
                  ({gradeToDelete.maMH})
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Sinh viên: </span>
                <strong className="text-slate-900 dark:text-slate-100">
                  {gradeToDelete.hoTenSV || gradeToDelete.maSV}
                </strong>{' '}
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  ({gradeToDelete.maSV})
                </span>
              </div>
              <div className="font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
                {gradeToDelete.hocKy} · {gradeToDelete.namHoc} · TK: {gradeToDelete.diemTongKet10} (
                {gradeToDelete.diemChu})
              </div>
            </div>
          )
        }
        onConfirm={async () => {
          if (!onDeleteGrade || !gradeToDelete) return;
          setIsDeleting(true);
          setActionError(null);
          try {
            await onDeleteGrade(gradeToDelete.id);
            setGradeToDelete(null);
          } catch {
            setActionError('Không thể xóa bản ghi điểm. Vui lòng thử lại.');
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      <StudentTranscriptModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        student={selectedStudentForModal}
        grades={grades}
        subjects={subjects}
        onDeleteGrade={onDeleteGrade}
      />
    </div>
  );
};
