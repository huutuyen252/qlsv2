import React, { useState } from 'react';
import { Diem, SinhVien, MonHoc, UserRole, GpaSummary, User } from '../../types';
import { StudentGradeView } from './StudentGradeView';
import { StudentTranscriptModal } from './StudentTranscriptModal';
import {
  Award,
  Upload,
  Download,
  Plus,
  Search,
  Calculator,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  X,
  TrendingUp,
  Folder,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Users,
  Layers,
  GraduationCap,
  Trash2,
  Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
interface GradeManagementModuleProps {
  grades: Diem[];
  students: SinhVien[];
  subjects?: MonHoc[];
  userRole: UserRole;
  currentStudentCode?: string;
  currentUser?: User | null;
  onSaveGrade: (grade: Partial<Diem>) => void;
  onImportExcel: (grades: Partial<Diem>[]) => void;
  onCalculateGpa: (maSV: string) => Promise<GpaSummary | null>;
  onDeleteGrade?: (id: string) => Promise<void>;
  onOpenRetakeRegister?: (maMH: string) => void;
}
export const GradeManagementModule: React.FC<GradeManagementModuleProps> = ({
  grades,
  students,
  subjects = [],
  userRole,
  currentStudentCode,
  currentUser,
  onSaveGrade,
  onImportExcel,
  onCalculateGpa,
  onDeleteGrade,
  onOpenRetakeRegister,
}) => {
  const isStudent = userRole === 'STUDENT';
  const isAdminOrLecturer = userRole === 'ADMIN' || userRole === 'LECTURER';
  const currentStudentObj = isStudent
    ? students.find(
        (s) =>
          (currentStudentCode && s.maSV.toLowerCase() === currentStudentCode.toLowerCase()) ||
          (currentUser?.studentCode && s.maSV.toLowerCase() === currentUser.studentCode.toLowerCase()) ||
          (currentUser?.username && s.maSV.toLowerCase() === currentUser.username.toLowerCase())
      ) || students[0]
    : null;
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<SinhVien | null>(null);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [viewMode, setViewMode] = useState<'HIERARCHICAL' | 'FLAT'>('HIERARCHICAL');
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState<Partial<Diem>>({
    maSV: students[0]?.maSV || '',
    maMH: subjects[0]?.maMH || '',
    hocKy: 'HK1',
    namHoc: '2025-2026',
    diemChuyenCan: 8.5,
    diemGiuaKy: 8.0,
    diemCuoiKy: 8.5,
  });
  const [importStatus, setImportStatus] = useState<string | null>(null);
  if (isStudent) {
    return (
      <StudentGradeView
        grades={grades}
        student={currentStudentObj}
        subjects={subjects}
        onOpenRetakeRegister={onOpenRetakeRegister}
      />
    );
  }
  const availableClasses = Array.from(
    new Set(students.map((s) => s.lop).filter(Boolean))
  );
  const subjectsForSelectedClass = selectedClass
    ? (subjects || []).filter((subject) => {
        if (!subject.lop?.trim()) return false;
        return subject.lop.trim().toLowerCase() === selectedClass.trim().toLowerCase();
      })
    : subjects || [];
  const classStudents = selectedClass
    ? students.filter((s) => s.lop === selectedClass)
    : students;
  const classStudentIds = new Set(classStudents.map((s) => s.maSV));
  const availableSemesters = Array.from(new Set(grades.map((g) => g.hocKy).filter(Boolean)));
  const availableYears = Array.from(new Set(grades.map((g) => g.namHoc).filter(Boolean)));
  const filteredGrades = grades.filter((g) => {
    const matchesClass = !selectedClass || classStudentIds.has(g.maSV);
    const matchesSearch =
      g.maSV.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.hoTenSV && g.hoTenSV.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (g.tenMH && g.tenMH.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = !selectedCourse || g.maMH === selectedCourse;
    const matchesSemester = !selectedSemester || g.hocKy === selectedSemester;
    const matchesYear = !selectedYear || g.namHoc === selectedYear;
    return matchesClass && matchesSearch && matchesCourse && matchesSemester && matchesYear;
  });
  const handleExportExcel = () => {
    const exportData = filteredGrades.map((g, idx) => ({
      'STT': idx + 1,
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
      'Trạng Thái': g.trangThai === 'PASSED' ? 'Đạt' : 'Không đạt',
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangDiem');
    XLSX.writeFile(workbook, `BangDiem_SinhVien_${Date.now()}.xlsx`);
  };
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        maSV: '25DDS0904101',
        hoTenSV: 'Nguyễn Văn An',
        maMH: 'MH01',
        tenMH: 'Nhập môn Lập trình C/C++',
        soTinChi: 3,
        hocKy: 'HK1',
        namHoc: '2025-2026',
        diemChuyenCan: 9.0,
        diemGiuaKy: 8.5,
        diemCuoiKy: 9.0,
      },
      {
        maSV: '25DDS0904102',
        hoTenSV: 'Trần Thị Bình',
        maMH: 'MH02',
        tenMH: 'Cơ sở Dữ liệu',
        soTinChi: 3,
        hocKy: 'HK1',
        namHoc: '2025-2026',
        diemChuyenCan: 9.5,
        diemGiuaKy: 8.0,
        diemCuoiKy: 8.5,
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MauImportDiem');
    XLSX.writeFile(workbook, `Mau_Import_Diem_SinhVien.xlsx`);
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        const normalized: Partial<Diem>[] = data.map((row) => ({
          maSV: String(row.maSV || row['Mã Sinh Viên'] || row['MaSV'] || ''),
          hoTenSV: String(row.hoTenSV || row['Họ và Tên'] || row['HoTen'] || ''),
          maMH: String(row.maMH || row['Mã Môn Học'] || row['MaMH'] || ''),
          tenMH: String(row.tenMH || row['Tên Môn Học'] || row['TenMH'] || ''),
          soTinChi: Number(row.soTinChi || row['Số Tín Chỉ'] || 3),
          hocKy: String(row.hocKy || row['Học Kỳ'] || 'HK1'),
          namHoc: String(row.namHoc || row['Năm Học'] || '2025-2026'),
          diemChuyenCan: Number(row.diemChuyenCan || row['Điểm Chuyên Cần (10%)'] || 0),
          diemGiuaKy: Number(row.diemGiuaKy || row['Điểm Giữa Kỳ (30%)'] || 0),
          diemCuoiKy: Number(row.diemCuoiKy || row['Điểm Cuối Kỳ (60%)'] || 0),
        }));
        onImportExcel(normalized);
        setImportStatus(`Đã đọc và import thành công ${normalized.length} dòng điểm từ Excel!`);
        setTimeout(() => setImportStatus(null), 5000);
      } catch (err) {
        setImportStatus('Lỗi đọc file Excel. Vui lòng sử dụng đúng template chuẩn!');
      }
    };
    reader.readAsBinaryString(file);
  };
  const handleOpenStudentTranscript = (maSV: string) => {
    const student = students.find((s) => s.maSV.toLowerCase() === maSV.toLowerCase()) || {
      maSV,
      hoTen: grades.find((g) => g.maSV.toLowerCase() === maSV.toLowerCase())?.hoTenSV || maSV,
      lop: selectedClass || 'N/A',
      khoa: 'Khoa Chuyên ngành',
      ngaySinh: '',
      gioiTinh: 'Nam' as const,
      soDienThoai: '',
      email: '',
      diaChi: '',
      ngayNhapHoc: '2025-09-01',
      trangThai: 'Đang học' as const,
    };
    setSelectedStudentForModal(student);
    setIsTranscriptModalOpen(true);
  };
  const handleSaveGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeForm.maSV || !gradeForm.maMH) return;
    const cc = Number(gradeForm.diemChuyenCan || 0);
    const gk = Number(gradeForm.diemGiuaKy || 0);
    const ck = Number(gradeForm.diemCuoiKy || 0);
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
    const course = (subjects || []).find((m) => m?.maMH === gradeForm.maMH);
    const stu = students.find((s) => s.maSV === gradeForm.maSV);
    onSaveGrade({
      ...gradeForm,
      hoTenSV: stu ? stu.hoTen : gradeForm.hoTenSV,
      diemTongKet10: tk10,
      diemThang4: thang4,
      diemChu: chu,
      trangThai,
      soTinChi: course ? course.soTinChi : 3,
      tenMH: course ? course.tenMH : gradeForm.maMH,
    });
    setIsGradeModalOpen(false);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Quản lý Điểm & GPA Sinh viên</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (viewMode === 'HIERARCHICAL') {
                setViewMode('FLAT');
              } else {
                setViewMode('HIERARCHICAL');
                setSelectedClass(null);
                setSelectedCourse('');
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>{viewMode === 'HIERARCHICAL' ? 'Xem Dạng Danh Sách Tất Cả' : 'Phân Cấp Theo Lớp'}</span>
          </button>
          {isAdminOrLecturer && (
            <>
              <button
                id="btn-download-excel-template"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                title="Tải Mẫu File Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Mẫu Excel</span>
              </button>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Import Excel</span>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                id="btn-export-excel"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Xuất Excel</span>
              </button>
              <button
                id="btn-add-grade"
                onClick={() => setIsGradeModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nhập điểm</span>
              </button>
            </>
          )}
        </div>
      </div>
      {importStatus && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}
      {viewMode === 'HIERARCHICAL' && (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <button
              onClick={() => {
                setSelectedClass(null);
                setSelectedCourse('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedClass === null
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Tất cả Lớp học</span>
            </button>
            {selectedClass && (
              <>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                <button
                  onClick={() => setSelectedCourse('')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    !selectedCourse
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Lớp: {selectedClass}</span>
                </button>
              </>
            )}
            {selectedClass && selectedCourse && (
              <>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold shadow-sm">
                  <BookOpen className="w-4 h-4" />
                  <span>
                    Môn: {(subjects || []).find((m) => m?.maMH === selectedCourse)?.tenMH || selectedCourse}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {viewMode === 'HIERARCHICAL' && selectedClass === null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span>Danh Sách Các Lớp Học • Chọn Lớp Để Mở Danh Sách Môn Học</span>
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              Tổng số {availableClasses.length} lớp học
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableClasses.map((lopName) => {
              const studentsInLop = students.filter((s) => s.lop === lopName);
              const lopStudentIds = new Set(studentsInLop.map((s) => s.maSV));
              const lopGradesCount = grades.filter((g) => lopStudentIds.has(g.maSV)).length;
              const faculty = studentsInLop[0]?.khoa || 'Khoa Chuyên ngành';
              return (
                <div
                  key={lopName}
                  onClick={() => setSelectedClass(lopName)}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {faculty}
                      </span>
                      <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h4 className="text-base font-black text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {lopName}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span>{studentsInLop.length} Sinh viên</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>{lopGradesCount} Đầu điểm</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                    <span>Xem môn học của lớp</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {viewMode === 'HIERARCHICAL' && selectedClass !== null && !selectedCourse && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60">
            <div>
              <h3 className="font-bold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Danh Sách Môn Học Của Lớp: {selectedClass}</span>
              </h3>
            </div>
            <button
              onClick={() => setSelectedClass(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 transition-all self-start sm:self-auto cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Đổi Lớp Khác</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectsForSelectedClass.map((m) => {
              const gradesForMonLop = filteredGrades.filter((g) => g?.maMH === m?.maMH);
              return (
                <div
                  key={m.maMH}
                  onClick={() => setSelectedCourse(m.maMH)}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {m.maMH}
                      </span>
                      <span className="text-xs font-semibold text-zinc-500">
                        {m.soTinChi} Tín chỉ
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      {m.tenMH}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Hình thức: {m.loaiMon || 'Lý thuyết + Thực hành'}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                      {gradesForMonLop.length} lượt nhập điểm
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      Mở Bảng Điểm <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(viewMode === 'FLAT' || (selectedClass !== null && selectedCourse !== '')) && (
        <div className="space-y-4">
          {viewMode === 'HIERARCHICAL' && selectedClass && selectedCourse && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-zinc-900 dark:to-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60">
              <div>
                <h3 className="font-black text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <span>
                    Bảng Điểm Môn: {(subjects || []).find((m) => m?.maMH === selectedCourse)?.tenMH} ({selectedCourse})
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCourse('')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Đổi Môn Học</span>
                </button>
              </div>
            </div>
          )}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                id="search-grade-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo Mã SV, Tên SV..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                id="filter-course-select"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả Môn học</option>
                {subjects.map((m) => (
                  <option key={m.maMH} value={m.maMH}>
                    {m.maMH} - {m.tenMH}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                id="filter-semester-select"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả Học kỳ</option>
                {availableSemesters.map((hk) => (
                  <option key={hk} value={hk}>
                    Học kỳ {hk}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                id="filter-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả Năm học</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Năm học {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 uppercase font-semibold border-b border-zinc-200 dark:border-zinc-700">
                  <tr>
                    <th className="p-3.5">Mã SV & Tên SV</th>
                    <th className="p-3.5">Môn học (STC)</th>
                    <th className="p-3.5">Học Kỳ / Năm</th>
                    <th className="p-3.5 text-center">CC (10%)</th>
                    <th className="p-3.5 text-center">GK (30%)</th>
                    <th className="p-3.5 text-center">CK (60%)</th>
                    <th className="p-3.5 text-center font-bold text-zinc-900 dark:text-white">Điểm HS10</th>
                    <th className="p-3.5 text-center font-bold text-zinc-900 dark:text-white">Điểm HS4</th>
                    <th className="p-3.5 text-center font-bold text-blue-600 dark:text-blue-400">Điểm Chữ</th>
                    <th className="p-3.5 text-center">Kết quả</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {filteredGrades.length > 0 ? (
                    filteredGrades.map((g) => (
                      <tr key={g.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-zinc-900 dark:text-white">{g.hoTenSV || 'Sinh viên'}</div>
                          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">{g.maSV}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold">{g.tenMH || g.maMH}</div>
                          <div className="text-[11px] text-zinc-500">
                            {g.maMH}  {g.soTinChi || 3} Tín ch
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 font-mono">
                            {g.hocKy}  {g.namHoc}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono">{g.diemChuyenCan}</td>
                        <td className="p-3.5 text-center font-mono">{g.diemGiuaKy}</td>
                        <td className="p-3.5 text-center font-mono">{g.diemCuoiKy}</td>
                        <td className="p-3.5 text-center font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-sm">
                          {g.diemTongKet10}
                        </td>
                        <td className="p-3.5 text-center font-bold text-zinc-900 dark:text-white font-mono text-sm">
                          {g.diemThang4}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-blue-600 dark:text-blue-400 font-mono text-sm bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60">
                            {g.diemChu === 'A+' ? 'A' : g.diemChu}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                            }`}
                          >
                            {g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0 ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenStudentTranscript(g.maSV)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60 cursor-pointer transition-all"
                              title="Xem Bảng Điểm & GPA Toàn Khóa của Sinh viên"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>Bảng Điểm</span>
                            </button>
                            {isAdminOrLecturer && onDeleteGrade && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`s️ Bạn có chắc chắn mun xóa bản ghi điểm môn ${g.tenMH || g.maMH} (${g.maMH}) của sinh viên ${g.hoTenSV || g.maSV}?`)) {
                                    await onDeleteGrade(g.id);
                                  }
                                }}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg border border-red-200 dark:border-red-800/60 transition-all cursor-pointer"
                                title="Xóa bản ghi điểm này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                        Chưa có bảng điểm phù hợp vi iều kin lọc
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsGradeModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Nhập/Cập nhật Điểm Môn học</h3>
            <form onSubmit={handleSaveGradeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Chọn Sinh viên *</label>
                <select
                  value={gradeForm.maSV}
                  onChange={(e) => setGradeForm({ ...gradeForm, maSV: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl border-zinc-300 dark:border-zinc-700"
                  required
                >
                  {students.map((s) => (
                    <option key={s.maSV} value={s.maSV}>
                      {s.maSV} - {s.hoTen} ({s.lop})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Chọn Môn học *</label>
                <select
                  value={gradeForm.maMH}
                  onChange={(e) => setGradeForm({ ...gradeForm, maMH: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl border-zinc-300 dark:border-zinc-700"
                  required
                >
                  {(subjects || []).map((m) => (
                    <option key={m.maMH} value={m.maMH}>
                      {m.maMH} - {m.tenMH} ({m.soTinChi} TC)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Học Kỳ</label>
                  <input
                    type="text"
                    value={gradeForm.hocKy}
                    onChange={(e) => setGradeForm({ ...gradeForm, hocKy: e.target.value })}
                    placeholder="HK1, HK2, HK3..."
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Năm Học</label>
                  <input
                    type="text"
                    value={gradeForm.namHoc}
                    onChange={(e) => setGradeForm({ ...gradeForm, namHoc: e.target.value })}
                    placeholder="2025-2026..."
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl border-zinc-300 dark:border-zinc-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Chuyên cần (10%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={gradeForm.diemChuyenCan}
                    onChange={(e) => setGradeForm({ ...gradeForm, diemChuyenCan: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl font-mono border-zinc-300 dark:border-zinc-700"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Giữa kỳ (30%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={gradeForm.diemGiuaKy}
                    onChange={(e) => setGradeForm({ ...gradeForm, diemGiuaKy: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl font-mono border-zinc-300 dark:border-zinc-700"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Cuối kỳ (60%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={gradeForm.diemCuoiKy}
                    onChange={(e) => setGradeForm({ ...gradeForm, diemCuoiKy: parseFloat(e.target.value) })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl font-mono border-zinc-300 dark:border-zinc-700"
                    required
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium cursor-pointer shadow-md">
                  Lưu Bảng Điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <StudentTranscriptModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        student={selectedStudentForModal}
        grades={grades}
        subjects={subjects}
      />
    </div>
  );
};

