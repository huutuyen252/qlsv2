export type GlobalTimePreset = 'TODAY' | 'WEEK' | 'MONTH' | 'SEMESTER' | 'CUSTOM';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'NEUTRAL';

export type AlertCategory = 'ACADEMIC' | 'ATTENDANCE' | 'EXAM' | 'TRAINING' | 'RETAKE';

export interface DashboardAlertItem {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  what: string;
  who: string;
  why: string;
  actionLabel: string;
  targetView?: string;
  studentCode?: string;
  className?: string;
  subjectCode?: string;
  count?: number;
  dateLabel?: string;
}

export interface GlobalScopeFilter {
  timePreset: GlobalTimePreset;
  customStart: string;
  customEnd: string;
  semester: string;
  campus: string;
  faculty: string;
  className: string;
  subjectCode: string;
}

export interface ExportCurrentFilterRequest {
  semester?: string;
  faculty?: string;
  className?: string;
  month?: string;
  reportType?: 'ACADEMIC' | 'TRAINING' | 'ATTENTION' | 'RETAKES_FEES';
}

export const TIME_PRESET_OPTIONS: Array<{ value: GlobalTimePreset; label: string }> = [
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'WEEK', label: 'Tuần này' },
  { value: 'MONTH', label: 'Tháng này' },
  { value: 'SEMESTER', label: 'Học kỳ hiện tại' },
  { value: 'CUSTOM', label: 'Tùy chọn' },
];

/**
 * Returns Vietnam weekday code used in ThoiKhoaBieu (2 = Thứ 2 ... 7 = Thứ 7, 8 = Chủ nhật)
 */
export function getTodayThuCode(refDate: Date = new Date()): number {
  const day = refDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return day === 0 ? 8 : day + 1;
}

export function formatThuLabel(thu?: number): string {
  if (!thu) return 'Chưa xếp thứ';
  if (thu === 8 || thu === 1) return 'Chủ nhật';
  return `Thứ ${thu}`;
}

export function parseDateSafe(input?: string | null): Date | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD or ISO timestamp
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY
  const vnMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);
  if (vnMatch) {
    const d = new Date(Number(vnMatch[3]), Number(vnMatch[2]) - 1, Number(vnMatch[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getDateRangeBounds(
  preset: GlobalTimePreset,
  customStart?: string,
  customEnd?: string,
  refDate: Date = new Date()
): { start: Date | null; end: Date | null } {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (preset === 'TODAY') {
    return { start: startOfDay(refDate), end: endOfDay(refDate) };
  }

  if (preset === 'WEEK') {
    const day = refDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: startOfDay(monday), end: endOfDay(sunday) };
  }

  if (preset === 'MONTH') {
    const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const last = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    return { start: startOfDay(first), end: endOfDay(last) };
  }

  if (preset === 'CUSTOM') {
    const s = parseDateSafe(customStart);
    const e = parseDateSafe(customEnd);
    return {
      start: s ? startOfDay(s) : null,
      end: e ? endOfDay(e) : null,
    };
  }

  // SEMESTER: do not restrict by calendar day bounds (handled by semester filter)
  return { start: null, end: null };
}

export function isDateWithinGlobalTime(
  dateStr: string | undefined | null,
  preset: GlobalTimePreset,
  customStart?: string,
  customEnd?: string
): boolean {
  if (preset === 'SEMESTER') return true;
  const parsed = parseDateSafe(dateStr);
  if (!parsed) return false;
  const { start, end } = getDateRangeBounds(preset, customStart, customEnd);
  if (start && parsed < start) return false;
  if (end && parsed > end) return false;
  return true;
}

export function formatShortDateVi(dateStr?: string | null): string {
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr || 'Chưa xác định';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function getTimePresetLabel(
  preset: GlobalTimePreset,
  customStart?: string,
  customEnd?: string,
  activeSemesterLabel?: string
): string {
  if (preset === 'TODAY') return 'Hôm nay';
  if (preset === 'WEEK') return 'Tuần này';
  if (preset === 'MONTH') return `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
  if (preset === 'CUSTOM') {
    if (customStart && customEnd) return `${formatShortDateVi(customStart)} – ${formatShortDateVi(customEnd)}`;
    if (customStart) return `Từ ${formatShortDateVi(customStart)}`;
    if (customEnd) return `Đến ${formatShortDateVi(customEnd)}`;
    return 'Khoảng tùy chọn';
  }
  return activeSemesterLabel || 'Học kỳ hiện tại';
}
