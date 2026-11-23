import React, { useEffect, useMemo, useState } from 'react';
import { User, SinhVien, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { useTheme } from '../../context/ThemeContext';
import { HolidayThemeKey, resolveHolidayTheme } from '../../utils/holidayTheme';
import {
  KeyRound,
  User as UserIcon,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  users?: User[];
  students?: SinhVien[];
  onRegisterAccount?: (userData: {
    username: string;
    fullName: string;
    role: UserRole;
    email?: string;
    password?: string;
    studentCode?: string;
    faculty?: string;
  }) => Promise<{ success: boolean; user?: User; message: string }>;
}

interface LoginContactConfig {
  adminName: string;
  adminUnit: string;
  hotline: string;
  contactEmail: string;
  supportHours: string;
  facebookUrl: string;
  tiktokUrl: string;
  zaloUrl: string;
  holidayThemeMode: HolidayThemeKey;
  holidayBannerText: string;
}

const DEFAULT_LOGIN_CONTACT: LoginContactConfig = {
  adminName: 'Dương Hữu Tuyến',
  adminUnit: 'Quản trị hệ thống · Phòng Đào tạo',
  hotline: '028.3894.1234',
  contactEmail: 'admin@tdnu.edu.vn',
  supportHours: 'Thứ 2 – Thứ 6 · 07:30 – 17:00',
  facebookUrl: 'https://www.facebook.com',
  tiktokUrl: 'https://www.tiktok.com',
  zaloUrl: 'https://zalo.me/02838941234',
  holidayThemeMode: 'AUTO',
  holidayBannerText: '',
};

const FacebookSvgIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`${className} drop-shadow-[0_2px_4px_rgba(2,6,23,0.85)]`}
    aria-hidden="true"
  >
    <path
      d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.43-4.92 8.43-9.94Z"
      fill="#FFFFFF"
    />
  </svg>
);

const TikTokSvgIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`${className} drop-shadow-[0_2px_4px_rgba(2,6,23,0.9)]`}
    aria-hidden="true"
  >
    <path
      d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z"
      fill="#25F4EE"
      transform="translate(-0.9 -0.7)"
    />
    <path
      d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z"
      fill="#FE2C55"
      transform="translate(0.9 0.7)"
    />
    <path
      d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z"
      fill="#FFFFFF"
    />
  </svg>
);

const ZaloSvgIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`${className} drop-shadow-[0_2px_4px_rgba(2,6,23,0.85)]`}
    aria-hidden="true"
  >
    <path
      d="M12 2.2C6.37 2.2 1.8 6.22 1.8 11.18c0 2.66 1.32 5.05 3.4 6.7-.14 1.2-.57 2.5-1.22 3.49-.16.23.05.53.32.47 1.64-.38 3.2-1.01 4.22-1.59 1.04.29 2.15.44 3.48.44 5.63 0 10.2-4.02 10.2-8.98S17.63 2.2 12 2.2Z"
      fill="#FFFFFF"
    />
    <text
      x="12"
      y="14.1"
      textAnchor="middle"
      fill="#0068FF"
      fontSize="7.6"
      fontWeight="900"
      fontFamily="Plus Jakarta Sans, sans-serif"
      letterSpacing="-0.25"
    >
      Zalo
    </text>
  </svg>
);

