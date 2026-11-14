import React, { useState } from 'react';
import { User, SinhVien, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { useTheme } from '../../context/ThemeContext';
import {
  KeyRound,
  User as UserIcon,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
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

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans transition-colors">
      <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl w-full mx-auto px-4 lg:px-6 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-truong.svg"
              alt="Logo Trường ĐH Trần Đại Nghĩa"
              className="w-8 h-8 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              TDNU <span className="text-blue-700 dark:text-blue-400">EduAdmin</span>
            </h1>
          </div>

          <button
            id="btn-login-theme-toggle"
            type="button"
            onClick={toggleTheme}
            className="p-1.5 text-slate-700 hover:text-slate-900 dark:text-amber-300 dark:hover:text-amber-200 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
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

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs p-6 md:p-8">
          <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-2.5">
            <img
              src="/logo-truong.svg"
              alt="Logo Trường ĐH Trần Đại Nghĩa"
              className="w-16 h-16 object-contain"
              referrerPolicy="no-referrer"
            />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Đăng Nhập Hệ Thống
            </h2>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div
                role="alert"
                className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded flex items-start gap-2"
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
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-600 rounded px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
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
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-600 rounded px-3 pr-9 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
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
                  setLoginError('Vui lòng liên hệ Quản trị viên Phòng Đào tạo để được cấp lại mật khẩu hoặc mở khóa tài khoản.');
                }}
                className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 rounded px-1"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold py-2.5 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
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
      </main>

      <footer className="py-3 text-center text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        Trường ĐH Trần Đại Nghĩa • TDNU EduAdmin
      </footer>
    </div>
  );
};
