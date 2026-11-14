import React, { useState, useEffect, useMemo, useId } from 'react';
import {
  ThoiKhoaBieu,
  SinhVien,
  UserRole,
  HocKy,
  NamHoc,
  DiemDanh,
  ThongBaoKiemTra,
  MonHoc,
  NghiLe,
} from '../../types';
import { ScheduleFileUploadModal } from './ScheduleFileUploadModal';
import { ScheduleEditModal } from './ScheduleEditModal';
import { AttendanceModal } from './AttendanceModal';
import { ExamNoticeModal } from './ExamNoticeModal';
import { HolidayModal } from './HolidayModal';
import { SemesterAcademicYearModule } from './SemesterAcademicYearModule';
import { apiService } from '../../services/apiService';
import { isSubjectMatchingClass } from '../../utils/subjectHelper';
import {
  Calendar,
  MapPin,
  User,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
  Upload,
  Download,
  Edit3,
  CalendarDays,
  Sun,
  Moon,
  UserCheck,
  BellRing,
  ShieldAlert,
  RotateCw,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ErrorState,
  FilteredEmptyState,
  LoadingState,
  MetricStrip,
  PageHeader,
  StatusBadge,
} from '../common';

interface ScheduleModuleProps {
  schedule: ThoiKhoaBieu[];
  students: SinhVien[];
  subjects?: MonHoc[];
  activeSemester: string;
  userRole?: UserRole;
  userPermissions?: {
    canManageUsers?: boolean;
    canManageStudents?: boolean;
    canEditGrades?: boolean;
    canImportExcel?: boolean;
    canEvaluateTraining?: boolean;
    canApproveRetakes?: boolean;
    canManageSchedule?: boolean;
  };
  currentStudentCode?: string;
  currentUserFullName?: string;
  onAddSchedule?: (data: Record<string, any>) => void;
  onUpdateSchedule?: (id: string, updated: Partial<ThoiKhoaBieu>) => void;
  onImportSchedule?: (data: any[]) => Promise<void> | void;
  onDeleteSchedule?: (id: string, maMH?: string) => void;
  onDeleteScheduleByYear?: (namHoc: string, hocKy?: string, lop?: string) => Promise<void> | void;
  isLoading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
}

export const getMondayOfDate = (d: Date): Date => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const formatDateToISO = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSemesterDefaultStartDate = (semester: string, academicYear: string): Date => {
  const yearMatch = academicYear ? academicYear.match(/(\d{4})/) : null;
  const baseYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  let targetDate: Date;
  if (semester === 'HK2') {
    targetDate = new Date(baseYear + 1, 0, 12);
  } else if (semester === 'HK3' || semester === 'Học kỳ Hè') {
    targetDate = new Date(baseYear + 1, 5, 1);
  } else {
    targetDate = new Date(baseYear, 8, 8);
  }

  return getMondayOfDate(targetDate);
};

