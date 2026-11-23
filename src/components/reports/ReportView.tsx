import React, { forwardRef, useState } from 'react';
import { Filter, RotateCcw, Inbox } from 'lucide-react';

export interface ReportSignatureConfig {
  show?: boolean;
  leftTitle?: string;
  leftNote?: string;
  leftName?: string;
  rightTitle?: string;
  rightNote?: string;
  rightName?: string;
}

export interface ReportFilterOption {
  value: string;
  label: string;
}

export interface ReportFilterControl {
  id: string;
  label: string;
  value: string;
  options: ReportFilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  quickOptions?: ReportFilterOption[];
}

export interface ReportViewProps {
  title: string;
  subtitle?: string;
  systemName?: string;
  schoolName?: string;
  unitName?: string;
  logoUrl?: string;
  location?: string;
  reportDate?: Date;
  documentCode?: string;
  signatures?: ReportSignatureConfig;
  footerRightText?: string;
  filters?: ReportFilterControl[];
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  filterSummary?: string;
  toolbarActions?: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export const ReportView = forwardRef<HTMLDivElement, ReportViewProps>(
  (
    {
      title,
      subtitle,
      systemName = 'Hệ thống Quản trị Học vụ - TDNU EduAdmin',
      schoolName = 'TRƯỜNG ĐẠI HỌC TRẦN ĐẠI NGHĨA',
      unitName = 'PHÒNG ĐÀO TẠO VÀ QUẢN LÝ SINH VIÊN',
      logoUrl = '/logo-truong.svg',
      location = 'TP. Hồ Chí Minh',
      reportDate,
      documentCode,
      signatures,
      footerRightText,
      filters = [],
      hasActiveFilters = false,
      onResetFilters,
      filterSummary,
      toolbarActions,
      isEmpty = false,
      emptyMessage = 'Chưa có dữ liệu phù hợp để lập báo cáo.',
      children,
      className = '',
    },
    ref
  ) => {
    const [logoHidden, setLogoHidden] = useState(false);
    const activeDate = reportDate || new Date();
    const day = activeDate.getDate();
    const month = activeDate.getMonth() + 1;
    const year = activeDate.getFullYear();

    const showSignatures = signatures?.show ?? true;
    const leftTitle = signatures?.leftTitle?.trim() || '';
    const leftNote = signatures?.leftNote?.trim() || '';
    const leftName = signatures?.leftName?.trim() || '';
    const rightTitle = signatures?.rightTitle?.trim() || '';
    const rightNote = signatures?.rightNote?.trim() || '';
    const rightName = signatures?.rightName?.trim() || '';

    const hasLeftColumn = Boolean(leftTitle || leftNote || leftName);
    const hasRightColumn = Boolean(rightTitle || rightNote || rightName);

    const formattedTimestamp = `${String(activeDate.getHours()).padStart(2, '0')}:${String(
      activeDate.getMinutes()
    ).padStart(2, '0')} · ${String(day).padStart(2, '0')}/${String(month).padStart(
      2,
      '0'
    )}/${year}`;

    const showFilterToolbar = filters.length > 0 || Boolean(toolbarActions) || Boolean(onResetFilters);

    return (
      <div className="w-full space-y-4">
        {showFilterToolbar && (
          <div className="report-view-filters no-print bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                <Filter className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>Bộ lọc phạm vi dữ liệu (A4)</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {filterSummary && (
                  <span className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {filterSummary}
                  </span>
                )}
                {onResetFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    disabled={!hasActiveFilters}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-45 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 dark:text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đặt lại bộ lọc</span>
                  </button>
                )}
                {toolbarActions}
              </div>
            </div>

            {filters.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {filters.map((filter) => (
                  <div key={filter.id} className="space-y-1.5">
                    <label
                      htmlFor={filter.id}
                      className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {filter.label}
                    </label>
                    <select
                      id={filter.id}
                      value={filter.value}
                      disabled={filter.disabled}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-2 font-medium cursor-pointer disabled:opacity-50"
                    >
                      {filter.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {filter.quickOptions && filter.quickOptions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {filter.quickOptions.map((quick) => {
                          const isSelected = filter.value === quick.value;
                          return (
                            <button
                              key={quick.value}
                              type="button"
                              disabled={filter.disabled}
                              onClick={() => filter.onChange(quick.value)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                                isSelected
                                  ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {quick.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isEmpty ? (
          <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md py-10 px-4 text-center flex flex-col items-center justify-center gap-2.5">
            <Inbox className="w-7 h-7 text-slate-400 dark:text-slate-500" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{emptyMessage}</p>
            {hasActiveFilters && onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 rounded cursor-pointer whitespace-nowrap"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto pb-2 report-view-viewport">
            <div
              ref={ref}
              className={`report-view-a4 keep-white print-page mx-auto bg-white text-[#0f172a] border border-slate-300 shadow-sm flex flex-col justify-between ${className}`}
              style={{
                fontFamily: "'Times New Roman', Times, serif",
              }}
            >
              <div>
                {/* Administrative A4 Header */}
                <header className="report-a4-header grid grid-cols-12 gap-3 items-start pb-4 border-b border-slate-400">
                  <div className="col-span-6 flex items-start gap-2.5 text-left">
                    {!logoHidden && logoUrl && (
                      <img
                        src={logoUrl}
                        alt={schoolName}
                        onError={() => setLogoHidden(true)}
                        className="report-a4-logo w-11 h-11 object-contain shrink-0 mt-0.5"
                      />
                    )}
                    <div className="min-w-0 leading-snug">
                      <p className="font-bold uppercase text-[10.5pt] tracking-tight text-[#0f172a]">
                        {schoolName}
                      </p>
                      {unitName && (
                        <p className="font-semibold uppercase text-[9.5pt] text-[#1e293b] mt-0.5">
                          {unitName}
                        </p>
                      )}
                      <p className="text-[9pt] text-[#475569] mt-0.5">{systemName}</p>
                    </div>
                  </div>

                  <div className="col-span-6 text-center leading-snug">
                    <p className="font-bold uppercase text-[10.5pt] tracking-tight text-[#0f172a]">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="font-bold text-[10.5pt] underline underline-offset-4 text-[#0f172a] mt-0.5">
                      Độc lập - Tự do - Hạnh phúc
                    </p>
                    <p className="italic text-[10.5pt] text-[#334155] mt-2">
                      {location ? `${location}, ` : ''}ngày {day} tháng {month} năm {year}
                    </p>
                  </div>
                </header>

                {/* Document Title (13pt Times New Roman) */}
                <div className="report-a4-title-block text-center py-5">
                  <h1
                    className="report-a4-title font-bold uppercase text-[#0f172a] leading-snug tracking-wide"
                    style={{
                      fontFamily: "'Times New Roman', Times, serif",
                      fontSize: '13pt',
                    }}
                  >
                    {title}
                  </h1>
                  {subtitle && (
                    <p
                      className="text-[#334155] mt-1.5"
                      style={{
                        fontFamily: "'Times New Roman', Times, serif",
                        fontSize: '11.5pt',
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                  {documentCode && (
                    <p
                      className="text-[#475569] italic mt-0.5"
                      style={{
                        fontFamily: "'Times New Roman', Times, serif",
                        fontSize: '10.5pt',
                      }}
                    >
                      Số hiệu: {documentCode}
                    </p>
                  )}
                </div>

                {/* Report Body Content */}
                <div className="report-a4-body text-[11pt] leading-relaxed text-[#0f172a]">
                  {children}
                </div>

                {/* Optional Configurable Signatures (Empty by default or Admin-defined) */}
                {showSignatures && (hasLeftColumn || hasRightColumn) && (
                  <div className="report-a4-signatures grid grid-cols-2 gap-6 text-center pt-8 pb-4 break-inside-avoid">
                    <div>
                      {hasLeftColumn && (
                        <>
                          {leftTitle && (
                            <p className="font-bold uppercase text-[11pt] text-[#0f172a]">{leftTitle}</p>
                          )}
                          {leftNote && (
                            <p className="text-[10pt] italic text-[#475569] mt-0.5">{leftNote}</p>
                          )}
                          <div className="h-20" />
                          {leftName && (
                            <p className="font-bold text-[11pt] text-[#0f172a]">{leftName}</p>
                          )}
                        </>
                      )}
                    </div>

                    <div>
                      {hasRightColumn && (
                        <>
                          {rightTitle && (
                            <p className="font-bold uppercase text-[11pt] text-[#0f172a]">{rightTitle}</p>
                          )}
                          {rightNote && (
                            <p className="text-[10pt] italic text-[#475569] mt-0.5">{rightNote}</p>
                          )}
                          <div className="h-20" />
                          {rightName && (
                            <p className="font-bold text-[11pt] text-[#0f172a]">{rightName}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Administrative A4 Footer */}
              <footer className="report-a4-footer border-t border-slate-300 pt-2.5 mt-8 flex items-center justify-between gap-4 text-[9.5pt] text-[#475569]">
                <span>
                  {systemName} · {schoolName}
                </span>
                <span>{footerRightText || `Ngày xuất: ${formattedTimestamp}`}</span>
              </footer>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ReportView.displayName = 'ReportView';
