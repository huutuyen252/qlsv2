import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { DiemDanh, SinhVien, ThoiKhoaBieu, UserRole } from '../../types';
import {
  X,
  UserCheck,
  AlertTriangle,
  Calendar,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Search,
  Users,
  FileSpreadsheet
} from 'lucide-react';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceList: DiemDanh[];
  schedule: ThoiKhoaBieu[];
  students: SinhVien[];
  userRole?: UserRole;
  currentUserFullName?: string;
  onSaveAttendance: (record: Partial<DiemDanh>) => Promise<void> | void;
  onDeleteAttendance: (id: string) => Promise<void> | void;
  attendanceContext?: {
    maMH: string;
    tenMH: string;
    lop?: string;
    ngay: string;
    soTiet: number;
    soTinChi?: number;
  } | null;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  attendanceList,
  schedule,
  students,
  userRole = 'LECTURER',
  currentUserFullName = '',
  onSaveAttendance,
  onDeleteAttendance,
  attendanceContext = null,
}) => {
  const [activeTab, setActiveTab] = useState<'RECORD' | 'SUMMARY'>('SUMMARY');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchStudent, setSearchStudent] = useState<string>('');

  // Form State for Single Attendance Entry
  const [formMaSV, setFormMaSV] = useState<string>('');
  const [formMaMH, setFormMaMH] = useState<string>('');
  const [formNgay, setFormNgay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formSoTietNghi, setFormSoTietNghi] = useState<number>(3);
  const [formCoPhep, setFormCoPhep] = useState<boolean>(false);
  const [formGhiChu, setFormGhiChu] = useState<string>('');

  if (!isOpen) return null;

  // Filter subjects accessible by Lecturer or Admin
  const availableSubjects = Array.from(
    new Set(schedule.map((s) => s.maMH))
  ).map((maMH) => {
    const item = schedule.find((s) => s.maMH === maMH);
    return { maMH, tenMH: item?.tenMH || maMH, soTinChi: item?.soTinChi || 3, giangVien: item?.giangVien || '' };
  });

  const availableClasses = Array.from(
    new Set(students.map((s) => s.lop).filter(Boolean))
  );

  // Filtered Students for single entry dropdown
  const filteredStudents = students.filter((s) => {
    if (selectedClass !== 'ALL' && s.lop !== selectedClass) return false;
    if (searchStudent) {
      const q = searchStudent.toLowerCase();
      return s.maSV.toLowerCase().includes(q) || s.hoTen.toLowerCase().includes(q);
    }
    return true;
  });

  const sortStudentsByCode = (studentList: SinhVien[]) => [...studentList].sort((a, b) =>
    a.maSV.localeCompare(b.maSV, undefined, { numeric: true, sensitivity: 'base' })
  );

  const contextStudents = attendanceContext
    ? sortStudentsByCode(students.filter((s) => !attendanceContext.lop || s.lop === attendanceContext.lop))
    : [];

  const getContextRecord = (student: SinhVien) => attendanceContext
    ? attendanceList.find((record) =>
        record.maSV.toLowerCase() === student.maSV.toLowerCase() &&
        record.maMH === attendanceContext.maMH &&
        record.ngay === attendanceContext.ngay
      )
    : undefined;

  const handleContextStatus = async (student: SinhVien, status: 'PRESENT' | 'EXCUSED' | 'UNEXCUSED') => {
    if (!attendanceContext) return;
    const existing = getContextRecord(student);
    await onSaveAttendance({
      id: existing?.id || `att-${student.maSV}-${attendanceContext.maMH}-${attendanceContext.ngay}`,
      maSV: student.maSV,
      hoTenSV: student.hoTen,
      maMH: attendanceContext.maMH,
      tenMH: attendanceContext.tenMH,
      lop: student.lop || attendanceContext.lop || '',
      ngay: attendanceContext.ngay,
      soTietNghi: status === 'PRESENT' ? 0 : attendanceContext.soTiet,
      coPhep: status === 'EXCUSED',
      ghiChu: status === 'PRESENT' ? 'Có mặt' : status === 'EXCUSED' ? 'Vắng có phép' : 'Vắng không phép',
      nguoiDiemDanh: currentUserFullName || 'Giảng viên',
    });
  };

  // Calculate Absence Statistics per Student per Subject
  // Rule: 1 tín chỉ = 15 tiết
  const studentAbsenceSummaries = students.map((sv) => {
    // Subjects taken by this student
    const studentSchedules = schedule.filter(
      (s) =>
        (!s.maSV || s.maSV.toLowerCase() === sv.maSV.toLowerCase()) &&
        (!s.lop || s.lop === sv.lop)
    );

    // Get unique subjects
    const uniqueSubjects = Array.from(new Set(studentSchedules.map((s) => s.maMH)));

    const subjectSummaries = uniqueSubjects.map((maMH) => {
      const schItem = studentSchedules.find((s) => s.maMH === maMH);
      const credits = schItem?.soTinChi || 3;
      const totalPeriods = credits * 15; // 1 tín chỉ = 15 tiết

      // Attendance records for this student and subject
      const svRecords = attendanceList.filter(
        (a) => a.maSV.toLowerCase() === sv.maSV.toLowerCase() && a.maMH === maMH
      );

      const totalMissed = svRecords.reduce((sum, r) => sum + (r.soTietNghi || 0), 0);
      const percentage = (totalMissed / totalPeriods) * 100;

      let alertLevel: 'NONE' | 'WARNING' | 'DANGER' = 'NONE';
      if (percentage >= 20) {
        alertLevel = 'DANGER'; // Restrict / Bị cấm thi (Nghỉ >= 20%)
      } else if (percentage >= 15) {
        alertLevel = 'WARNING'; // Approaching 20% threshold
      }

      return {
        maMH,
        tenMH: schItem?.tenMH || maMH,
        soTinChi: credits,
        totalPeriods,
        totalMissed,
        percentage,
        alertLevel,
        records: svRecords,
      };
    });

    return {
      student: sv,
      subjectSummaries,
      hasDanger: subjectSummaries.some((s) => s.alertLevel === 'DANGER'),
      hasWarning: subjectSummaries.some((s) => s.alertLevel === 'WARNING'),
    };
  });

  // Filter summaries based on user controls
  const filteredSummaries = studentAbsenceSummaries.filter((item) => {
    if (selectedClass !== 'ALL' && item.student.lop !== selectedClass) return false;
    if (searchStudent) {
      const q = searchStudent.toLowerCase();
      const matchName = item.student.hoTen.toLowerCase().includes(q);
      const matchCode = item.student.maSV.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    if (selectedSubject !== 'ALL') {
      return item.subjectSummaries.some((sub) => sub.maMH === selectedSubject);
    }
    return true;
  });

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaSV || !formMaMH || !formNgay) {
      alert('Vui lòng chọn Sinh viên, Môn học và Ngày điểm danh!');
      return;
    }

    const targetSv = students.find((s) => s.maSV === formMaSV);
    const targetMh = availableSubjects.find((m) => m.maMH === formMaMH);

    await onSaveAttendance({
      maSV: formMaSV,
      hoTenSV: targetSv?.hoTen || '',
      maMH: formMaMH,
      tenMH: targetMh?.tenMH || formMaMH,
      lop: targetSv?.lop || '',
      ngay: formNgay,
      soTietNghi: Number(formSoTietNghi) || 1,
      coPhep: formCoPhep,
      ghiChu: formGhiChu,
      nguoiDiemDanh: currentUserFullName || 'Giảng viên',
    });

    // Reset form
    setFormGhiChu('');
    alert('Đã lưu lượt điểm danh thành công!');
  };

  // Export process attendance report Excel file with class list & dates
  const handleExportAttendanceExcel = () => {
    const exportClass = attendanceContext?.lop || selectedClass;
    const exportSubject = attendanceContext?.maMH || selectedSubject;
    const exportStudents = sortStudentsByCode(students.filter(
      (s) => exportClass === 'ALL' || s.lop === exportClass
    ));

    if (exportStudents.length === 0) {
      alert('Không có dữ liệu sinh viên phù hợp để xuất Excel!');
      return;
    }

    // Collect all unique attendance dates
    const datesSet = new Set<string>();
    if (attendanceContext?.ngay && exportSubject !== 'ALL') {
      datesSet.add(attendanceContext.ngay);
    }
    attendanceList.forEach((rec) => {
      if (exportSubject !== 'ALL' && rec.maMH !== exportSubject) return;
      if (exportClass !== 'ALL' && rec.lop && rec.lop !== exportClass) return;
      if (rec.ngay) datesSet.add(rec.ngay);
    });

    const sortedDates = Array.from(datesSet).sort();
    const totalCoursePeriods = (attendanceContext?.soTinChi || 1) * 15;

    const formatDateHeader = (dateStr: string) => {
      const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
      if (parts.length === 3) {
        return dateStr.includes('-') ? `${parts[2]}/${parts[1]}` : `${parts[0]}/${parts[1]}`;
      }
      return dateStr;
    };

    // Build row data for Excel
    const exportData = exportStudents.map((sv, index) => {
      const svRecords = attendanceList.filter(
        (a) =>
          a.maSV.toLowerCase() === sv.maSV.toLowerCase() &&
            (exportSubject === 'ALL' || a.maMH === exportSubject) &&
            (exportClass === 'ALL' || !a.lop || a.lop === exportClass)
      );

      const totalMissed = svRecords.reduce((sum, r) => sum + (r.soTietNghi || 0), 0);
          const absencePercentage = totalCoursePeriods > 0 ? (totalMissed / totalCoursePeriods) * 100 : 0;

      const row: Record<string, any> = {
        'STT': index + 1,
        'Mã Sinh Viên': sv.maSV,
        'Họ và Tên': sv.hoTen,
        'Lớp Học': sv.lop || 'Chưa phân lớp',
        'Môn Học': attendanceContext?.tenMH || exportSubject,
      };

      if (sortedDates.length > 0) {
        sortedDates.forEach((dateStr) => {
          const recOnDate = svRecords.find((r) => r.ngay === dateStr);
          if (recOnDate) {
            if (recOnDate.soTietNghi > 0) {
              row[formatDateHeader(dateStr)] = `Vắng ${recOnDate.soTietNghi} tiết${recOnDate.coPhep ? ' (Có phép)' : ' (Không phép)'}`;
            } else {
                  row[formatDateHeader(dateStr)] = 'Có mặt';
            }
          } else {
                row[formatDateHeader(dateStr)] = 'Có mặt';
          }
        });
      } else {
        row['Điểm Danh Quá Trình Học'] = totalMissed > 0 ? `Tổng vắng ${totalMissed} tiết` : 'Có mặt đầy đủ';
      }

      row['Tổng Tiết Vắng'] = totalMissed;
      row['Tỷ Lệ Nghỉ (%)'] = Number(absencePercentage.toFixed(2));

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangDiemDanh_Lop');
    const fileName = `BangDiemDanh_${exportClass !== 'ALL' ? exportClass : 'TatCaLop'}_${exportSubject !== 'ALL' ? exportSubject : 'TatCaMon'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Quản Lý Điểm Danh Hằng Ngày & Cảnh Báo Nghỉ Học</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('SUMMARY')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'SUMMARY'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Điểm danh
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
            {userRole === 'LECTURER' && (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                GV: {currentUserFullName || 'Giảng viên phụ trách'}
              </span>
            )}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SUMMARY & 20% WARNING TABLE */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-6">
              {attendanceContext && (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-indigo-950 dark:text-indigo-100">Điểm danh lớp theo thời khóa biểu</p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                          {attendanceContext.tenMH} ({attendanceContext.maMH}) • Lớp {attendanceContext.lop || 'chưa xác định'} • Ngày {attendanceContext.ngay}
                        </p>
                      </div>
                      <button
                        onClick={() => handleExportAttendanceExcel()}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                      >
                        <FileSpreadsheet className="w-4 h-4" /> Xuất Excel tổng hợp
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold">
                            <th className="p-3">STT</th><th className="p-3">Mã SV</th><th className="p-3">Họ và tên</th><th className="p-3">Trạng thái điểm danh</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {contextStudents.map((student, index) => {
                            const record = getContextRecord(student);
                            const status = !record ? null : record.soTietNghi === 0 ? 'PRESENT' : record.coPhep ? 'EXCUSED' : 'UNEXCUSED';
                            return (
                              <tr key={student.maSV}>
                                <td className="p-3">{index + 1}</td>
                                <td className="p-3 font-mono font-bold text-indigo-600">{student.maSV}</td>
                                <td className="p-3 font-semibold">{student.hoTen}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-2">
                                    {([
                                      ['PRESENT', 'Có mặt', 'bg-emerald-600'],
                                      ['EXCUSED', 'Vắng có phép', 'bg-amber-500'],
                                      ['UNEXCUSED', 'Vắng không phép', 'bg-red-600'],
                                    ] as const).map(([value, label, color]) => (
                                      <button
                                        key={value}
                                        onClick={() => handleContextStatus(student, value)}
                                        className={`px-2.5 py-1.5 rounded-lg font-bold border transition-colors ${status === value ? `${color} text-white border-transparent` : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'}`}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {!attendanceContext && (
                <div className="space-y-6">
              {/* Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-100 dark:bg-slate-800/80 p-4 rounded-2xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Lọc Theo Lớp Lớp Học
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">-- Tất cả Lớp --</option>
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Lọc Theo Môn Học
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">-- Tất cả Môn học --</option>
                    {availableSubjects.map((s) => (
                      <option key={s.maMH} value={s.maMH}>
                        {s.maMH} - {s.tenMH} ({s.soTinChi} tín chỉ = {s.soTinChi * 15} tiết)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Tìm kiếm Sinh viên
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Mã SV hoặc Tên..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Excel Export Action Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/60">
                <p className="text-xs text-indigo-950 dark:text-indigo-200 font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Danh sách điểm danh lớp: <strong className="font-bold">{selectedClass === 'ALL' ? 'Tất cả Lớp' : selectedClass}</strong> ({filteredSummaries.length} sinh viên)</span>
                </p>
                <button
                  onClick={handleExportAttendanceExcel}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất File Excel Điểm Danh Quá Trình Học</span>
                </button>
              </div>

              {/* Attendance Rule Banner */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Quy chế Chuyên cần & Cấm Thi (Nghỉ học 20%):</p>
                  <p className="mt-1">
                    Số tiết quy định = <span className="font-semibold">Số tín chỉ × 15 tiết</span>. Nếu tổng số tiết nghỉ của sinh viên đạt từ <span className="font-bold text-red-600 dark:text-red-400">20% trở lên</span>, sinh viên thuộc diện <span className="font-bold text-red-600 dark:text-red-400">NGUY CƠ BỊ CẤM THI</span> học phần đó và sẽ tự động nhận thông báo cảnh báo khi đăng nhập.
                  </p>
                </div>
              </div>

              {/* Summary Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3">Mã SV</th>
                        <th className="p-3">Họ và Tên</th>
                        <th className="p-3">Lớp</th>
                        <th className="p-3">Môn Học</th>
                        <th className="p-3 text-center">Tín Chỉ</th>
                        <th className="p-3 text-center">Tổng Số Tiết</th>
                        <th className="p-3 text-center">Đã Nghỉ</th>
                        <th className="p-3 text-center">Tỷ Lệ Nghỉ %</th>
                        <th className="p-3 text-center">Trạng Thái Cảnh Báo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">
                            Chưa có dữ liệu điểm danh phù hợp với bộ lọc chọn.
                          </td>
                        </tr>
                      ) : (
                        filteredSummaries.flatMap((summary) =>
                          summary.subjectSummaries
                            .filter(
                              (sub) => selectedSubject === 'ALL' || sub.maMH === selectedSubject
                            )
                            .map((sub, idx) => {
                              const isDanger = sub.alertLevel === 'DANGER';
                              const isWarning = sub.alertLevel === 'WARNING';

                              return (
                                <tr
                                  key={`${summary.student.maSV}-${sub.maMH}`}
                                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                    isDanger
                                      ? 'bg-red-50/70 dark:bg-red-950/30'
                                      : isWarning
                                      ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                      : ''
                                  }`}
                                >
                                  <td className="p-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                    {summary.student.maSV}
                                  </td>
                                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                                    {summary.student.hoTen}
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-400">
                                    {summary.student.lop}
                                  </td>
                                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                    {sub.tenMH} ({sub.maMH})
                                  </td>
                                  <td className="p-3 text-center font-bold">{sub.soTinChi} TC</td>
                                  <td className="p-3 text-center font-bold text-slate-600 dark:text-slate-400">
                                    {sub.totalPeriods} tiết
                                  </td>
                                  <td className="p-3 text-center font-bold text-red-600 dark:text-red-400">
                                    {sub.totalMissed} tiết
                                  </td>
                                  <td className="p-3 text-center font-bold">
                                    <span
                                      className={`px-2.5 py-1 rounded-full ${
                                        isDanger
                                          ? 'bg-red-600 text-white animate-pulse'
                                          : isWarning
                                          ? 'bg-amber-500 text-white'
                                          : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                      }`}
                                    >
                                      {sub.percentage.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {isDanger ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 shadow-sm">
                                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                        CẤM THI (≥20%)
                                      </span>
                                    ) : isWarning ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                        CẢNH BÁO (≥15%)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                        Bình thường
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* History Log of Raw Attendance Records */}
              <div className="mt-8 space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Nhật Ký Lượt Điểm Danh Đã Ghi Nhanh
                </h3>

                <div className="space-y-2">
                  {attendanceList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      Chưa có lượt ghi điểm danh nào.
                    </div>
                  ) : (
                    attendanceList.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${record.soTietNghi === 0
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            {record.soTietNghi === 0 ? 'Có mặt' : `-${record.soTietNghi}T`}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span>{record.hoTenSV} ({record.maSV})</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{record.tenMH}</span>
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 flex items-center gap-2">
                              <span>Ngày: {record.ngay}</span>
                              <span>•</span>
                              <span>
                                {record.soTietNghi === 0 ? (
                                  <span className="text-emerald-600 font-medium">Có mặt</span>
                                ) : record.coPhep ? (
                                  <span className="text-amber-600 font-medium">Vắng có phép</span>
                                ) : (
                                  <span className="text-red-500 font-medium">Vắng không phép</span>
                                )}
                              </span>
                              {record.ghiChu &&
                                !['Có mặt', 'Vắng có phép', 'Vắng không phép'].includes(record.ghiChu.trim()) && (
                                <>
                                  <span>•</span>
                                  <span className="italic">"{record.ghiChu}"</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onDeleteAttendance(record.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Xóa lượt điểm danh này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RECORD NEW ATTENDANCE FORM */}
          {activeTab === 'RECORD' && (
            <form onSubmit={handleSingleSubmit} className="space-y-6 max-w-2xl mx-auto">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs text-indigo-800 dark:text-indigo-300">
                <p className="font-bold">Nhập thông tin lượt nghỉ cho Sinh viên:</p>
                <p className="mt-0.5">
                  Mỗi tín chỉ tương ứng với 15 tiết học. Điểm danh ghi nhận số tiết nghỉ sẽ tự động tính toán tổng số tiết vắng mặt để xuất cảnh báo cho sinh viên khi chạm mốc 20%.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chọn Lớp Học
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">-- Tất cả Lớp --</option>
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chọn Môn Học <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formMaMH}
                    onChange={(e) => setFormMaMH(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Chọn Môn Giảng Dạy --</option>
                    {availableSubjects.map((s) => (
                      <option key={s.maMH} value={s.maMH}>
                        {s.maMH} - {s.tenMH} ({s.soTinChi} tín chỉ = {s.soTinChi * 15} tiết)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn Sinh Viên <span className="text-red-500">*</span>
                </label>
                <select
                  value={formMaSV}
                  onChange={(e) => setFormMaSV(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn Sinh Viên Cần Điểm Danh --</option>
                  {filteredStudents.map((sv) => (
                    <option key={sv.maSV} value={sv.maSV}>
                      {sv.maSV} - {sv.hoTen} ({sv.lop})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày Điểm Danh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formNgay}
                    onChange={(e) => setFormNgay(e.target.value)}
                    required
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số Tiết Sinh Viên Nghỉ Trong Buổi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formSoTietNghi}
                    onChange={(e) => setFormSoTietNghi(Number(e.target.value))}
                    required
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="coPhep"
                  checked={formCoPhep}
                  onChange={(e) => setFormCoPhep(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="coPhep" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nghỉ có đơn xin phép (Có giấy xác nhận lý do chính đáng)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi Chú Lý Do Nghỉ / Nhắc Nhở
                </label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Nghỉ ốm có giấy khám bệnh / Vắng mặt không lý do..."
                  value={formGhiChu}
                  onChange={(e) => setFormGhiChu(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Lưu Lượt Điểm Danh
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
