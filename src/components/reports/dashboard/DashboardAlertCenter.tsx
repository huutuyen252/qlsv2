import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Info,
  MinusCircle,
} from 'lucide-react';
import {
  AlertCategory,
  AlertSeverity,
  DashboardAlertItem,
} from './dashboardTypes';

interface DashboardAlertCenterProps {
  title?: string;
  alerts: DashboardAlertItem[];
  onAlertAction: (alert: DashboardAlertItem) => void;
  allowMarkHandled?: boolean;
  emptyMessage?: string;
  maxVisibleDefault?: number;
}

const SEVERITY_META: Record<
  AlertSeverity,
  {
    label: string;
    order: number;
    iconClass: string;
    labelClass: string;
    surfaceClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  CRITICAL: {
    label: 'Khẩn cấp',
    order: 0,
    iconClass: 'text-rose-600 dark:text-rose-400',
    labelClass: 'text-rose-700 dark:text-rose-300',
    surfaceClass: 'bg-rose-50/60 dark:bg-rose-950/20',
    Icon: AlertOctagon,
  },
  WARNING: {
    label: 'Cần chú ý',
    order: 1,
    iconClass: 'text-amber-600 dark:text-amber-400',
    labelClass: 'text-amber-700 dark:text-amber-300',
    surfaceClass: 'bg-amber-50/50 dark:bg-amber-950/15',
    Icon: AlertTriangle,
  },
  INFO: {
    label: 'Thông tin',
    order: 2,
    iconClass: 'text-blue-600 dark:text-blue-400',
    labelClass: 'text-blue-700 dark:text-blue-300',
    surfaceClass: 'bg-white dark:bg-slate-900',
    Icon: Info,
  },
  NEUTRAL: {
    label: 'Thông thường',
    order: 3,
    iconClass: 'text-slate-500 dark:text-slate-400',
    labelClass: 'text-slate-600 dark:text-slate-400',
    surfaceClass: 'bg-white dark:bg-slate-900',
    Icon: MinusCircle,
  },
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  ACADEMIC: 'Học tập',
  ATTENDANCE: 'Chuyên cần',
  EXAM: 'Thi & Kiểm tra',
  TRAINING: 'Rèn luyện',
  RETAKE: 'Thi lại / Học lại',
};

export const DashboardAlertCenter: React.FC<DashboardAlertCenterProps> = ({
  title = 'Trung tâm cảnh báo',
  alerts,
  onAlertAction,
  allowMarkHandled = true,
  emptyMessage = 'Không phát hiện cảnh báo bất thường trong phạm vi đang lọc.',
  maxVisibleDefault = 6,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AlertSeverity>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AlertCategory>('ALL');
  const [handledIds, setHandledIds] = useState<Set<string>>(() => new Set());
  const [showHandled, setShowHandled] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let info = 0;
    let activeTotal = 0;
    alerts.forEach((a) => {
      if (handledIds.has(a.id)) return;
      activeTotal++;
      if (a.severity === 'CRITICAL') critical++;
      else if (a.severity === 'WARNING') warning++;
      else if (a.severity === 'INFO') info++;
    });
    return { critical, warning, info, activeTotal };
  }, [alerts, handledIds]);

  const filteredAlerts = useMemo(() => {
    return [...alerts]
      .filter((a) => {
        if (!showHandled && handledIds.has(a.id)) return false;
        if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
        if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => SEVERITY_META[a.severity].order - SEVERITY_META[b.severity].order);
  }, [alerts, handledIds, showHandled, severityFilter, categoryFilter]);

  const visibleAlerts = expanded
    ? filteredAlerts
    : filteredAlerts.slice(0, maxVisibleDefault);

  const toggleHandled = (id: string) => {
    setHandledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section
      aria-label={title}
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h2>
          </div>
          <div className="text-right shrink-0 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-slate-100">{counts.activeTotal}</span> đang mở
          </div>
        </div>

        {/* Summary metadata line (unboxed text, zero-pill discipline) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-rose-700 dark:text-rose-400 font-mono tabular-nums">
            <AlertOctagon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{counts.critical} khẩn cấp</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400 font-mono tabular-nums">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{counts.warning} cần chú ý</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400 font-mono tabular-nums">
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{counts.info} thông tin</span>
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div
            role="tablist"
            aria-label="Lọc theo mức độ cảnh báo"
            className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md"
          >
            {(
              [
                { key: 'ALL', label: 'Tất cả' },
                { key: 'CRITICAL', label: 'Khẩn cấp' },
                { key: 'WARNING', label: 'Cần chú ý' },
                { key: 'INFO', label: 'Thông tin' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={severityFilter === tab.key}
                onClick={() => setSeverityFilter(tab.key)}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  severityFilter === tab.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Lọc theo loại cảnh báo"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | AlertCategory)}
              className="px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">Mọi nhóm</option>
              <option value="ACADEMIC">Học tập</option>
              <option value="ATTENDANCE">Chuyên cần</option>
              <option value="EXAM">Thi & Kiểm tra</option>
              <option value="TRAINING">Rèn luyện</option>
              <option value="RETAKE">Thi lại / Học lại</option>
            </select>

            {allowMarkHandled && handledIds.size > 0 && (
              <button
                type="button"
                onClick={() => setShowHandled((v) => !v)}
                className="text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                {showHandled ? 'Ẩn đã xử lý' : `Đã xử lý (${handledIds.size})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <div className="p-6 text-center space-y-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" aria-hidden="true" />
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {visibleAlerts.map((alert) => {
            const meta = SEVERITY_META[alert.severity];
            const SeverityIcon = meta.Icon;
            const isHandled = handledIds.has(alert.id);

            return (
              <li
                key={alert.id}
                className={`p-3.5 transition-colors ${isHandled ? 'opacity-60 bg-slate-50 dark:bg-slate-900' : meta.surfaceClass}`}
              >
                <div className="flex items-start gap-2.5">
                  <SeverityIcon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Severity + Category + Date (unboxed metadata line) */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                      <span className={`font-semibold ${meta.labelClass}`}>{meta.label}</span>
                      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {CATEGORY_LABELS[alert.category]}
                      </span>
                      {alert.dateLabel && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {alert.dateLabel}
                          </span>
                        </>
                      )}
                    </div>

                    {/* WHAT */}
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                      {alert.what}
                    </p>

                    {/* WHO & WHY */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{alert.who}</span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                      <span>{alert.why}</span>
                    </p>

                    {/* ACTION & MARK HANDLED */}
                    <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onAlertAction(alert)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded cursor-pointer whitespace-nowrap"
                      >
                        <span>{alert.actionLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>

                      {allowMarkHandled && (
                        <button
                          type="button"
                          onClick={() => toggleHandled(alert.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer whitespace-nowrap"
                        >
                          <Check className="w-3 h-3" aria-hidden="true" />
                          <span>{isHandled ? 'Mở lại' : 'Đánh dấu đã xem'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filteredAlerts.length > maxVisibleDefault && (
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {expanded
              ? 'Thu gọn danh sách cảnh báo'
              : `Xem thêm ${filteredAlerts.length - maxVisibleDefault} cảnh báo khác`}
          </button>
        </div>
      )}
    </section>
  );
};
