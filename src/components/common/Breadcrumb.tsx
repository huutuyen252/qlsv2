import React from 'react';
import { ChevronRight, Home, Shield } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  isAdmin?: boolean;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, isAdmin = false }) => {
  return (
    <nav className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
      <div className="flex items-center gap-1.5 font-medium">
        {isAdmin ? (
          <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Console</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </span>
        )}
      </div>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {item.active || !item.onClick ? (
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[240px]">
              {item.label}
            </span>
          ) : (
            <button
              type="button"
              onClick={item.onClick}
              className="font-medium text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer truncate max-w-[200px]"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
