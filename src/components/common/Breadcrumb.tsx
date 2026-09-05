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
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4" aria-label="Breadcrumb">
      <div className="flex items-center gap-1.5 font-medium">
        {isAdmin ? (
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Console</span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </span>
        )}
      </div>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {item.active || !item.onClick ? (
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
              {item.label}
            </span>
          ) : (
            <button
              type="button"
              onClick={item.onClick}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer truncate max-w-[180px]"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
