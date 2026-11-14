import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';
import {
  X,
  KeyRound,
  User as UserIcon,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  users?: User[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setErrorMsg('');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiService.login(cleanUsername, cleanPassword);
      if (res.success && res.user) {
        setUsername('');
        setPassword('');
        setErrorMsg('');
        onLoginSuccess(res.user);
        onClose();
      } else {
        setErrorMsg(res.message || 'Thông tin đăng nhập không chính xác.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-md w-full p-6 shadow-lg relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          id="btn-close-login"
          type="button"
          onClick={() => {
            setErrorMsg('');
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          title="Đóng (Esc)"
          aria-label="Đóng cửa sổ đăng nhập"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5 pb-4 border-b border-slate-200 dark:border-slate-800">
          <img
            src="/logo-truong.svg"
            alt="Logo Trường ĐH Trần Đại Nghĩa"
            className="w-12 h-12 mx-auto mb-2.5 object-contain"
            referrerPolicy="no-referrer"
          />
          <h2 id="login-title" className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Đăng Nhập Cổng Đào Tạo TDNU
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="text-xs text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded border border-rose-300 dark:border-rose-800 font-medium"
            >
              {errorMsg}
            </div>
          )}

          <div>
            <label
              htmlFor="input-username"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5"
            >
              Mã sinh viên / Tên đăng nhập
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập mã sinh viên hoặc tên đăng nhập"
                autoComplete="username"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="input-password"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                className="w-full pl-9 pr-9 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Đăng nhập</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
