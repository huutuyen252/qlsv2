import React from 'react';
import { ShieldX, Home, ArrowLeft, Lock, RefreshCw, Mail } from 'lucide-react';

interface ErrorStateProps {
  type?: '403' | '401' | '404';
  title?: string;
  message?: string;
  attemptedPath?: string;
  onGoHome?: () => void;
  onGoBack?: () => void;
  onLogin?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = '403',
  title,
  message,
  attemptedPath,
  onGoHome,
  onGoBack,
  onLogin,
}) => {
  const is403 = type === '403';
  const is401 = type === '401';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner ${
            is403
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400'
              : is401
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {is403 ? <ShieldX className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
        </div>

        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          {title || (is403 ? '403 - Quyền truy cập bị từ chối' : '401 - Yêu cầu xác thực')}
        </h2>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
          {message ||
            (is403
              ? 'Tài khoản của bạn không có đủ thẩm quyền để truy cập phân hệ quản trị hoặc chức năng này. Chỉ Quản trị viên (ADMIN) mới có quyền truy cập.'
              : 'Phiên đăng nhập của bạn đã hết hạn hoặc bạn chưa đăng nhập vào hệ thống.')}
        </p>

        {attemptedPath && (
          <div className="mt-3 inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-mono border border-slate-200 dark:border-slate-700">
            Route yêu cầu: <span className="font-bold text-rose-600 dark:text-rose-400">{attemptedPath}</span>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          )}

          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Về Dashboard</span>
            </button>
          )}

          {is401 && onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Đăng nhập lại</span>
            </button>
          )}
        </div>

        <div className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
          <Mail className="w-3.5 h-3.5" />
          <span>Nếu cần quyền, vui lòng liên hệ Ban Quản Trị Hệ Thống</span>
        </div>
      </div>
    </div>
  );
};
