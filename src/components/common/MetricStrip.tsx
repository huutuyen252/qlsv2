import React from 'react';

export interface MetricItem {
  label: string;
  value: string | number;
  dotColor?: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate';
  isMono?: boolean;
}

interface MetricStripProps {
  metrics: MetricItem[];
  className?: string;
}

/**
 * Standard Academic MetricStrip component (Unboxed horizontal data metric bar)
 * Replaces decorative AI KPI cards
 * Part of TDNU Visual Source of Truth
 */
export const MetricStrip: React.FC<MetricStripProps> = ({ metrics, className = '' }) => {
  const getDotClass = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500';
      case 'amber':
        return 'bg-amber-500';
      case 'blue':
        return 'bg-blue-600';
      case 'rose':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-y-1.5 gap-x-4 py-2 px-3 rounded bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 ${className}`}
    >
      {metrics.map((m, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-slate-300 dark:text-slate-700 select-none" aria-hidden="true">·</span>}
          <span className="flex items-center gap-1.5 font-medium">
            {m.dotColor && (
              <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${getDotClass(m.dotColor)}`} aria-hidden="true" />
            )}
            <span className="text-slate-600 dark:text-slate-400">{m.label}:</span>
            <span
              className={`font-semibold text-slate-900 dark:text-slate-100 tabular-nums ${
                m.isMono !== false ? 'font-mono' : ''
              }`}
            >
              {m.value}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};
