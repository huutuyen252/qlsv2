import React, { useState, useMemo } from 'react';
import { Diem, SinhVien, MonHoc, SemesterGpaSummary, YearGpaSummary } from '../../types';
import {
  calculateSemesterSummary,
  calculateYearSummary,
  calculateCumulativeSummary,
  exportTranscriptExcel,
} from '../../utils/gradeHelper';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  Search,
  Sparkles,
  TrendingUp,
  XCircle,
  AlertCircle,
  BarChart3,
  Check,
  User,
} from 'lucide-react';
interface StudentGradeViewProps {
  grades: Diem[];
  student: SinhVien | null | undefined;
  subjects?: MonHoc[];
  onOpenRetakeRegister?: (maMH: string) => void;
}
export const StudentGradeView: React.FC<StudentGradeViewProps> = ({
  grades,
  student,
  subjects = [],
  onOpenRetakeRegister,
}) => {
  const [activeTab, setActiveTab] = useState<'SEMESTER' | 'CUMULATIVE' | 'ANALYTICS'>('SEMESTER');
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(grades.map((g) => g.namHoc?.trim()).filter(Boolean)));
    return (years as string[]).sort().reverse();
  }, [grades]);
  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || '');
  React.useEffect(() => {
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
        .filter((g) => g.namHoc?.trim() === selectedYear?.trim())
        .map((g) => g.hocKy?.trim())
        .filter(Boolean)
    );
    const list = (Array.from(semSet) as string[]).sort();
    return list;
  }, [grades, selectedYear]);
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [cumulativeViewStyle, setCumulativeViewStyle] = useState<'GROUPED' | 'UNIFIED'>('GROUPED');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const cumulativeSummary = useMemo(() => {
    return calculateCumulativeSummary(grades, student ? {
      maSV: student.maSV,
      hoTen: student.hoTen,
      lop: student.lop,
    } : undefined);
  }, [grades, student]);
  const yearSummary: YearGpaSummary = useMemo(() => {
    return calculateYearSummary(grades, selectedYear);
  }, [grades, selectedYear]);
  const currentSemesterSummary: SemesterGpaSummary | null = useMemo(() => {
    if (selectedSemester === 'ALL') return null;
    return calculateSemesterSummary(grades, selectedSemester, selectedYear);
  }, [grades, selectedSemester, selectedYear]);
  const currentViewGrades = useMemo(() => {
    let list: Diem[] = [];
    if (activeTab === 'SEMESTER') {
      if (selectedSemester === 'ALL') {
        list = grades.filter((g) => g.namHoc?.trim() === selectedYear?.trim());
      } else {
        list = grades.filter(
          (g) => g.namHoc?.trim() === selectedYear?.trim() && g.hocKy?.trim() === selectedSemester?.trim()
        );
      }
    } else {
      list = [...grades];
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
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
  const handleExportExcel = () => {
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
  const getGradeBadge = (diemChu: string, trangThai: string) => {
    if (trangThai === 'FAILED' || diemChu === 'F') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          {diemChu || 'F'}
        </span>
      );
    }
    if (diemChu === 'A' || diemChu === 'A+') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          {diemChu}
        </span>
      );
    }
    if (diemChu === 'B+' || diemChu === 'B') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {diemChu}
        </span>
      );
    }
    if (diemChu === 'C+' || diemChu === 'C') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          {diemChu}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
        {diemChu || 'D'}
      </span>
    );
  };
  const getStatusBadge = (trangThai: string, tk10: number) => {
    const isPass = trangThai === 'PASSED' || tk10 >= 4.0;
    if (isPass) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Check className="w-3 h-3" /> Đạt
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        <XCircle className="w-3 h-3" /> Chưa Đạt
      </span>
    );
  };
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-800/60">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <GraduationCap className="w-8 h-8 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {student?.hoTen || grades[0]?.hoTenSV || 'Sinh Viên'}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {student?.maSV || grades[0]?.maSV || 'Chưa cập nhật'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {student?.trangThai || 'Đang học'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-blue-200/90 mt-2 flex-wrap font-medium">
                <span>Lớp: <strong className="text-white">{student?.lop || 'Chuyên ngành'}</strong></span>
                <span>•</span>
                <span>Khoa: <strong className="text-white">{student?.khoa || 'Công nghệ'}</strong></span>
                <span>•</span>
                <span>Tổng số môn đã học: <strong className="text-white">{grades.length} môn</strong></span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-center min-w-[110px] shadow-sm">
              <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">GPA Tích Lũy</div>
              <div className="text-2xl font-black text-amber-300 font-mono mt-0.5">
                {cumulativeSummary.diemTBTichLuyThang4.toFixed(2)}
              </div>
              <div className="text-[10px] text-blue-200/80 font-semibold">H 4.0</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-center min-w-[110px] shadow-sm">
              <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Điểm Hệ 10</div>
              <div className="text-2xl font-black text-white font-mono mt-0.5">
                {cumulativeSummary.diemTBTichLuyThang10.toFixed(2)}
              </div>
              <div className="text-[10px] text-blue-200/80 font-semibold">Hệ 10.0</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-center min-w-[110px] shadow-sm">
              <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">TC Tích Lũy</div>
              <div className="text-2xl font-black text-emerald-300 font-mono mt-0.5">
                {cumulativeSummary.tongTinChiTichLuy}
              </div>
              <div className="text-[10px] text-blue-200/80 font-semibold">Tín ch ạt</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-center min-w-[110px] shadow-sm">
              <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Học Lực</div>
              <div className="text-sm font-black text-white mt-1.5 px-2 py-0.5 rounded-lg bg-blue-500/40 border border-blue-300/30">
                {cumulativeSummary.xepLoaiHocLuc}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
          <button
            onClick={() => setActiveTab('SEMESTER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'SEMESTER'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Bảng Điểm Theo Học Kỳ</span>
          </button>
          <button
            onClick={() => setActiveTab('CUMULATIVE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'CUMULATIVE'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Bảng Điểm Tổng Hợp Toàn Khóa</span>
          </button>
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ANALYTICS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Tiến Trình & Thống Kê GPA</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-sm"
            title="Xuất bảng điểm ra file Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition-all cursor-pointer shadow-sm"
            title="In / Xem trưc bảng điểm chuẩn"
          >
            <Printer className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <span>Xem & In Bảng Điểm</span>
          </button>
        </div>
      </div>
      {activeTab === 'SEMESTER' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Tra Cứu Bảng Điểm Theo Học Kỳ & Năm Học</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Chọn năm học và học kỳ để xem điểm chi tiết các môn học đã hoàn thành cùng kết quả GPA.
                </p>
              </div>
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
                {availableYears.length > 0 ? (
                  <>
                    Đang xem: <strong className="text-blue-700 dark:text-blue-300">Năm học {selectedYear}</strong> {' '}
                    <strong className="text-indigo-700 dark:text-indigo-300">
                      {selectedSemester === 'ALL' ? 'Tất cả các học kỳ trong năm' : `Học kỳ ${selectedSemester}`}
                    </strong>
                  </>
                ) : (
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">Chưa có dữ liệu điểm môn học</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1">
                  1. Chọn Năm Học
                </label>
                <select
                  value={selectedYear}
                  disabled={availableYears.length === 0}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setSelectedSemester('ALL');
                  }}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {availableYears.length > 0 ? (
                    availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Năm học {yr}
                      </option>
                    ))
                  ) : (
                    <option value="">Chưa có năm học nào có điểm</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1">
                  2. Chọn Học Kỳ
                </label>
                <select
                  value={selectedSemester}
                  disabled={availableSemestersInYear.length === 0}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {availableSemestersInYear.length > 0 ? (
                    <>
                      <option value="ALL">YOY Tất cả các học kỳ của năm {selectedYear}</option>
                      {availableSemestersInYear.map((sem) => (
                        <option key={sem} value={sem}>
                          Học kỳ {sem}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value="ALL">Chưa có học kỳ nào có điểm</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1">
                  3. Tìm Môn Học
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Mã môn hoặc tên môn..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1">
                  4. Trạng Thái
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả kết quả</option>
                  <option value="PASSED">Ch môn Đạt</option>
                  <option value="FAILED">Ch môn Chưa Đạt</option>
                </select>
              </div>
            </div>
          </div>
          {availableYears.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Chưa có dữ liệu bảng điểm nào cho sinh viên này
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Điểm theo từng môn học của học kỳ và năm học sẽ hiển thị tại đây sau khi Ban Đào tạo / Giảng viên nhập điểm chính thức vào hệ thống.
              </p>
            </div>
          ) : selectedSemester === 'ALL' ? (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-zinc-900 dark:via-blue-950/30 dark:to-indigo-950/30 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>Tổng Kết Toàn Diện Năm Học {selectedYear}</span>
                  </div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white mt-1">
                    Bao gồm {availableSemestersInYear.length} học kỳ  {yearSummary.soMonHoc} môn học đã có điểm
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                    <div className="text-[10px] font-semibold text-zinc-500">GPA Năm (H 4)</div>
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                      {yearSummary.diemTBNamHocThang4.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                    <div className="text-[10px] font-semibold text-zinc-500">Điểm Năm (Hệ 10)</div>
                    <div className="text-lg font-black text-zinc-900 dark:text-white font-mono">
                      {yearSummary.diemTBNamHocThang10.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                    <div className="text-[10px] font-semibold text-zinc-500">TC Tích Lũy Năm</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {yearSummary.tongTinChiTichLuy} / {yearSummary.tongTinChiDangKy}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                    <div className="text-[10px] font-semibold text-zinc-500">Xếp Loại Năm</div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      {yearSummary.xepLoaiNamHoc}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : currentSemesterSummary ? (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-zinc-900 dark:via-emerald-950/30 dark:to-blue-950/30 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kết Quả Học Kỳ {selectedSemester} " Năm Học {selectedYear}</span>
                  </div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-white mt-1">
                    Tổng số {currentSemesterSummary.soMonHoc} môn học ({currentSemesterSummary.soMonDat} Đạt, {currentSemesterSummary.soMonKhongDat} Chưa đạt)
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                    <div className="text-[10px] font-semibold text-zinc-500">GPA Học Kỳ (H 4)</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {currentSemesterSummary.diemTBHocKyThang4.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                    <div className="text-[10px] font-semibold text-zinc-500">Điểm HK (Hệ 10)</div>
                    <div className="text-lg font-black text-zinc-900 dark:text-white font-mono">
                      {currentSemesterSummary.diemTBHocKyThang10.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                    <div className="text-[10px] font-semibold text-zinc-500">TC Tích Lũy Kỳ</div>
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                      {currentSemesterSummary.tongTinChiTichLuy} / {currentSemesterSummary.tongTinChiDangKy}
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
                    <div className="text-[10px] font-semibold text-zinc-500">Xếp Loại Học Kỳ</div>
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      {currentSemesterSummary.xepLoaiHocKy}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {selectedSemester === 'ALL' ? (
            <div className="space-y-6">
              {availableSemestersInYear.map((sem) => {
                const semGrades = grades.filter(
                  (g) => g.namHoc?.trim() === selectedYear?.trim() && g.hocKy?.trim() === sem.trim()
                );
                const semSummary = calculateSemesterSummary(grades, sem, selectedYear);
                if (semGrades.length === 0) return null;
                return (
                  <div
                    key={sem}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm space-y-0"
                  >
                    <div className="bg-zinc-50 dark:bg-zinc-800/90 px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                          {sem}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                            Học Kỳ {sem} • Năm Học {selectedYear}
                          </h4>
                          <span className="text-[11px] text-zinc-500">
                            {semGrades.length} môn học • {semSummary.tongTinChiDangKy} tín chỉ đăng ký
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <div className="px-3 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                          <span className="text-zinc-500">GPA HK: </span>
                          <strong className="text-blue-600 dark:text-blue-400 font-mono">
                            {semSummary.diemTBHocKyThang4.toFixed(2)} (Thang 4)
                          </strong>
                        </div>
                        <div className="px-3 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                          <span className="text-zinc-500">Điểm TB: </span>
                          <strong className="text-zinc-900 dark:text-white font-mono">
                            {semSummary.diemTBHocKyThang10.toFixed(2)} (Thang 10)
                          </strong>
                        </div>
                        <div className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                          {semSummary.xepLoaiHocKy}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-100/60 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-[11px] border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="p-3.5">Mã MH</th>
                            <th className="p-3.5">Tên Môn Học</th>
                            <th className="p-3.5 text-center">Số TC</th>
                            <th className="p-3.5 text-center">CC (10%)</th>
                            <th className="p-3.5 text-center">GK (30%)</th>
                            <th className="p-3.5 text-center">CK (60%)</th>
                            <th className="p-3.5 text-center font-bold text-zinc-900 dark:text-white">Điểm Tổng (10)</th>
                            <th className="p-3.5 text-center font-bold text-zinc-900 dark:text-white">Thang 4</th>
                            <th className="p-3.5 text-center font-bold">Điểm Chữ</th>
                            <th className="p-3.5 text-center">Kết Quả</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {semGrades.map((g) => (
                            <tr key={g.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                {g.maMH}
                              </td>
                              <td className="p-3.5 font-semibold text-zinc-900 dark:text-white">
                                {g.tenMH || g.maMH}
                              </td>
                              <td className="p-3.5 text-center font-mono font-medium">{g.soTinChi || 3}</td>
                              <td className="p-3.5 text-center font-mono">{g.diemChuyenCan}</td>
                              <td className="p-3.5 text-center font-mono">{g.diemGiuaKy}</td>
                              <td className="p-3.5 text-center font-mono">{g.diemCuoiKy}</td>
                              <td className="p-3.5 text-center font-bold font-mono text-zinc-900 dark:text-white">
                                {g.diemTongKet10}
                              </td>
                              <td className="p-3.5 text-center font-black font-mono text-blue-600 dark:text-blue-400">
                                {g.diemThang4}
                              </td>
                              <td className="p-3.5 text-center">
                                {getGradeBadge(g.diemChu, g.trangThai)}
                              </td>
                              <td className="p-3.5 text-center">
                                {getStatusBadge(g.trangThai, g.diemTongKet10)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-[11px] border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      <th className="p-3.5">Mã MH</th>
                      <th className="p-3.5">Tên Môn Học</th>
                      <th className="p-3.5 text-center">Số TC</th>
                      <th className="p-3.5 text-center">CC (10%)</th>
                      <th className="p-3.5 text-center">GK (30%)</th>
                      <th className="p-3.5 text-center">CK (60%)</th>
                      <th className="p-3.5 text-center font-bold text-zinc-900 dark:text-white">Điểm Tổng (10)</th>
                      <th className="p-3.5 text-center font-bold text-zinc-900 dark:text-white">Thang 4</th>
                      <th className="p-3.5 text-center font-bold">Điểm Chữ</th>
                      <th className="p-3.5 text-center">Kết Quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {currentViewGrades.length > 0 ? (
                      currentViewGrades.map((g) => (
                        <tr key={g.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {g.maMH}
                          </td>
                          <td className="p-3.5 font-semibold text-zinc-900 dark:text-white">
                            {g.tenMH || g.maMH}
                          </td>
                          <td className="p-3.5 text-center font-mono font-medium">{g.soTinChi || 3}</td>
                          <td className="p-3.5 text-center font-mono">{g.diemChuyenCan}</td>
                          <td className="p-3.5 text-center font-mono">{g.diemGiuaKy}</td>
                          <td className="p-3.5 text-center font-mono">{g.diemCuoiKy}</td>
                          <td className="p-3.5 text-center font-bold font-mono text-zinc-900 dark:text-white">
                            {g.diemTongKet10}
                          </td>
                          <td className="p-3.5 text-center font-black font-mono text-blue-600 dark:text-blue-400">
                            {g.diemThang4}
                          </td>
                          <td className="p-3.5 text-center">
                            {getGradeBadge(g.diemChu, g.trangThai)}
                          </td>
                          <td className="p-3.5 text-center">
                            {getStatusBadge(g.trangThai, g.diemTongKet10)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                          Chưa có bảng điểm phù hợp cho Học kỳ {selectedSemester} - Năm học {selectedYear}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'CUMULATIVE' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Bảng Điểm Tổng Hợp Toàn Khóa (Tất Cả Học Kỳ & Năm Học)
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Tổng hợp toàn bộ các môn học đã tham gia qua các năm học, phân tích tín chỉ tích lũy và kết quả học tập toàn khóa.
                </p>
              </div>
              <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setCumulativeViewStyle('GROUPED')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    cumulativeViewStyle === 'GROUPED'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Theo Niên Giám Học Kỳ</span>
                </button>
                <button
                  onClick={() => setCumulativeViewStyle('UNIFIED')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    cumulativeViewStyle === 'UNIFIED'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Bảng Hợp Nhất MTt Trang</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm môn học trong toàn bộ quá trình học tập..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả môn học ({grades.length})</option>
                  <option value="PASSED">Môn ã Đạt ({grades.filter((g) => g.trangThai === 'PASSED').length})</option>
                  <option value="FAILED">Môn nợ / Chưa đạt ({cumulativeSummary.soMonNoTinChi})</option>
                </select>
              </div>
            </div>
          </div>
          {availableYears.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Chưa có dữ liệu bảng điểm toàn khóa
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Dữ liệu bảng điểm tổng hợp toàn khóa sẽ xuất hiện khi có điểm các môn học được ban đào tạo nhập vào.
              </p>
            </div>
          ) : cumulativeViewStyle === 'GROUPED' ? (
            <div className="space-y-6">
              {availableYears.map((yr) => {
                const yearGrades = grades.filter((g) => g.namHoc?.trim() === yr.trim());
                if (yearGrades.length === 0) return null;
                const yrSummary = calculateYearSummary(grades, yr);
                const yrSemesters = (Array.from(
                  new Set(yearGrades.map((g) => g.hocKy?.trim()).filter(Boolean))
                ) as string[]).sort();
                return (
                  <div key={yr} className="space-y-4">
                    <div className="bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h3 className="font-bold text-sm text-white">Năm Học {yr}</h3>
                          <p className="text-[11px] text-zinc-400">
                            {yearGrades.length} môn học • {yrSummary.tongTinChiTichLuy} tín chỉ tích lũy
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/20">
                          GPA Năm: <strong className="text-amber-300 font-mono">{yrSummary.diemTBNamHocThang4.toFixed(2)}</strong> (Thang 4)
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/20">
                          Hệ 10: <strong className="text-white font-mono">{yrSummary.diemTBNamHocThang10.toFixed(2)}</strong>
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold">
                          {yrSummary.xepLoaiNamHoc}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4 pl-0 sm:pl-3">
                      {yrSemesters.map((sem: string) => {
                        const semGrades = yearGrades.filter((g) => g.hocKy?.trim() === sem.trim());
                        const semSummary = calculateSemesterSummary(grades, sem, yr);
                        return (
                          <div
                            key={sem}
                            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
                          >
                            <div className="bg-zinc-50 dark:bg-zinc-800/80 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                              <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-white">
                                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                                  {sem}
                                </span>
                                <span>Học kỳ {sem}</span>
                              </div>
                              <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                                <span>GPA HK: <strong className="text-blue-600 font-mono">{semSummary.diemTBHocKyThang4.toFixed(2)}</strong></span>
                                <span>Tín ch: <strong className="text-zinc-900 dark:text-white font-mono">{semSummary.tongTinChiTichLuy}/{semSummary.tongTinChiDangKy}</strong></span>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-100/40 dark:bg-zinc-800/40 text-zinc-500 text-[11px]">
                                  <tr>
                                    <th className="p-3">Mã MH</th>
                                    <th className="p-3">Tên Môn Học</th>
                                    <th className="p-3 text-center">TC</th>
                                    <th className="p-3 text-center">CC</th>
                                    <th className="p-3 text-center">GK</th>
                                    <th className="p-3 text-center">CK</th>
                                    <th className="p-3 text-center font-bold">Hệ 10</th>
                                    <th className="p-3 text-center font-bold">H 4</th>
                                    <th className="p-3 text-center">Điểm Chữ</th>
                                    <th className="p-3 text-center">Trạng Thái</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                  {semGrades.map((g) => (
                                    <tr key={g.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{g.maMH}</td>
                                      <td className="p-3 font-semibold text-zinc-900 dark:text-white">{g.tenMH || g.maMH}</td>
                                      <td className="p-3 text-center font-mono">{g.soTinChi || 3}</td>
                                      <td className="p-3 text-center font-mono">{g.diemChuyenCan}</td>
                                      <td className="p-3 text-center font-mono">{g.diemGiuaKy}</td>
                                      <td className="p-3 text-center font-mono">{g.diemCuoiKy}</td>
                                      <td className="p-3 text-center font-bold font-mono">{g.diemTongKet10}</td>
                                      <td className="p-3 text-center font-bold font-mono text-blue-600 dark:text-blue-400">{g.diemThang4}</td>
                                      <td className="p-3 text-center">{getGradeBadge(g.diemChu, g.trangThai)}</td>
                                      <td className="p-3 text-center">{getStatusBadge(g.trangThai, g.diemTongKet10)}</td>
                                    </tr>
                                  ))}
                                </tbody>
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
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-[11px] border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      <th className="p-3.5">Học Kỳ / Năm</th>
                      <th className="p-3.5">Mã MH</th>
                      <th className="p-3.5">Tên Môn Học</th>
                      <th className="p-3.5 text-center">Số TC</th>
                      <th className="p-3.5 text-center">CC (10%)</th>
                      <th className="p-3.5 text-center">GK (30%)</th>
                      <th className="p-3.5 text-center">CK (60%)</th>
                      <th className="p-3.5 text-center font-bold text-zinc-900 dark:text-white">Điểm Tổng (10)</th>
                      <th className="p-3.5 text-center font-bold text-zinc-900 dark:text-white">Thang 4</th>
                      <th className="p-3.5 text-center font-bold">Điểm Chữ</th>
                      <th className="p-3.5 text-center">Kết Quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {currentViewGrades.length > 0 ? (
                      currentViewGrades.map((g) => (
                        <tr key={g.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="p-3.5">
                            <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-mono">
                              {g.hocKy}  {g.namHoc}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {g.maMH}
                          </td>
                          <td className="p-3.5 font-semibold text-zinc-900 dark:text-white">
                            {g.tenMH || g.maMH}
                          </td>
                          <td className="p-3.5 text-center font-mono font-medium">{g.soTinChi || 3}</td>
                          <td className="p-3.5 text-center font-mono">{g.diemChuyenCan}</td>
                          <td className="p-3.5 text-center font-mono">{g.diemGiuaKy}</td>
                          <td className="p-3.5 text-center font-mono">{g.diemCuoiKy}</td>
                          <td className="p-3.5 text-center font-bold font-mono text-zinc-900 dark:text-white">
                            {g.diemTongKet10}
                          </td>
                          <td className="p-3.5 text-center font-black font-mono text-blue-600 dark:text-blue-400">
                            {g.diemThang4}
                          </td>
                          <td className="p-3.5 text-center">
                            {getGradeBadge(g.diemChu, g.trangThai)}
                          </td>
                          <td className="p-3.5 text-center">
                            {getStatusBadge(g.trangThai, g.diemTongKet10)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                          Chưa có môn học nào trong toàn khóa học
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'ANALYTICS' && (
        availableYears.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Chưa có tiến trình học tập để thống kê
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Tiến trình GPA và số tín chỉ tích lũy sẽ được tổng hợp tự động khi có kết quả điểm môn học được nhập vào hệ thống.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-zinc-500">Tỷ L Tích Lũy Tín Ch</span>
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-900 dark:text-white font-mono">
                  {cumulativeSummary.tongTinChiTichLuy}
                </span>
                <span className="text-xs text-zinc-500 font-semibold">Tín ch đã hoàn thành</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (cumulativeSummary.tongTinChiTichLuy / 120) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500 mt-2">
                Tiến T ào tạo: ~{Math.round((cumulativeSummary.tongTinChiTichLuy / 120) * 100)}% chương trình (Chuẩn ~120 TC)
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-zinc-500">Xếp Hạng Học Lực</span>
                <Award className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {cumulativeSummary.xepLoaiHocLuc}
                </span>
                <span className="text-xs text-zinc-500 font-mono font-semibold">
                  (GPA {cumulativeSummary.diemTBTichLuyThang4.toFixed(2)})
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                Mức điểm ạt chuẩn học bổng khuyến khích và xét tốt nghiệp đúng hạn.
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-zinc-500">Môn Nợ Tín Ch / Cần Thi Lại</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black font-mono ${cumulativeSummary.soMonNoTinChi > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {cumulativeSummary.soMonNoTinChi}
                </span>
                <span className="text-xs text-zinc-500 font-semibold">môn cần học/thi lại</span>
              </div>
              <div className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span>{cumulativeSummary.soMonNoTinChi === 0 ? 'Hoàn toàn không nợ môn' : 'Có môn chưa hoàn thành'}</span>
                {cumulativeSummary.soMonNoTinChi > 0 && onOpenRetakeRegister && (
                  <button
                    onClick={() => onOpenRetakeRegister('')}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Đăng ký thi lại</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Bảng Thống Kê Tiến Trình GPA Qua Từng Học Kỳ</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="p-3">Học Kỳ</th>
                    <th className="p-3">Năm Học</th>
                    <th className="p-3 text-center">Số Môn</th>
                    <th className="p-3 text-center">TC Đăng Ký</th>
                    <th className="p-3 text-center">TC Đạt</th>
                    <th className="p-3 text-center font-bold text-blue-600 dark:text-blue-400">GPA Học Kỳ (Hệ 4)</th>
                    <th className="p-3 text-center font-bold text-zinc-900 dark:text-white">Điểm TB HK (Hệ 10)</th>
                    <th className="p-3 text-center">Xếp Loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {availableYears.map((yr) => {
                    const yrGrades = grades.filter((g) => g.namHoc?.trim() === yr.trim());
                    const sems = (Array.from(
                      new Set(yrGrades.map((g) => g.hocKy?.trim()).filter(Boolean))
                    ) as string[]).sort();
                    return sems.map((sem: string) => {
                      const semSummary = calculateSemesterSummary(grades, sem, yr);
                      return (
                        <tr key={`${yr}-${sem}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <td className="p-3 font-bold text-zinc-900 dark:text-white font-mono">{sem}</td>
                          <td className="p-3 text-zinc-600 dark:text-zinc-400">{yr}</td>
                          <td className="p-3 text-center font-mono">{semSummary.soMonHoc}</td>
                          <td className="p-3 text-center font-mono">{semSummary.tongTinChiDangKy}</td>
                          <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {semSummary.tongTinChiTichLuy}
                          </td>
                          <td className="p-3 text-center font-black font-mono text-blue-600 dark:text-blue-400 text-sm">
                            {semSummary.diemTBHocKyThang4.toFixed(2)}
                          </td>
                          <td className="p-3 text-center font-bold font-mono text-zinc-900 dark:text-white text-sm">
                            {semSummary.diemTBHocKyThang10.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {semSummary.xepLoaiHocKy}
                            </span>
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
      ))}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full cursor-pointer"
            >
              o.
            </button>
            <div className="text-center pb-6 border-b-2 border-zinc-800 dark:border-zinc-200 space-y-1">
              <div className="text-xs uppercase font-bold tracking-wider text-zinc-600 dark:text-zinc-400">
                BỘ GIÁO DỤC VÀ ĐÀO TẠO • TRƯỜNG ĐẠI HỌC TRẦN ĐẠI NGHĨA
              </div>
              <h2 className="text-xl font-black uppercase text-zinc-900 dark:text-white">
                BẢNG ĐIỂM KẾT QUẢ HỌC TẬP TOÀN KHÓA
              </h2>
              <p className="text-xs italic text-zinc-500">
                (Ban hành theo Quy chế Đào tạo Đại học theo hệ thống Tín chỉ)
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-zinc-500 block">Họ và tên:</span>
                <strong className="text-zinc-900 dark:text-white text-sm">{student?.hoTen || grades[0]?.hoTenSV}</strong>
              </div>
              <div>
                <span className="text-zinc-500 block">Mã số sinh viên:</span>
                <strong className="text-blue-600 dark:text-blue-400 font-mono text-sm">{student?.maSV || grades[0]?.maSV}</strong>
              </div>
              <div>
                <span className="text-zinc-500 block">Lớp chuyên ngành:</span>
                <strong className="text-zinc-900 dark:text-white">{student?.lop || 'Đại học'}</strong>
              </div>
              <div>
                <span className="text-zinc-500 block">Khoa / BT môn:</span>
                <strong className="text-zinc-900 dark:text-white">{student?.khoa || 'Công ngh'}</strong>
              </div>
            </div>
            <div className="py-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-[11px] font-bold">
                    <th className="p-2">STT</th>
                    <th className="p-2">Học kỳ / Năm</th>
                    <th className="p-2">Mã MH</th>
                    <th className="p-2">Tên Môn Học</th>
                    <th className="p-2 text-center">Số TC</th>
                    <th className="p-2 text-center">Hệ 10</th>
                    <th className="p-2 text-center">H 4</th>
                    <th className="p-2 text-center">Điểm Chữ</th>
                    <th className="p-2 text-center">Kết Quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {grades.map((g, idx) => (
                    <tr key={g.id}>
                      <td className="p-2 text-zinc-500">{idx + 1}</td>
                      <td className="p-2 font-mono text-zinc-600">{g.hocKy} ({g.namHoc})</td>
                      <td className="p-2 font-mono font-bold text-blue-600">{g.maMH}</td>
                      <td className="p-2 font-semibold text-zinc-900 dark:text-white">{g.tenMH || g.maMH}</td>
                      <td className="p-2 text-center font-mono">{g.soTinChi || 3}</td>
                      <td className="p-2 text-center font-mono font-bold">{g.diemTongKet10}</td>
                      <td className="p-2 text-center font-mono font-bold">{g.diemThang4}</td>
                      <td className="p-2 text-center font-bold">{g.diemChu}</td>
                      <td className="p-2 text-center font-semibold text-emerald-700">
                        {g.trangThai === 'PASSED' ? 'Đạt' : 'Không đạt'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-center font-semibold">
              <div>
                <span className="text-zinc-500 text-[11px] block">Tổng Tín Chỉ Tích Lũy</span>
                <strong className="text-emerald-600 text-base">{cumulativeSummary.tongTinChiTichLuy} Tín ch</strong>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px] block">GPA Tích Lũy Thang 4</span>
                <strong className="text-blue-600 text-base">{cumulativeSummary.diemTBTichLuyThang4.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px] block">Điểm TB Tích Lũy Thang 10</span>
                <strong className="text-zinc-900 dark:text-white text-base">{cumulativeSummary.diemTBTichLuyThang10.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px] block">Xếp Loại Học Lực</span>
                <strong className="text-indigo-600 text-base">{cumulativeSummary.xepLoaiHocLuc}</strong>
              </div>
            </div>
            <div className="pt-6 flex justify-end gap-3 no-print">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Tải File Excel</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>In Bản Cứng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

