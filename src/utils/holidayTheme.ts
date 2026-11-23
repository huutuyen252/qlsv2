export type HolidayThemeKey =
  | 'AUTO'
  | 'DEFAULT'
  | 'TET'
  | 'FOUNDING_PARTY'
  | 'WOMEN_DAY'
  | 'LIBERATION_LABOR'
  | 'NATIONAL_DAY'
  | 'VIETNAMESE_WOMEN'
  | 'TEACHERS_DAY'
  | 'MILITARY_DAY';

export type ResolvedHolidayKey = Exclude<HolidayThemeKey, 'AUTO'>;

export interface HolidayThemeConfig {
  key: ResolvedHolidayKey;
  name: string;
  dateLabel: string;
  marqueeText: string;
  mainBgLight: string;
  mainBgDark: string;
  leftPanelGradientClass: string;
  leftAccentTextClass: string;
  leftGlowTopClass: string;
  leftGlowBottomClass: string;
  headerTickerTextClass: string;
  headerDividerClass: string;
  cardShadowClass: string;
}

export interface HolidayThemeOption {
  value: HolidayThemeKey;
  label: string;
}

export const HOLIDAY_THEME_OPTIONS: HolidayThemeOption[] = [
  { value: 'AUTO', label: 'Tự động theo lịch ngày lễ trong năm' },
  { value: 'DEFAULT', label: 'Mặc định học kỳ (TDNU Chuẩn)' },
  { value: 'TET', label: 'Tết Nguyên Đán · Mừng Đảng, Mừng Xuân' },
  { value: 'FOUNDING_PARTY', label: '03/02 · Ngày thành lập Đảng CSVN' },
  { value: 'WOMEN_DAY', label: '08/03 · Ngày Quốc tế Phụ nữ' },
  { value: 'LIBERATION_LABOR', label: '30/04 – 01/05 · Giải phóng miền Nam & Quốc tế Lao động' },
  { value: 'NATIONAL_DAY', label: '02/09 · Quốc khánh nước CHXHCN Việt Nam' },
  { value: 'VIETNAMESE_WOMEN', label: '20/10 · Ngày Phụ nữ Việt Nam' },
  { value: 'TEACHERS_DAY', label: '20/11 · Ngày Nhà giáo Việt Nam' },
  { value: 'MILITARY_DAY', label: '22/12 · Ngày thành lập QĐND Việt Nam' },
];

export const VALID_HOLIDAY_THEME_KEYS: readonly HolidayThemeKey[] = HOLIDAY_THEME_OPTIONS.map(
  (item) => item.value
);

