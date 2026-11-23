import React, { useEffect, useState, useMemo, useRef } from 'react';
import { SinhVien, Diem, RenLuyen, ThiLaiHocLai } from '../../types';
import { getCohortForClass } from '../../utils/classHelper';
import { triggerPrintWithFallback } from '../../utils/printHelper';
import { StatusBadge, EmptyState } from '../common';
import type { ProfileTabKey } from './StudentFullProfileView';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  FileText,
  Download,
  Edit2,
  GraduationCap,
  Copy,
  Check,
  ExternalLink,
  Printer,
  BookOpen,
  Award,
  Paperclip,
} from 'lucide-react';

interface StudentDetailDrawerProps {
  isOpen: boolean;
  student: SinhVien | null;
  onClose: () => void;
  onEdit?: (student: SinhVien) => void;
  grades?: Diem[];
  trainingPoints?: RenLuyen[];
  retakes?: ThiLaiHocLai[];
  activeSemester?: string;
  onPreviewFile?: (
    fileUrl: string,
    customName: string,
    fileName: string,
    student: { hoTen: string; maSV: string; lop?: string }
  ) => void;
  onOpenFullProfile?: (maSV: string, tab?: ProfileTabKey) => void;
}

export const StudentDetailDrawer: React.FC<StudentDetailDrawerProps> = ({
  isOpen,
  student,
  onClose,
  onEdit,
  grades = [],
  trainingPoints = [],
  retakes = [],
  activeSemester = '',
  onPreviewFile,
  onOpenFullProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'DOCUMENTS' | 'ACADEMIC'>('PROFILE');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const drawerPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (student) {
      setActiveTab('PROFILE');
      setCopiedField(null);
      setPrintNotice(null);
    }
  }, [student?.maSV]);

  const academicSummary = useMemo(() => {
    if (!student) {
      return {
        gradeCount: 0,
        passedCredits: 0,
        gpa4: null as number | null,
        gpa10: null as number | null,
        latestTraining: null as RenLuyen | null,
        retakeCount: 0,
      };
    }

    const maSVLower = student.maSV.toLowerCase();
    const studentGrades = grades.filter((g) => g.maSV?.toLowerCase() === maSVLower);
    let totalWeighted4 = 0;
    let totalWeighted10 = 0;
    let totalCredits = 0;
    let passedCredits = 0;

    studentGrades.forEach((g) => {
      const credits = Number(g.soTinChi) || 0;
      const d4 = Number(g.diemThang4Num ?? g.diemThang4);
      const d10 = Number(g.diemTongKet10Num ?? g.diemTongKet10);
      if (credits > 0 && !Number.isNaN(d4) && !Number.isNaN(d10)) {
        totalCredits += credits;
        totalWeighted4 += d4 * credits;
        totalWeighted10 += d10 * credits;
        if (g.trangThai === 'PASSED') {
          passedCredits += credits;
        }
      }
    });

    const studentTraining = trainingPoints
      .filter((r) => r.maSV?.toLowerCase() === maSVLower)
      .sort((a, b) => (b.nam - a.nam) || (b.thang - a.thang));

    const studentRetakes = retakes.filter((rt) => rt.maSV?.toLowerCase() === maSVLower);

    return {
      gradeCount: studentGrades.length,
      passedCredits,
      gpa4: totalCredits > 0 ? totalWeighted4 / totalCredits : null,
      gpa10: totalCredits > 0 ? totalWeighted10 / totalCredits : null,
      latestTraining: studentTraining[0] || null,
      retakeCount: studentRetakes.length,
    };
  }, [student, grades, trainingPoints, retakes]);

  if (!isOpen || !student) return null;

  const isGraduated = student.trangThai === 'Tốt nghiệp';
  const isSuspended =
    student.trangThai === 'Bảo lưu' ||
    student.trangThai === 'Đã thôi học' ||
    student.trangThai === 'Thôi học';

  const statusVariant = isGraduated ? 'info' : isSuspended ? 'warning' : 'success';

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField((cur) => (cur === fieldName ? null : cur));
    }, 2000);
  };

  const parts = (student.hoTen || student.maSV || 'SV').trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0
      ? 'SV'
      : parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  const fallbackBg = student.gioiTinh === 'Nữ' ? '#be123c' : '#1d4ed8';
  const fallbackSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="20" fill="${fallbackBg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="48" font-weight="700">${initials}</text></svg>`
  )}`;
  const avatarUrl = student.avatar && student.avatar.trim() ? student.avatar.trim() : fallbackSvg;

  const allFiles: { id: string; customName: string; fileName: string; fileUrl: string; uploadedAt?: string }[] = [];
  if (Array.isArray(student.hoSoFiles) && student.hoSoFiles.length > 0) {
    student.hoSoFiles.forEach((f, idx) => {
      allFiles.push({
        id: f.id || `file-${idx}`,
        customName: f.customName || f.fileName || `Tài liệu #${idx + 1}`,
        fileName: f.fileName || 'TaiLieu.pdf',
        fileUrl: f.fileUrl,
        uploadedAt: f.uploadedAt || student.ngayNhapHoc || '',
      });
    });
  } else if (student.hoSoFile) {
    allFiles.push({
      id: 'legacy-hoso-1',
      customName: student.hoSoFileName || 'Hồ sơ đính kèm',
      fileName: student.hoSoFileName || `HoSo_${student.maSV}.pdf`,
      fileUrl: student.hoSoFile,
      uploadedAt: student.ngayNhapHoc || '',
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="slide-over-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 sm:pl-10">
        <div
          ref={drawerPrintRef}
          className="w-screen max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-xl print-page"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h2
                id="slide-over-title"
                className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider"
              >
                Hồ sơ chi tiết sinh viên
              </h2>
            </div>
            <div className="flex items-center gap-1.5 no-print">
              <button
                type="button"
                onClick={() => {
                  setPrintNotice(null);
                  triggerPrintWithFallback({
                    element: drawerPrintRef.current,
                    title: `Hồ sơ sinh viên - ${student.hoTen} (${student.maSV})`,
                    filename: `TDNU_HoSo_${student.maSV}.html`,
                    onFallback: () => {
                      setPrintNotice('Đã tự động tải xuống phiếu hồ sơ (.html). Mở tệp và nhấn Ctrl+P để in hoặc lưu PDF.');
                    },
                  });
                }}
                className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="In phiếu thông tin"
                aria-label="In phiếu thông tin"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Đóng bảng chi tiết"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {printNotice && (
            <div
              role="status"
              className="no-print mx-5 mt-3 p-2 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-[11px] text-blue-900 dark:text-blue-200"
            >
              {printNotice}
            </div>
          )}

          {/* Identity Summary & Tabs */}
          <div className="p-5 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-start gap-3.5">
              <img
                src={avatarUrl}
                alt={student.hoTen}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackSvg;
                }}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {student.hoTen}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(student.maSV, 'MSSV')}
                    className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                    title="Sao chép MSSV"
                  >
                    <span className="tabular-nums">{student.maSV}</span>
                    {copiedField === 'MSSV' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  <StatusBadge label={student.trangThai || 'Đang học'} variant={statusVariant} />

                  {student.gioiTinh && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      · {student.gioiTinh}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Lớp: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{student.lop || 'Chưa cập nhật'}</strong>
                  {student.khoa ? ` · ${student.khoa}` : ''}
                </p>
              </div>
            </div>

            <div className="flex border-b border-slate-200 dark:border-slate-800 mt-4 -mb-4 pt-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'PROFILE'}
                onClick={() => setActiveTab('PROFILE')}
                className={`flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'PROFILE'
                    ? 'border-blue-700 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Lý lịch & Học vụ</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'DOCUMENTS'}
                onClick={() => setActiveTab('DOCUMENTS')}
                className={`flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'DOCUMENTS'
                    ? 'border-blue-700 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Hồ sơ ({allFiles.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ACADEMIC'}
                onClick={() => setActiveTab('ACADEMIC')}
                className={`flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'ACADEMIC'
                    ? 'border-blue-700 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Tiến độ đào tạo</span>
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {activeTab === 'PROFILE' && (
              <>
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    <span>Thông tin học vụ</span>
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    <div className="flex items-center justify-between p-2.5 gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Lớp sinh hoạt</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                        {student.lop || 'Chưa cập nhật'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Khoa / Viện</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                        {student.khoa || 'Chưa cập nhật'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Ngày nhập học</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                        {student.ngayNhapHoc || 'Chưa cập nhật'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Trạng thái</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {student.trangThai || 'Đang học'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    <span>Thông tin liên hệ</span>
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    <div className="flex items-center justify-between p-2.5 gap-3">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ngày sinh</span>
                      </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                        {student.ngaySinh || 'Chưa cập nhật'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 gap-3">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Số điện thoại</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                          {student.soDienThoai || 'Chưa cập nhật'}
                        </span>
                        {student.soDienThoai && (
                          <button
                            type="button"
                            onClick={() => handleCopy(student.soDienThoai, 'PHONE')}
                            className="p-1 text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            title="Sao chép số điện thoại"
                            aria-label="Sao chép số điện thoại"
                          >
                            {copiedField === 'PHONE' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2.5 gap-3">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Email</span>
                      </span>
                      <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                        <span className="font-medium text-blue-700 dark:text-blue-400 truncate">
                          {student.email || 'Chưa cập nhật'}
                        </span>
                        {student.email && (
                          <button
                            type="button"
                            onClick={() => handleCopy(student.email, 'EMAIL')}
                            className="p-1 text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors shrink-0 cursor-pointer"
                            title="Sao chép email"
                            aria-label="Sao chép email"
                          >
                            {copiedField === 'EMAIL' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start justify-between p-2.5 gap-3">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Địa chỉ</span>
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 text-right text-xs">
                        {student.diaChi || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'DOCUMENTS' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    <span>Tài liệu số hóa</span>
                  </h4>
                  <StatusBadge label={`${allFiles.length} tệp`} variant="info" />
                </div>

                {allFiles.length > 0 ? (
                  <div className="space-y-2">
                    {allFiles.map((f, idx) => (
                      <div
                        key={f.id || idx}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="w-5 h-5 rounded bg-blue-700 text-white text-[10px] font-mono font-semibold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {f.customName}
                            </span>
                          </div>
                          {f.uploadedAt && (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                              {f.uploadedAt}
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate pl-7">
                          {f.fileName}
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                          {onPreviewFile && (
                            <button
                              type="button"
                              onClick={() =>
                                onPreviewFile(f.fileUrl, f.customName, f.fileName, {
                                  hoTen: student.hoTen,
                                  maSV: student.maSV,
                                  lop: student.lop,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Xem tài liệu</span>
                            </button>
                          )}
                          <a
                            href={f.fileUrl}
                            download={f.fileName}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            <Download className="w-3 h-3" />
                            <span>Tải về</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="Chưa có dữ liệu." />
                )}
              </div>
            )}

            {activeTab === 'ACADEMIC' && (
              <div className="space-y-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Tổng hợp kết quả học tập</span>
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Khóa tuyển sinh</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {student.lop ? getCohortForClass(student.lop) || 'Chưa có dữ liệu' : 'Chưa có dữ liệu'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Học kỳ hiện hành</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 font-mono">
                      {activeSemester || 'Chưa có dữ liệu'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">GPA tích lũy (Hệ 4)</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      {academicSummary.gpa4 !== null
                        ? `${academicSummary.gpa4.toFixed(2)} (${academicSummary.gpa10?.toFixed(2)} / 10)`
                        : 'Chưa có dữ liệu'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Tín chỉ tích lũy</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                      {academicSummary.gradeCount > 0 ? `${academicSummary.passedCredits} TC` : 'Chưa có dữ liệu'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Điểm rèn luyện gần nhất</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      {academicSummary.latestTraining
                        ? `${academicSummary.latestTraining.diemRL} (${academicSummary.latestTraining.thang}/${academicSummary.latestTraining.nam})`
                        : 'Chưa có dữ liệu'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Học lại / Thi lại</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      {academicSummary.retakeCount} lượt
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {onOpenFullProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullProfile(student.maSV, 'GENERAL');
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-950 rounded border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Chi tiết hồ sơ</span>
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(student);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