function readInitialContactConfig(users: User[]): LoginContactConfig {
  const adminUser = users.find((u) => u.role === 'ADMIN');
  const base: LoginContactConfig = {
    ...DEFAULT_LOGIN_CONTACT,
    adminName: adminUser?.fullName || DEFAULT_LOGIN_CONTACT.adminName,
    adminUnit: adminUser?.faculty
      ? `Quản trị hệ thống · ${adminUser.faculty}`
      : DEFAULT_LOGIN_CONTACT.adminUnit,
    contactEmail: adminUser?.email || DEFAULT_LOGIN_CONTACT.contactEmail,
  };
  try {
    const saved = localStorage.getItem('app_system_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        adminName: parsed.adminName || base.adminName,
        adminUnit: parsed.adminUnit || base.adminUnit,
        hotline: parsed.hotline || base.hotline,
        contactEmail: parsed.contactEmail || base.contactEmail,
        supportHours: parsed.supportHours || base.supportHours,
        facebookUrl: parsed.facebookUrl || base.facebookUrl,
        tiktokUrl: parsed.tiktokUrl || base.tiktokUrl,
        zaloUrl: parsed.zaloUrl || base.zaloUrl,
        holidayThemeMode: parsed.holidayThemeMode || base.holidayThemeMode,
        holidayBannerText:
          typeof parsed.holidayBannerText === 'string'
            ? parsed.holidayBannerText
            : base.holidayBannerText,
      };
    }
  } catch {
    // ignore
  }
  return base;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  users = [],
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [headerLogoError, setHeaderLogoError] = useState(false);
  const [cardLogoError, setCardLogoError] = useState(false);
  const [contactConfig, setContactConfig] = useState<LoginContactConfig>(() =>
    readInitialContactConfig(users)
  );

  useEffect(() => {
    let active = true;
    apiService.getSystemConfig().then((res) => {
      if (active && res.success && res.data) {
        const d = res.data;
        setContactConfig((prev) => ({
          adminName: d.adminName || prev.adminName,
          adminUnit: d.adminUnit || prev.adminUnit,
          hotline: d.hotline || prev.hotline,
          contactEmail: d.contactEmail || prev.contactEmail,
          supportHours: d.supportHours || prev.supportHours,
          facebookUrl: d.facebookUrl || prev.facebookUrl,
          tiktokUrl: d.tiktokUrl || prev.tiktokUrl,
          zaloUrl: d.zaloUrl || prev.zaloUrl,
          holidayThemeMode: d.holidayThemeMode || prev.holidayThemeMode,
          holidayBannerText:
            typeof d.holidayBannerText === 'string'
              ? d.holidayBannerText
              : prev.holidayBannerText,
        }));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const activeTheme = useMemo(
    () => resolveHolidayTheme(contactConfig.holidayThemeMode, contactConfig.holidayBannerText),
    [contactConfig.holidayThemeMode, contactConfig.holidayBannerText]
  );

  const cleanPhoneHref = contactConfig.hotline.replace(/[^\d+]/g, '');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const cleanUsername = loginUsername.trim();
    const cleanPassword = loginPassword.trim();
    if (!cleanUsername || !cleanPassword) {
      setLoginError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiService.login(cleanUsername, cleanPassword);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setLoginError(res.message || 'Thông tin đăng nhập không chính xác.');
      }
    } catch {
      setLoginError('Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans transition-colors">
      <header className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/90 dark:border-slate-800">
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-0 sm:h-[56px] flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-3 sm:gap-x-4 gap-y-1.5">
          <div className="order-1 flex items-center gap-2.5 min-w-0 shrink-0">
            <h1 className="flex items-center gap-2.5 text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 min-w-0">
              {!headerLogoError ? (
                <img
                  src="/logo-truong.png"
                  alt="Logo Trường Đại học Trần Đại Nghĩa"
                  onError={() => setHeaderLogoError(true)}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 rounded-sm"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-blue-700 text-white font-bold text-[11px] flex items-center justify-center shrink-0"
                >
                  TDNU
                </span>
              )}
              <span className="flex flex-col justify-center gap-0.5 leading-none antialiased min-w-0">
                <span className="inline-flex items-baseline gap-1 text-[14px] sm:text-base font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white whitespace-nowrap leading-none">
                  <span>TDNU</span>
                  <span className="text-blue-700 dark:text-blue-400 font-black tracking-tight">EDU</span>
                </span>
                <span className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.015em] text-slate-600 dark:text-slate-300 truncate leading-tight">
                  Trường Đại học Trần Đại Nghĩa
                </span>
              </span>
            </h1>
          </div>

          <span
            aria-hidden="true"
            className={`hidden sm:block sm:order-2 w-px h-5 shrink-0 ${activeTheme.headerDividerClass}`}
          />

          <div
            role="region"
            aria-label={`Thông điệp kỷ niệm: ${activeTheme.name}`}
            className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 min-w-0 pt-1.5 sm:pt-0 border-t border-slate-200/80 dark:border-slate-800 sm:border-t-0 tdnu-marquee-viewport"
          >
            <div className="tdnu-marquee-track">
              <span
                className={`inline-flex items-center gap-2.5 pr-14 text-[13px] sm:text-sm md:text-[15px] font-bold uppercase tracking-[0.04em] ${activeTheme.headerTickerTextClass}`}
              >
                <span aria-hidden="true" className="opacity-75">✦</span>
                <span>{activeTheme.marqueeText}</span>
              </span>
              <span
                aria-hidden="true"
                className={`tdnu-marquee-clone inline-flex items-center gap-2.5 pr-14 text-[13px] sm:text-sm md:text-[15px] font-bold uppercase tracking-[0.04em] ${activeTheme.headerTickerTextClass}`}
              >
                <span className="opacity-75">✦</span>
                <span>{activeTheme.marqueeText}</span>
              </span>
            </div>
          </div>

          <button
            id="btn-login-theme-toggle"
            type="button"
            onClick={toggleTheme}
            className="order-2 sm:order-3 shrink-0 p-1.5 text-slate-700 hover:text-slate-900 dark:text-amber-300 dark:hover:text-amber-200 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            title={`Chuyển chế độ ${isDark ? 'Sáng' : 'Tối'}`}
            aria-label="Chuyển chế độ giao diện Sáng / Tối"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      <main
        data-holiday-theme={activeTheme.key}
        style={{
          backgroundImage: isDark ? activeTheme.mainBgDark : activeTheme.mainBgLight,
        }}
        className="flex-1 flex items-center justify-center px-3 py-5 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-12 lg:py-12 xl:px-16 transition-[background-image,padding] duration-300"
      >
        {/* Unified 2-Div Joined 3D Sculpted Card (Responsive by device & Holiday Theme) */}
        <div
          className={`w-full max-w-[430px] sm:max-w-[500px] md:max-w-[740px] lg:max-w-[880px] xl:max-w-[960px] 2xl:max-w-[1020px] grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-700/80 transition-all duration-300 ${activeTheme.cardShadowClass}`}
        >
          {/* LEFT DIV: Customizable Admin Contact Info & SVG Social Links */}
          <div
            className={`relative overflow-hidden bg-gradient-to-br ${activeTheme.leftPanelGradientClass} text-white p-5 sm:p-7 lg:p-9 flex flex-col justify-between md:border-r border-white/15 transition-colors duration-300`}
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full ${activeTheme.leftGlowTopClass} blur-2xl`}
            />
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute -bottom-24 -left-20 w-60 h-60 rounded-full ${activeTheme.leftGlowBottomClass} blur-2xl`}
            />

            <div className="relative z-10 space-y-5 sm:space-y-6">
              {/* School Brand Header */}
              <div className="flex items-center gap-3.5 pb-4 sm:pb-5 border-b border-white/15">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white keep-white p-2 flex items-center justify-center shrink-0 shadow-[0_10px_22px_-6px_rgba(2,6,23,0.55),inset_0_1px_0_rgba(255,255,255,1),inset_0_-3px_0_rgba(203,213,225,0.85)]">
                  {!cardLogoError ? (
                    <img
                      src="/logo-truong.png"
                      alt="Logo Trường Đại học Trần Đại Nghĩa"
                      onError={() => setCardLogoError(true)}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-black text-blue-800 keep-colored">TDNU</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`text-[11px] font-semibold tracking-wide ${activeTheme.leftAccentTextClass} keep-colored`}>
                    {activeTheme.key !== 'DEFAULT'
                      ? `${activeTheme.dateLabel} · ${activeTheme.name}`
                      : 'Trường Đại học Trần Đại Nghĩa'}
                  </div>
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white leading-snug text-balance">
                    Hỗ Trợ & Liên Hệ Quản Trị
                  </h2>
                </div>
              </div>

              {/* Admin Contact Block (Customizable via System Config) */}
              <div className="space-y-3">
                <div className={`flex items-center gap-2 text-xs font-semibold ${activeTheme.leftAccentTextClass} keep-colored`}>
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTheme.leftAccentTextClass}`} aria-hidden="true" />
                  <span className={`keep-colored ${activeTheme.leftAccentTextClass}`}>Thông tin liên hệ Quản trị viên</span>
                </div>

                <div className="rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_20px_-10px_rgba(2,6,23,0.45)]">
                  <div className="pb-2.5 border-b border-white/10">
                    <div className="text-sm font-bold text-white truncate">
                      {contactConfig.adminName}
                    </div>
                    <div className="text-xs text-blue-100/85 keep-colored">
                      {contactConfig.adminUnit}
                    </div>
                  </div>

                  {/* Admin Phone (no copy button) */}
                  <div className="flex items-center gap-2.5">
                    <a
                      href={`tel:${cleanPhoneHref}`}
                      className="inline-flex items-center gap-2.5 text-sm font-mono font-bold tabular-nums text-white hover:text-sky-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded"
                    >
                      <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_10px_-3px_rgba(2,6,23,0.4)]">
                        <Phone className="w-4 h-4 text-sky-200" aria-hidden="true" />
                      </span>
                      <span className="keep-colored text-white">{contactConfig.hotline}</span>
                    </a>
                  </div>

                  {/* Admin Email */}
                  <div className="flex items-center gap-2.5">
                    <a
                      href={`mailto:${contactConfig.contactEmail}`}
                      className="inline-flex items-center gap-2.5 text-xs font-medium text-blue-50 hover:text-white transition-colors min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded"
                    >
                      <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_10px_-3px_rgba(2,6,23,0.4)]">
                        <Mail className="w-4 h-4 text-sky-200" aria-hidden="true" />
                      </span>
                      <span className="truncate keep-colored text-blue-50">{contactConfig.contactEmail}</span>
                    </a>
                  </div>

                  {/* Support Hours */}
                  <div className="flex items-center gap-2.5 text-xs text-blue-100/85 pt-0.5">
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-sky-200" aria-hidden="true" />
                    </span>
                    <span className="keep-colored text-blue-100/90 tabular-nums">
                      {contactConfig.supportHours}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Contact SVG Icons: Facebook, TikTok, Zalo */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/15 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold tracking-wide text-blue-100/90 keep-colored whitespace-nowrap">
                  Liên hệ
                </span>
                <span aria-hidden="true" className="h-px w-6 bg-white/25 hidden sm:inline-block" />
              </div>

              <div className="flex items-center gap-4">
                <a
                  href={contactConfig.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  aria-label="Liên hệ qua Facebook"
                  className="inline-flex items-center justify-center p-1 transition-all duration-150 hover:scale-110 hover:-translate-y-0.5 hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded"
                >
                  <FacebookSvgIcon className="w-6 h-6" />
                </a>

                <a
                  href={contactConfig.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="TikTok"
                  aria-label="Liên hệ qua TikTok"
                  className="inline-flex items-center justify-center p-1 transition-all duration-150 hover:scale-110 hover:-translate-y-0.5 hover:drop-shadow-[0_0_10px_rgba(37,244,238,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded"
                >
                  <TikTokSvgIcon className="w-6 h-6" />
                </a>

                <a
                  href={contactConfig.zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Zalo"
                  aria-label="Liên hệ qua Zalo"
                  className="inline-flex items-center justify-center p-1 transition-all duration-150 hover:scale-110 hover:-translate-y-0.5 hover:drop-shadow-[0_0_10px_rgba(125,211,252,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded"
                >
                  <ZaloSvgIcon className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT DIV: Preserved Login Card seamlessly joined to Left Div */}
          <div className="relative bg-white dark:bg-slate-900 p-5 sm:p-7 lg:p-9 flex flex-col justify-center">
            <div className="mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-slate-200/90 dark:border-slate-800 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white keep-white border border-slate-200/90 p-2.5 flex items-center justify-center shadow-[0_12px_24px_-8px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,1),inset_0_-3px_0_rgba(226,232,240,0.9)]">
                {!cardLogoError ? (
                  <img
                    src="/logo-truong.png"
                    alt="Logo Trường ĐH Trần Đại Nghĩa"
                    onError={() => setCardLogoError(true)}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-base font-black text-blue-800 keep-colored">TDNU</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Đăng Nhập Hệ Thống
              </h2>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{loginError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="input-login-username"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Tên đăng nhập / Mã sinh viên</span>
                </label>
                <input
                  id="input-login-username"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập hoặc MaSV"
                  autoComplete="username"
                  className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-600 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-[inset_0_2px_4px_rgba(15,23,42,0.05)] focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600/25 font-medium transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="input-login-password"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Mật khẩu</span>
                </label>
                <div className="relative">
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    className="w-full bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-600 rounded-lg px-3.5 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-[inset_0_2px_4px_rgba(15,23,42,0.05)] focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600/25 font-medium transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setLoginError(
                      `Vui lòng liên hệ Quản trị viên (${contactConfig.hotline}) hoặc ${contactConfig.contactEmail} để cấp lại mật khẩu.`
                    );
                  }}
                  className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 rounded px-1"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-700 active:translate-y-[1px] text-white text-xs font-bold py-3 rounded-xl shadow-[0_10px_20px_-6px_rgba(29,78,216,0.6),inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-3px_0_rgba(30,58,138,0.65)] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {isLoading ? (
                  <span>Đang xác thực...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Đăng nhập</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="py-3 text-center text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
        Trường ĐH Trần Đại Nghĩa · TDNU EduAdmin
      </footer>
    </div>
  );
};
