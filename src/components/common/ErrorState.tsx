import React from 'react';
import { ShieldX, Home, ArrowLeft, Lock, RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  type?: '403' | '401' | '404' | 'error';
  title?: string;
  message?: string;
  attemptedPath?: string;
  onGoHome?: () => void;
  onGoBack?: () => void;
  onLogin?: () => void;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = '403',
  title,
  message,
  attemptedPath,
  onGoHome,
  onGoBack,
  onLogin,
  onRetry,
}) => {
  const is403 = type === '403';
  const is401 = type === '401';
  const isApiError = type === 'error';

  const defaultTitle = is403
    ? '403 - Không có quyền truy cập'
    : is401
    ? '401 - Yêu cầu xác thực'
    : isApiError
    ? 'Không thể tải dữ liệu'
    : '404 - Không tìm thấy trang';

  const defaultMessage = is403
    ? 'Tài khoản của bạn không có quyền truy cập vào phân hệ hoặc thao tác này.'
    : is401
    ? 'Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập.'
    : isApiError
    ? 'Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.'
    : 'Đường dẫn yêu cầu không tồn tại hoặc đã thay đổi.';

  return (
    <div className="min-h-[55vh] flex items-center justify-center p-4" role="alert">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 text-center">
        <div
          className={`w-11 h-11 rounded flex items-center justify-center mx-auto mb-4 border ${
            is403 || isApiError
              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800'
              : is401
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
          }`}
        >
          {is403 ? (
            <ShieldX className="w-5 h-5" />
          ) : isApiError ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Lock className="w-5 h-5" />
          )}
        </div>

        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {title || defaultTitle}
        </h2>

        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
          {message || defaultMessage}
        </p>

        {attemptedPath && (
          <div className="mt-3 inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-mono border border-slate-200 dark:border-slate-700">
            {attemptedPath}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          )}

          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium rounded text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>
          )}

          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Về Tổng quan</span>
            </button>
          )}

          {is401 && onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
