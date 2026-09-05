import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, UserRole, ThoiKhoaBieu, ThiLaiHocLai, SinhVien, MonHoc, DiemDanh, ThongBaoKiemTra } from '../types';
import { apiService } from '../services/apiService';
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
    return () => {
      isMounted = false;
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Admin
          </span>
        );
      case 'LECTURER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
            <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Giảng viên
          </span>
        );
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Sinh viên
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
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
    if (currentUser.password && oldPassword.trim() !== currentUser.password) {
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
        (a) => studentCode && a.maSV.toLowerCase() === studentCode.toLowerCase()
      );
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
      (examNotices || []).forEach((n) => {
        if (courseCodes.has(n.maMH) && (!n.hocKy || n.hocKy === currentActiveSemCode)) {
          list.push({
            id: `exam-${n.id}`,
            type: 'EXAM',
            title: `Lịch kiểm tra: ${n.tieuDe}`,
            content: `Môn ${n.tenMH || n.maMH} (${n.loai === '15_PHUT' ? 'KT 15 Phút' : 'KT Giữa Kỳ'}). Ngày: ${n.ngayKiemTra || 'Tuần tới'}. ${n.noiDung}`,
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
  return (
    <header id="app-header" className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 lg:px-8 py-3 transition-colors shadow-xs">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/logo-truong.svg"
            alt="Logo Trường ĐH Trần Đại Nghĩa"
            className="w-10 h-10 md:w-11 md:h-11 object-contain drop-shadow-sm shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">
                TDNU <span className="text-blue-600 dark:text-blue-400">EDU</span>
              </h1>
             
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block font-medium">
              Trường ĐH Trần Đại Nghĩa • Quản lý Đào tạo
            </p>
          </div>
        </div>
        <input
          type="file"
          ref={avatarInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileSelect}
        />
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            id="btn-theme-toggle"
            type="button"
            onClick={toggleTheme}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title={`Chuyển chế độ ${isDark ? 'Sáng' : 'Tối'} (Hiện tại: ${theme === 'system' ? `Tự động (${isDark ? 'Tối' : 'Sáng'})` : isDark ? 'Tối' : 'Sáng'})`}
            aria-label="Chuyển chế độ giao diện Sáng / Tối"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400 hover:rotate-90 transition-transform duration-300" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300 hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={handleToggleNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Thông báo hệ thống"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-black text-white bg-rose-600 rounded-full min-w-[18px] text-center shadow-md border-2 border-white dark:border-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span className="font-extrabold text-xs uppercase tracking-wider">
                      {currentUser?.role === 'STUDENT'
                        ? `Thông Báo (${currentActiveSemCode})`
                        : 'Đơn Đăng Ký Thi Lại / Học Lại'}
                    </span>
                  </div>
                  <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                    {notifications.length} thông báo
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto p-3.5 space-y-2.5">
                  {notifications.map((noti) => {
                    const isRead = readNotiIds.includes(noti.id);
                    return (
                      <div
                        key={noti.id}
                        className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                          isRead ? 'opacity-70 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800' : ''
                        } ${
                          !isRead && noti.type === 'DANGER'
                            ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100 shadow-xs'
                            : !isRead && noti.type === 'WARNING'
                            ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 shadow-xs'
                            : !isRead && noti.type === 'EXAM'
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 shadow-xs'
                            : !isRead && noti.type === 'RETAKE'
                            ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100 shadow-xs'
                            : isRead
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 font-bold">
                          <span className="line-clamp-1 flex items-center gap-1.5 text-xs">
                            {noti.type === 'DANGER' && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />}
                            {noti.type === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                            {noti.type === 'EXAM' && <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />}
                            {noti.type === 'INFO' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                            {noti.title}
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                              isRead
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                : noti.type === 'DANGER'
                                ? 'bg-rose-600 text-white'
                                : noti.type === 'WARNING'
                                ? 'bg-amber-500 text-slate-950'
                                : noti.type === 'EXAM'
                                ? 'bg-indigo-600 text-white'
                                : noti.type === 'RETAKE'
                                ? 'bg-purple-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isRead ? 'Đã đọc' : noti.tag}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-95 font-medium">{noti.content}</p>
                        <div className="text-[10px] opacity-75 font-semibold pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                          <span>{noti.time}</span>
                          <span className="italic">{isRead ? '✓ Đã xem' : 'Mới'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center">
                  <button
                    onClick={() => {
                      setIsNotificationOpen(false);
                      onSwitchView('dashboard');
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Xem chi tiết trong Báo Cáo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {currentUser ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800 relative" ref={dropdownRef}>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {currentUser.fullName}
                </span>
                <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative group cursor-pointer focus:outline-none"
                title="Tùy chọn tài khoản"
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={currentUser.fullName}
                  className="w-9 h-9 rounded-2xl object-cover ring-2 ring-blue-500/30 group-hover:ring-blue-600 transition-all shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white p-0.5 rounded-full shadow-md group-hover:scale-110 transition-transform">
                  <Camera className="w-2.5 h-2.5" />
                </span>
              </button>
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-3">
                      <img
                        src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={currentUser.fullName}
                        className="w-10 h-10 rounded-2xl object-cover ring-2 ring-blue-500/30"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {currentUser.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
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
                          className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer border-b border-indigo-100 dark:border-indigo-900/50"
                        >
                          <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <div>
                            <span className="font-bold block flex items-center gap-1.5">
                              Admin Console
                              <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                                TOÀN QUYỀN
                              </span>
                            </span>
                            <span className="text-[10px] text-indigo-500/80 dark:text-indigo-400/80">
                              Quản trị người dùng, import & sao lưu CSDL
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
                      className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <span className="font-bold block">Đổi hình đại diện</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
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
                      className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <span className="font-bold block">Đổi mật khẩu</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Yêu cầu nhập mật khẩu cũ
                        </span>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    {/* Theme Selector Section */}
                    <div className="px-4 py-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Giao diện
                      </span>
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            theme === 'light'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Chế độ Sáng"
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>Sáng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Chế độ Tối"
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>Tối</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('system')}
                          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            theme === 'system'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
              className="inline-flex items-center gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl shadow-sm transition-all cursor-pointer"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>
      {isChangePasswordModalOpen && currentUser && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsChangePasswordModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              Đổi Mật Khẩu
            </h3>
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
                  Mật khẩu hiện tại (Mật khẩu cũ) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOldPw ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full p-2.5 pr-10 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-white font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPw(!showOldPw)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (ít nhất 4 ký tự)"
                    className="w-full p-2.5 pr-10 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-white font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full p-2.5 pr-10 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-white font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
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

