import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, UserRole, ThoiKhoaBieu, ThiLaiHocLai, SinhVien, MonHoc, DiemDanh, ThongBaoKiemTra } from '../types';
import { apiService } from '../services/apiService';
import { verifyPassword } from '../utils/security';
import { getAcademicPeriod } from '../utils/academicCalendar';
import { useTheme } from '../context/ThemeContext';
import {
  GraduationCap,
  ShieldCheck,
  UserCheck,
  LogOut,
  Bell,
  BellRing,
  Camera,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Check,
  ChevronDown,
  User as UserIcon,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  BookOpen,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
interface HeaderProps {
  currentUser: User | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  activeSemester: string;
  onChangeSemester: (sem: string) => void;
  onSwitchView: (view: string) => void;
  onUpdateUser?: (id: string, userData: Partial<User>) => Promise<{ success: boolean; message: string; data?: User }>;
  showToast?: (msg: string) => void;
  schedule?: ThoiKhoaBieu[];
  retakes?: ThiLaiHocLai[];
  trainingPoints?: any[];
  students?: SinhVien[];
  subjects?: MonHoc[];
}
export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenLoginModal,
  onLogout,
  activeSemester,
  onChangeSemester,
  onSwitchView,
  onUpdateUser,
  showToast,
  schedule = [],
  retakes = [],
  trainingPoints = [],
  students = [],
  subjects = [],
}) => {
  const { theme, resolvedTheme, isDark, toggleTheme, setTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [attendanceList, setAttendanceList] = useState<DiemDanh[]>([]);
  const [examNotices, setExamNotices] = useState<ThongBaoKiemTra[]>([]);
  const [readNotiIds, setReadNotiIds] = useState<string[]>(() => {
    try {
      const key = `read_noti_${currentUser?.id || currentUser?.username || 'guest'}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showOldPw, setShowOldPw] = useState<boolean>(false);
  const [showNewPw, setShowNewPw] = useState<boolean>(false);
  const [showConfirmPw, setShowConfirmPw] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const matchedStudent = (currentUser?.role === 'STUDENT' && students)
    ? students.find(
        (s) =>
          s.maSV.toLowerCase() === (currentUser.studentCode || currentUser.username).toLowerCase()
      )
    : null;
  const currentAvatar =
    currentUser?.avatar ||
    matchedStudent?.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  useEffect(() => {
    let isMounted = true;
    const fetchBellData = async () => {
      try {
        const [resAtt, resNotice] = await Promise.all([
          apiService.getAttendance(),
          apiService.getExamNotices(),
        ]);
        if (isMounted) {
          if (resAtt?.success) setAttendanceList(resAtt.data || []);
          if (resNotice?.success) setExamNotices(resNotice.data || []);
        }
      } catch {
      }
    };
    fetchBellData();
    const handleUpdate = () => {
      if (isMounted) fetchBellData();
    };
    window.addEventListener('app-data-updated', handleUpdate);
    window.addEventListener('attendance-updated', handleUpdate);
    window.addEventListener('exam-notices-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('app-data-updated', handleUpdate);
      window.removeEventListener('attendance-updated', handleUpdate);
      window.removeEventListener('exam-notices-updated', handleUpdate);
    };
  }, [currentUser]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border border-purple-200 dark:border-purple-700">
            <ShieldCheck className="w-3 h-3 text-purple-700 dark:text-purple-300" />
            Quản trị
          </span>
        );
      case 'LECTURER':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-900 dark:bg-blue-950/80 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
            <UserCheck className="w-3 h-3 text-blue-700 dark:text-blue-300" />
            Giảng viên
          </span>
        );
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700">
            <GraduationCap className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
            Sinh viên
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            Khách
          </span>
        );
    }
  };
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('Vui lòng chọn tp hình ảnh hợp l (PNG, JPG, WEBP)!');
      return;
    }
    try {
      let isCompressed = false;
      if (file.size > 5 * 1024 * 1024) {
        if (showToast) showToast('Ảnh vượt quá 5MB. Hệ thống ang tự Tổng ti ưu & nén dung lượng ảnh...');
        isCompressed = true;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDimension = 800;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(evt.target?.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const quality = file.size > 5 * 1024 * 1024 ? 0.6 : 0.85;
            const compressedUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedUrl);
          };
          img.onerror = () => reject(new Error('Lỗi xử lý hình ảnh'));
          img.src = evt.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Lỗi ọc tp'));
        reader.readAsDataURL(file);
      });
      if (currentUser && onUpdateUser) {
        const res = await onUpdateUser(currentUser.id, { avatar: dataUrl });
        if (res.success) {
          if (showToast) {
            showToast(
              isCompressed
                ? 'Đã tự động nén dung lượng và cập nhật hình đại diện thành công!'
                : 'Đổi hình đại diện thành công!'
            );
          }
        }
      }
    } catch {
      if (showToast) showToast('Đã có lỗi xảy ra khi xử lý ảnh đại diện!');
    }
    setIsDropdownOpen(false);
    e.target.value = '';
  };
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!currentUser) return;
    if (!oldPassword.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu cũ!');
      return;
    }
    const currentStoredPw = (currentUser.password && currentUser.password.trim()) || (currentUser.role === 'ADMIN' ? 'admin123' : currentUser.role === 'LECTURER' ? 'gv123' : '123456');
    if (!verifyPassword(oldPassword.trim(), currentStoredPw)) {
      setErrorMsg('Mật khẩu cũ không chính xác. Vui lòng kiểm tra lại!');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 4 ký tự!');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMsg('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!');
      return;
    }
    setIsSubmitting(true);
    try {
      if (onUpdateUser) {
        const res = await onUpdateUser(currentUser.id, { password: newPassword.trim() });
        if (res.success) {
          if (showToast) showToast('Đổi mật khẩu thành công!');
          setIsChangePasswordModalOpen(false);
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          setErrorMsg(res.message || 'Thay đổi mật khẩu thất bại!');
        }
      }
    } catch {
      setErrorMsg('Đã xảy ra lỗi khi đổi mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const currentPeriod = getAcademicPeriod();
  const currentActiveSemCode = currentPeriod.semester;
  const currentAcademicYear = currentPeriod.academicYear;
  const studentCode = currentUser?.studentCode || (currentUser?.role === 'STUDENT' ? currentUser.username : '');
  const notifications = React.useMemo(() => {
    const list: {
      id: string;
      type: 'DANGER' | 'WARNING' | 'EXAM' | 'RETAKE' | 'INFO';
      title: string;
      content: string;
      time: string;
      tag: string;
    }[] = [];
    if (currentUser?.role === 'STUDENT') {
      const currentSemCourses = (schedule || []).filter((sch) => {
        const schHk = sch.hocKy || 'HK1';
        return schHk === currentActiveSemCode || schHk.includes(currentActiveSemCode);
      });
      const courseMap = new Map<string, { maMH: string; tenMH: string; soTinChi: number }>();
      currentSemCourses.forEach((c) => {
        if (c.maMH && !courseMap.has(c.maMH)) {
          courseMap.set(c.maMH, {
            maMH: c.maMH,
            tenMH: c.tenMH || c.maMH,
            soTinChi: c.soTinChi || 3,
          });
        }
      });
      if ((subjects || []).length > 0) {
        const matchingSubs = subjects.filter(
          (mh) =>
            (!mh.hocKy || mh.hocKy === currentActiveSemCode) &&
            (!mh.namHoc || mh.namHoc === currentAcademicYear)
        );
        const targetSubs = matchingSubs.length > 0 ? matchingSubs : subjects;
        targetSubs.forEach((mh) => {
          if (!courseMap.has(mh.maMH)) {
            courseMap.set(mh.maMH, {
              maMH: mh.maMH,
              tenMH: mh.tenMH,
              soTinChi: mh.soTinChi || 3,
            });
          }
        });
      }
      const svAtt = (attendanceList || []).filter(
        (a) => studentCode && a.maSV?.trim().toLowerCase() === studentCode.trim().toLowerCase()
      );
      // Ensure all subjects that have attendance records are added to courseMap
      svAtt.forEach((a) => {
        if (a.maMH && !courseMap.has(a.maMH)) {
          courseMap.set(a.maMH, {
            maMH: a.maMH,
            tenMH: a.tenMH || a.maMH,
            soTinChi: 3,
          });
        }
      });
      // Fallback: if courseMap is still empty, include all schedule items for student
      if (courseMap.size === 0) {
        (schedule || []).forEach((sch) => {
          if (sch.maMH && !courseMap.has(sch.maMH)) {
            courseMap.set(sch.maMH, {
              maMH: sch.maMH,
              tenMH: sch.tenMH || sch.maMH,
              soTinChi: sch.soTinChi || 3,
            });
          }
        });
      }
      courseMap.forEach((c) => {
        const totalPeriods = c.soTinChi * 15;
        const courseAtt = svAtt.filter((a) => a.maMH === c.maMH);
        const missed = courseAtt.reduce((sum, curr) => sum + (curr.soTietNghi || 0), 0);
        const pct = (missed / totalPeriods) * 100;
        if (pct >= 20) {
          list.push({
            id: `abs-danger-${c.maMH}`,
            type: 'DANGER',
            title: `Cảnh báo cấm thi (vắng 20%)`,
            content: `Môn ${c.tenMH} (${c.maMH}): Đã vắng ${missed}/${totalPeriods} tiết (${pct.toFixed(1)}%). Cấm thi môn học này, cần liên hệ Giảng viên gấp!`,
            time: `Học kỳ ${currentActiveSemCode}`,
            tag: 'CẤM THI',
          });
        } else if (pct >= 10) {
          list.push({
            id: `abs-warn-${c.maMH}`,
            type: 'WARNING',
            title: `Cảnh báo vắng học (>10%)`,
            content: `Môn ${c.tenMH} (${c.maMH}): Đã vắng ${missed}/${totalPeriods} tiết (${pct.toFixed(1)}%). Dưới ngưỡng 20%, cần đi học đầy đủ.`,
            time: `Học kỳ ${currentActiveSemCode}`,
            tag: 'CẢNH BÁO VẮNG',
          });
        }
      });
      const courseCodes = new Set(courseMap.keys());
      (schedule || []).forEach((s) => s.maMH && courseCodes.add(s.maMH));
      (subjects || []).forEach((s) => s.maMH && courseCodes.add(s.maMH));
      svAtt.forEach((a) => a.maMH && courseCodes.add(a.maMH));

      (examNotices || []).forEach((n) => {
        if (!n.maMH || courseCodes.size === 0 || courseCodes.has(n.maMH)) {
          list.push({
            id: `exam-${n.id}`,
            type: 'EXAM',
            title: `Lịch kiểm tra: ${n.tieuDe}`,
            content: `Môn ${n.tenMH || n.maMH} (${n.loai === '15_PHUT' ? 'KT 15 Phút' : 'KT Giữa Kỳ'}). Ngày: ${n.ngayKiemTra || 'Sắp tới'}. ${n.noiDung || ''}`,
            time: `Tuần ${n.tuanKiemTra || 'hiện tại'}`,
            tag: 'LỊCH KIỂM TRA',
          });
        }
      });
      const svRetakes = (retakes || []).filter(
        (r) => studentCode && r.maSV.toLowerCase() === studentCode.toLowerCase()
      );
      svRetakes.forEach((r) => {
        list.push({
          id: `retake-${r.id}`,
          type: 'RETAKE',
          title: `Đơn ${r.loaiDangKy === 'THI_LAI' ? 'Thi lại' : 'Học lại'}: ${r.tenMH}`,
          content: `Môn ${r.tenMH} (${r.maMH}) - Trạng thái: ${!r.phiDiem || r.phiDiem === 0 ? 'Chờ Admin/Phòng Đào tạo điền lệ phí' : `Lệ phí: ${r.phiDiem.toLocaleString()} VNĐ`}`,
          time: `${r.hocKy || currentActiveSemCode}`,
          tag: 'THI LẠI',
        });
      });
      if (list.length === 0) {
        list.push({
          id: 'good-status',
          type: 'INFO',
          title: 'Tiến trình chuyên cần tốt',
          content: `Tất cả các môn học thuộc Học kỳ ${currentActiveSemCode} đều đạt tỷ lệ đi học tốt (vắng < 10%). Chúc bạn học tốt!`,
          time: `Học kỳ ${currentActiveSemCode}`,
          tag: 'ĐẢM BẢO',
        });
      }
    } else {
      (retakes || []).forEach((r) => {
        list.push({
          id: `admin-retake-${r.id}`,
          type: 'RETAKE',
          title: `Đơn đăng ký: ${r.hoTenSV || r.maSV}`,
          content: `Sinh viên ${r.hoTenSV || r.maSV} (${r.maSV}) đã đăng ký ${r.loaiDangKy === 'THI_LAI' ? 'thi lại' : 'học lại'} môn ${r.tenMH} (${r.maMH}). ${!r.phiDiem || r.phiDiem === 0 ? 'Trạng thái: Chờ Admin bổ sung lệ phí.' : `Lệ phí: ${r.phiDiem.toLocaleString()} VNĐ`}`,
          time: r.ngayDangKy || `${r.hocKy || currentActiveSemCode}`,
          tag: r.loaiDangKy === 'THI_LAI' ? 'THI LẠI' : 'HOC LẠI',
        });
      });
      if (list.length === 0) {
        list.push({
          id: 'admin-empty-retake',
          type: 'INFO',
          title: 'Không có đơn mới',
          content: 'Hiện chưa có sinh viên nào đăng ký thi lại hoặc học lại.',
          time: 'Hệ thống',
          tag: 'THÔNG BÁO',
        });
      }
    }
    return list;
  }, [currentUser, studentCode, schedule, attendanceList, examNotices, retakes, currentActiveSemCode, subjects]);
  const unreadNotifications = React.useMemo(() => {
    return notifications.filter((n) => !readNotiIds.includes(n.id) && n.type !== 'INFO');
  }, [notifications, readNotiIds]);
  const unreadCount = unreadNotifications.length;
  const handleToggleNotifications = () => {
    if (!isNotificationOpen) {
      const allCurrentIds = notifications.map((n) => n.id);
      setReadNotiIds((prev) => {
        const merged = Array.from(new Set([...prev, ...allCurrentIds]));
        try {
          const key = `read_noti_${currentUser?.id || currentUser?.username || 'guest'}`;
          localStorage.setItem(key, JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }
    setIsNotificationOpen((prev) => !prev);
  };
  const handleGoToDashboard = () => {
    onSwitchView('dashboard');
    try {
      localStorage.setItem('app_current_view', 'dashboard');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header id="app-header" className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-[52px] px-4 lg:px-6 transition-colors shadow-xs dark:shadow-md dark:shadow-slate-950/40">
      <div className="flex items-center justify-between gap-8 h-full max-w-full">
        {/* Zone 1: Brand Wordmark (Single text element, no subtitle clutter) */}
        <div
          id="header-brand-logo"
          onClick={handleGoToDashboard}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleGoToDashboard();
            }
          }}
          role="button"
          tabIndex={0}
          title="Về trang tổng quan"
          aria-label="Về trang tổng quan"
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0 outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          <img
            src="/logo-truong.svg"
            alt="Logo Trường ĐH Trần Đại Nghĩa"
            className="w-7 h-7 object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            TDNU <span className="text-blue-700 dark:text-blue-400 font-bold">EduAdmin</span>
          </span>
        </div>

        {/* Zone 2: Academic Period / Semester indicator (Contextual center) */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 font-medium">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-slate-600 dark:text-slate-200 font-semibold">Học kỳ hiện hành:</span>
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-blue-300 rounded border border-slate-300 dark:border-slate-700 font-bold tabular-nums">
            {currentActiveSemCode}
          </span>
        </div>

        <input
          type="file"
          ref={avatarInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileSelect}
        />

        {/* Zone 3: Actions (Theme switcher, Notifications, User profile) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Toggle Button */}
          <button
            id="btn-theme-toggle"
            type="button"
            onClick={toggleTheme}
            className="p-1.5 text-slate-700 hover:text-slate-900 dark:text-amber-300 dark:hover:text-amber-200 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer border border-transparent dark:border-slate-700 hover:border-slate-300"
            title={`Chuyển chế độ ${isDark ? 'Sáng' : 'Tối'}`}
            aria-label="Chuyển chế độ giao diện Sáng / Tối"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={handleToggleNotifications}
              className="relative p-1.5 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer border border-transparent dark:border-slate-700 hover:border-slate-300"
              title="Thông báo hệ thống"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 ? (
                <span className="absolute top-0 right-0 px-1 py-0.2 text-[9px] font-bold text-white bg-rose-600 dark:bg-rose-500 rounded-sm min-w-[14px] text-center leading-tight shadow-xs">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg dark:shadow-2xl dark:shadow-black/70 z-50 overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/90 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {currentUser?.role === 'STUDENT'
                      ? `Thông Báo (${currentActiveSemCode})`
                      : 'Đơn Đăng Ký Thi Lại / Học Lại'}
                  </span>
                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-[10px] font-bold px-2 py-0.5 rounded border border-transparent dark:border-slate-600">
                    {notifications.length}
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
                  {notifications.map((noti) => {
                    const isRead = readNotiIds.includes(noti.id);
                    return (
                      <div
                        key={noti.id}
                        className={`p-2.5 rounded border text-xs space-y-1 transition-colors ${
                          isRead
                            ? 'opacity-80 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 font-semibold">
                          <span className="line-clamp-1 flex items-center gap-1.5 text-xs text-slate-900 dark:text-slate-100">
                            {noti.type === 'DANGER' && <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />}
                            {noti.type === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                            {noti.type === 'EXAM' && <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                            {noti.type === 'INFO' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                            {noti.title}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-300 font-medium shrink-0">
                            {noti.time}
                          </span>
                        </div>
                        <p className="text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-200">{noti.content}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 text-center">
                  <button
                    onClick={() => {
                      setIsNotificationOpen(false);
                      onSwitchView('dashboard');
                    }}
                    className="w-full py-1.5 text-xs text-blue-700 dark:text-blue-300 hover:dark:text-blue-200 hover:underline font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Xem toàn bộ thông báo trong Báo cáo</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800 relative" ref={dropdownRef}>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {currentUser.fullName}
                </span>
                <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
                title="Tùy chọn tài khoản"
              >
                <img
                  src={currentAvatar}
                  alt={currentUser.fullName}
                  className="w-7 h-7 rounded object-cover border border-slate-200 dark:border-slate-700"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-10 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg dark:shadow-2xl dark:shadow-black/70 py-1 z-50">
                  <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-3">
                      <img
                        src={currentAvatar}
                        alt={currentUser.fullName}
                        className="w-9 h-9 rounded object-cover border border-slate-200 dark:border-slate-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {currentUser.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">
                          {currentUser.email || currentUser.username}
                        </p>
                        <div className="mt-1">{getRoleBadge(currentUser.role)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="py-1 text-xs font-medium">
                    {currentUser.role === 'ADMIN' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            onSwitchView('admin');
                          }}
                          className="w-full text-left px-4 py-2 flex items-center gap-2.5 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800"
                        >
                          <ShieldAlert className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                          <div>
                            <span className="font-semibold block flex items-center gap-1.5">
                              Admin Console
                              <span className="text-[9px] bg-blue-700 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                                QUẢN TRỊ
                              </span>
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-300">
                              Người dùng, import & sao lưu
                            </span>
                          </div>
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        avatarInputRef.current?.click();
                      }}
                      className="w-full text-left px-4 py-2 flex items-center gap-2.5 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                      <div>
                        <span className="font-semibold block">Đổi hình đại diện</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-300">
                          Tải ảnh từ thiết bị
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setErrorMsg(null);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setIsChangePasswordModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 flex items-center gap-2.5 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                      <div>
                        <span className="font-semibold block">Đổi mật khẩu</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-300">
                          Yêu cầu mật khẩu cũ
                        </span>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    {/* Theme Selector Section */}
                    <div className="px-4 py-2">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                        Giao diện
                      </span>
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded border border-transparent dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            theme === 'light'
                              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Chế độ Sáng"
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>Sáng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Chế độ Tối"
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>Tối</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('system')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            theme === 'system'
                              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200 dark:border-slate-600'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Theo hệ điều hành"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          <span>Tự động</span>
                        </button>
                      </div>
                    </div>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              id="btn-login-open"
              onClick={onOpenLoginModal}
              className="inline-flex items-center gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm transition-all cursor-pointer"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>
      {isChangePasswordModalOpen && currentUser && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-labelledby="modal-change-password-title">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsChangePasswordModalOpen(false)}
              aria-label="Đóng hộp thoại đổi mật khẩu"
              className="absolute top-4 right-4 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 id="modal-change-password-title" className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Đổi Mật Khẩu Tài Khoản
            </h3>
            {errorMsg && (
              <div className="mb-4 p-2.5 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Mật khẩu hiện tại (Mật khẩu cũ) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOldPw ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full px-3 py-1.5 pr-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPw(!showOldPw)}
                    aria-label={showOldPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showOldPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Mật khẩu mới <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (ít nhất 4 ký tự)"
                    className="w-full px-3 py-1.5 pr-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    aria-label={showNewPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Xác nhận mật khẩu mới <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-3 py-1.5 pr-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    aria-label={showConfirmPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Xác nhận Đổi Mật Khẩu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};

