import React from 'react';
import { Search, X } from 'lucide-react';

interface DataToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard Academic DataToolbar component
 * Search input + Cascading filter dropdowns + Clear filter action
 * Part of TDNU Visual Source of Truth
 */
export const DataToolbar: React.FC<DataToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  filters,
  hasActiveFilters,
  onClearFilters,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${className}`}>
      {onSearchChange && (
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {filters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters}

          {hasActiveFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded transition-colors whitespace-nowrap cursor-pointer"
              title="Xóa tất cả bộ lọc đang áp dụng"
            >
              Xóa lọc
            </button>
          )}
        </div>
      )}

      {actions && (
        <div className="flex items-center gap-2 sm:ml-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
