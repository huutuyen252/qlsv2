import React from 'react';
import { AlertCircle, Inbox, RefreshCw, SearchX } from 'lucide-react';

export const LoadingState: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className = '',
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden ${className}`}
      role="status"
      aria-label="Đang tải dữ liệu"
    >
      <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse ml-auto" />
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="px-3 py-3 flex items-center gap-4">
            <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-3 flex-1 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  message?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ message = 'Chưa có dữ liệu.', action, className = '' }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md py-10 px-4 text-center flex flex-col items-center justify-center gap-2.5 ${className}`}
    >
      <Inbox className="w-7 h-7 text-slate-400 dark:text-slate-500" />
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};

export const FilteredEmptyState: React.FC<{
  message?: string;
  onClearFilters?: () => void;
  className?: string;
}> = ({
  message = 'Không có dữ liệu phù hợp với bộ lọc.',
  onClearFilters,
  className = '',
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md py-10 px-4 text-center flex flex-col items-center justify-center gap-2.5 ${className}`}
    >
      <SearchX className="w-7 h-7 text-slate-400 dark:text-slate-500" />
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{message}</p>
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 rounded cursor-pointer whitespace-nowrap"
        >
          Xóa lọc
        </button>
      )}
    </div>
  );
};

export const ErrorBanner: React.FC<{
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({ message, onRetry, className = '' }) => {
  return (
    <div
      role="alert"
      className={`p-3 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs flex flex-wrap items-center justify-between gap-2 ${className}`}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Thử lại</span>
        </button>
      )}
    </div>
  );
};