const HOLIDAY_THEMES: Record<ResolvedHolidayKey, HolidayThemeConfig> = {
  DEFAULT: {
    key: 'DEFAULT',
    name: 'Trường Đại học Trần Đại Nghĩa',
    dateLabel: 'TDNU EDU',
    marqueeText:
      'Chào mừng đến với Cổng thông tin Đào tạo Trường Đại học Trần Đại Nghĩa (TDNU) — Kỷ cương · Chất lượng · Sáng tạo · Hội nhập',
    mainBgLight:
      'radial-gradient(ellipse 80% 60% at 15% 12%, rgba(37, 99, 235, 0.11), transparent 62%), radial-gradient(ellipse 70% 55% at 88% 88%, rgba(14, 165, 233, 0.10), transparent 60%), linear-gradient(135deg, #f1f5f9 0%, #eff6ff 50%, #e2e8f0 100%)',
    mainBgDark:
      'radial-gradient(ellipse 75% 55% at 18% 15%, rgba(37, 99, 235, 0.18), transparent 62%), radial-gradient(ellipse 65% 50% at 85% 85%, rgba(14, 165, 233, 0.12), transparent 60%)',
    leftPanelGradientClass: 'from-[#0d1f49] via-[#16347a] to-[#1d4ed8]',
    leftAccentTextClass: 'text-sky-200',
    leftGlowTopClass: 'bg-sky-300/15',
    leftGlowBottomClass: 'bg-blue-950/55',
    headerTickerTextClass: 'text-blue-900 dark:text-sky-300',
    headerDividerClass: 'bg-blue-200 dark:bg-slate-700',
    cardShadowClass:
      'shadow-[0_32px_64px_-16px_rgba(15,23,42,0.28),0_14px_28px_-10px_rgba(29,78,216,0.22),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(15,23,42,0.14)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.82),0_14px_28px_-10px_rgba(37,99,235,0.26),inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
  TET: {
    key: 'TET',
    name: 'Mừng Đảng · Mừng Xuân Mới',
    dateLabel: 'Tết Nguyên Đán',
    marqueeText:
      'Chúc Mừng Năm Mới — Mừng Đảng, Mừng Xuân — Kính chúc cán bộ, giảng viên và toàn thể sinh viên Trường Đại học Trần Đại Nghĩa An Khang, Thịnh Vượng, Học Tập Tốt',
    mainBgLight:
      'radial-gradient(ellipse 75% 55% at 14% 12%, rgba(220, 38, 38, 0.13), transparent 60%), radial-gradient(ellipse 70% 55% at 86% 88%, rgba(217, 119, 6, 0.14), transparent 62%), linear-gradient(135deg, #fff7ed 0%, #fef2f2 48%, #fefce8 100%)',
    mainBgDark:
      'radial-gradient(ellipse 75% 55% at 15% 15%, rgba(185, 28, 28, 0.24), transparent 62%), radial-gradient(ellipse 65% 55% at 85% 85%, rgba(217, 119, 6, 0.18), transparent 60%)',
    leftPanelGradientClass: 'from-[#6b0f1a] via-[#991b1b] to-[#b45309]',
    leftAccentTextClass: 'text-amber-200',
    leftGlowTopClass: 'bg-amber-300/20',
    leftGlowBottomClass: 'bg-red-950/60',
    headerTickerTextClass: 'text-red-800 dark:text-amber-300',
    headerDividerClass: 'bg-red-200 dark:bg-red-900/60',
    cardShadowClass:
      'shadow-[0_32px_64px_-16px_rgba(127,29,29,0.28),0_14px_28px_-10px_rgba(180,83,9,0.20),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(127,29,29,0.16)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85),0_14px_28px_-10px_rgba(185,28,28,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
  FOUNDING_PARTY: {
    key: 'FOUNDING_PARTY',
    name: 'Kỷ niệm Ngày thành lập Đảng CSVN',
    dateLabel: '03/02',
    marqueeText:
      'Nhiệt liệt chào mừng Kỷ niệm Ngày thành lập Đảng Cộng sản Việt Nam (03/02/1930) — Trường Đại học Trần Đại Nghĩa vững bước dưới lá cờ vẻ vang của Đảng',
    mainBgLight:
      'radial-gradient(ellipse 75% 55% at 15% 12%, rgba(185, 28, 28, 0.13), transparent 62%), radial-gradient(ellipse 68% 55% at 88% 85%, rgba(202, 138, 4, 0.13), transparent 60%), linear-gradient(135deg, #fef2f2 0%, #fffbeb 52%, #f1f5f9 100%)',
    mainBgDark:
      'radial-gradient(ellipse 75% 55% at 15% 15%, rgba(185, 28, 28, 0.25), transparent 62%), radial-gradient(ellipse 65% 50% at 85% 85%, rgba(202, 138, 4, 0.17), transparent 60%)',
    leftPanelGradientClass: 'from-[#5c0b14] via-[#8f121e] to-[#b91c1c]',
    leftAccentTextClass: 'text-amber-200',
    leftGlowTopClass: 'bg-amber-300/20',
    leftGlowBottomClass: 'bg-red-950/65',
    headerTickerTextClass: 'text-red-800 dark:text-amber-300',
    headerDividerClass: 'bg-red-200 dark:bg-red-900/60',
    cardShadowClass:
      'shadow-[0_32px_64px_-16px_rgba(127,29,29,0.26),0_14px_28px_-10px_rgba(185,28,28,0.20),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(127,29,29,0.16)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85),0_14px_28px_-10px_rgba(185,28,28,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
  WOMEN_DAY: {
    key: 'WOMEN_DAY',
    name: 'Chào mừng Ngày Quốc tế Phụ nữ',
    dateLabel: '08/03',
    marqueeText:
      'Chào mừng Ngày Quốc tế Phụ nữ 08/03 — Kính chúc các nữ cán bộ, giảng viên và nữ sinh viên Trường Đại học Trần Đại Nghĩa luôn rạng rỡ, hạnh phúc và thành công',
    mainBgLight:
      'radial-gradient(ellipse 75% 55% at 16% 12%, rgba(225, 29, 72, 0.11), transparent 60%), radial-gradient(ellipse 70% 55% at 85% 86%, rgba(245, 158, 11, 0.10), transparent 60%), linear-gradient(135deg, #fff1f2 0%, #f8fafc 52%, #fef2f2 100%)',
    mainBgDark:
      'radial-gradient(ellipse 75% 55% at 18% 16%, rgba(190, 18, 60, 0.22), transparent 62%), radial-gradient(ellipse 65% 50% at 84% 84%, rgba(217, 119, 6, 0.12), transparent 60%)',
    leftPanelGradientClass: 'from-[#4c0519] via-[#881337] to-[#be123c]',
    leftAccentTextClass: 'text-rose-200',
    leftGlowTopClass: 'bg-rose-300/20',
    leftGlowBottomClass: 'bg-rose-950/65',
    headerTickerTextClass: 'text-rose-800 dark:text-rose-300',
    headerDividerClass: 'bg-rose-200 dark:bg-rose-900/60',
    cardShadowClass:
      'shadow-[0_32px_64px_-16px_rgba(136,19,55,0.25),0_14px_28px_-10px_rgba(190,18,60,0.18),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(136,19,55,0.15)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.84),0_14px_28px_-10px_rgba(190,18,60,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
  LIBERATION_LABOR: {
    key: 'LIBERATION_LABOR',
    name: 'Kỷ niệm 30/04 & Quốc tế Lao động 01/05',
    dateLabel: '30/04 – 01/05',
    marqueeText:
      'Nhiệt liệt chào mừng Kỷ niệm Ngày Giải phóng miền Nam, thống nhất đất nước (30/04/1975) và Ngày Quốc tế Lao động (01/05) — Tự hào truyền thống hào hùng dân tộc Việt Nam',
    mainBgLight:
      'radial-gradient(ellipse 75% 55% at 15% 12%, rgba(220, 38, 38, 0.12), transparent 60%), radial-gradient(ellipse 70% 55% at 86% 86%, rgba(29, 78, 216, 0.12), transparent 60%), linear-gradient(135deg, #fef2f2 0%, #eff6ff 52%, #fefce8 100%)',
    mainBgDark:
      'radial-gradient(ellipse 75% 55% at 16% 15%, rgba(185, 28, 28, 0.24), transparent 62%), radial-gradient(ellipse 65% 50% at 85% 85%, rgba(30, 64, 175, 0.22), transparent 60%)',
    leftPanelGradientClass: 'from-[#6b0f1a] via-[#991b1b] to-[#1e3a8a]',
    leftAccentTextClass: 'text-amber-200',
    leftGlowTopClass: 'bg-amber-300/20',
    leftGlowBottomClass: 'bg-blue-950/60',
    headerTickerTextClass: 'text-red-800 dark:text-amber-300',
    headerDividerClass: 'bg-red-200 dark:bg-red-900/60',
    cardShadowClass:
      'shadow-[0_32px_64px_-16px_rgba(127,29,29,0.26),0_14px_28px_-10px_rgba(30,58,138,0.22),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(15,23,42,0.16)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85),0_14px_28px_-10px_rgba(185,28,28,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
  NATIONAL_DAY: {
    key: 'NATIONAL_DAY',
    name: 'Quốc khánh nước CHXHCN Việt Nam',
    dateLabel: '02/09',
    marqueeText:
      'Chào mừng Kỷ niệm Quốc khánh nước Cộng hòa Xã hội Chủ nghĩa Việt Nam (02/09/1945) — Độc lập · Tự do · Hạnh phúc — Trường Đại học Trần Đại Nghĩa',
    mainBgLight:
      'radial-gradient(ellipse 75% 55% at 16% 12%, rgba(220, 38, 38, 0.14), transparent 60%), radial-gradient(ellipse 70% 55% at 86% 86%, rgba(234, 179, 8, 0.15), transparent 60%), linear-gradient(135deg, #fef2f2 0%, #fffbeb 50%, #f8fafc 100%)',
    mainBgDark:
      'radial-gradient(ellipse 75% 55% at 16% 15%, rgba(185, 28, 28, 0.26), transparent 62%), radial-gradient(ellipse 65% 50% at 84% 85%, rgba(202, 138, 4, 0.18), transparent 60%)',
    leftPanelGradientClass: 'from-[#6b0f1a] via-[#991b1b] to-[#c2410c]',
    leftAccentTextClass: 'text-amber-200',
    leftGlowTopClass: 'bg-amber-300/22',
    leftGlowBottomClass: 'bg-red-950/65',
    headerTickerTextClass: 'text-red-800 dark:text-amber-300',
    headerDividerClass: 'bg-red-200 dark:bg-red-900/60',
    cardShadowClass:
      'shadow-[0_32px_64px_-16px_rgba(127,29,29,0.28),0_14px_28px_-10px_rgba(217,119,6,0.20),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(127,29,29,0.16)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85),0_14px_28px_-10px_rgba(185,28,28,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
  VIETNAMESE_WOMEN: {
    key: 'VIETNAMESE_WOMEN',
    name: 'Chào mừng Ngày Phụ nữ Việt Nam',
    dateLabel: '20/10',
    marqueeText:
      'Chào mừng Ngày Phụ nữ Việt Nam 20/10 — Tôn vinh những đóng góp thầm lặng và bản lĩnh của các nữ cán bộ, giảng viên, sinh viên Trường Đại học Trần Đại Nghĩa',
    mainBgLight:
      'radial-gradient(ellipse 75% 55% at 16% 14%, rgba(225, 29, 72, 0.11), transparent 60%), radial-gradient(ellipse 70% 55% at 84% 86%, rgba(217, 119, 6, 0.11), transparent 60%), linear-gradient(135deg, #fff1f2 0%, #fffbeb 52%, #f8fafc 100%)',
    mainBgDark:
      'radial-gradient(ellipse 75% 55% at 16% 15%, rgba(190, 18, 60, 0.22), transparent 62%), radial-gradient(ellipse 65% 50% at 84% 85%, rgba(217, 119, 6, 0.15), transparent 60%)',
    leftPanelGradientClass: 'from-[#500724] via-[#881337] to-[#b45309]',
    leftAccentTextClass: 'text-amber-200',
    leftGlowTopClass: 'bg-rose-300/20',
    leftGlowBottomClass: 'bg-rose-950/60',
    headerTickerTextClass: 'text-rose-800 dark:text-rose-300',
    headerDividerClass: 'bg-rose-200 dark:bg-rose-900/60',
    cardShadowClass:
      'shadow-[0_32px_64px_-16px_rgba(136,19,55,0.25),0_14px_28px_-10px_rgba(180,83,9,0.18),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(136,19,55,0.15)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.84),0_14px_28px_-10px_rgba(190,18,60,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
  TEACHERS_DAY: {
    key: 'TEACHERS_DAY',
    name: 'Tri ân Ngày Nhà giáo Việt Nam',
    dateLabel: '20/11',
    marqueeText:
      'Chào mừng Ngày Nhà giáo Việt Nam 20/11 — Tri ân các thầy cô giáo Trường Đại học Trần Đại Nghĩa — Tôn sư trọng đạo · Vững bước tương lai',
    mainBgLight:
      'radial-gradient(ellipse 78% 58% at 15% 12%, rgba(29, 78, 216, 0.13), transparent 62%), radial-gradient(ellipse 72% 56% at 86% 86%, rgba(217, 119, 6, 0.15), transparent 62%), linear-gradient(135deg, #eff6ff 0%, #fffbeb 52%, #e2e8f0 100%)',
    mainBgDark:
      'radial-gradient(ellipse 76% 56% at 16% 14%, rgba(37, 99, 235, 0.22), transparent 62%), radial-gradient(ellipse 68% 52% at 85% 85%, rgba(217, 119, 6, 0.19), transparent 60%)',
    leftPanelGradientClass: 'from-[#0c234b] via-[#1a3c7e] to-[#9a5b13]',
    leftAccentTextClass: 'text-amber-200',
    leftGlowTopClass: 'bg-amber-300/20',
    leftGlowBottomClass: 'bg-blue-950/60',
    headerTickerTextClass: 'text-amber-900 dark:text-amber-300',
    headerDividerClass: 'bg-amber-300/80 dark:bg-amber-700/50',
    cardShadowClass:
      'shadow-[0_32px_64px_-16px_rgba(15,23,42,0.28),0_14px_28px_-10px_rgba(180,83,9,0.20),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(15,23,42,0.15)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.84),0_14px_28px_-10px_rgba(217,119,6,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
  MILITARY_DAY: {
    key: 'MILITARY_DAY',
    name: 'Ngày thành lập QĐND Việt Nam',
    dateLabel: '22/12',
    marqueeText:
      'Chào mừng Kỷ niệm Ngày thành lập Quân đội Nhân dân Việt Nam (22/12/1944) và Ngày hội Quốc phòng toàn dân — Trung với Đảng, Hiếu với Dân — Trường Đại học Trần Đại Nghĩa',
    mainBgLight:
      'radial-gradient(ellipse 76% 56% at 15% 12%, rgba(21, 128, 61, 0.13), transparent 62%), radial-gradient(ellipse 70% 55% at 86% 86%, rgba(180, 83, 9, 0.14), transparent 60%), linear-gradient(135deg, #f0fdf4 0%, #fefce8 52%, #e2e8f0 100%)',
    mainBgDark:
      'radial-gradient(ellipse 76% 56% at 16% 15%, rgba(21, 128, 61, 0.24), transparent 62%), radial-gradient(ellipse 66% 52% at 85% 85%, rgba(180, 83, 9, 0.17), transparent 60%)',
    leftPanelGradientClass: 'from-[#0d2e1f] via-[#14532d] to-[#166534]',
    leftAccentTextClass: 'text-amber-200',
    leftGlowTopClass: 'bg-amber-300/18',
    leftGlowBottomClass: 'bg-emerald-950/65',
    headerTickerTextClass: 'text-emerald-900 dark:text-emerald-300',
    headerDividerClass: 'bg-emerald-300/80 dark:bg-emerald-800/60',
    cardShadowClass:
      'shadow-[0_32px_64px_-16px_rgba(20,83,45,0.26),0_14px_28px_-10px_rgba(180,83,9,0.18),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(20,83,45,0.16)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85),0_14px_28px_-10px_rgba(21,128,61,0.26),inset_0_1px_0_rgba(255,255,255,0.08)]',
  },
};

export function detectHolidayKeyForDate(date: Date = new Date()): ResolvedHolidayKey {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 03/02: Thành lập Đảng CSVN (01/02 - 05/02)
  if (month === 2 && day >= 1 && day <= 5) return 'FOUNDING_PARTY';
  // Tết Nguyên Đán & Mừng Xuân (01/01 - 15/02)
  if (month === 1 || (month === 2 && day <= 15)) return 'TET';
  // 08/03: Quốc tế Phụ nữ (06/03 - 09/03)
  if (month === 3 && day >= 6 && day <= 9) return 'WOMEN_DAY';
  // 30/04 - 01/05: Giải phóng miền Nam & Quốc tế Lao động (25/04 - 03/05)
  if ((month === 4 && day >= 25) || (month === 5 && day <= 3)) return 'LIBERATION_LABOR';
  // 02/09: Quốc khánh (28/08 - 04/09)
  if ((month === 8 && day >= 28) || (month === 9 && day <= 4)) return 'NATIONAL_DAY';
  // 20/10: Phụ nữ Việt Nam (18/10 - 21/10)
  if (month === 10 && day >= 18 && day <= 21) return 'VIETNAMESE_WOMEN';
  // 20/11: Ngày Nhà giáo Việt Nam (15/11 - 25/11)
  if (month === 11 && day >= 15 && day <= 25) return 'TEACHERS_DAY';
  // 22/12: Ngày thành lập QĐND Việt Nam (15/12 - 25/12)
  if (month === 12 && day >= 15 && day <= 25) return 'MILITARY_DAY';

  return 'DEFAULT';
}

export function resolveHolidayTheme(
  mode?: string,
  customBannerText?: string,
  date: Date = new Date()
): HolidayThemeConfig {
  let resolvedKey: ResolvedHolidayKey;
  if (!mode || mode === 'AUTO') {
    resolvedKey = detectHolidayKeyForDate(date);
  } else if (mode in HOLIDAY_THEMES) {
    resolvedKey = mode as ResolvedHolidayKey;
  } else {
    resolvedKey = detectHolidayKeyForDate(date);
  }

  const base = HOLIDAY_THEMES[resolvedKey];
  const trimmedBanner = typeof customBannerText === 'string' ? customBannerText.trim() : '';

  if (trimmedBanner) {
    return {
      ...base,
      marqueeText: trimmedBanner,
    };
  }

  return base;
}
