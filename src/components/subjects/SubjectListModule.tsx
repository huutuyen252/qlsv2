import React, { useState } from 'react';
import { MonHoc, SinhVien, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { isSubjectMatchingClass } from '../../utils/subjectHelper';
import {
  BookOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  Download,
  Upload,
  X,
  AlertCircle,
  Building2,
  GraduationCap,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface SubjectListModuleProps {
  subjects: MonHoc[];
  students?: SinhVien[];
  userRole?: UserRole;
  studentClass?: string;
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}

export const SubjectListModule: React.FC<SubjectListModuleProps> = ({
  subjects,
  students = [],
  userRole = 'ADMIN',
  studentClass,
  onRefreshData,
  showToast,
}) => {
  const isAdminOrLecturer = userRole === 'ADMIN' || userRole === 'LECTURER';

  // Build class list dynamically strictly from student management and assigned subjects
  const studentClasses = students
    .map((s) => s.lop?.trim())
    .filter((l): l is string => Boolean(l));
  const subjectClasses = subjects
    .map((s) => s.lop?.trim())
    .filter((l): l is string => Boolean(l) && l !== 'ALL');
  const classList = Array.from(new Set([...studentClasses, ...subjectClasses]));

  // Build unique semesters and academic years dynamically from entered subject data
  const semesters = Array.from(
    new Set(subjects.map((s) => s.hocKy?.trim()).filter((h): h is string => Boolean(h)))
  );
  const academicYears = Array.from(
    new Set(subjects.map((s) => s.namHoc?.trim()).filter((y): y is string => Boolean(y)))
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('ALL');

  // For student role, automatically use student's assigned class without requiring manual selection
  const effectiveClass = userRole === 'STUDENT' ? (studentClass || 'ALL') : selectedClass;

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

  // Get unique faculties for form choices
  const facultyList = Array.from(
    new Set(subjects.map((s) => s.khoaPhuTrach?.trim()).filter((f): f is string => Boolean(f)))
  );

  // Filter subjects by search, class, semester & year
  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.maMH.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tenMH.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.khoaPhuTrach && s.khoaPhuTrach.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.lop && s.lop.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesClass = isSubjectMatchingClass(s, effectiveClass);

    const matchesSemester =
      selectedSemester === 'ALL' ||
      !s.hocKy ||
      s.hocKy.toLowerCase() === selectedSemester.toLowerCase();

    const matchesAcademicYear =
      selectedAcademicYear === 'ALL' ||
      !s.namHoc ||
      s.namHoc.toLowerCase() === selectedAcademicYear.toLowerCase();

    return matchesSearch && matchesClass && matchesSemester && matchesAcademicYear;
  });

  const totalCredits = filteredSubjects.reduce((sum, s) => sum + (s.soTinChi || 0), 0);

  // Open Modal Add
  const handleOpenAddModal = () => {
    setEditingSubject(null);
    setForm({
      id: '',
      maMH: '',
      tenMH: '',
      soTinChi: 3,
      khoaPhuTrach: facultyList[0] || 'Khoa Cơ khí',
      loaiMon: 'Bắt buộc',
      hocKy: selectedSemester !== 'ALL' ? selectedSemester : (semesters[0] || 'HK1'),
      namHoc: selectedAcademicYear !== 'ALL' ? selectedAcademicYear : (academicYears[0] || ''),
      lop: selectedClass !== 'ALL' ? selectedClass : (classList[0] || 'ALL'),
    });
    setCustomLop('');
    setModalError('');
    setIsModalOpen(true);
  };

  // Open Modal Edit
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

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.maMH.trim() || !form.tenMH.trim()) {
      setModalError('Vui lòng nhập đầy đủ Mã môn học và Tên môn học!');
      return;
    }

    const finalLop = form.lop === 'CUSTOM' ? customLop.trim() : form.lop;
    if (!finalLop) {
      setModalError('Vui lòng chọn hoặc nhập Lớp áp dụng môn học!');
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

  // Delete Subject
  const handleDelete = async (subject: MonHoc) => {
    const lopText = subject.lop && subject.lop !== 'ALL' ? `cho lớp "${subject.lop}"` : 'áp dụng chung';
    if (window.confirm(`⚠️ Bạn có chắc chắn muốn xóa môn học "${subject.tenMH}" (${subject.maMH}) ${lopText} khỏi CSDL?`)) {
      const res = await apiService.deleteSubject(subject.maMH, subject.id, subject.lop);
      showToast(res.message);
      onRefreshData();
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (subjects.length === 0) {
      showToast('Không có dữ liệu môn học để xuất Excel!');
      return;
    }
    const exportData = filteredSubjects.map((s, idx) => ({
      'STT': idx + 1,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachMonHocTheoLop');
    XLSX.writeFile(workbook, `Danh_Sach_Mon_Hoc_Theo_Lop_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Đã xuất file Excel môn học theo lớp thành công!');
  };

  // Import from Excel
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
          showToast('File Excel không có dữ liệu!');
          return;
        }

        const parsedSubjects: Partial<MonHoc>[] = data.map((row) => ({
          maMH: String(row['Mã Môn Học'] || row['maMH'] || row['MÃ MON HỌC'] || row['Mã môn'] || '').trim(),
          tenMH: String(row['Tên Môn Học'] || row['tenMH'] || row['TÊN MON HỌC'] || row['Tên môn'] || '').trim(),
          soTinChi: Number(row['Số Tín Chỉ'] || row['soTinChi'] || row['SỐ TÍN CHỈ'] || row['Tín chỉ'] || 3),
          lop: String(row['Lớp Áp Dụng'] || row['Lớp'] || row['Lop'] || row['lop'] || row['Mã Lớp'] || 'ALL').trim(),
          hocKy: String(row['Học Kỳ'] || row['hocKy'] || row['HỌC KỲ'] || row['Học kì'] || '').trim(),
          namHoc: String(row['Năm Học'] || row['namHoc'] || row['NĂM HỌC'] || row['Năm'] || '').trim(),
          khoaPhuTrach: String(row['Khoa / Bộ Môn Phụ Trách'] || row['khoaPhuTrach'] || row['Khoa'] || '').trim(),
          loaiMon: String(row['Loại Môn'] || row['loaiMon'] || 'Bắt buộc').trim(),
        })).filter(s => s.maMH && s.tenMH);

        if (parsedSubjects.length === 0) {
          showToast('Không tìm thấy cột Mã Môn Học và Tên Môn Học hợp lệ trong file Excel!');
          return;
        }

        const res = await apiService.importSubjects(parsedSubjects);
        showToast(res.message);
        onRefreshData();
      } catch {
        showToast('Lỗi khi đọc file Excel. Vui lòng kiểm tra địđịnh dạng file!');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div id="subject-list-module" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/60">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-2xl text-blue-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Danh Mục Môn Học Theo Lớp
              </h1>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-export-subjects-excel"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Xuất Excel
          </button>

          {isAdminOrLecturer && (
            <>
              <label
                htmlFor="input-import-subjects-excel"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                Import Excel
                <input
                  id="input-import-subjects-excel"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                id="btn-add-subject"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Thêm Môn Học Mới
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Môn học hiển thị
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {filteredSubjects.length} <span className="text-xs font-semibold text-slate-400">/ {subjects.length} môn</span>
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng số tín chỉ
            </p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {totalCredits} <span className="text-xs font-semibold text-slate-400">tín chỉ</span>
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-2xl">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {userRole === 'STUDENT' ? 'Lớp của bạn' : 'Lớp đang lọc'}
            </p>
            <p className="text-sm font-black text-purple-600 dark:text-purple-400 mt-1 truncate max-w-[180px]">
              {effectiveClass === 'ALL' ? 'Tất cả các lớp' : effectiveClass}
            </p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Student Banner showing Class Scope */}
      {userRole === 'STUDENT' && (
        <div className="bg-blue-50/90 dark:bg-blue-950/60 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/80 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                Chương Trình Đào Tạo Theo Lớp Sinh Viên
              </div>
              <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium mt-0.5">
                Lớp học: <strong className="font-extrabold text-blue-950 dark:text-blue-100">{studentClass || 'Chưa phân lớp'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-subjects"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã môn, Tên môn, Lớp..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 pl-10 pr-4 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Class Filter (Only show for Admin / Lecturer, student is locked to their class) */}
          {userRole !== 'STUDENT' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[11px] text-slate-400">Lớp:</span>
              <select
                id="select-class-filter"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[200px]"
              >
                <option value="ALL">Tất cả các lớp</option>
                {classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Semester Filter (populated dynamically from entered data) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="text-[11px] text-slate-400">Học kỳ:</span>
            <select
              id="select-semester-filter"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả học kỳ</option>
              {semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter (populated dynamically from entered data) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="text-[11px] text-slate-400">Năm học:</span>
            <select
              id="select-academicyear-filter"
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả năm học</option>
              {academicYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List View for Subjects */}
      {filteredSubjects.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900/60 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
              Chưa có môn học nào
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Danh mục môn học hiện đang trống hoặc không có kết quả phù hợp với bộ lọc tìm kiếm.
            </p>
          </div>
          {isAdminOrLecturer && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Môn Học Cho Lớp
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-300">
            <span>Danh sách môn học theo Lớp ({filteredSubjects.length} môn)</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {filteredSubjects.map((subject, idx) => {
              const isSpecificClass = subject.lop && subject.lop !== 'ALL';
              return (
                <div
                  key={subject.id || `${subject.maMH}_${subject.lop}_${idx}`}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Subject Info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      {idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-blue-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-lg shadow-xs">
                          {subject.maMH}
                        </span>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {subject.tenMH}
                        </h4>

                        {/* Class Badge */}
                        {isSpecificClass ? (
                          <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Users className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            Lớp: {subject.lop}
                          </span>
                        ) : (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            Tất cả các lớp
                          </span>
                        )}

                        <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {subject.loaiMon || 'Bắt buộc'}
                        </span>
                        {subject.hocKy && (
                          <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {subject.hocKy}
                          </span>
                        )}
                        {subject.namHoc && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            {subject.namHoc}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {subject.soTinChi} Tín chỉ
                        </span>
                        {subject.khoaPhuTrach && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {subject.khoaPhuTrach}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Admin / Lecturer */}
                  {isAdminOrLecturer && (
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        id={`btn-edit-subject-${subject.maMH}`}
                        onClick={() => handleOpenEditModal(subject)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                        Sửa
                      </button>

                      <button
                        id={`btn-delete-subject-${subject.maMH}`}
                        onClick={() => handleDelete(subject)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-800 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Add / Edit Subject */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5 font-black text-sm uppercase tracking-wider">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <span>{editingSubject ? 'Sửa Môn Học Cho Lớp' : 'Thêm Môn Học Mới Cho Lớp'}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Class Scope Dropdown populated from Student Management */}
              <div className="space-y-1.5 p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-2xl">
                <label className="text-xs font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Lớp Áp Dụng Môn Học <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.lop}
                  onChange={(e) => setForm({ ...form, lop: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả các lớp (Áp dụng chung)</option>
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      Lớp: {c}
                    </option>
                  ))}
                  <option value="CUSTOM">-- Tự nhập mã lớp khác... --</option>
                </select>

                {form.lop === 'CUSTOM' && (
                  <input
                    type="text"
                    required
                    value={customLop}
                    onChange={(e) => setCustomLop(e.target.value)}
                    placeholder="Nhập mã lớp cụ thể từ quản lý sinh viên..."
                    className="w-full bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none mt-2"
                  />
                )}
                <p className="text-[11px] text-purple-700 dark:text-purple-300">
                  {classList.length > 0
                    ? 'Danh sách mã lớp được đồng bộ trực tiếp từ Quản lý sinh viên.'
                    : 'Chưa có lớp nào từ Quản lý sinh viên. Bạn có thể chọn tự nhập mã lớp.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mã Môn Học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingSubject)}
                  value={form.maMH}
                  onChange={(e) => setForm({ ...form, maMH: e.target.value })}
                  placeholder="Ví dụ: MH01, CSE101..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tên Môn Học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.tenMH}
                  onChange={(e) => setForm({ ...form, tenMH: e.target.value })}
                  placeholder="Ví dụ: Đại số tuyến tính, Lập trình C++..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Số Tín Chỉ
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.soTinChi}
                    onChange={(e) => setForm({ ...form, soTinChi: Number(e.target.value) || 1 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Loại Môn Học
                  </label>
                  <select
                    value={form.loaiMon}
                    onChange={(e) => setForm({ ...form, loaiMon: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="Bắt buộc">Bắt buộc</option>
                    <option value="Tự chọn">Tự chọn</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Semester & Academic Year inputs (entered as data is created/imported) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Học Kỳ Phân Bổ
                  </label>
                  <input
                    type="text"
                    list="datalist-form-semesters"
                    value={form.hocKy}
                    onChange={(e) => setForm({ ...form, hocKy: e.target.value })}
                    placeholder="VD: HK1, HK2..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <datalist id="datalist-form-semesters">
                    {semesters.map((sem) => (
                      <option key={sem} value={sem} />
                    ))}
                    <option value="HK1" />
                    <option value="HK2" />
                    <option value="HK3" />
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Năm Học
                  </label>
                  <input
                    type="text"
                    list="datalist-form-academic-years"
                    value={form.namHoc}
                    onChange={(e) => setForm({ ...form, namHoc: e.target.value })}
                    placeholder="VD: 2025-2026..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <datalist id="datalist-form-academic-years">
                    {academicYears.map((yr) => (
                      <option key={yr} value={yr} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Khoa / Bộ môn Phụ trách
                </label>
                {facultyList.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={facultyList.includes(form.khoaPhuTrach) ? form.khoaPhuTrach : 'OTHER'}
                      onChange={(e) => {
                        if (e.target.value !== 'OTHER') {
                          setForm({ ...form, khoaPhuTrach: e.target.value });
                        }
                      }}
                      className="w-1/2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <option value="" disabled>-- Chọn Khoa đã có --</option>
                      {facultyList.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                      <option value="OTHER">Tự nhập khác...</option>
                    </select>
                    <input
                      type="text"
                      value={form.khoaPhuTrach}
                      onChange={(e) => setForm({ ...form, khoaPhuTrach: e.target.value })}
                      placeholder="Tên Khoa/Bộ môn..."
                      className="w-1/2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={form.khoaPhuTrach}
                    onChange={(e) => setForm({ ...form, khoaPhuTrach: e.target.value })}
                    placeholder="Nhập tên Khoa/Bộ môn phụ trách..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  {editingSubject ? 'Lưu Cập Nhật' : 'Tạo Môn Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
