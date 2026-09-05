import React, { useState } from 'react';
import { User, SinhVien, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { useTheme } from '../../context/ThemeContext';
import {
  ShieldCheck,
  UserCheck,
  KeyRound,
  User as UserIcon,
  AlertCircle,
  Lock,
  LogIn,
  School,
  Sun,
  Moon,
} from 'lucide-react';
interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
  students: SinhVien[];
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
  users,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    const key = loginUsername.trim().toLowerCase();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === key
    );
    if (!foundUser) {
      setLoginError(
        'Tên đăng nhập hoặc mã số sinh viên không tồn tại trên hệ thống. Vui lòng kiểm tra lại hoặc liên hệ Quản trị viên (Admin) để khởi tạo tài khoản!'
      );
      setIsLoading(false);
      return;
    }
    if (foundUser.status === 'LOCKED') {
      setLoginError(
        'Tài khoản này đã bị KHÓA! Do nhập sai thông tin quá 5 lần hoặc bị Quản trị viên khóa. Chỉ có Quản trị viên (Admin) mới có quyền mở khóa tài khoản này.'
      );
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiService.login(loginUsername.trim(), loginPassword);
      if (res.success && res.user) {
        setFailedAttempts((prev) => ({ ...prev, [key]: 0 }));
        setIsLoading(false);
        onLoginSuccess(res.user);
      } else {
        const count = (failedAttempts[key] || 0) + 1;
        setFailedAttempts((prev) => ({ ...prev, [key]: count }));
        if (count >= 5) {
          foundUser.status = 'LOCKED';
          await apiService.updateUserStatus(foundUser.id, 'LOCKED');
          setLoginError(
            `Tài khoản [${foundUser.username}] đã bị KHÓA do nhập sai thông tin quá 5 lần! Chỉ có Quản trị viên (Admin) mới có thể mở khóa tài khoản này.`
          );
        } else {
          setLoginError(
            res.message ||
              `Thông tin đăng nhập không chính xác! Cảnh báo: Bạn đã nhập sai ${count}/5 lần. Còn ${
                5 - count
              } lần thử trước khi tài khoản bị khóa.`
          );
        }
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
      setLoginError('Lỗi kết nối máy chủ xác thực');
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between relative overflow-hidden font-sans transition-colors duration-200 selection:bg-blue-600 selection:text-white">
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/10 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <img
            src="/logo-truong.svg"
            alt="Logo Trường ĐH Trần Đại Nghĩa"
            className="w-12 h-12 object-contain drop-shadow-md shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-sans">
                TDNU <span className="text-blue-600 dark:text-blue-400">EDU</span>
              </h1>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                Cổng Đào Tạo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Trường ĐH Trần Đại Nghĩa • Cổng quản lý sinh viên
            </p>
          </div>
        </div>

        <button
          id="btn-login-theme-toggle"
          type="button"
          onClick={toggleTheme}
          className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700/60 shadow-xs"
          title={`Chuyển chế độ ${isDark ? 'Sáng' : 'Tối'}`}
          aria-label="Chuyển chế độ giao diện Sáng / Tối"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </button>
      </header>
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-md w-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl dark:shadow-2xl overflow-hidden backdrop-blur-xl p-6 md:p-8 transition-colors">
          <div className="flex flex-col justify-between">
            <div className="mb-6 pb-5 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-3">
              <img
                src="/logo-truong.svg"
                alt="Logo Trường Sĩ quan Kỹ thuật Quân sự / ĐH Trần Đại Nghĩa"
                className="w-20 h-20 object-contain drop-shadow-md"
                referrerPolicy="no-referrer"
              />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Đăng Nhập Hệ Thống</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Trường Sĩ quan Kỹ thuật Quân sự / ĐH Trần Đại Nghĩa</p>
              </div>
            </div>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{loginError}</span>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Tên Đăng Nhập / Mã Số Sinh Viên (MaSV):
                </label>
                <input
                  id="input-login-username"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập hoặc MaSV..."
                  autoComplete="off"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Mật Khẩu:
                </label>
                <input
                  id="input-login-password"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  autoComplete="new-password"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              <div className="flex items-center justify-end text-xs text-slate-500 dark:text-slate-400 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginError('Vui lòng liên hệ Quản trị viên (Admin) Phòng Đào Tạo để được hỗ trợ cấp lại mật khẩu hoặc mở khóa tài khoản.');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline cursor-pointer text-xs"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <button
                id="btn-login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Đang xác thực bảo mật...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Đăng Nhập Hệ Thống Đào Tạo
                  </>
                )}
              </button>
            </form>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Tài khoản do Admin cấp & quản lý
              </span>
              <span>TDNU EDU © 2024</span>
            </div>
          </div>
        </div>
      </main>
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-slate-200/80 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80">
        Trường ĐH Trần Đại Nghĩa • Cổng quản lý sinh viên
      </footer>
    </div>
  );
};