export const ScheduleModule: React.FC<ScheduleModuleProps> = ({
  schedule,
  students,
  subjects = [],
  activeSemester,
  userRole = 'STUDENT',
  userPermissions,
  currentStudentCode,
  currentUserFullName,
  onAddSchedule,
  onUpdateSchedule,
  onImportSchedule,
  onDeleteSchedule,
  onDeleteScheduleByYear,
  isLoading = false,
  loadError = null,
  onRetryLoad,
}) => {
  const addModalTitleId = useId();
  const importModalTitleId = useId();
  const deleteModalTitleId = useId();

  const isAdmin = userRole === 'ADMIN';
  const isAdminOrLecturer =
    userRole === 'ADMIN' ||
    userRole === 'LECTURER' ||
    Boolean(userPermissions?.canManageSchedule);

  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    students.forEach((s) => {
      if (s.lop) classSet.add(s.lop);
    });
    if (userRole !== 'STUDENT') {
      schedule.forEach((s) => {
        if (s.lop) classSet.add(s.lop);
      });
    }
    return Array.from(classSet).sort();
  }, [students, schedule, userRole]);

  const [semesters, setSemesters] = useState<HocKy[]>([]);
  const [academicYears, setAcademicYears] = useState<NamHoc[]>([]);
  const [activeScheduleTab, setActiveScheduleTab] = useState<
    'WEEKLY_SCHEDULE' | 'SEMESTERS_ACADEMIC_YEARS'
  >('WEEKLY_SCHEDULE');
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ThoiKhoaBieu | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);

  const showModuleToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadSemestersAndYears = async () => {
    try {
      const [semRes, yearRes] = await Promise.all([
        apiService.getSemesters(),
        apiService.getAcademicYears(),
      ]);
      if (semRes.success) setSemesters(semRes.data);
      if (yearRes.success) setAcademicYears(yearRes.data);
    } catch {
      // ignore non-fatal metadata failure
    }
  };

  useEffect(() => {
    loadSemestersAndYears();
  }, []);

  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStudentMaSV, setSelectedStudentMaSV] = useState<string>(
    currentStudentCode || ''
  );
  const [filterSemester, setFilterSemester] = useState<string>(activeSemester || 'ALL');
  const [filterNamHoc, setFilterNamHoc] = useState<string>('ALL');

  const normalizeNamHocStr = (val: string) => {
    if (!val) return '';
    return val
      .replace(/^Năm\s*học\s*/i, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*/g, '-')
      .trim();
  };

  const [customNamHocList, setCustomNamHocList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('custom_nam_hoc_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed
            .map((item: string) =>
              item
                ? item
                    .replace(/^Năm\s*học\s*/i, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s*-\s*/g, '-')
                    .trim()
                : ''
            )
            .filter(Boolean);
          if (cleaned.length > 0) return Array.from(new Set(cleaned));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const updateCustomNamHocList = (newList: string[]) => {
    const cleaned = Array.from(new Set(newList.map(normalizeNamHocStr).filter(Boolean)));
    setCustomNamHocList(cleaned);
    try {
      localStorage.setItem('custom_nam_hoc_list', JSON.stringify(cleaned));
    } catch {
      // ignore
    }
  };

  const availableNamHocOptions = useMemo(() => {
    const yearsMap = new Map<string, string>();
    const addYear = (raw: string) => {
      const norm = normalizeNamHocStr(raw);
      if (norm && !yearsMap.has(norm)) {
        yearsMap.set(norm, norm);
      }
    };
    academicYears.forEach((a) => {
      if (a.tenNamHoc) addYear(a.tenNamHoc);
    });
    customNamHocList.forEach((y) => addYear(y));
    schedule.forEach((s) => {
      if (s.namHoc) addYear(s.namHoc);
    });
    subjects.forEach((sub) => {
      if (sub.namHoc) addYear(sub.namHoc);
    });
    return Array.from(yearsMap.values()).sort().reverse();
  }, [academicYears, customNamHocList, schedule, subjects]);

  const availableSemesterOptions = useMemo(() => {
    const semMap = new Map<string, string>();
    semesters.forEach((s) => {
      if (s.tenHocKy) {
        const id = s.hocKyID || s.tenHocKy;
        semMap.set(id, s.tenHocKy);
      }
    });
    schedule.forEach((s) => {
      if (s.hocKy && !semMap.has(s.hocKy)) {
        const name =
          s.hocKy === 'HK1'
            ? 'Học kỳ 1'
            : s.hocKy === 'HK2'
            ? 'Học kỳ 2'
            : s.hocKy === 'HK3'
            ? 'Học kỳ Hè'
            : s.hocKy;
        semMap.set(s.hocKy, name);
      }
    });
    subjects.forEach((sub) => {
      if (sub.hocKy && !semMap.has(sub.hocKy)) {
        const name =
          sub.hocKy === 'HK1'
            ? 'Học kỳ 1'
            : sub.hocKy === 'HK2'
            ? 'Học kỳ 2'
            : sub.hocKy === 'HK3'
            ? 'Học kỳ Hè'
            : sub.hocKy;
        semMap.set(sub.hocKy, name);
      }
    });
    return Array.from(semMap.entries()).map(([id, name]) => ({ id, name }));
  }, [semesters, schedule, subjects]);

  useEffect(() => {
    if (filterSemester !== 'ALL' && availableSemesterOptions.length > 0) {
      const exists = availableSemesterOptions.some(
        (s) => s.id.toUpperCase() === filterSemester.toUpperCase()
      );
      if (!exists) setFilterSemester('ALL');
    }
  }, [availableSemesterOptions, filterSemester]);

  const [isDeleteScheduleModalOpen, setIsDeleteScheduleModalOpen] = useState(false);
  const [deleteTargetNamHoc, setDeleteTargetNamHoc] = useState<string>('ALL');
  const [deleteTargetHocKy, setDeleteTargetHocKy] = useState<string>('ALL');
  const [deleteTargetLop, setDeleteTargetLop] = useState<string>('ALL');
  const [isDeletingSchedule, setIsDeletingSchedule] = useState<boolean>(false);

  const handleOpenDeleteScheduleModal = () => {
    setDeleteTargetNamHoc(
      filterNamHoc !== 'ALL' ? filterNamHoc : availableNamHocOptions[0] || 'ALL'
    );
    setDeleteTargetHocKy(filterSemester);
    setDeleteTargetLop(selectedClass);
    setIsDeleteScheduleModalOpen(true);
  };

  const matchingDeleteItems = useMemo(() => {
    const targetNormYear = normalizeNamHocStr(deleteTargetNamHoc);
    return schedule.filter((item) => {
      if (deleteTargetNamHoc && deleteTargetNamHoc !== 'ALL') {
        const itemNormYear = normalizeNamHocStr(item.namHoc || '');
        if (
          itemNormYear !== targetNormYear &&
          !(item.namHoc && item.namHoc.includes(targetNormYear))
        ) {
          return false;
        }
      }
      if (deleteTargetHocKy && deleteTargetHocKy !== 'ALL') {
        const itemHK = (item.hocKy || '').trim().toUpperCase();
        const targetHK = deleteTargetHocKy.trim().toUpperCase();
        if (itemHK !== targetHK && !itemHK.includes(targetHK)) {
          return false;
        }
      }
      if (deleteTargetLop && deleteTargetLop !== 'ALL') {
        const itemLop = (item.lop || '').trim().toLowerCase();
        const targetLop = deleteTargetLop.trim().toLowerCase();
        if (itemLop !== targetLop) {
          return false;
        }
      }
      return true;
    });
  }, [schedule, deleteTargetNamHoc, deleteTargetHocKy, deleteTargetLop]);

  const handleRequestDeleteSchedule = () => {
    if (matchingDeleteItems.length === 0) {
      showModuleToast('Không tìm thấy môn học khớp với bộ lọc.');
      return;
    }
    const yearLabel =
      deleteTargetNamHoc === 'ALL' ? 'tất cả năm học' : `năm học ${deleteTargetNamHoc}`;
    const hkLabel = deleteTargetHocKy === 'ALL' ? 'tất cả học kỳ' : deleteTargetHocKy;
    const lopLabel = deleteTargetLop === 'ALL' ? 'tất cả các lớp' : `lớp ${deleteTargetLop}`;

    setConfirmState({
      title: 'Xác nhận xóa thời khóa biểu',
      message: `Xóa ${matchingDeleteItems.length} môn học thuộc ${yearLabel}, ${hkLabel}, ${lopLabel}? Thao tác này không thể khôi phục.`,
      confirmLabel: `Xóa ${matchingDeleteItems.length} môn`,
      onConfirm: async () => {
        setIsDeletingSchedule(true);
        try {
          const res = await apiService.deleteScheduleByYear(
            deleteTargetNamHoc,
            deleteTargetHocKy,
            deleteTargetLop
          );
          if (onDeleteScheduleByYear) {
            await onDeleteScheduleByYear(deleteTargetNamHoc, deleteTargetHocKy, deleteTargetLop);
          } else if (onImportSchedule) {
            await onImportSchedule([]);
          }
          showModuleToast(res.message || `Đã xóa ${matchingDeleteItems.length} môn thời khóa biểu.`);
          setIsDeleteScheduleModalOpen(false);
        } catch {
          showModuleToast('Không thể xóa thời khóa biểu.');
        } finally {
          setIsDeletingSchedule(false);
        }
      },
    });
  };

  const [customWeekStartDates, setCustomWeekStartDates] = useState<Record<number, string>>({});
  const [customDayDateTexts, setCustomDayDateTexts] = useState<Record<string, string>>({});

  const [flagOverrides, setFlagOverrides] = useState<Record<string, 'TIEU_DOAN' | 'NHA_TRUONG'>>(
    () => {
      try {
        const saved = localStorage.getItem('flag_ceremony_overrides');
        if (!saved) return {};
        const parsed = JSON.parse(saved);
        const res: Record<string, 'TIEU_DOAN' | 'NHA_TRUONG'> = {};
        Object.keys(parsed).forEach((k) => {
          const val = typeof parsed[k] === 'string' ? parsed[k] : parsed[k]?.type;
          if (val === 'TIEU_DOAN' || val === 'NHA_TRUONG') {
            res[k] = val;
          }
        });
        return res;
      } catch {
        return {};
      }
    }
  );

  const [hiddenFlagKeys, setHiddenFlagKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hidden_flag_ceremonies');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleHideFlagCeremony = (flagKey: string) => {
    setHiddenFlagKeys((prev) => {
      const next = [...new Set([...prev, flagKey])];
      try {
        localStorage.setItem('hidden_flag_ceremonies', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    showModuleToast('Đã ẩn tiết Chào cờ khỏi thời khóa biểu.');
  };

  const getWeekStartDate = (weekNum: number): Date => {
    const w = weekNum === 0 ? 1 : weekNum;
    if (customWeekStartDates[w]) {
      const parts = customWeekStartDates[w].split('-');
      if (parts.length === 3) {
        return getMondayOfDate(
          new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        );
      }
    }
    const week1Start = customWeekStartDates[1]
      ? getMondayOfDate(new Date(customWeekStartDates[1]))
      : getSemesterDefaultStartDate(
          filterSemester === 'ALL' ? availableSemesterOptions[0]?.id || 'HK1' : filterSemester,
          filterNamHoc === 'ALL' ? availableNamHocOptions[0] || '' : filterNamHoc
        );
    const d = new Date(week1Start);
    d.setDate(week1Start.getDate() + (w - 1) * 7);
    return getMondayOfDate(d);
  };

  const getWeekRangeStr = (weekNum: number) => {
    const activeW = weekNum === 0 ? 1 : weekNum;
    const startDate = getWeekStartDate(activeW);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const formatShort = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    };
    const formatFull = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${d.getFullYear()}`;
    };
    return {
      startShort: formatShort(startDate),
      endShort: formatShort(endDate),
      startFull: formatFull(startDate),
      endFull: formatFull(endDate),
      startDate,
      endDate,
    };
  };

  const getDayDateStr = (weekNum: number, dayKey: number) => {
    const activeW = weekNum === 0 ? 1 : weekNum;
    const key = `${activeW}-${dayKey}`;
    if (customDayDateTexts[key]) {
      return customDayDateTexts[key];
    }
    const startDate = getWeekStartDate(activeW);
    const offset = dayKey - 2;
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + offset);
    const day = String(dayDate.getDate()).padStart(2, '0');
    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const isFirstMondayOfMonth = (date: Date): boolean => date.getDate() <= 7;

  const getFlagCeremonyInfo = (weekNum: number) => {
    const activeW = weekNum > 0 ? weekNum : 1;
    const monDate = getWeekStartDate(activeW);
    const isFirstMon = isFirstMondayOfMonth(monDate);
    const defaultType: 'TIEU_DOAN' | 'NHA_TRUONG' = isFirstMon ? 'NHA_TRUONG' : 'TIEU_DOAN';

    const flagKey =
      weekNum > 0 ? `flag_w${weekNum}_${filterSemester}_${filterNamHoc}` : 'flag_all';
    const legacyKey = `flag_w${activeW}`;

    const override = flagOverrides[flagKey] || flagOverrides[legacyKey];
    const actualType: 'TIEU_DOAN' | 'NHA_TRUONG' = override || defaultType;

    const isFlagHidden =
      hiddenFlagKeys.includes(flagKey) ||
      hiddenFlagKeys.includes(legacyKey) ||
      hiddenFlagKeys.includes('flag_all');

    const isSchool = actualType === 'NHA_TRUONG';
    const flagSpan = isSchool ? 2 : 1;
    const flagTitle = isSchool ? 'CHÀO CỜ NHÀ TRƯỜNG' : 'CHÀO CỜ TIỂU ĐOÀN';

    return {
      activeW,
      monDate,
      isFirstMon,
      defaultType,
      actualType,
      isFlagHidden,
      isSchool,
      flagSpan,
      flagTitle,
      flagKey,
    };
  };

  const handleToggleFlagType = (weekNum: number) => {
    const info = getFlagCeremonyInfo(weekNum);
    const targetType: 'TIEU_DOAN' | 'NHA_TRUONG' =
      info.actualType === 'NHA_TRUONG' ? 'TIEU_DOAN' : 'NHA_TRUONG';

    setHiddenFlagKeys((prev) =>
      prev.filter((k) => k !== info.flagKey && k !== `flag_w${info.activeW}` && k !== 'flag_all')
    );

    setFlagOverrides((prev) => {
      const next = {
        ...prev,
        [info.flagKey]: targetType,
        [`flag_w${info.activeW}`]: targetType,
      };
      try {
        localStorage.setItem('flag_ceremony_overrides', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    const label =
      targetType === 'NHA_TRUONG' ? 'Chào cờ Nhà trường (2 tiết)' : 'Chào cờ Tiểu đoàn (1 tiết)';
    showModuleToast(`Tuần ${info.activeW}: ${label}`);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [isManualNamHoc, setIsManualNamHoc] = useState(false);
  const [manualNamHocInput, setManualNamHocInput] = useState('');
  const [weekSelectionMode, setWeekSelectionMode] = useState<'range' | 'custom_list'>('range');
  const [selectedCustomWeeks, setSelectedCustomWeeks] = useState<number[]>([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);
  const [customWeekTextInput, setCustomWeekTextInput] = useState<string>(
    '1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15'
  );
  const [customWeekMaxDisplay, setCustomWeekMaxDisplay] = useState<number>(30);
  const [formWeek1StartDate, setFormWeek1StartDate] = useState<string>(() =>
    formatDateToISO(getSemesterDefaultStartDate('HK1', ''))
  );
  const [formManualDayOverrides, setFormManualDayOverrides] = useState<Record<number, string>>({});

  const [form, setForm] = useState({
    lop: '',
    applyToClass: true,
    maSV: '',
    hocKy: '',
    namHoc: '',
    tuanTu: 1,
    tuanDen: 15,
    maMH: '',
    tenMH: '',
    soTinChi: 3,
    giangVien: '',
    phongHoc: '',
    thu: 2,
    tietBatDau: 1,
    soTiet: 3,
    coSo: '',
  });

  const [showAllSubjectsInForm, setShowAllSubjectsInForm] = useState(false);
  const filteredFormSubjects = useMemo(() => {
    if (showAllSubjectsInForm) return subjects;
    return subjects.filter((s) => isSubjectMatchingClass(s, form.lop));
  }, [subjects, form.lop, showAllSubjectsInForm]);

  useEffect(() => {
    if (formWeek1StartDate && (!isModalOpen || form.tuanTu === 1)) {
      const parts = formWeek1StartDate.split('-');
      if (parts.length === 3) {
        const base = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const newOverrides: Record<number, string> = {};
        for (let d = 2; d <= 7; d++) {
          const offset = d - 2;
          const dt = new Date(base);
          dt.setDate(base.getDate() + offset);
          const dayStr = String(dt.getDate()).padStart(2, '0');
          const monthStr = String(dt.getMonth() + 1).padStart(2, '0');
          newOverrides[d] = `${dayStr}/${monthStr}`;
        }
        setFormManualDayOverrides(newOverrides);
      }
    }
  }, [formWeek1StartDate, isModalOpen, form.tuanTu]);

  useEffect(() => {
    if (isModalOpen && form.tuanTu > 0) {
      const startDate = getWeekStartDate(form.tuanTu);
      const newOverrides: Record<number, string> = {};
      for (let d = 2; d <= 7; d++) {
        const offset = d - 2;
        const dt = new Date(startDate);
        dt.setDate(startDate.getDate() + offset);
        const dayStr = String(dt.getDate()).padStart(2, '0');
        const monthStr = String(dt.getMonth() + 1).padStart(2, '0');
        newOverrides[d] = `${dayStr}/${monthStr}`;
      }
      setFormManualDayOverrides(newOverrides);
    }
  }, [form.tuanTu, isModalOpen, customWeekStartDates]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importedDataPreview, setImportedDataPreview] = useState<any[]>([]);
  const [importDefaultLop, setImportDefaultLop] = useState<string>('');
  const [importDefaultHocKy, setImportDefaultHocKy] = useState<string>('');
  const [importDefaultNamHoc, setImportDefaultNamHoc] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (confirmState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) setIsModalOpen(false);
        if (isImportModalOpen) setIsImportModalOpen(false);
        if (isDeleteScheduleModalOpen) setIsDeleteScheduleModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isImportModalOpen, isDeleteScheduleModalOpen, confirmState]);

  const [attendanceList, setAttendanceList] = useState<DiemDanh[]>([]);
  const [examNotices, setExamNotices] = useState<ThongBaoKiemTra[]>([]);
  const [holidays, setHolidays] = useState<NghiLe[]>([]);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState<boolean>(false);
  const [editingHolidayItem, setEditingHolidayItem] = useState<NghiLe | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);
  const [isExamNoticeModalOpen, setIsExamNoticeModalOpen] = useState<boolean>(false);
  const [noticeDefaultMaMH, setNoticeDefaultMaMH] = useState<string>('');
  const [noticeContext, setNoticeContext] = useState<{
    maMH: string;
    ngay: string;
    thu: number;
  } | null>(null);
  const [attendanceContext, setAttendanceContext] = useState<{
    maMH: string;
    tenMH: string;
    lop?: string;
    ngay: string;
    soTiet: number;
    soTinChi: number;
  } | null>(null);

  const loadAttendanceAndNotices = async () => {
    try {
      const [attRes, noticeRes, holidayRes] = await Promise.all([
        apiService.getAttendance(),
        apiService.getExamNotices(),
        apiService.getHolidays(),
      ]);
      if (attRes.success && attRes.data) setAttendanceList(attRes.data);
      if (noticeRes.success && noticeRes.data) setExamNotices(noticeRes.data);
      if (holidayRes.success && holidayRes.data) setHolidays(holidayRes.data);
    } catch {
      // ignore non-fatal
    }
  };

  const loadHolidays = async () => {
    try {
      const res = await apiService.getHolidays();
      if (res.success && res.data) setHolidays(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAttendanceAndNotices();
  }, []);

  const handleSaveAttendance = async (record: Partial<DiemDanh>) => {
    const res = await apiService.saveAttendance(record);
    if (res.success) {
      await loadAttendanceAndNotices();
    } else {
      setActionError(res.message || 'Lưu điểm danh thất bại.');
    }
  };

  const openAttendanceForSchedule = (course: ThoiKhoaBieu, dayKey: number) => {
    const lesson =
      course.lichHoc?.find((item) => Number(item.thu) === dayKey) || course.lichHoc?.[0];
    setAttendanceContext({
      maMH: course.maMH,
      tenMH: course.tenMH,
      lop: course.lop || (selectedClass !== 'ALL' ? selectedClass : undefined),
      ngay: getDayDateStr(selectedWeek, dayKey),
      soTiet: lesson?.soTiet || course.soTinChi * 15 || 1,
      soTinChi: course.soTinChi || 1,
    });
    setIsAttendanceModalOpen(true);
  };

  const getScheduleDateISO = (weekNum: number, dayKey: number) => {
    const startDate = getWeekStartDate(weekNum || 1);
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + (dayKey - 2));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
  };

  const getHolidayForDay = (weekNum: number, dayKey: number) => {
    if (!holidays || holidays.length === 0) return null;
    const dayIso = getScheduleDateISO(weekNum, dayKey);
    return (
      holidays.find((h) => {
        if (h.lop && h.lop !== 'ALL' && selectedClass !== 'ALL' && h.lop !== selectedClass) {
          return false;
        }
        if (h.hocKy && h.hocKy !== 'ALL' && filterSemester !== 'ALL' && h.hocKy !== filterSemester) {
          return false;
        }
        if (h.namHoc && h.namHoc !== 'ALL' && filterNamHoc !== 'ALL' && h.namHoc !== filterNamHoc) {
          return false;
        }
        if (h.tuNgay && h.denNgay) {
          return dayIso >= h.tuNgay && dayIso <= h.denNgay;
        }
        return false;
      }) || null
    );
  };

  const openExamNoticeForSchedule = (course: ThoiKhoaBieu, dayKey: number) => {
    setNoticeDefaultMaMH(course.maMH);
    setNoticeContext({
      maMH: course.maMH,
      ngay: getScheduleDateISO(selectedWeek, dayKey),
      thu: dayKey,
    });
    setIsExamNoticeModalOpen(true);
  };

  const handleDeleteAttendance = async (id: string) => {
    const res = await apiService.deleteAttendance(id);
    if (res.success) {
      await loadAttendanceAndNotices();
    } else {
      setActionError(res.message || 'Xóa lượt điểm danh thất bại.');
    }
  };

  const handleSaveExamNotice = async (notice: Partial<ThongBaoKiemTra>) => {
    const res = await apiService.saveExamNotice(notice);
    if (res.success) {
      await loadAttendanceAndNotices();
    } else {
      setActionError(res.message || 'Đăng thông báo kiểm tra thất bại.');
    }
  };

  const handleDeleteExamNotice = async (id: string) => {
    const res = await apiService.deleteExamNotice(id);
    if (res.success) {
      await loadAttendanceAndNotices();
    } else {
      setActionError(res.message || 'Xóa thông báo kiểm tra thất bại.');
    }
  };

  useEffect(() => {
    if (userRole === 'STUDENT' && currentStudentCode) {
      setSelectedStudentMaSV(currentStudentCode);
    }
  }, [userRole, currentStudentCode]);

  const currentStudentObj = useMemo(() => {
    if (userRole === 'STUDENT') {
      if (!currentStudentCode) return undefined;
      return students.find((s) => s.maSV.toLowerCase() === currentStudentCode.toLowerCase());
    }
    if (!selectedStudentMaSV || selectedStudentMaSV === 'ALL') return undefined;
    return students.find((s) => s.maSV.toLowerCase() === selectedStudentMaSV.toLowerCase());
  }, [students, userRole, currentStudentCode, selectedStudentMaSV]);

  const filteredSchedule = useMemo(() => {
    const rawFiltered = schedule.filter((item) => {
      if (filterSemester !== 'ALL' && item.hocKy) {
        const itemHK = item.hocKy.trim().toUpperCase();
        const selHK = filterSemester.trim().toUpperCase();
        if (itemHK !== selHK && !itemHK.includes(selHK)) {
          return false;
        }
      }
      if (filterNamHoc !== 'ALL' && item.namHoc) {
        const itemNH = normalizeNamHocStr(item.namHoc).toLowerCase();
        const selNH = normalizeNamHocStr(filterNamHoc).toLowerCase();
        if (itemNH !== selNH && !itemNH.includes(selNH)) {
          return false;
        }
      }
      if (userRole === 'STUDENT') {
        if (currentStudentCode) {
          const studentMa = currentStudentCode.trim().toLowerCase();
          const studentLop = currentStudentObj?.lop?.trim().toLowerCase();
          const isTargetStudent = Boolean(
            item.maSV && item.maSV.trim().toLowerCase() === studentMa
          );
          const isTargetClass = Boolean(
            !item.lop ||
              item.lop.toUpperCase() === 'ALL' ||
              (studentLop && item.lop.trim().toLowerCase() === studentLop)
          );
          if (!isTargetStudent && !isTargetClass) {
            return false;
          }
        }
      } else {
        if (selectedClass !== 'ALL') {
          const selClass = selectedClass.trim().toLowerCase();
          const itemLop = item.lop?.trim().toLowerCase();
          const itemMaSV = item.maSV?.trim().toLowerCase();
          const selStudent = selectedStudentMaSV?.trim().toLowerCase();
          if (itemLop !== selClass && itemMaSV !== selStudent) {
            return false;
          }
        } else if (selectedStudentMaSV && selectedStudentMaSV !== 'ALL') {
          if (item.maSV?.trim().toLowerCase() !== selectedStudentMaSV.trim().toLowerCase()) {
            return false;
          }
        }
      }
      if (selectedWeek !== 0) {
        const startW = item.tuanTu || 1;
        const endW = item.tuanDen || 15;
        if (item.danhSachTuan && item.danhSachTuan.length > 0) {
          if (!item.danhSachTuan.includes(selectedWeek)) return false;
        } else if (selectedWeek < startW || selectedWeek > endW) {
          return false;
        }
      }
      return true;
    });

    const seenKeys = new Set<string>();
    const result: typeof rawFiltered = [];
    for (const item of rawFiltered) {
      const dayVal = item.thu || item.lichHoc?.[0]?.thu || 2;
      const tietVal = item.tietBatDau || item.lichHoc?.[0]?.tietBatDau || 1;
      const key = `${(item.maMH || '').trim().toLowerCase()}_${(item.tenMH || '')
        .trim()
        .toLowerCase()}_${(item.lop || '').trim().toLowerCase()}_${(
        item.phongHoc ||
        item.lichHoc?.[0]?.phong ||
        ''
      )
        .trim()
        .toLowerCase()}_${dayVal}_${tietVal}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(item);
      }
    }
    return result;
  }, [
    schedule,
    filterSemester,
    filterNamHoc,
    userRole,
    currentStudentCode,
    selectedClass,
    selectedStudentMaSV,
    selectedWeek,
    currentStudentObj,
  ]);

  const studentAbsenceWarnings = useMemo(() => {
    if (userRole !== 'STUDENT' || !currentStudentCode) return [];
    const svCode = currentStudentCode.toLowerCase();
    const svAtt = attendanceList.filter((a) => a.maSV.toLowerCase() === svCode);
    const mapMH = new Map<string, { maMH: string; tenMH: string; totalMissed: number }>();
    svAtt.forEach((a) => {
      const existing = mapMH.get(a.maMH) || {
        maMH: a.maMH,
        tenMH: a.tenMH || a.maMH,
        totalMissed: 0,
      };
      existing.totalMissed += a.soTietNghi || 0;
      mapMH.set(a.maMH, existing);
    });
    const warnings: {
      maMH: string;
      tenMH: string;
      totalMissed: number;
      totalPeriods: number;
      credits: number;
      percentage: number;
      isDanger: boolean;
    }[] = [];
    mapMH.forEach((item, maMH) => {
      const schItem = schedule.find((s) => s.maMH === maMH);
      const credits = schItem?.soTinChi || 3;
      const totalPeriods = credits * 15;
      const percentage = (item.totalMissed / totalPeriods) * 100;
      if (percentage >= 15) {
        warnings.push({
          maMH: item.maMH,
          tenMH: item.tenMH,
          totalMissed: item.totalMissed,
          totalPeriods,
          credits,
          percentage,
          isDanger: percentage >= 20,
        });
      }
    });
    return warnings;
  }, [userRole, currentStudentCode, attendanceList, schedule]);

  const daysOfWeek = [
    { key: 2, label: 'Thứ 2' },
    { key: 3, label: 'Thứ 3' },
    { key: 4, label: 'Thứ 4' },
    { key: 5, label: 'Thứ 5' },
    { key: 6, label: 'Thứ 6' },
    { key: 7, label: 'Thứ 7' },
  ];

  const getPeriodTimeStr = (pNum: number) => {
    switch (pNum) {
      case 1:
        return '07:00 - 07:45';
      case 2:
        return '07:50 - 08:35';
      case 3:
        return '08:35 - 09:20';
      case 4:
        return '09:30 - 10:15';
      case 5:
        return '10:15 - 11:00';
      case 6:
        return '11:00 - 11:45';
      case 7:
        return '13:30 - 14:15';
      case 8:
        return '14:20 - 15:05';
      case 9:
        return '15:15 - 16:00';
      case 10:
        return '16:05 - 16:50';
      default:
        return '13:30 - 16:00';
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddSchedule) return;
    setAddFormError(null);

    let finalNamHoc = form.namHoc;
    if (isManualNamHoc) {
      if (!manualNamHocInput.trim()) {
        setAddFormError('Vui lòng nhập tên năm học.');
        return;
      }
      finalNamHoc = normalizeNamHocStr(manualNamHocInput.trim());
      updateCustomNamHocList([...customNamHocList, finalNamHoc]);
    }
    let finalWeekList: number[] = [];
    if (weekSelectionMode === 'custom_list') {
      finalWeekList = [...selectedCustomWeeks].sort((a, b) => a - b);
    } else {
      const startW = Number(form.tuanTu);
      const endW = Number(form.tuanDen);
      for (let w = Math.min(startW, endW); w <= Math.max(startW, endW); w++) {
        finalWeekList.push(w);
      }
    }
    if (formWeek1StartDate) {
      setCustomWeekStartDates((prev) => ({ ...prev, 1: formWeek1StartDate }));
    }
    const updatedCustomDays = { ...customDayDateTexts };
    Object.entries(formManualDayOverrides).forEach(([dKey, val]) => {
      updatedCustomDays[`1-${dKey}`] = val;
    });
    setCustomDayDateTexts(updatedCustomDays);

    const payload = {
      lop: form.lop,
      applyToClass: form.applyToClass,
      maSV: form.maSV,
      hocKy: form.hocKy,
      namHoc: finalNamHoc,
      tuanTu: finalWeekList[0] || 1,
      tuanDen: finalWeekList[finalWeekList.length - 1] || 15,
      danhSachTuan: finalWeekList,
      maMH: form.maMH,
      tenMH: form.tenMH,
      soTinChi: Number(form.soTinChi),
      giangVien: form.giangVien,
      phongHoc: form.phongHoc,
      lichHoc: [
        {
          thu: Number(form.thu),
          tietBatDau: Number(form.tietBatDau),
          soTiet: Number(form.soTiet),
          phong: form.phongHoc,
          coSo: form.coSo,
        },
      ],
    };
    onAddSchedule(payload);
    setIsModalOpen(false);
  };

  const handleOpenAddModal = (dayKey?: number, tietStart?: number) => {
    if (!isAdminOrLecturer) return;
    setAddFormError(null);
    const activeWeek = selectedWeek > 0 ? selectedWeek : 1;
    const targetLop =
      selectedClass !== 'ALL' ? selectedClass : availableClasses[0] || '';
    const targetStudent =
      selectedStudentMaSV && selectedStudentMaSV !== 'ALL' ? selectedStudentMaSV : '';
    const targetSemester =
      filterSemester !== 'ALL' ? filterSemester : availableSemesterOptions[0]?.id || '';
    const targetNamHoc =
      filterNamHoc !== 'ALL' ? filterNamHoc : availableNamHocOptions[0] || '';

    const startDate = getWeekStartDate(activeWeek);
    const newOverrides: Record<number, string> = {};
    for (let d = 2; d <= 7; d++) {
      const offset = d - 2;
      const dt = new Date(startDate);
      dt.setDate(startDate.getDate() + offset);
      const dayStr = String(dt.getDate()).padStart(2, '0');
      const monthStr = String(dt.getMonth() + 1).padStart(2, '0');
      newOverrides[d] = `${dayStr}/${monthStr}`;
    }
    setFormManualDayOverrides(newOverrides);
    if (selectedWeek > 0) {
      setSelectedCustomWeeks([selectedWeek]);
      setCustomWeekTextInput(String(selectedWeek));
    }
    setForm({
      lop: targetLop,
      applyToClass: true,
      maSV: targetStudent,
      hocKy: targetSemester,
      namHoc: targetNamHoc,
      tuanTu: activeWeek,
      tuanDen: selectedWeek > 0 ? selectedWeek : 15,
      maMH: '',
      tenMH: '',
      soTinChi: 3,
      giangVien: '',
      phongHoc: '',
      thu: dayKey || 2,
      tietBatDau: tietStart || 1,
      soTiet: 3,
      coSo: '',
    });
    setShowAllSubjectsInForm(false);
    setIsManualNamHoc(false);
    setManualNamHocInput('');
    setIsModalOpen(true);
  };

  const handleQuickCourseSelect = (maMH: string) => {
    if (!maMH) return;
    const foundSub = subjects.find((s) => s.maMH === maMH);
    if (foundSub) {
      setForm((prev) => ({
        ...prev,
        maMH: foundSub.maMH,
        tenMH: foundSub.tenMH,
        soTinChi: foundSub.soTinChi !== undefined ? foundSub.soTinChi : prev.soTinChi,
        hocKy: foundSub.hocKy?.trim() ? foundSub.hocKy.trim() : prev.hocKy,
        namHoc: foundSub.namHoc?.trim() ? foundSub.namHoc.trim() : prev.namHoc,
      }));
      if (foundSub.namHoc?.trim()) {
        setIsManualNamHoc(false);
      }
    }
  };

  const handleMaMHInputChange = (val: string) => {
    const foundSub = subjects.find(
      (s) => s.maMH.trim().toLowerCase() === val.trim().toLowerCase()
    );
    if (foundSub) {
      setForm((prev) => ({
        ...prev,
        maMH: val,
        tenMH: foundSub.tenMH,
        soTinChi: foundSub.soTinChi !== undefined ? foundSub.soTinChi : prev.soTinChi,
        hocKy: foundSub.hocKy?.trim() ? foundSub.hocKy.trim() : prev.hocKy,
        namHoc: foundSub.namHoc?.trim() ? foundSub.namHoc.trim() : prev.namHoc,
      }));
      if (foundSub.namHoc?.trim()) {
        setIsManualNamHoc(false);
      }
    } else {
      setForm((prev) => ({ ...prev, maMH: val }));
    }
  };

  const toggleCustomWeekSelect = (weekNum: number) => {
    setSelectedCustomWeeks((prev) => {
      const next = prev.includes(weekNum)
        ? prev.filter((w) => w !== weekNum)
        : [...prev, weekNum].sort((a, b) => a - b);
      setCustomWeekTextInput(next.join(', '));
      return next;
    });
  };

  const handleCustomWeekTextInput = (val: string) => {
    setCustomWeekTextInput(val);
    const parsed = val
      .split(/[,;\s]+/)
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
    const unique = Array.from(new Set(parsed)).sort((a, b) => a - b);
    setSelectedCustomWeeks(unique);
  };

  const handleDownloadSampleTemplate = () => {
    const templateHeaders = [
      {
        'Mã HP': '',
        'Tên môn học': '',
        'Số tín chỉ': '',
        'Lớp': '',
        'Học kỳ': '',
        'Năm học': '',
        'Thứ': '',
        'Tiết bắt đầu': '',
        'Số tiết': '',
        'Phòng học': '',
        'Giảng viên': '',
        'Tuần bắt đầu': '',
        'Tuần kết thúc': '',
        'Ngày bắt đầu (dd/mm/yyyy)': '',
        'Danh sách tuần': '',
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ThoiKhoaBieu');
    XLSX.writeFile(workbook, 'Mau_Import_ThoiKhoaBieu.xlsx');
    showModuleToast('Đã tải xuống tệp mẫu Excel (Mau_Import_ThoiKhoaBieu.xlsx).');
  };

  const parseThuVal = (val: any): number => {
    if (!val) return 2;
    if (typeof val === 'number') {
      return val >= 2 && val <= 7 ? val : 2;
    }
    const str = String(val).toLowerCase().trim();
    if (str.includes('2') || str.includes('hai')) return 2;
    if (str.includes('3') || str.includes('ba')) return 3;
    if (str.includes('4') || str.includes('tư') || str.includes('tu')) return 4;
    if (str.includes('5') || str.includes('năm') || str.includes('nam')) return 5;
    if (str.includes('6') || str.includes('sáu') || str.includes('sau')) return 6;
    if (str.includes('7') || str.includes('bảy') || str.includes('bay')) return 7;
    const num = parseInt(str.replace(/\D/g, ''), 10);
    return num >= 2 && num <= 7 ? num : 2;
  };

  const parseNumberVal = (val: any, defaultVal: number): number => {
    if (val === undefined || val === null || val === '') return defaultVal;
    const num = parseInt(String(val).replace(/\D/g, ''), 10);
    return isNaN(num) ? defaultVal : num;
  };

  const parseWeekList = (val: any, startW: number, endW: number): number[] => {
    if (val) {
      const str = String(val);
      const parts = str
        .split(/[,;\s]+/)
        .map((p) => parseInt(p.trim(), 10))
        .filter((n) => !isNaN(n));
      if (parts.length > 0) return parts;
    }
    const res: number[] = [];
    for (let w = Math.min(startW, endW); w <= Math.max(startW, endW); w++) {
      res.push(w);
    }
    return res;
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (!rawJson || rawJson.length === 0) {
          setImportError('Tệp Excel rỗng hoặc không có dữ liệu.');
          setImportedDataPreview([]);
          return;
        }
        const parsedList = rawJson
          .map((row, idx) => {
            const findVal = (keys: string[]) => {
              for (const k of Object.keys(row)) {
                const cleanK = k.toLowerCase().replace(/\s+/g, '');
                for (const targetKey of keys) {
                  const cleanTarget = targetKey.toLowerCase().replace(/\s+/g, '');
                  if (cleanK === cleanTarget || cleanK.includes(cleanTarget)) {
                    return row[k];
                  }
                }
              }
              return '';
            };
            const maMH = String(
              findVal(['Mã HP', 'MaHP', 'Mã môn', 'Mã môn học', 'maMH', 'CourseCode'])
            ).trim();
            const tenMH = String(
              findVal(['Tên môn học', 'TenMH', 'Tên môn', 'tenMH', 'CourseName'])
            ).trim();
            if (!maMH && !tenMH) return null;

            const soTinChi = parseNumberVal(
              findVal(['Số tín chỉ', 'SoTinChi', 'Số TC', 'soTC', 'Credits']),
              0
            );
            const lop = String(
              findVal(['Lớp', 'Lop', 'Lớp học', 'Class']) || importDefaultLop
            ).trim();
            const hocKy = String(
              findVal(['Học kỳ', 'HocKy', 'HK', 'Semester']) || importDefaultHocKy
            ).trim();
            const namHoc = String(
              findVal(['Năm học', 'NamHoc', 'AcademicYear']) || importDefaultNamHoc
            ).trim();
            const thu = parseThuVal(findVal(['Thứ', 'Thu', 'DayOfWeek', 'Day']));
            const tietBatDau = parseNumberVal(
              findVal(['Tiết bắt đầu', 'TietBatDau', 'Tiết BD', 'StartPeriod']),
              1
            );
            const soTiet = parseNumberVal(findVal(['Số tiết', 'SoTiet', 'Periods']), 3);
            const phongHoc = String(
              findVal(['Phòng học', 'PhongHoc', 'Phòng', 'Room']) || ''
            ).trim();
            const giangVien = String(
              findVal(['Giảng viên', 'GiangVien', 'Lecturer', 'Teacher']) || ''
            ).trim();
            const tuanTu = parseNumberVal(
              findVal(['Tuần bắt đầu', 'TuanTu', 'Tuần BD', 'StartWeek']),
              1
            );
            const tuanDen = parseNumberVal(
              findVal(['Tuần kết thúc', 'TuanDen', 'Tuần KT', 'EndWeek']),
              15
            );
            const danhSachTuan = parseWeekList(
              findVal(['Danh sách tuần', 'DanhSachTuan', 'WeekList']),
              tuanTu,
              tuanDen
            );
            const defaultMonday = getSemesterDefaultStartDate(hocKy, namHoc);
            const defaultDateStr = `${String(defaultMonday.getDate()).padStart(2, '0')}/${String(
              defaultMonday.getMonth() + 1
            ).padStart(2, '0')}/${defaultMonday.getFullYear()}`;
            const ngayBatDauStr = String(
              findVal(['Ngày bắt đầu', 'NgayBatDau', 'StartDate']) || defaultDateStr
            ).trim();
            return {
              id: `excel-row-${idx}`,
              maMH,
              tenMH,
              soTinChi,
              lop,
              hocKy,
              namHoc,
              thu,
              tietBatDau,
              soTiet,
              phongHoc,
              giangVien,
              tuanTu,
              tuanDen,
              danhSachTuan,
              ngayBatDauStr,
              isValid: Boolean(tenMH && maMH),
            };
          })
          .filter(Boolean);

        if (parsedList.length === 0) {
          setImportError('Không tìm thấy dòng môn học hợp lệ trong tệp.');
        }
        setImportedDataPreview(parsedList);
      } catch (err: any) {
        setImportError('Lỗi đọc tệp Excel: ' + (err.message || 'Định dạng không hợp lệ.'));
        setImportedDataPreview([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImportExcel = async () => {
    if (importedDataPreview.length === 0) {
      setImportError('Chưa có dữ liệu để nhập.');
      return;
    }
    setIsImporting(true);
    try {
      const formattedItems = importedDataPreview.map((item) => ({
        lop: item.lop || importDefaultLop,
        applyToClass: true,
        hocKy: item.hocKy || importDefaultHocKy,
        namHoc: item.namHoc || importDefaultNamHoc,
        tuanTu: item.tuanTu || 1,
        tuanDen: item.tuanDen || 15,
        danhSachTuan: item.danhSachTuan,
        maMH: item.maMH,
        tenMH: item.tenMH,
        soTinChi: item.soTinChi,
        giangVien: item.giangVien,
        phongHoc: item.phongHoc,
        thu: item.thu,
        tietBatDau: item.tietBatDau,
        soTiet: item.soTiet,
        lichHoc: [
          {
            thu: item.thu,
            tietBatDau: item.tietBatDau,
            soTiet: item.soTiet,
            phong: item.phongHoc,
            coSo: '',
          },
        ],
      }));
      const newYears: string[] = [];
      formattedItems.forEach((item) => {
        if (item.namHoc) newYears.push(item.namHoc);
      });
      if (newYears.length > 0) {
        updateCustomNamHocList([...customNamHocList, ...newYears]);
      }
      if (onImportSchedule) {
        await onImportSchedule(formattedItems);
      } else if (onAddSchedule) {
        for (const item of formattedItems) {
          onAddSchedule(item);
        }
      }
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportedDataPreview([]);
    } catch (err: any) {
      setImportError('Lỗi khi nhập dữ liệu: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const maxDisplayWeek = useMemo(() => {
    let maxW = 20;
    schedule.forEach((s) => {
      if (s.tuanDen && Number(s.tuanDen) > maxW) maxW = Number(s.tuanDen);
      if (s.tuanTu && Number(s.tuanTu) > maxW) maxW = Number(s.tuanTu);
      if (s.danhSachTuan && Array.isArray(s.danhSachTuan)) {
        s.danhSachTuan.forEach((w) => {
          if (Number(w) > maxW) maxW = Number(w);
        });
      }
    });
    return Math.max(maxW, 20);
  }, [schedule]);

  const currentWeekRange = getWeekRangeStr(selectedWeek);

  const hasActiveFilters =
    filterSemester !== 'ALL' ||
    filterNamHoc !== 'ALL' ||
    (userRole !== 'STUDENT' && selectedClass !== 'ALL') ||
    selectedWeek !== 1;

  const handleClearFilters = () => {
    setFilterSemester('ALL');
    setFilterNamHoc('ALL');
    setSelectedClass('ALL');
    setSelectedWeek(0);
  };

  if (isLoading && schedule.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Thời khóa biểu" icon={Calendar} />
        <LoadingState rows={6} />
      </div>
    );
  }

  if (loadError && schedule.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Thời khóa biểu" icon={Calendar} />
        <ErrorState type="error" message={loadError} onRetry={onRetryLoad} />
      </div>
    );
  }

  const uniqueFilteredCoursesCount = new Set(filteredSchedule.map((i) => i.maMH)).size;

  const renderSlotCourseCard = (course: ThoiKhoaBieu, dayKey: number, isMorning: boolean) => {
    const lich = course.lichHoc?.find((l) => l.thu === dayKey) || course.lichHoc?.[0];
    const tietStartVal = lich?.tietBatDau || course.tietBatDau || (isMorning ? 1 : 7);
    const soTietVal =
      lich?.soTiet ||
      course.soTiet ||
      (course.soTinChi && Number(course.soTinChi) > 0 ? Number(course.soTinChi) : 3);
    const tietEndVal = tietStartVal + soTietVal - 1;

    const mhNotices = examNotices.filter((n) => {
      if (n.maMH !== course.maMH) return false;
      if (n.tuanKiemTra && selectedWeek > 0 && Number(n.tuanKiemTra) !== selectedWeek) {
        return false;
      }
      if (n.thuKiemTra && Number(n.thuKiemTra) !== dayKey) {
        return false;
      }
      if (n.ngayKiemTra) {
        const cellDateStr = getDayDateStr(selectedWeek, dayKey);
        let noticeDayMonth = '';
        if (n.ngayKiemTra.includes('-')) {
          const p = n.ngayKiemTra.split('-');
          if (p.length === 3) {
            noticeDayMonth = `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}`;
          }
        } else if (n.ngayKiemTra.includes('/')) {
          const p = n.ngayKiemTra.split('/');
          if (p.length >= 2) {
            noticeDayMonth = `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}`;
          }
        }
        if (noticeDayMonth && cellDateStr && noticeDayMonth !== cellDateStr) {
          return false;
        }
      }
      return true;
    });

    const cardColors = isMorning
      ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/80'
      : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80';

    const titleColor = isMorning
      ? 'text-blue-950 dark:text-blue-100'
      : 'text-amber-950 dark:text-amber-100';

    const periodBadgeColor = isMorning
      ? 'text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60'
      : 'text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60';

    return (
      <div
        key={course.id || (course as any).tkbID || `${course.maMH}-${tietStartVal}`}
        className={`p-2 rounded border space-y-1 relative group ${cardColors}`}
      >
        {isAdminOrLecturer && (
          <div className="absolute top-1.5 right-1.5 opacity-85 group-hover:opacity-100 flex items-center gap-1 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingScheduleItem(course);
              }}
              aria-label={`Sửa ${course.tenMH}`}
              title="Sửa môn"
              className="p-1 rounded bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            {onDeleteSchedule && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetId = course.id || (course as any).tkbID || course.maMH;
                  setConfirmState({
                    title: 'Xác nhận xóa môn học',
                    message: `Bạn có chắc chắn muốn xóa môn "${course.tenMH}" khỏi thời khóa biểu?`,
                    confirmLabel: 'Xóa',
                    onConfirm: () => onDeleteSchedule(targetId, course.maMH),
                  });
                }}
                aria-label={`Xóa ${course.tenMH}`}
                title="Xóa môn"
                className="p-1 rounded bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <div className={`font-semibold text-xs leading-tight ${titleColor} ${isAdminOrLecturer ? 'pr-12' : 'pr-1'}`}>
          {course.tenMH}
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono tabular-nums font-semibold">
            <span className={`px-1.5 py-0.5 rounded ${periodBadgeColor}`}>
              Tiết {tietStartVal}–{tietEndVal} ({soTietVal}T)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-700 dark:text-slate-300">
            <span>{course.maMH}</span>
            {course.lop && (
              <span className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 px-1 rounded truncate max-w-[90px]">
                {course.lop}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-700 dark:text-slate-200 font-medium">
            <MapPin className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="truncate font-mono">
              {course.phongHoc || lich?.phong || 'Chưa xếp phòng'}
            </span>
          </div>
          {course.giangVien && (
            <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
              <User className="w-2.5 h-2.5 shrink-0" />
              <span>{course.giangVien}</span>
            </div>
          )}

          {mhNotices.length > 0 && (
            <div className="mt-1 space-y-1">
              {mhNotices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-1.5 rounded border text-[10px] font-medium flex items-start gap-1 ${
                    notice.loai === '15_PHUT'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                      : notice.loai === 'GIUA_KY'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  }`}
                  title={`${notice.tieuDe}: ${notice.noiDung}`}
                >
                  <BellRing className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="line-clamp-2">
                    <span className="font-bold mr-1">
                      {notice.loai === '15_PHUT'
                        ? 'KT 15p:'
                        : notice.loai === 'GIUA_KY'
                        ? 'KT Giữa kỳ:'
                        : 'Thông báo:'}
                    </span>
                    {notice.tieuDe}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isAdminOrLecturer && (
            <div className="pt-1 flex items-center gap-1 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openAttendanceForSchedule(course, dayKey);
                }}
                className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-2.5 h-2.5 text-blue-700 dark:text-blue-400" />
                <span>Điểm danh</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openExamNoticeForSchedule(course, dayKey);
                }}
                className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <BellRing className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                <span>Đăng KT</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {loadError && schedule.length > 0 && (
        <ErrorBanner message={loadError} onRetry={onRetryLoad} />
      )}
      {actionError && <ErrorBanner message={actionError} />}

      {userRole === 'STUDENT' && studentAbsenceWarnings.length > 0 && (
        <div
          role="alert"
          className="bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 p-3.5 rounded-md border border-rose-300 dark:border-rose-800 space-y-1.5"
        >
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
            <span>Cảnh báo chuyên cần</span>
          </div>
          <div className="text-xs space-y-1 pl-6">
            {studentAbsenceWarnings.map((w) => (
              <p key={w.maMH} className="font-medium font-mono tabular-nums">
                {w.tenMH} ({w.maMH}): Nghỉ {w.totalMissed}/{w.totalPeriods} tiết ({w.percentage.toFixed(1)}%) —{' '}
                {w.isDanger ? 'Nguy cơ cấm thi' : 'Cảnh báo'}
              </p>
            ))}
          </div>
        </div>
      )}

      <PageHeader
        title="Thời khóa biểu"
        icon={Calendar}
        actions={
          <>
            {isAdminOrLecturer && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceContext(null);
                    setIsAttendanceModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded cursor-pointer whitespace-nowrap"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Điểm danh</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNoticeDefaultMaMH('');
                    setNoticeContext(null);
                    setIsExamNoticeModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded cursor-pointer whitespace-nowrap"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Thông báo KT</span>
                </button>
                {activeScheduleTab === 'WEEKLY_SCHEDULE' && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadSampleTemplate}
                      className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải mẫu Excel</span>
                    </button>
                    <button
                      id="btn-import-schedule-excel"
                      type="button"
                      onClick={() => setIsFileUploadModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 cursor-pointer whitespace-nowrap"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>Nhập từ tệp</span>
                    </button>
                    <button
                      id="btn-add-schedule-admin"
                      type="button"
                      onClick={() => handleOpenAddModal()}
                      className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs px-3 py-1.5 rounded cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm lịch học</span>
                    </button>
                  </>
                )}
              </>
            )}
            {userRole === 'STUDENT' && (
              <StatusBadge
                label={
                  currentStudentObj
                    ? `${currentStudentObj.hoTen} (${currentStudentObj.lop || '—'})`
                    : currentStudentCode || 'Sinh viên'
                }
                variant="info"
              />
            )}
          </>
        }
      />

      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Phân mục thời khóa biểu">
          <button
            type="button"
            role="tab"
            aria-selected={activeScheduleTab === 'WEEKLY_SCHEDULE'}
            onClick={() => setActiveScheduleTab('WEEKLY_SCHEDULE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              activeScheduleTab === 'WEEKLY_SCHEDULE'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Thời khóa biểu tuần</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeScheduleTab === 'SEMESTERS_ACADEMIC_YEARS'}
            onClick={() => setActiveScheduleTab('SEMESTERS_ACADEMIC_YEARS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
              activeScheduleTab === 'SEMESTERS_ACADEMIC_YEARS'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Năm học & Học kỳ ({semesters.length})</span>
          </button>
        </div>
      </div>

      {activeScheduleTab === 'SEMESTERS_ACADEMIC_YEARS' ? (
        <SemesterAcademicYearModule
          semesters={semesters}
          academicYears={academicYears}
          userRole={userRole}
          onRefreshData={loadSemestersAndYears}
          showToast={showModuleToast}
        />
      ) : (
        <>
          <MetricStrip
            metrics={[
              { label: 'Môn đang hiển thị', value: uniqueFilteredCoursesCount, dotColor: 'blue' },
              {
                label: 'Tuần',
                value:
                  selectedWeek === 0
                    ? 'Tất cả'
                    : `Tuần ${selectedWeek} (${currentWeekRange.startShort}–${currentWeekRange.endShort})`,
                dotColor: 'emerald',
              },
              {
                label: 'Học kỳ',
                value: filterSemester === 'ALL' ? 'Tất cả' : filterSemester,
                dotColor: 'slate',
              },
              {
                label: 'Năm học',
                value: filterNamHoc === 'ALL' ? 'Tất cả' : filterNamHoc,
                dotColor: 'amber',
              },
            ]}
          />

          <div className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Tuần:
              </span>
              <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedWeek((w) => (w > 1 ? w - 1 : maxDisplayWeek))}
                  aria-label="Tuần trước"
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <select
                  aria-label="Chọn tuần"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="text-xs font-mono font-semibold px-2 py-0.5 bg-transparent text-blue-700 dark:text-blue-400 border-0 focus:outline-none cursor-pointer"
                >
                  <option value={0} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    Tất cả tuần
                  </option>
                  {Array.from({ length: Math.max(maxDisplayWeek, 25) }, (_, i) => i + 1).map((w) => (
                    <option
                      key={w}
                      value={w}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      Tuần {w}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setSelectedWeek((w) => (w < maxDisplayWeek ? w + 1 : 1))}
                  aria-label="Tuần sau"
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {userRole !== 'STUDENT' && (
                <select
                  id="select-schedule-class"
                  aria-label="Lọc theo lớp"
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    if (e.target.value !== 'ALL') setSelectedStudentMaSV('ALL');
                  }}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:border-blue-600"
                >
                  <option value="ALL">Tất cả lớp</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              <select
                id="select-schedule-semester"
                aria-label="Lọc theo học kỳ"
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">Tất cả học kỳ</option>
                {availableSemesterOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                id="select-schedule-namhoc"
                aria-label="Lọc theo năm học"
                value={filterNamHoc}
                onChange={(e) => setFilterNamHoc(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">Tất cả năm học</option>
                {availableNamHocOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded cursor-pointer whitespace-nowrap"
                >
                  Xóa lọc
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenDeleteScheduleModal}
                  className="px-2.5 py-1.5 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded cursor-pointer inline-flex items-center gap-1 font-medium text-xs whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa TKB</span>
                </button>
              )}
            </div>
          </div>

          {schedule.length === 0 ? (
            <EmptyState
              message="Chưa có dữ liệu."
              action={
                isAdminOrLecturer ? (
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm lịch học</span>
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredSchedule.length === 0 && (
                <FilteredEmptyState
                  message="Không có lịch học phù hợp với bộ lọc hoặc tuần đã chọn."
                  onClearFilters={handleClearFilters}
                />
              )}

              <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3 w-40 border-r border-slate-200 dark:border-slate-700">
                          Tiết / Giờ
                        </th>
                        {daysOfWeek.map((day) => {
                          const dayDate = getDayDateStr(selectedWeek, day.key);
                          return (
                            <th
                              key={day.key}
                              className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 min-w-[160px]"
                            >
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {day.label}
                              </div>
                              <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 mt-0.5">
                                {dayDate}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr className="bg-blue-50/70 dark:bg-blue-950/40 font-semibold text-blue-900 dark:text-blue-200 border-b border-slate-200 dark:border-slate-800">
                        <td colSpan={7} className="py-1.5 px-3 text-center text-[11px] uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-1.5">
                            <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Buổi sáng (Tiết 1 - 5: 07:00 - 11:00)</span>
                          </div>
                        </td>
                      </tr>

                      {[1, 2, 3, 4, 5].map((pNum) => (
                        <tr
                          key={`morning-p-${pNum}`}
                          className="min-h-[52px] border-b border-slate-200 dark:border-slate-800"
                        >
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 align-middle w-40">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                              Tiết {pNum}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                              {getPeriodTimeStr(pNum)}
                            </div>
                          </td>
                          {daysOfWeek.map((day) => {
                            const dayCourses = filteredSchedule.filter((item) => {
                              if (item.lichHoc && item.lichHoc.length > 0) {
                                return item.lichHoc.some((l) => l.thu === day.key);
                              }
                              return (item.thu || 2) === day.key;
                            });
                            const startingCourses = dayCourses.filter((item) => {
                              const lich = item.lichHoc?.find((l) => l.thu === day.key);
                              const tStart = lich?.tietBatDau || item.tietBatDau || 1;
                              return tStart === pNum;
                            });
                            const isCoveredByEarlier = dayCourses.some((item) => {
                              const lich = item.lichHoc?.find((l) => l.thu === day.key);
                              const tStart = lich?.tietBatDau || item.tietBatDau || 1;
                              const sTiet =
                                lich?.soTiet ||
                                item.soTiet ||
                                (item.soTinChi && Number(item.soTinChi) > 0
                                  ? Number(item.soTinChi)
                                  : 3);
                              return tStart < pNum && tStart + sTiet - 1 >= pNum;
                            });

                            const matchedHoliday = getHolidayForDay(
                              selectedWeek > 0 ? selectedWeek : 1,
                              day.key
                            );
                            if (matchedHoliday) {
                              if (pNum === 1) {
                                return (
                                  <td
                                    key={day.key}
                                    rowSpan={5}
                                    className="p-2 border-r border-slate-200 dark:border-slate-800 align-top bg-emerald-50/40 dark:bg-emerald-950/20"
                                  >
                                    <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1.5 relative">
                                      {isAdminOrLecturer && (
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingHolidayItem(matchedHoliday);
                                              setIsHolidayModalOpen(true);
                                            }}
                                            aria-label="Sửa kỳ nghỉ lễ"
                                            title="Sửa kỳ nghỉ lễ"
                                            className="p-1 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setConfirmState({
                                                title: 'Xác nhận xóa lịch nghỉ lễ',
                                                message: `Xóa lịch nghỉ lễ "${matchedHoliday.dipLe}"?`,
                                                confirmLabel: 'Xóa',
                                                onConfirm: async () => {
                                                  await apiService.deleteHoliday(matchedHoliday.id);
                                                  await loadHolidays();
                                                  showModuleToast(`Đã xóa lịch nghỉ lễ "${matchedHoliday.dipLe}".`);
                                                },
                                              });
                                            }}
                                            aria-label="Xóa kỳ nghỉ lễ"
                                            title="Xóa kỳ nghỉ lễ"
                                            className="p-1 rounded border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                      <div className="font-bold text-[11px] uppercase">
                                        {matchedHoliday.dipLe}
                                      </div>
                                      <div className="text-[10px] font-mono">
                                        {matchedHoliday.tuNgay === matchedHoliday.denNgay
                                          ? matchedHoliday.tuNgay
                                          : `${matchedHoliday.tuNgay} → ${matchedHoliday.denNgay}`}
                                      </div>
                                      <StatusBadge label="Nghỉ lễ" variant="success" />
                                      {matchedHoliday.ghiChu && (
                                        <div className="text-[10px] text-emerald-800 dark:text-emerald-300 line-clamp-2">
                                          {matchedHoliday.ghiChu}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              }
                              return null;
                            }

                            if (day.key === 2) {
                              const flagInfo = getFlagCeremonyInfo(selectedWeek);
                              if (!flagInfo.isFlagHidden && startingCourses.length === 0 && !isCoveredByEarlier) {
                                if (pNum === 1) {
                                  return (
                                    <td
                                      key={day.key}
                                      rowSpan={selectedWeek > 0 ? flagInfo.flagSpan : 1}
                                      className="p-2 border-r border-slate-200 dark:border-slate-800 align-top"
                                    >
                                      <div
                                        className={`p-2 rounded border space-y-1 ${
                                          flagInfo.isSchool
                                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-1">
                                          <div className="font-bold text-[11px] uppercase leading-tight">
                                            {selectedWeek === 0 ? 'CHÀO CỜ THỨ 2' : flagInfo.flagTitle}
                                          </div>
                                          {isAdminOrLecturer && (
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleFlagType(selectedWeek);
                                                }}
                                                title="Chuyển loại Chào cờ"
                                                className="p-0.5 rounded bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                                              >
                                                <RotateCw className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setConfirmState({
                                                    title: 'Ẩn tiết Chào cờ',
                                                    message: `Ẩn tiết "${
                                                      selectedWeek === 0
                                                        ? 'Chào cờ Thứ 2'
                                                        : flagInfo.flagTitle
                                                    }" khỏi thời khóa biểu?`,
                                                    confirmLabel: 'Ẩn',
                                                    onConfirm: () => {
                                                      handleHideFlagCeremony(flagInfo.flagKey);
                                                      handleHideFlagCeremony(`flag_w${flagInfo.activeW}`);
                                                    },
                                                  });
                                                }}
                                                title="Ẩn tiết Chào cờ"
                                                className="p-0.5 rounded bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 text-rose-600 dark:text-rose-400 cursor-pointer"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-[10px] font-mono">
                                          {flagInfo.isSchool
                                            ? '2 tiết (07:00 - 08:35)'
                                            : '1 tiết (07:00 - 07:45)'}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                }
                                if (pNum === 2 && selectedWeek > 0 && flagInfo.flagSpan === 2) {
                                  return null;
                                }
                              }
                            }

                            if (isCoveredByEarlier) return null;

                            if (startingCourses.length > 0) {
                              const maxSpan = Math.max(
                                ...startingCourses.map((c) => {
                                  const lich = c.lichHoc?.find((l) => l.thu === day.key);
                                  const sTiet =
                                    lich?.soTiet ||
                                    c.soTiet ||
                                    (c.soTinChi && Number(c.soTinChi) > 0
                                      ? Number(c.soTinChi)
                                      : 3);
                                  const tStart = lich?.tietBatDau || c.tietBatDau || 1;
                                  return Math.min(sTiet, 5 - tStart + 1);
                                })
                              );
                              return (
                                <td
                                  key={day.key}
                                  rowSpan={maxSpan}
                                  className="p-1.5 border-r border-slate-200 dark:border-slate-800 align-top"
                                >
                                  <div className="space-y-1.5">
                                    {startingCourses.map((course) =>
                                      renderSlotCourseCard(course, day.key, true)
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={day.key}
                                rowSpan={1}
                                className="p-1 border-r border-slate-200 dark:border-slate-800 align-middle"
                              >
                                {isAdminOrLecturer ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddModal(day.key, pNum)}
                                    className="w-full h-7 flex items-center justify-center gap-1 rounded border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 text-[10px] font-medium text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer opacity-35 hover:opacity-100"
                                    title={`Thêm môn vào ${day.label}, Tiết ${pNum}`}
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Thêm</span>
                                  </button>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      <tr className="bg-amber-50/70 dark:bg-amber-950/30 font-semibold text-amber-900 dark:text-amber-200 border-y border-slate-200 dark:border-slate-800">
                        <td colSpan={7} className="py-1.5 px-3 text-center text-[11px] uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-1.5">
                            <Moon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Buổi chiều (Tiết 7 - 9: 13:30 - 16:00)</span>
                          </div>
                        </td>
                      </tr>

                      {[7, 8, 9].map((pNum) => (
                        <tr
                          key={`afternoon-p-${pNum}`}
                          className="min-h-[52px] border-b border-slate-200 dark:border-slate-800"
                        >
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 align-middle w-40">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                              Tiết {pNum}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                              {getPeriodTimeStr(pNum)}
                            </div>
                          </td>
                          {daysOfWeek.map((day) => {
                            const dayCourses = filteredSchedule.filter((item) => {
                              if (item.lichHoc && item.lichHoc.length > 0) {
                                return item.lichHoc.some((l) => l.thu === day.key);
                              }
                              return (item.thu || 2) === day.key;
                            });
                            const startingCourses = dayCourses.filter((item) => {
                              const lich = item.lichHoc?.find((l) => l.thu === day.key);
                              const tStart = lich?.tietBatDau || item.tietBatDau || 7;
                              return tStart === pNum;
                            });
                            const isCoveredByEarlier = dayCourses.some((item) => {
                              const lich = item.lichHoc?.find((l) => l.thu === day.key);
                              const tStart = lich?.tietBatDau || item.tietBatDau || 7;
                              const sTiet =
                                lich?.soTiet ||
                                item.soTiet ||
                                (item.soTinChi && Number(item.soTinChi) > 0
                                  ? Number(item.soTinChi)
                                  : 3);
                              return tStart < pNum && tStart + sTiet - 1 >= pNum;
                            });

                            const matchedHoliday = getHolidayForDay(
                              selectedWeek > 0 ? selectedWeek : 1,
                              day.key
                            );
                            if (matchedHoliday) {
                              if (pNum === 7) {
                                return (
                                  <td
                                    key={day.key}
                                    rowSpan={3}
                                    className="p-2 border-r border-slate-200 dark:border-slate-800 align-top bg-emerald-50/30 dark:bg-emerald-950/20"
                                  >
                                    <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-center space-y-1">
                                      <StatusBadge label="Nghỉ lễ" variant="success" />
                                      <div className="text-[10px] font-medium truncate">
                                        {matchedHoliday.dipLe}
                                      </div>
                                    </div>
                                  </td>
                                );
                              }
                              return null;
                            }

                            if (isCoveredByEarlier) return null;

                            if (startingCourses.length > 0) {
                              const maxSpan = Math.max(
                                ...startingCourses.map((c) => {
                                  const lich = c.lichHoc?.find((l) => l.thu === day.key);
                                  const sTiet =
                                    lich?.soTiet ||
                                    c.soTiet ||
                                    (c.soTinChi && Number(c.soTinChi) > 0
                                      ? Number(c.soTinChi)
                                      : 3);
                                  const tStart = lich?.tietBatDau || c.tietBatDau || 7;
                                  return Math.min(sTiet, 9 - tStart + 1);
                                })
                              );
                              return (
                                <td
                                  key={day.key}
                                  rowSpan={maxSpan}
                                  className="p-1.5 border-r border-slate-200 dark:border-slate-800 align-top"
                                >
                                  <div className="space-y-1.5">
                                    {startingCourses.map((course) =>
                                      renderSlotCourseCard(course, day.key, false)
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={day.key}
                                rowSpan={1}
                                className="p-1 border-r border-slate-200 dark:border-slate-800 align-middle"
                              >
                                {isAdminOrLecturer ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddModal(day.key, pNum)}
                                    className="w-full h-7 flex items-center justify-center gap-1 rounded border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 text-[10px] font-medium text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer opacity-35 hover:opacity-100"
                                    title={`Thêm môn vào ${day.label}, Tiết ${pNum}`}
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Thêm</span>
                                  </button>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={addModalTitleId}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h3 id={addModalTitleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Thêm lịch học
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng hộp thoại"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              {addFormError && <ErrorBanner message={addFormError} />}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                <div>
                  <label htmlFor="add-tkb-lop" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Lớp học *
                  </label>
                  <select
                    id="add-tkb-lop"
                    value={form.lop}
                    onChange={(e) => setForm({ ...form, lop: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Phạm vi áp dụng
                  </span>
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.applyToClass}
                      onChange={(e) => setForm({ ...form, applyToClass: e.target.checked })}
                      className="rounded text-blue-700"
                    />
                    <span className="font-medium">Toàn bộ sinh viên trong lớp</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-1.5">
                  <label htmlFor="add-tkb-sub-select" className="font-semibold text-slate-700 dark:text-slate-200">
                    Môn học *
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          maMH: 'CHAO_CO',
                          tenMH: 'Chào cờ Tiểu đoàn',
                          soTinChi: 0,
                          thu: 2,
                          tietBatDau: 1,
                          soTiet: 1,
                          phongHoc: '',
                          giangVien: 'Chỉ huy Tiểu đoàn',
                        }))
                      }
                      className="px-2 py-0.5 text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800 cursor-pointer"
                    >
                      Chào cờ Tiểu đoàn (1T)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          maMH: 'CHAO_CO',
                          tenMH: 'Chào cờ Nhà trường',
                          soTinChi: 0,
                          thu: 2,
                          tietBatDau: 1,
                          soTiet: 2,
                          phongHoc: 'Sân chào cờ',
                          giangVien: 'Ban Giám hiệu',
                        }))
                      }
                      className="px-2 py-0.5 text-[11px] font-medium bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-800 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800 cursor-pointer"
                    >
                      Chào cờ Nhà trường (2T)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingHolidayItem(null);
                        setIsHolidayModalOpen(true);
                      }}
                      className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800 cursor-pointer"
                    >
                      + Thêm nghỉ lễ
                    </button>
                    {subjects.length > filteredFormSubjects.length && (
                      <button
                        type="button"
                        onClick={() => setShowAllSubjectsInForm(!showAllSubjectsInForm)}
                        className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {showAllSubjectsInForm
                          ? `Lọc theo lớp ${form.lop}`
                          : `Hiện tất cả (${subjects.length})`}
                      </button>
                    )}
                  </div>
                </div>

                <select
                  id="add-tkb-sub-select"
                  value={form.maMH}
                  onChange={(e) => handleQuickCourseSelect(e.target.value)}
                  className="w-full px-2.5 py-1.5 mb-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Chọn từ danh mục ({filteredFormSubjects.length} môn) --</option>
                  {filteredFormSubjects.map((sub) => (
                    <option key={sub.maMH} value={sub.maMH}>
                      {sub.maMH} - {sub.tenMH} ({sub.soTinChi} TC)
                      {sub.hocKy || sub.namHoc
                        ? ` [${[sub.hocKy, sub.namHoc].filter(Boolean).join(' ')}]`
                        : ''}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    aria-label="Mã học phần"
                    placeholder="Mã HP *"
                    value={form.maMH}
                    onChange={(e) => handleMaMHInputChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono font-semibold text-slate-900 dark:text-slate-100"
                    required
                  />
                  <input
                    type="text"
                    aria-label="Tên môn học"
                    placeholder="Tên môn học *"
                    value={form.tenMH}
                    onChange={(e) => setForm({ ...form, tenMH: e.target.value })}
                    className="col-span-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-medium text-slate-900 dark:text-slate-100"
                    required
                  />
                  <input
                    type="number"
                    aria-label="Số tín chỉ"
                    min={0}
                    max={10}
                    disabled={form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ')}
                    value={
                      form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ')
                        ? 0
                        : form.soTinChi
                    }
                    onChange={(e) => setForm({ ...form, soTinChi: Number(e.target.value) })}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono tabular-nums text-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-md border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label htmlFor="add-tkb-hocky" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                      Học kỳ
                    </label>
                    <select
                      id="add-tkb-hocky"
                      value={form.hocKy}
                      onChange={(e) => setForm({ ...form, hocKy: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- Chọn HK --</option>
                      {availableSemesterOptions.map((sem) => (
                        <option key={sem.id} value={sem.id}>
                          {sem.name}
                        </option>
                      ))}
                      {!availableSemesterOptions.some((s) => s.id === form.hocKy) && form.hocKy && (
                        <option value={form.hocKy}>{form.hocKy}</option>
                      )}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="add-tkb-namhoc" className="font-semibold text-slate-700 dark:text-slate-200">
                        Năm học *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsManualNamHoc(!isManualNamHoc)}
                        className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isManualNamHoc ? 'Chọn từ danh sách' : '+ Nhập năm học mới'}
                      </button>
                    </div>
                    {isManualNamHoc ? (
                      <input
                        id="add-tkb-namhoc"
                        type="text"
                        placeholder="VD: 2026-2027"
                        value={manualNamHocInput}
                        onChange={(e) => setManualNamHocInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-600 rounded font-mono text-slate-900 dark:text-slate-100"
                        required
                      />
                    ) : (
                      <select
                        id="add-tkb-namhoc"
                        value={form.namHoc}
                        onChange={(e) => {
                          if (e.target.value === '__MANUAL__') {
                            setIsManualNamHoc(true);
                          } else {
                            setForm({ ...form, namHoc: e.target.value });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-slate-100"
                      >
                        <option value="">-- Chọn năm học --</option>
                        {availableNamHocOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                        {!availableNamHocOptions.includes(form.namHoc) && form.namHoc && (
                          <option value={form.namHoc}>{form.namHoc}</option>
                        )}
                        <option value="__MANUAL__">+ Nhập năm học mới...</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Tuần học *</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="weekMode"
                          checked={weekSelectionMode === 'range'}
                          onChange={() => setWeekSelectionMode('range')}
                          className="text-blue-700"
                        />
                        <span>Theo khoảng</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="weekMode"
                          checked={weekSelectionMode === 'custom_list'}
                          onChange={() => setWeekSelectionMode('custom_list')}
                          className="text-blue-700"
                        />
                        <span>Chọn từng tuần</span>
                      </label>
                    </div>
                  </div>

                  {weekSelectionMode === 'range' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label htmlFor="add-tkb-tuantu" className="font-medium block mb-1 text-slate-700 dark:text-slate-300">
                          Tuần bắt đầu *
                        </label>
                        <input
                          id="add-tkb-tuantu"
                          type="number"
                          min={1}
                          value={form.tuanTu}
                          onChange={(e) =>
                            setForm({ ...form, tuanTu: Math.max(1, Number(e.target.value)) })
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="add-tkb-tuanden" className="font-medium block mb-1 text-slate-700 dark:text-slate-300">
                          Tuần kết thúc *
                        </label>
                        <input
                          id="add-tkb-tuanden"
                          type="number"
                          min={1}
                          value={form.tuanDen}
                          onChange={(e) =>
                            setForm({ ...form, tuanDen: Math.max(1, Number(e.target.value)) })
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex items-end">
                        <div className="w-full px-2.5 py-1.5 text-[11px] font-mono tabular-nums font-medium text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded">
                          {Math.max(Number(form.tuanDen) - Number(form.tuanTu) + 1, 1)} tuần
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Chọn nhanh:</span>
                        <div className="flex flex-wrap items-center gap-1">
                          {[15, 20, 30, 52].map((len) => (
                            <button
                              key={len}
                              type="button"
                              onClick={() => {
                                const list = Array.from({ length: len }, (_, i) => i + 1);
                                setSelectedCustomWeeks(list);
                                setCustomWeekTextInput(list.join(', '));
                              }}
                              className="px-1.5 py-0.5 font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                            >
                              1-{len}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomWeeks([]);
                              setCustomWeekTextInput('');
                            }}
                            className="px-1.5 py-0.5 font-medium bg-rose-50 text-rose-700 rounded border border-rose-200 cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700">
                        {Array.from({ length: customWeekMaxDisplay }, (_, i) => i + 1).map((w) => {
                          const isSel = selectedCustomWeeks.includes(w);
                          return (
                            <button
                              type="button"
                              key={w}
                              onClick={() => toggleCustomWeekSelect(w)}
                              className={`p-1 text-[11px] font-mono font-semibold rounded border cursor-pointer ${
                                isSel
                                  ? 'bg-blue-700 text-white border-blue-700'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              T{w}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        aria-label="Danh sách tuần"
                        placeholder="1, 2, 3, 5..."
                        value={customWeekTextInput}
                        onChange={(e) => handleCustomWeekTextInput(e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-900 dark:text-slate-100"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="font-mono tabular-nums">
                          Đã chọn {selectedCustomWeeks.length} tuần
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomWeekMaxDisplay((prev) => (prev <= 30 ? 52 : 30))}
                          className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {customWeekMaxDisplay <= 30 ? 'Hiện 52 tuần' : 'Thu gọn'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label htmlFor="add-tkb-w1start" className="font-medium text-slate-700 dark:text-slate-300">
                        Ngày bắt đầu Tuần 1:
                      </label>
                      <input
                        id="add-tkb-w1start"
                        type="date"
                        value={formWeek1StartDate}
                        onChange={(e) => setFormWeek1StartDate(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {daysOfWeek.map((day) => (
                        <div key={day.key} className="text-center">
                          <span className="text-[10px] font-semibold text-slate-500 block">
                            {day.label}
                          </span>
                          <input
                            type="text"
                            aria-label={`Ngày ${day.label}`}
                            value={formManualDayOverrides[day.key] || ''}
                            onChange={(e) =>
                              setFormManualDayOverrides({
                                ...formManualDayOverrides,
                                [day.key]: e.target.value,
                              })
                            }
                            className="w-full text-center p-1 font-mono text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                            placeholder="dd/mm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="add-tkb-thu" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Thứ *
                  </label>
                  <select
                    id="add-tkb-thu"
                    value={form.thu}
                    onChange={(e) => setForm({ ...form, thu: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
                  >
                    {daysOfWeek.map((day) => (
                      <option key={day.key} value={day.key}>
                        {day.label} ({formManualDayOverrides[day.key] || getDayDateStr(form.tuanTu, day.key)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="add-tkb-tietbd" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Tiết bắt đầu *
                  </label>
                  <select
                    id="add-tkb-tietbd"
                    value={form.tietBatDau}
                    onChange={(e) => setForm({ ...form, tietBatDau: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
                  >
                    {[
                      { tiet: 1, label: 'Tiết 1 (07:00 - 07:45)' },
                      { tiet: 2, label: 'Tiết 2 (07:50 - 08:35)' },
                      { tiet: 3, label: 'Tiết 3 (08:35 - 09:20)' },
                      { tiet: 4, label: 'Tiết 4 (09:30 - 10:15)' },
                      { tiet: 5, label: 'Tiết 5 (10:15 - 11:00)' },
                      { tiet: 6, label: 'Tiết 6 (11:00 - 11:45)' },
                      { tiet: 7, label: 'Tiết 7 (13:30 - 14:15)' },
                      { tiet: 8, label: 'Tiết 8 (14:20 - 15:05)' },
                      { tiet: 9, label: 'Tiết 9 (15:15 - 16:00)' },
                      { tiet: 10, label: 'Tiết 10 (16:05 - 16:50)' },
                      { tiet: 11, label: 'Tiết 11 (16:55 - 17:40)' },
                      { tiet: 12, label: 'Tiết 12 (17:45 - 18:30)' },
                    ].map((opt) => (
                      <option key={opt.tiet} value={opt.tiet}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="add-tkb-sotiet" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Số tiết *
                  </label>
                  <input
                    id="add-tkb-sotiet"
                    type="number"
                    min={1}
                    max={10}
                    value={form.soTiet}
                    onChange={(e) => setForm({ ...form, soTiet: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono tabular-nums text-slate-900 dark:text-slate-100 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="add-tkb-gv" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Giảng viên
                  </label>
                  <input
                    id="add-tkb-gv"
                    type="text"
                    value={form.giangVien}
                    onChange={(e) => setForm({ ...form, giangVien: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="add-tkb-phong" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Phòng học
                  </label>
                  <input
                    id="add-tkb-phong"
                    type="text"
                    value={form.phongHoc}
                    onChange={(e) => setForm({ ...form, phongHoc: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 rounded cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Lưu lịch học</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={importModalTitleId}
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h3 id={importModalTitleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Nhập thời khóa biểu từ Excel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportedDataPreview([]);
                  setImportFile(null);
                  setImportError(null);
                }}
                aria-label="Đóng hộp thoại"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
              {importError && <ErrorBanner message={importError} />}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                <div>
                  <label htmlFor="imp-tkb-lop" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Lớp mặc định
                  </label>
                  <select
                    id="imp-tkb-lop"
                    value={importDefaultLop}
                    onChange={(e) => setImportDefaultLop(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="imp-tkb-hk" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Học kỳ mặc định
                  </label>
                  <select
                    id="imp-tkb-hk"
                    value={importDefaultHocKy}
                    onChange={(e) => setImportDefaultHocKy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- Chọn HK --</option>
                    {availableSemesterOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="imp-tkb-nh" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                    Năm học mặc định
                  </label>
                  <select
                    id="imp-tkb-nh"
                    value={importDefaultNamHoc}
                    onChange={(e) => setImportDefaultNamHoc(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- Chọn năm học --</option>
                    {availableNamHocOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 p-5 rounded-md text-center relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Upload className="w-6 h-6 text-blue-700 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Chọn tệp Excel (.xlsx, .xls, .csv)
                </p>
                {importFile && (
                  <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mt-2">
                    {importFile.name}
                  </p>
                )}
              </div>

              {importedDataPreview.length > 0 && (
                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-md">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-2.5 w-8 text-center">STT</th>
                        <th className="py-2 px-2.5">Mã HP</th>
                        <th className="py-2 px-2.5">Tên môn học</th>
                        <th className="py-2 px-2.5">TC</th>
                        <th className="py-2 px-2.5">Lớp</th>
                        <th className="py-2 px-2.5">HK & Năm</th>
                        <th className="py-2 px-2.5">Thứ / Tiết</th>
                        <th className="py-2 px-2.5">Phòng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {importedDataPreview.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-mono font-semibold text-blue-700 dark:text-blue-400">
                            {item.maMH}
                          </td>
                          <td className="py-2 px-2.5 font-medium text-slate-900 dark:text-slate-100">
                            {item.tenMH}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono">{item.soTinChi}</td>
                          <td className="py-2 px-2.5">{item.lop}</td>
                          <td className="py-2 px-2.5 font-mono">
                            {item.hocKy} ({item.namHoc})
                          </td>
                          <td className="py-2 px-2.5 font-mono">
                            Thứ {item.thu} ({item.tietBatDau}–{item.tietBatDau + item.soTiet - 1})
                          </td>
                          <td className="py-2 px-2.5 font-mono">{item.phongHoc || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportedDataPreview([]);
                    setImportFile(null);
                  }}
                  className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={importedDataPreview.length === 0 || isImporting}
                  onClick={handleExecuteImportExcel}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded cursor-pointer"
                >
                  {isImporting ? 'Đang nhập...' : `Xác nhận nhập (${importedDataPreview.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteScheduleModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={deleteModalTitleId}
          onClick={() => setIsDeleteScheduleModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                <h3 id={deleteModalTitleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Xóa thời khóa biểu theo bộ lọc
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteScheduleModalOpen(false)}
                aria-label="Đóng hộp thoại"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label htmlFor="del-tkb-hk" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Học kỳ
                </label>
                <select
                  id="del-tkb-hk"
                  value={deleteTargetHocKy}
                  onChange={(e) => setDeleteTargetHocKy(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded"
                >
                  <option value="ALL">Tất cả học kỳ</option>
                  {availableSemesterOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="del-tkb-nh" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Năm học
                </label>
                <select
                  id="del-tkb-nh"
                  value={deleteTargetNamHoc}
                  onChange={(e) => setDeleteTargetNamHoc(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono border border-slate-300 dark:border-slate-700 rounded"
                >
                  <option value="ALL">Tất cả năm học</option>
                  {availableNamHocOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="del-tkb-lop" className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Lớp học
                </label>
                <select
                  id="del-tkb-lop"
                  value={deleteTargetLop}
                  onChange={(e) => setDeleteTargetLop(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded"
                >
                  <option value="ALL">Tất cả lớp</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Số môn khớp điều kiện
                  </span>
                  <StatusBadge
                    label={`${matchingDeleteItems.length} môn`}
                    variant={matchingDeleteItems.length > 0 ? 'danger' : 'neutral'}
                  />
                </div>

                {matchingDeleteItems.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-y-auto max-h-40 divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    {matchingDeleteItems.map((item, idx) => (
                      <div key={item.id || idx} className="p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {item.tenMH || item.maMH}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {item.maMH} · {item.lop || 'Tất cả'} · Thứ {item.thu} (T{item.tietBatDau}–
                            {item.tietBatDau + (item.soTiet || 1) - 1})
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {item.namHoc} · {item.hocKy}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="Không có môn học khớp bộ lọc." />
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsDeleteScheduleModalOpen(false)}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-medium rounded text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={matchingDeleteItems.length === 0 || isDeletingSchedule}
                onClick={handleRequestDeleteSchedule}
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-semibold rounded text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isDeletingSchedule ? 'Đang xóa...' : `Xóa ${matchingDeleteItems.length} môn`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ScheduleFileUploadModal
        isOpen={isFileUploadModalOpen}
        onClose={() => setIsFileUploadModalOpen(false)}
        availableClasses={availableClasses}
        availableNamHocOptions={availableNamHocOptions}
        availableSemesterOptions={availableSemesterOptions}
        onUploadSuccess={() => {
          if (onImportSchedule) onImportSchedule([]);
        }}
        showToast={showModuleToast}
      />

      <ScheduleEditModal
        isOpen={Boolean(editingScheduleItem)}
        onClose={() => setEditingScheduleItem(null)}
        item={editingScheduleItem}
        subjects={subjects}
        onSuccess={(updatedData) => {
          if (editingScheduleItem) {
            if (onUpdateSchedule) {
              onUpdateSchedule(editingScheduleItem.id, updatedData || {});
            } else if (onAddSchedule) {
              onAddSchedule({ refreshOnly: true });
            }
          }
          setEditingScheduleItem(null);
        }}
        showToast={showModuleToast}
      />

      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        attendanceList={attendanceList}
        schedule={schedule}
        students={students}
        userRole={userRole}
        currentUserFullName={currentUserFullName}
        onSaveAttendance={handleSaveAttendance}
        onDeleteAttendance={handleDeleteAttendance}
        attendanceContext={attendanceContext}
      />

      <ExamNoticeModal
        isOpen={isExamNoticeModalOpen}
        onClose={() => setIsExamNoticeModalOpen(false)}
        examNotices={examNotices}
        schedule={schedule}
        userRole={userRole}
        currentUserFullName={currentUserFullName}
        defaultMaMH={noticeDefaultMaMH}
        defaultNgayKiemTra={noticeContext?.ngay || ''}
        defaultThuKiemTra={noticeContext?.thu || 2}
        onSaveNotice={handleSaveExamNotice}
        onDeleteNotice={handleDeleteExamNotice}
      />

      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => {
          setIsHolidayModalOpen(false);
          setEditingHolidayItem(null);
        }}
        availableClasses={availableClasses}
        currentClass={selectedClass}
        currentSemester={filterSemester}
        currentNamHoc={filterNamHoc}
        availableSemesters={availableSemesterOptions}
        availableNamHoc={availableNamHocOptions}
        onSuccess={loadHolidays}
        showToast={showModuleToast}
        editingHolidayItem={editingHolidayItem}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmState)}
        title={confirmState?.title || 'Xác nhận'}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || 'Xác nhận'}
        variant="danger"
        isSubmitting={isConfirmSubmitting}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) return;
          setIsConfirmSubmitting(true);
          try {
            await confirmState.onConfirm();
          } finally {
            setIsConfirmSubmitting(false);
            setConfirmState(null);
          }
        }}
      />

      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-3.5 py-2.5 rounded-md border border-slate-700 dark:border-slate-300 text-xs font-medium"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
};
