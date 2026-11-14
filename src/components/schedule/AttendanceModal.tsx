import React, { useState, useEffect, useId } from 'react';
import * as XLSX from 'xlsx';
import { DiemDanh, SinhVien, ThoiKhoaBieu, UserRole } from '../../types';
import {
  X,
  UserCheck,
  Clock,
  Trash2,
  Search,
  Users,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ConfirmDialog,
  DataToolbar,
  EmptyState,
  ErrorBanner,
  FilteredEmptyState,
  StatusBadge,
} from '../common';

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
  const titleId = useId();
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'RECORD'>('SUMMARY');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchStudent, setSearchStudent] = useState<string>('');

  const [formMaSV, setFormMaSV] = useState<string>('');
  const [formMaMH, setFormMaMH] = useState<string>('');
  const [formNgay, setFormNgay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formSoTietNghi, setFormSoTietNghi] = useState<number>(3);
  const [formCoPhep, setFormCoPhep] = useState<boolean>(false);
  const [formGhiChu, setFormGhiChu] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiemDanh | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setModalError(null);
    setStatusMessage(null);
    if (attendanceContext) {
      setActiveTab('SUMMARY');
    }
  }, [isOpen, attendanceContext]);

  useEffect(() => {
    if (!isOpen || deleteTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deleteTarget, onClose]);

  if (!isOpen) return null;

  const availableSubjects = Array.from(new Set(schedule.map((s) => s.maMH))).map((maMH) => {
    const item = schedule.find((s) => s.maMH === maMH);
    return {
      maMH,
      tenMH: item?.tenMH || maMH,
      soTinChi: item?.soTinChi || 3,
      giangVien: item?.giangVien || '',
    };
  });

  const availableClasses = Array.from(new Set(students.map((s) => s.lop).filter(Boolean))).sort();

  const filteredStudents = students.filter((s) => {
    if (selectedClass !== 'ALL' && s.lop !== selectedClass) return false;
    if (searchStudent) {
      const q = searchStudent.toLowerCase();
      return s.maSV.toLowerCase().includes(q) || s.hoTen.toLowerCase().includes(q);
    }
    return true;
  });

  const sortStudentsByCode = (studentList: SinhVien[]) =>
    [...studentList].sort((a, b) =>
      a.maSV.localeCompare(b.maSV, undefined, { numeric: true, sensitivity: 'base' })
    );

  const contextStudents = attendanceContext
    ? sortStudentsByCode(
        students.filter((s) => !attendanceContext.lop || s.lop === attendanceContext.lop)
      )
    : [];

  const getContextRecord = (student: SinhVien) =>
    attendanceContext
      ? attendanceList.find(
          (record) =>
            record.maSV.toLowerCase() === student.maSV.toLowerCase() &&
            record.maMH === attendanceContext.maMH &&
            record.ngay === attendanceContext.ngay
        )
      : undefined;

  const handleContextStatus = async (
    student: SinhVien,
    status: 'PRESENT' | 'EXCUSED' | 'UNEXCUSED'
  ) => {
    if (!attendanceContext) return;
    setModalError(null);
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
      ghiChu:
        status === 'PRESENT'
          ? 'Có mặt'
          : status === 'EXCUSED'
          ? 'Vắng có phép'
          : 'Vắng không phép',
      nguoiDiemDanh: currentUserFullName || 'Giảng viên',
    });
  };

  const studentAbsenceSummaries = students.map((sv) => {
    const studentSchedules = schedule.filter(
      (s) =>
        (!s.maSV || s.maSV.toLowerCase() === sv.maSV.toLowerCase()) &&
        (!s.lop || s.lop === sv.lop)
    );
    const uniqueSubjects = Array.from(new Set(studentSchedules.map((s) => s.maMH)));

    const subjectSummaries = uniqueSubjects.map((maMH) => {
      const schItem = studentSchedules.find((s) => s.maMH === maMH);
      const credits = schItem?.soTinChi || 3;
      const totalPeriods = credits * 15;
      const svRecords = attendanceList.filter(
        (a) => a.maSV.toLowerCase() === sv.maSV.toLowerCase() && a.maMH === maMH
      );
      const totalMissed = svRecords.reduce((sum, r) => sum + (r.soTietNghi || 0), 0);
      const percentage = totalPeriods > 0 ? (totalMissed / totalPeriods) * 100 : 0;

      let alertLevel: 'NONE' | 'WARNING' | 'DANGER' = 'NONE';
      if (percentage >= 20) {
        alertLevel = 'DANGER';
      } else if (percentage >= 15) {
        alertLevel = 'WARNING';
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

  const summaryRows = filteredSummaries.flatMap((summary) =>
    summary.subjectSummaries
      .filter((sub) => selectedSubject === 'ALL' || sub.maMH === selectedSubject)
      .map((sub) => ({ summary, sub }))
  );

  const hasActiveFilters =
    selectedClass !== 'ALL' || selectedSubject !== 'ALL' || Boolean(searchStudent.trim());

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setStatusMessage(null);

    if (!formMaSV || !formMaMH || !formNgay) {
      setModalError('Vui lòng chọn sinh viên, môn học và ngày điểm danh.');
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

    setFormGhiChu('');
    setStatusMessage('Đã lưu lượt điểm danh.');
  };

  const handleExportAttendanceExcel = () => {
    setModalError(null);
    const exportClass = attendanceContext?.lop || selectedClass;
    const exportSubject = attendanceContext?.maMH || selectedSubject;
    const exportStudents = sortStudentsByCode(
      students.filter((s) => exportClass === 'ALL' || s.lop === exportClass)
    );

    if (exportStudents.length === 0) {
      setModalError('Chưa có dữ liệu sinh viên để xuất Excel.');
      return;
    }

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
        STT: index + 1,
        'Mã Sinh Viên': sv.maSV,
        'Họ và Tên': sv.hoTen,
        'Lớp Học': sv.lop || '',
        'Môn Học': attendanceContext?.tenMH || exportSubject,
      };

      if (sortedDates.length > 0) {
        sortedDates.forEach((dateStr) => {
          const recOnDate = svRecords.find((r) => r.ngay === dateStr);
          if (recOnDate && recOnDate.soTietNghi > 0) {
            row[formatDateHeader(dateStr)] = `Vắng ${recOnDate.soTietNghi} tiết${
              recOnDate.coPhep ? ' (Có phép)' : ' (Không phép)'
            }`;
          } else {
            row[formatDateHeader(dateStr)] = 'Có mặt';
          }
        });
      } else {
        row['Chuyên cần'] = totalMissed > 0 ? `Vắng ${totalMissed} tiết` : 'Có mặt';
      }

      row['Tổng Tiết Vắng'] = totalMissed;
      row['Tỷ Lệ Nghỉ (%)'] = Number(absencePercentage.toFixed(2));
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangDiemDanh_Lop');
    const fileName = `BangDiemDanh_${exportClass !== 'ALL' ? exportClass : 'TatCaLop'}_${
      exportSubject !== 'ALL' ? exportSubject : 'TatCaMon'
    }_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <h2 id={titleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Quản lý điểm danh
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Chế độ điểm danh">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'SUMMARY'}
              onClick={() => setActiveTab('SUMMARY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                activeTab === 'SUMMARY'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{attendanceContext ? 'Điểm danh lớp' : 'Tổng hợp chuyên cần'}</span>
            </button>
            {!attendanceContext && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'RECORD'}
                onClick={() => setActiveTab('RECORD')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  activeTab === 'RECORD'
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Ghi nhận nghỉ học</span>
              </button>
            )}
          </div>

          {userRole === 'LECTURER' && currentUserFullName && (
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hidden sm:inline">
              {currentUserFullName}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {modalError && <ErrorBanner message={modalError} />}
          {statusMessage && (
            <div
              role="status"
              className="p-2.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-medium"
            >
              {statusMessage}
            </div>
          )}

          {activeTab === 'SUMMARY' && attendanceContext && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-md flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                  <span>{attendanceContext.tenMH}</span>
                  <span className="font-mono text-blue-700 dark:text-blue-400">
                    ({attendanceContext.maMH})
                  </span>
                  {attendanceContext.lop && <StatusBadge label={attendanceContext.lop} variant="info" />}
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {attendanceContext.ngay}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportAttendanceExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Xuất Excel</span>
                </button>
              </div>

              {contextStudents.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">STT</th>
                          <th className="py-2.5 px-3">Mã SV</th>
                          <th className="py-2.5 px-3">Họ và tên</th>
                          <th className="py-2.5 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {contextStudents.map((student, index) => {
                          const record = getContextRecord(student);
                          const status = !record
                            ? null
                            : record.soTietNghi === 0
                            ? 'PRESENT'
                            : record.coPhep
                            ? 'EXCUSED'
                            : 'UNEXCUSED';
                          return (
                            <tr key={student.maSV} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                                {index + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                                {student.maSV}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                                {student.hoTen}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {(
                                    [
                                      ['PRESENT', 'Có mặt', 'bg-emerald-700 text-white border-emerald-700'],
                                      ['EXCUSED', 'Vắng có phép', 'bg-amber-600 text-white border-amber-600'],
                                      ['UNEXCUSED', 'Vắng không phép', 'bg-rose-700 text-white border-rose-700'],
                                    ] as const
                                  ).map(([value, label, activeClass]) => (
                                    <button
                                      type="button"
                                      key={value}
                                      onClick={() => handleContextStatus(student, value)}
                                      className={`px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                                        status === value
                                          ? activeClass
                                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
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
              )}
            </div>
          )}

          {activeTab === 'SUMMARY' && !attendanceContext && (
            <div className="space-y-4">
              <DataToolbar
                searchValue={searchStudent}
                onSearchChange={setSearchStudent}
                searchPlaceholder="Tìm mã SV hoặc họ tên..."
                hasActiveFilters={hasActiveFilters}
                onClearFilters={() => {
                  setSelectedClass('ALL');
                  setSelectedSubject('ALL');
                  setSearchStudent('');
                }}
                filters={
                  <>
                    <select
                      aria-label="Lọc theo lớp"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200"
                    >
                      <option value="ALL">Tất cả lớp</option>
                      {availableClasses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Lọc theo môn học"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 max-w-[240px]"
                    >
                      <option value="ALL">Tất cả môn học</option>
                      {availableSubjects.map((s) => (
                        <option key={s.maMH} value={s.maMH}>
                          {s.maMH} - {s.tenMH}
                        </option>
                      ))}
                    </select>
                  </>
                }
                actions={
                  <button
                    type="button"
                    onClick={handleExportAttendanceExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded cursor-pointer whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Xuất Excel</span>
                  </button>
                }
              />

              {students.length === 0 || schedule.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : summaryRows.length === 0 ? (
                <FilteredEmptyState
                  onClearFilters={() => {
                    setSelectedClass('ALL');
                    setSelectedSubject('ALL');
                    setSearchStudent('');
                  }}
                />
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Mã SV</th>
                          <th className="py-2.5 px-3">Họ và tên</th>
                          <th className="py-2.5 px-3">Lớp</th>
                          <th className="py-2.5 px-3">Môn học</th>
                          <th className="py-2.5 px-3 text-center">TC</th>
                          <th className="py-2.5 px-3 text-center">Tổng tiết</th>
                          <th className="py-2.5 px-3 text-center">Đã nghỉ</th>
                          <th className="py-2.5 px-3 text-center">Tỷ lệ %</th>
                          <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {summaryRows.map(({ summary, sub }) => {
                          const isDanger = sub.alertLevel === 'DANGER';
                          const isWarning = sub.alertLevel === 'WARNING';
                          return (
                            <tr
                              key={`${summary.student.maSV}-${sub.maMH}`}
                              className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                            >
                              <td className="py-2.5 px-3 font-mono font-semibold text-blue-700 dark:text-blue-400">
                                {summary.student.maSV}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                                {summary.student.hoTen}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                {summary.student.lop || '—'}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                                {sub.tenMH} ({sub.maMH})
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                {sub.soTinChi}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                {sub.totalPeriods}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                                {sub.totalMissed}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold">
                                {sub.percentage.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isDanger ? (
                                  <StatusBadge label="Cấm thi (≥20%)" variant="danger" dot />
                                ) : isWarning ? (
                                  <StatusBadge label="Cảnh báo (≥15%)" variant="warning" dot />
                                ) : (
                                  <StatusBadge label="Bình thường" variant="success" dot />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Nhật ký điểm danh ({attendanceList.length})</span>
                </h3>

                {attendanceList.length === 0 ? (
                  <EmptyState message="Chưa có dữ liệu." />
                ) : (
                  <div className="space-y-1.5">
                    {attendanceList.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StatusBadge
                            label={record.soTietNghi === 0 ? 'Có mặt' : `-${record.soTietNghi} tiết`}
                            variant={
                              record.soTietNghi === 0
                                ? 'success'
                                : record.coPhep
                                ? 'warning'
                                : 'danger'
                            }
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {record.hoTenSV} ({record.maSV}) · {record.tenMH}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                              {record.ngay}
                              {record.ghiChu ? ` · ${record.ghiChu}` : ''}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(record)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                          aria-label={`Xóa lượt điểm danh ${record.maSV}`}
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'RECORD' && !attendanceContext && (
            <form onSubmit={handleSingleSubmit} className="space-y-3.5 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="att-rec-class" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Lớp học
                  </label>
                  <select
                    id="att-rec-class"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5"
                  >
                    <option value="ALL">Tất cả lớp</option>
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="att-rec-mamh" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Môn học *
                  </label>
                  <select
                    id="att-rec-mamh"
                    value={formMaMH}
                    onChange={(e) => setFormMaMH(e.target.value)}
                    required
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {availableSubjects.map((s) => (
                      <option key={s.maMH} value={s.maMH}>
                        {s.maMH} - {s.tenMH} ({s.soTinChi} TC)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="att-rec-sv" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Sinh viên *
                </label>
                <select
                  id="att-rec-sv"
                  value={formMaSV}
                  onChange={(e) => setFormMaSV(e.target.value)}
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5"
                >
                  <option value="">-- Chọn sinh viên --</option>
                  {filteredStudents.map((sv) => (
                    <option key={sv.maSV} value={sv.maSV}>
                      {sv.maSV} - {sv.hoTen} ({sv.lop})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="att-rec-ngay" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Ngày điểm danh *
                  </label>
                  <input
                    id="att-rec-ngay"
                    type="date"
                    value={formNgay}
                    onChange={(e) => setFormNgay(e.target.value)}
                    required
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="att-rec-sotiet" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Số tiết nghỉ *
                  </label>
                  <input
                    id="att-rec-sotiet"
                    type="number"
                    min={1}
                    max={10}
                    value={formSoTietNghi}
                    onChange={(e) => setFormSoTietNghi(Number(e.target.value))}
                    required
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 font-mono tabular-nums font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="coPhep"
                  checked={formCoPhep}
                  onChange={(e) => setFormCoPhep(e.target.checked)}
                  className="w-4 h-4 text-blue-700 rounded border-slate-300"
                />
                <label htmlFor="coPhep" className="font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                  Nghỉ có phép
                </label>
              </div>

              <div>
                <label htmlFor="att-rec-ghichu" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Ghi chú
                </label>
                <textarea
                  id="att-rec-ghichu"
                  rows={2}
                  value={formGhiChu}
                  onChange={(e) => setFormGhiChu(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Lưu điểm danh</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xác nhận xóa lượt điểm danh"
        message={`Bạn có chắc chắn muốn xóa lượt điểm danh của sinh viên ${deleteTarget?.hoTenSV || ''} (${deleteTarget?.maSV || ''}) ngày ${deleteTarget?.ngay || ''}?`}
        confirmLabel="Xóa"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await onDeleteAttendance(deleteTarget.id);
          setDeleteTarget(null);
          setStatusMessage('Đã xóa lượt điểm danh.');
        }}
      />
    </div>
  );
};
