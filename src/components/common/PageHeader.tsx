import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Standard Academic PageHeader component
 * Part of TDNU Visual Source of Truth
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />}
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
};
