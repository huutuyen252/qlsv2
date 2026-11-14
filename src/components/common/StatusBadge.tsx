import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
}

/**
 * Standard Academic StatusBadge
 * Crisp border, 3px-4px radius, no neon glowing effects, no giant pill shapes
 * Part of TDNU Visual Source of Truth
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  dot = false,
  className = '',
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300';
      case 'warning':
        return 'border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300';
      case 'danger':
        return 'border-rose-300 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300';
      case 'info':
        return 'border-blue-300 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300';
      case 'neutral':
      default:
        return 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  };

  const getDotBg = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-amber-500';
      case 'danger':
        return 'bg-rose-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${getVariantClasses()} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotBg()}`} />}
      <span>{label}</span>
    </span>
  );
};
