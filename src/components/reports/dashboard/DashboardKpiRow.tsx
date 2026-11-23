import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Minus,
  XCircle,
} from 'lucide-react';

export type KpiStatusTone = 'good' | 'warning' | 'critical' | 'info' | 'neutral';

export interface DashboardKpiItem {
  id: string;
  label: string;
  value: string | number;
  context?: string;
  statusLabel?: string;
  statusTone?: KpiStatusTone;
  onClick?: () => void;
  actionHint?: string;
}

interface DashboardKpiRowProps {
  items: DashboardKpiItem[];
}

function getStatusMeta(tone: KpiStatusTone = 'neutral') {
  switch (tone) {
    case 'good':
      return {
        textClass: 'text-emerald-700 dark:text-emerald-400',
        Icon: CheckCircle2,
      };
    case 'warning':
      return {
        textClass: 'text-amber-700 dark:text-amber-400',
        Icon: AlertTriangle,
      };
    case 'critical':
      return {
        textClass: 'text-rose-700 dark:text-rose-400',
        Icon: XCircle,
      };
    case 'info':
      return {
        textClass: 'text-blue-700 dark:text-blue-400',
        Icon: Info,
      };
    default:
      return {
        textClass: 'text-slate-600 dark:text-slate-400',
        Icon: Minus,
      };
  }
}

export const DashboardKpiRow: React.FC<DashboardKpiRowProps> = ({ items }) => {
  const gridColsClass =
    items.length <= 4
      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
      : items.length === 5
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';

  return (
    <section aria-label="Chỉ số tổng quan trọng yếu" className={`grid ${gridColsClass} gap-3`}>
      {items.map((item) => {
        const { textClass, Icon } = getStatusMeta(item.statusTone);
        const interactive = Boolean(item.onClick);
        const content = (
          <>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-snug">
                {item.label}
              </span>
              {interactive && (
                <ChevronRight
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-mono tabular-nums">
                {item.value}
              </span>
            </div>

            {item.context && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed truncate" title={item.context}>
                {item.context}
              </p>
            )}

            {item.statusLabel && (
              <div className={`mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs font-medium ${textClass}`}>
                <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.statusLabel}</span>
                </span>
                {item.actionHint && interactive && (
                  <span className="text-[11px] text-blue-700 dark:text-blue-400 font-medium shrink-0 whitespace-nowrap">
                    {item.actionHint}
                  </span>
                )}
              </div>
            )}
          </>
        );

        if (interactive) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="group text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-600 dark:hover:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer flex flex-col justify-between"
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between"
          >
            {content}
          </div>
        );
      })}
    </section>
  );
};
