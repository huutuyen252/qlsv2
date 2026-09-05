import React, { useState, useEffect, useMemo } from 'react';
import { ThoiKhoaBieu, SinhVien, UserRole, HocKy, NamHoc, DiemDanh, ThongBaoKiemTra, MonHoc, NghiLe } from '../../types';
import { ScheduleFileUploadModal } from './ScheduleFileUploadModal';
import { ScheduleEditModal } from './ScheduleEditModal';
import { AttendanceModal } from './AttendanceModal';
import { ExamNoticeModal } from './ExamNoticeModal';
import { HolidayModal } from './HolidayModal';
import { apiService } from '../../services/apiService';
import { isSubjectMatchingClass } from '../../utils/subjectHelper';
import {
  Calendar,
  MapPin,
  User,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  Filter,
  Layers,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  HelpCircle,
  Edit3,
  Check,
  CalendarDays,
  Grid,
  FileText,
  Sun,
  Moon,
  UserCheck,
  BellRing,
  ShieldAlert,
  AlertTriangle,
  Bell,
  Sparkles,
  Flag,
  RotateCw,
  Settings,
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
}
// Standard International / ISO 8601 Calendar Utilities
export const getMondayOfDate = (d: Date): Date => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  // In standard Monday-first international calendar:
  // If Sunday (0), Monday was 6 days ago (-6)
  // If Monday (1), diff is 0
  // If Tue-Sat (2..6), diff is (1 - day)
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
  // Parse starting year from academicYear like '2025-2026', '2026-2027', or '2025'
  const yearMatch = academicYear ? academicYear.match(/(\d{4})/) : null;
  const baseYear = yearMatch ? parseInt(yearMatch[1], 10) : 2025;

  let targetDate: Date;
  if (semester === 'HK2') {
    // HK2: Second Monday of January of (baseYear + 1)
    targetDate = new Date(baseYear + 1, 0, 12);
  } else if (semester === 'HK3' || semester === 'Học kỳ Hè') {
    // HK3: First Monday of June of (baseYear + 1)
    targetDate = new Date(baseYear + 1, 5, 1);
  } else {
    // HK1: Standard Monday of September in baseYear (08/09/2025 for 2025, 07/09/2026 for 2026)
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
}) => {
  const isAdmin = userRole === 'ADMIN';
  const isAdminOrLecturer = userRole === 'ADMIN' || userRole === 'LECTURER' || Boolean(userPermissions?.canManageSchedule);
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
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ThoiKhoaBieu | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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
      console.log('Error loading semesters/academic years');
    }
  };
  useEffect(() => {
    loadSemestersAndYears();
  }, []);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStudentMaSV, setSelectedStudentMaSV] = useState<string>(
    currentStudentCode || students[0]?.maSV || 'sv2024001'
  );
  const [filterSemester, setFilterSemester] = useState<string>('HK1');
  const [filterNamHoc, setFilterNamHoc] = useState<string>('2025-2026');
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
    }
    return [];
  });
  const updateCustomNamHocList = (newList: string[]) => {
    const cleaned = Array.from(
      new Set(
        newList
          .map(normalizeNamHocStr)
          .filter(Boolean)
      )
    );
    setCustomNamHocList(cleaned);
    try {
      localStorage.setItem('custom_nam_hoc_list', JSON.stringify(cleaned));
    } catch (e) {
      console.error('Failed to save custom_nam_hoc_list', e);
    }
  };
  const [isDeleteScheduleModalOpen, setIsDeleteScheduleModalOpen] = useState(false);
  const [deleteTargetNamHoc, setDeleteTargetNamHoc] = useState<string>('2025-2026');
  const [deleteTargetHocKy, setDeleteTargetHocKy] = useState<string>('ALL');
  const [deleteTargetLop, setDeleteTargetLop] = useState<string>('ALL');
  const [isDeletingSchedule, setIsDeletingSchedule] = useState<boolean>(false);

  const handleOpenDeleteScheduleModal = () => {
    setDeleteTargetNamHoc(filterNamHoc !== 'ALL' ? filterNamHoc : (availableNamHocOptions[0] || '2025-2026'));
    setDeleteTargetHocKy(filterSemester);
    setDeleteTargetLop(selectedClass);
    setIsDeleteScheduleModalOpen(true);
  };

  const matchingDeleteItems = useMemo(() => {
    const targetNormYear = normalizeNamHocStr(deleteTargetNamHoc);
    return schedule.filter((item) => {
      // 1. Filter Academic Year
      if (deleteTargetNamHoc && deleteTargetNamHoc !== 'ALL') {
        const itemNormYear = normalizeNamHocStr(item.namHoc || '');
        if (itemNormYear !== targetNormYear && !(item.namHoc && item.namHoc.includes(targetNormYear))) {
          return false;
        }
      }

      // 2. Filter Semester
      if (deleteTargetHocKy && deleteTargetHocKy !== 'ALL') {
        const itemHK = (item.hocKy || '').trim().toUpperCase();
        const targetHK = deleteTargetHocKy.trim().toUpperCase();
        if (itemHK !== targetHK && !itemHK.includes(targetHK)) {
          return false;
        }
      }

      // 3. Filter Class
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

  const handleExecuteDeleteSchedule = async () => {
    if (matchingDeleteItems.length === 0) {
      showModuleToast('Không tìm thấy môn học nào khớp với bộ lọc để xóa!');
      return;
    }
    const yearLabel = deleteTargetNamHoc === 'ALL' ? 'Tất cả năm học' : `năm học ${deleteTargetNamHoc}`;
    const hkLabel = deleteTargetHocKy === 'ALL' ? 'Tất cả HK' : `Học kỳ ${deleteTargetHocKy}`;
    const lopLabel = deleteTargetLop === 'ALL' ? 'Tất cả các lớp' : `Lớp ${deleteTargetLop}`;

    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${matchingDeleteItems.length} môn học thời khóa biểu của:\n- Năm học: ${deleteTargetNamHoc === 'ALL' ? 'Tất cả năm học' : deleteTargetNamHoc}\n- Học kỳ: ${deleteTargetHocKy === 'ALL' ? 'Tất cả HK' : deleteTargetHocKy}\n- Lớp: ${lopLabel}\n\nThao tác này sẽ xóa dữ liệu khỏi hệ thống và không thể khôi phục.`
      )
    ) {
      return;
    }

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
      showModuleToast(
        res.message ||
          `Đã xóa thành công ${matchingDeleteItems.length} môn thời khóa biểu của ${yearLabel} (${hkLabel})!`
      );
      setIsDeleteScheduleModalOpen(false);
    } catch (err) {
      console.error('Error executing delete schedule:', err);
      showModuleToast('Có lỗi xảy ra khi xóa thời khóa biểu');
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  const handleDeleteYear = async (yearStr: string) => {
    const norm = normalizeNamHocStr(yearStr);
    if (!window.confirm(`Bạn có chắc chắn muốn xóa năm học "${norm}" và toàn bộ thời khóa biểu liên quan khỏi hệ thống?`)) {
      return;
    }

    // 1. Delete all schedule entries belonging to this academic year in PostgreSQL and State
    try {
      await apiService.deleteScheduleByYear(norm);
      if (onDeleteScheduleByYear) {
        await onDeleteScheduleByYear(norm);
      } else if (onImportSchedule) {
        await onImportSchedule([]);
      }
    } catch (e) {
      console.error('Delete schedule by year error:', e);
    }

    // 2. Remove from custom list in local storage
    const updatedCustom = customNamHocList.filter(
      (y) => normalizeNamHocStr(y) !== norm
    );
    updateCustomNamHocList(updatedCustom);

    // 3. Delete from DB academic years
    const dbMatch = academicYears.find(
      (a) => normalizeNamHocStr(a.tenNamHoc) === norm || a.namHocID === norm || a.tenNamHoc === norm
    );
    if (dbMatch) {
      try {
        await apiService.deleteAcademicYear(dbMatch.namHocID);
      } catch (e) {
        console.error('Delete DB year error:', e);
      }
    }

    // 4. Update filter if current selected year is the deleted one
    if (filterNamHoc === norm || filterNamHoc === yearStr) {
      setFilterNamHoc('ALL');
    }

    loadSemestersAndYears();
    showModuleToast(`Đã xóa năm học "${norm}" và dọn dẹp toàn bộ thời khóa biểu liên quan!`);
  };
  const handleDeleteSemesterItem = async (semesterId: string, semesterName: string) => {
    if (!window.confirm(`Bạn có chắc chắn mun xóa học kỳ "${semesterName}" (${semesterId})?`)) {
      return;
    }
    try {
      const res = await apiService.deleteSemester(semesterId);
      if (showModuleToast) showModuleToast(res.message || `Đã xóa học kỳ ${semesterName}`);
      loadSemestersAndYears();
    } catch {
      if (showModuleToast) showModuleToast('Không thể xóa học kỳ này');
    }
  };
  const [customWeekStartDates, setCustomWeekStartDates] = useState<Record<number, string>>({});
  const [customDayDateTexts, setCustomDayDateTexts] = useState<Record<string, string>>({});
  const [isEditingWeekDate, setIsEditingWeekDate] = useState(false);

  // Flag Ceremony Overrides state (TIEU_DOAN: 1 period, NHA_TRUONG: 2 periods)
  const [flagOverrides, setFlagOverrides] = useState<Record<string, 'TIEU_DOAN' | 'NHA_TRUONG'>>(() => {
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
  });

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
    if (showModuleToast) {
      showModuleToast('Đã xóa tiết Chào cờ khỏi thời khóa biểu!');
    }
  };

  const getFlagCeremonyInfo = (weekNum: number) => {
    const activeW = weekNum > 0 ? weekNum : 1;
    const monDate = getWeekStartDate(activeW);
    const isFirstMon = isFirstMondayOfMonth(monDate);
    const defaultType: 'TIEU_DOAN' | 'NHA_TRUONG' = isFirstMon ? 'NHA_TRUONG' : 'TIEU_DOAN';

    const flagKey = weekNum > 0 ? `flag_w${weekNum}_${filterSemester}_${filterNamHoc}` : 'flag_all';
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
    const isOverridden = !!override && override !== defaultType;

    return {
      activeW,
      monDate,
      isFirstMon,
      defaultType,
      actualType,
      isOverridden,
      isFlagHidden,
      isSchool,
      flagSpan,
      flagTitle,
      flagKey,
    };
  };

  const handleToggleFlagType = (weekNum: number) => {
    const info = getFlagCeremonyInfo(weekNum);
    const targetType: 'TIEU_DOAN' | 'NHA_TRUONG' = info.actualType === 'NHA_TRUONG' ? 'TIEU_DOAN' : 'NHA_TRUONG';

    // Also unhide if previously hidden
    setHiddenFlagKeys((prev) => prev.filter((k) => k !== info.flagKey && k !== `flag_w${info.activeW}` && k !== 'flag_all'));

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

    if (showModuleToast) {
      const label = targetType === 'NHA_TRUONG' ? 'Chào cờ Nhà trường (2 tiết)' : 'Chào cờ Tiểu đoàn (1 tiết)';
      showModuleToast(`Tuần ${info.activeW}: Đã đổi sang "${label}"`);
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
        const name = s.hocKy === 'HK1' ? 'Học kỳ 1' : s.hocKy === 'HK2' ? 'Học kỳ 2' : s.hocKy === 'HK3' ? 'Học kỳ Hè' : s.hocKy;
        semMap.set(s.hocKy, name);
      }
    });
    subjects.forEach((sub) => {
      if (sub.hocKy && !semMap.has(sub.hocKy)) {
        const name = sub.hocKy === 'HK1' ? 'Học kỳ 1' : sub.hocKy === 'HK2' ? 'Học kỳ 2' : sub.hocKy === 'HK3' ? 'Học kỳ Hè' : sub.hocKy;
        semMap.set(sub.hocKy, name);
      }
    });
    return Array.from(semMap.entries()).map(([id, name]) => ({ id, name }));
  }, [semesters, schedule, subjects]);
  const getWeekStartDate = (weekNum: number): Date => {
    const w = weekNum === 0 ? 1 : weekNum;
    if (customWeekStartDates[w]) {
      const parts = customWeekStartDates[w].split('-');
      if (parts.length === 3) {
        return getMondayOfDate(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      }
    }
    const week1Start = customWeekStartDates[1]
      ? getMondayOfDate(new Date(customWeekStartDates[1]))
      : getSemesterDefaultStartDate(filterSemester, filterNamHoc);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualNamHoc, setIsManualNamHoc] = useState(false);
  const [manualNamHocInput, setManualNamHocInput] = useState('');
  const [weekSelectionMode, setWeekSelectionMode] = useState<'range' | 'custom_list'>('range');
  const [selectedCustomWeeks, setSelectedCustomWeeks] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const [customWeekTextInput, setCustomWeekTextInput] = useState<string>('1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15');
  const [customWeekMaxDisplay, setCustomWeekMaxDisplay] = useState<number>(30);
  const [formWeek1StartDate, setFormWeek1StartDate] = useState<string>(() => {
    return formatDateToISO(getSemesterDefaultStartDate('HK1', '2025-2026'));
  });
  const [formManualDayOverrides, setFormManualDayOverrides] = useState<Record<number, string>>(() => {
    const base = getSemesterDefaultStartDate('HK1', '2025-2026');
    const initial: Record<number, string> = {};
    for (let d = 2; d <= 7; d++) {
      const offset = d - 2;
      const dt = new Date(base);
      dt.setDate(base.getDate() + offset);
      initial[d] = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    }
    return initial;
  });
  const [form, setForm] = useState({
    lop: availableClasses[0] || 'CNKT Cơ khí 25DDS 09041',
    applyToClass: true,
    maSV: students[0]?.maSV || 'sv2024001',
    hocKy: 'HK1',
    namHoc: '2025-2026',
    tuanTu: 1,
    tuanDen: 15,
    maMH: 'CNTT101',
    tenMH: 'Lập trình Hướng đối tượng (OOP)',
    soTinChi: 3,
    giangVien: 'TS. Nguyễn Văn Hùng',
    phongHoc: 'H1-302',
    thu: 2,
    tietBatDau: 1,
    soTiet: 3,
    coSo: 'Cơ sở chính',
  });

  const [showAllSubjectsInForm, setShowAllSubjectsInForm] = useState(false);
  const filteredFormSubjects = useMemo(() => {
    if (showAllSubjectsInForm) return subjects;
    return subjects.filter((s) => isSubjectMatchingClass(s, form.lop));
  }, [subjects, form.lop, showAllSubjectsInForm]);

  const handlePresetChaoCo = () => {
    setForm((prev) => ({
      ...prev,
      maMH: 'CHAO_CO',
      tenMH: 'Chào cờ',
      soTinChi: 0,
      thu: 2,
      tietBatDau: 1,
      soTiet: 1,
      phongHoc: 'Sân chào cờ',
      giangVien: 'Chỉ huy đơn vị',
      coSo: 'Cơ sở chính',
    }));
  };
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
  }, [formWeek1StartDate]);
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
  const [importDefaultLop, setImportDefaultLop] = useState<string>(availableClasses[0] || 'CNKT Cơ khí 25DDS 09041');
  const [importDefaultHocKy, setImportDefaultHocKy] = useState<string>('HK1');
  const [importDefaultNamHoc, setImportDefaultNamHoc] = useState<string>('2025-2026');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
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
      if (attRes.success && attRes.data) {
        setAttendanceList(attRes.data);
      }
      if (noticeRes.success && noticeRes.data) {
        setExamNotices(noticeRes.data);
      }
      if (holidayRes.success && holidayRes.data) {
        setHolidays(holidayRes.data);
      }
    } catch (err) {
      console.error('Error loading attendance, exam notices & holidays:', err);
    }
  };
  const loadHolidays = async () => {
    try {
      const res = await apiService.getHolidays();
      if (res.success && res.data) {
        setHolidays(res.data);
      }
    } catch (err) {
      console.error('Error loading holidays:', err);
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
      alert(res.message || 'Lưu điểm danh thất bại!');
    }
  };
  const openAttendanceForSchedule = (course: ThoiKhoaBieu, dayKey: number) => {
    const lesson = course.lichHoc?.find((item) => Number(item.thu) === dayKey) || course.lichHoc?.[0];
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
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const getHolidayForDay = (weekNum: number, dayKey: number) => {
    if (!holidays || holidays.length === 0) return null;
    const dayIso = getScheduleDateISO(weekNum, dayKey);
    return holidays.find((h) => {
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
    }) || null;
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
    if (window.confirm('Bạn có chắc chắn mun xóa lượt điểm danh này?')) {
      const res = await apiService.deleteAttendance(id);
      if (res.success) {
        await loadAttendanceAndNotices();
      }
    }
  };
  const handleSaveExamNotice = async (notice: Partial<ThongBaoKiemTra>) => {
    const res = await apiService.saveExamNotice(notice);
    if (res.success) {
      await loadAttendanceAndNotices();
    } else {
      alert(res.message || 'Đăng thông báo kiểm tra thất bại!');
    }
  };
  const handleDeleteExamNotice = async (id: string) => {
    if (window.confirm('Xóa thông báo kiểm tra này khỏi thời khóa biểu?')) {
      const res = await apiService.deleteExamNotice(id);
      if (res.success) {
        await loadAttendanceAndNotices();
      }
    }
  };
  useEffect(() => {
    if (userRole === 'STUDENT' && currentStudentCode) {
      setSelectedStudentMaSV(currentStudentCode);
    }
  }, [userRole, currentStudentCode]);
  const currentStudentObj = students.find(
    (s) => s.maSV.toLowerCase() === (selectedStudentMaSV || currentStudentCode || '').toLowerCase()
  ) || students[0];
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
        const itemNH = item.namHoc.trim().toLowerCase();
        const selNH = filterNamHoc.trim().toLowerCase();
        if (itemNH !== selNH && !itemNH.includes(selNH)) {
          return false;
        }
      }
      if (userRole === 'STUDENT') {
        if (currentStudentCode) {
          const studentMa = currentStudentCode.trim().toLowerCase();
          const studentLop = currentStudentObj?.lop?.trim().toLowerCase();
          const isTargetStudent = Boolean(item.maSV && item.maSV.trim().toLowerCase() === studentMa);
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
      const key = `${(item.maMH || '').trim().toLowerCase()}_${(item.tenMH || '').trim().toLowerCase()}_${(item.lop || '').trim().toLowerCase()}_${(item.phongHoc || item.lichHoc?.[0]?.phong || '').trim().toLowerCase()}_${dayVal}_${tietVal}`;
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
      const existing = mapMH.get(a.maMH) || { maMH: a.maMH, tenMH: a.tenMH || a.maMH, totalMissed: 0 };
      existing.totalMissed += a.soTietNghi || 0;
      mapMH.set(a.maMH, existing);
    });
    const warnings: { maMH: string; tenMH: string; totalMissed: number; totalPeriods: number; credits: number; percentage: number; isDanger: boolean }[] = [];
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
  const timeSlots = [
    { period: 'Buổi Sáng', time: '07:00 - 11:00', tietRange: 'Tiết 1 - 5', tietStart: 1, tietEnd: 5 },
    { period: 'Buổi Chiều', time: '13:30 - 16:00', tietRange: 'Tiết 7 - 9', tietStart: 7, tietEnd: 9 },
  ];
  const isFirstMondayOfMonth = (date: Date): boolean => {
    return date.getDate() <= 7;
  };
  const getCoursesForSlot = (dayKey: number, slotStart: number, slotEnd: number) => {
    const rawMatches = filteredSchedule.filter((item) => {
      if (item.lichHoc && item.lichHoc.length > 0) {
        return item.lichHoc.some((l) => {
          if (l.thu !== dayKey) return false;
          const courseStart = l.tietBatDau || item.tietBatDau || 1;
          const courseEnd = courseStart + (l.soTiet || item.soTiet || (item.soTinChi && Number(item.soTinChi) > 0 ? Number(item.soTinChi) : 3)) - 1;
          return courseStart <= slotEnd && courseEnd >= slotStart;
        });
      }
      if (item.thu !== dayKey) return false;
      const courseStart = item.tietBatDau || 1;
      const courseEnd = courseStart + (item.soTiet || (item.soTinChi && Number(item.soTinChi) > 0 ? Number(item.soTinChi) : 3)) - 1;
      return courseStart <= slotEnd && courseEnd >= slotStart;
    });
    const seenKeys = new Set<string>();
    const uniqueCourses: typeof rawMatches = [];
    for (const item of rawMatches) {
      const lich = item.lichHoc?.find((l) => l.thu === dayKey);
      const tietStartVal = lich?.tietBatDau || item.tietBatDau || 1;
      const key = `${(item.maMH || '').trim().toLowerCase()}_${(item.tenMH || '').trim().toLowerCase()}_${(item.phongHoc || lich?.phong || '').trim().toLowerCase()}_${tietStartVal}_${dayKey}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueCourses.push(item);
      }
    }
    return uniqueCourses;
  };
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
    let finalNamHoc = form.namHoc;
    if (isManualNamHoc) {
      if (!manualNamHocInput.trim()) {
        alert('Vui lòng nhập tên năm học thủ công!');
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
    const activeWeek = selectedWeek > 0 ? selectedWeek : 1;
    const targetLop =
      userRole === 'STUDENT'
        ? (currentStudentObj?.lop || availableClasses[0] || 'CNKT Cơ khí 25DDS 09041')
        : selectedClass !== 'ALL'
        ? selectedClass
        : (availableClasses[0] || 'CNKT Cơ khí 25DDS 09041');
    const targetStudent =
      userRole === 'STUDENT'
        ? (currentStudentObj?.maSV || currentStudentCode || students[0]?.maSV || 'sv2024001')
        : selectedStudentMaSV !== 'ALL'
        ? selectedStudentMaSV
        : (students[0]?.maSV || 'sv2024001');
    const targetSemester = filterSemester !== 'ALL' ? filterSemester : 'HK1';
    const targetNamHoc = filterNamHoc !== 'ALL' ? filterNamHoc : '2025-2026';
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
    }
    setForm({
      lop: targetLop,
      applyToClass: userRole !== 'STUDENT',
      maSV: targetStudent,
      hocKy: targetSemester,
      namHoc: targetNamHoc,
      tuanTu: activeWeek,
      tuanDen: selectedWeek > 0 ? selectedWeek : 15,
      maMH: '',
      tenMH: '',
      soTinChi: 3,
      giangVien: 'TS. Nguyễn Văn Hùng',
      phongHoc: 'A2-201',
      thu: dayKey || 2,
      tietBatDau: tietStart || 1,
      soTiet: 3,
      coSo: 'Cơ sở chính',
    });
    setShowAllSubjectsInForm(false);
    setIsManualNamHoc(false);
    setManualNamHocInput('');
    setIsModalOpen(true);
  };
  const handleQuickAddSlot = (dayKey: number, tietStart: number) => {
    handleOpenAddModal(dayKey, tietStart);
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
    const foundSub = subjects.find((s) => s.maMH.trim().toLowerCase() === val.trim().toLowerCase());
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
    const sampleData = [
      {
        'Mã HP': 'CNTT101',
        'Tên môn học': 'Lập trình Hưng i tượng (OOP)',
        'Số tín chỉ': 3,
        'Lớp': 'CNKT Cơ khí 25DDS 09041',
        'Học kỳ': 'HK1',
        'Năm học': '2025-2026',
        'Thứ': 2,
        'Tiết bắt đầu': 1,
        'Số tiết': 3,
        'Phòng học': 'H1-302',
        'Giảng viên': 'TS. Nguyễn Văn Hùng',
        'Tuần bắt đầu': 1,
        'Tuần kết thúc': 15,
        'Ngày bắt đầu (dd/mm/yyyy)': '08/09/2025',
        'Danh sách tuần': '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15',
      },
      {
        'Mã HP': 'CNTT102',
        'Tên môn học': 'Cơ sở dữ liệu',
        'Số tín chỉ': 3,
        'Lớp': 'CNKT Cơ khí 25DDS 09041',
        'Học kỳ': 'HK1',
        'Năm học': '2025-2026',
        'Thứ': 4,
        'Tiết bắt đầu': 4,
        'Số tiết': 3,
        'Phòng học': 'H2-105',
        'Giảng viên': 'ThS. Trần Thị Mai',
        'Tuần bắt đầu': 1,
        'Tuần kết thúc': 15,
        'Ngày bắt đầu (dd/mm/yyyy)': '08/09/2025',
        'Danh sách tuần': '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15',
      },
      {
        'Mã HP': 'MATH101',
        'Tên môn học': 'Giải tích 1',
        'Số tín chỉ': 3,
        'Lớp': 'CNKT Cơ khí 25DDS 09041',
        'Học kỳ': 'HK1',
        'Năm học': '2025-2026',
        'Thứ': 6,
        'Tiết bắt đầu': 7,
        'Số tiết': 3,
        'Phòng học': 'H3-201',
        'Giảng viên': 'PGS.TS. Lê Văn Tám',
        'Tuần bắt đầu': 1,
        'Tuần kết thúc': 15,
        'Ngày bắt đầu (dd/mm/yyyy)': '08/09/2025',
        'Danh sách tuần': '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15',
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ThoiKhoaBieu');
    XLSX.writeFile(workbook, 'Mau_Import_ThoiKhoaBieu.xlsx');
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
      const parts = str.split(/[,;\s]+/).map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n));
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
          setImportError('File Excel rỗng hoặc không có dữ liệu phù hợp!');
          setImportedDataPreview([]);
          return;
        }
        const parsedList = rawJson.map((row, idx) => {
          const findVal = (keys: string[]) => {
            for (const k of Object.keys(row)) {
              const cleanK = k
                .toLowerCase()
                .replace(/[^a-z0-9àáảđãạfắằẳẵặâấầẩẫậèéẻẽẹêếềf.ìíĩòóỏõọô".-TơờYỡợùúủũụưứừửữựỳýỷỹỵ]/g, '');
              for (const targetKey of keys) {
                const cleanTarget = targetKey
                  .toLowerCase()
                  .replace(/[^a-z0-9àáảđãạfắằẳẵặâấầẩẫậèéẻẽẹêếềf.ìíĩòóỏõọô".-TơờYỡợùúủũụưứừửữựỳýỷỹỵ]/g, '');
                if (cleanK === cleanTarget || cleanK.includes(cleanTarget)) {
                  return row[k];
                }
              }
            }
            return '';
          };
          const maMH = String(findVal(['Mã HP', 'MaHP', 'Mã môn', 'Mã môn học', 'maMH', 'CourseCode']) || `MH${101 + idx}`).trim();
          const tenMH = String(findVal(['Tên môn học', 'TenMH', 'Tên môn', 'tenMH', 'CourseName']) || `Môn học ${idx + 1}`).trim();
          const soTinChi = parseNumberVal(findVal(['Số tín chỉ', 'SoTinChi', 'Số TC', 'soTC', 'Credits']), 3);
          const lop = String(findVal(['Lớp', 'Lop', 'Lớp học', 'Class']) || importDefaultLop).trim();
          const hocKy = String(findVal(['Học kỳ', 'HocKy', 'HK', 'Semester']) || importDefaultHocKy).trim();
          const namHoc = String(findVal(['Năm học', 'NamHoc', 'AcademicYear']) || importDefaultNamHoc).trim();
          const thu = parseThuVal(findVal(['Thứ', 'Thu', 'DayOfWeek', 'Day']));
          const tietBatDau = parseNumberVal(findVal(['Tiết bắt đầu', 'TietBatDau', 'Tiết BD', 'StartPeriod']), 1);
          const soTiet = parseNumberVal(findVal(['Số tiết', 'SoTiet', 'Periods']), 3);
          const phongHoc = String(findVal(['Phòng học', 'PhongHoc', 'Phòng', 'Room']) || 'H1-101').trim();
          const giangVien = String(findVal(['Giảng viên', 'GiangVien', 'Lecturer', 'Teacher']) || 'Giảng viên BT môn').trim();
          const tuanTu = parseNumberVal(findVal(['Tuần bắt đầu', 'TuanTu', 'Tuần BD', 'StartWeek']), 1);
          const tuanDen = parseNumberVal(findVal(['Tuần kết thúc', 'TuanDen', 'Tuần KT', 'EndWeek']), 15);
          const danhSachTuan = parseWeekList(findVal(['Danh sách tuần', 'DanhSachTuan', 'WeekList']), tuanTu, tuanDen);
          const defaultMonday = getSemesterDefaultStartDate(hocKy, namHoc);
          const defaultDateStr = `${String(defaultMonday.getDate()).padStart(2, '0')}/${String(defaultMonday.getMonth() + 1).padStart(2, '0')}/${defaultMonday.getFullYear()}`;
          const ngayBatDauStr = String(findVal(['Ngày bắt đầu', 'NgayBatDau', 'StartDate']) || defaultDateStr).trim();
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
        });
        setImportedDataPreview(parsedList);
      } catch (err: any) {
        setImportError('Lỗi đọc file Excel: ' + (err.message || 'Định dạng file không hợp lệ'));
        setImportedDataPreview([]);
      }
    };
    reader.readAsBinaryString(file);
  };
  const handleExecuteImportExcel = async () => {
    if (importedDataPreview.length === 0) {
      alert('Chưa có dữ liệu thời khóa biểu nào để import!');
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
            coSo: 'Cơ sở chính',
          },
        ],
      }));
      const newYears: string[] = [];
      formattedItems.forEach((item) => {
        if (item.namHoc) {
          newYears.push(item.namHoc);
        }
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
      setImportError('Lỗi trong quá trình import: ' + err.message);
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
  return (
    <div className="space-y-6">
      {userRole === 'STUDENT' && studentAbsenceWarnings.length > 0 && (
        <div className="bg-red-600 text-white p-5 rounded-2xl shadow-xl space-y-2 border border-red-500 animate-pulse">
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
            <ShieldAlert className="w-6 h-6 text-yellow-300" />
            <span>CẢNH BÁO CHUYÊN CẦN: NGHỈ HỌC QUÁ NGƯỠNG 20% SỐ TIẾT!</span>
          </div>
          <div className="text-xs space-y-1.5 pl-8">
            {studentAbsenceWarnings.map((w) => (
              <p key={w.maMH} className="font-semibold">
                 Môn <span className="underline font-bold text-yellow-200">{w.tenMH} ({w.maMH})</span>: 
                Bạn đã nghỉ <span className="font-black text-yellow-300">{w.totalMissed} tiết</span> trên tổng số {w.totalPeriods} tiết ({w.credits} tín chỉ). Tỷ lệ vắng: <span className="font-black text-yellow-300">{w.percentage.toFixed(1)}%</span> 
                {w.isDanger ? ' ⚠️ NGUY CƠ CAO BỊ CẤM THI!' : ' ⚠️ ĐÃ CHẠM MỨC CẢNH BÁO!'}
              </p>
            ))}
            <p className="text-[11px] text-red-100 italic pt-1">
              * Quy định: 1 tín chỉ = 15 tiết. Sinh viên vắng từ 20% số tiết trở lên sẽ thuộc diện cấm thi. Vui lòng liên hệ Giảng viên hoặc Cố vấn học tập ngay!
            </p>
          </div>
        </div>
      )}
      {(userRole === 'LECTURER' || userRole === 'ADMIN') && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4.5 rounded-2xl shadow-md border border-indigo-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                {userRole === 'LECTURER' ? 'Bảng Điều Khiển Giảng Viên' : 'Quản Lý Điểm Danh & Thông Báo Kiểm Tra'}
              </div>
              <div className="text-sm font-extrabold text-white">
                {currentUserFullName ? `Giảng viên: ${currentUserFullName}` : 'Cán bộ Giảng dạy / Quản trị viên'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setAttendanceContext(null);
                setIsAttendanceModalOpen(true);
              }}
              className="px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              Điểm danh
            </button>
            <button
              onClick={() => {
                setNoticeDefaultMaMH('');
                setNoticeContext(null);
                setIsExamNoticeModalOpen(true);
              }}
              className="px-4 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <BellRing className="w-4 h-4" />
              Thông Báo Kiểm Tra (15p, Giữa kỳ)
            </button>
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Thời khóa biểu Học tập & Giảng dạy</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {userRole !== 'STUDENT' && (
            <button
              onClick={handleDownloadSampleTemplate}
              title="Tải xung file mẫu Excel thời khóa biểu chuẩn (.xlsx)"
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold text-xs px-3 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tải File Mẫu Excel</span>
            </button>
          )}
          {isAdminOrLecturer && (
            <>
              <button
                id="btn-import-schedule-excel"
                onClick={() => setIsFileUploadModalOpen(true)}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Upload File Excel/PDF TKB
              </button>
              <button
                id="btn-add-schedule-admin"
                onClick={() => handleOpenAddModal()}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Thêm TKB Thủ công
              </button>
            </>
          )}
          {userRole === 'STUDENT' ? (
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded-xl">
              Sinh viên: {currentStudentObj?.hoTen || currentStudentCode} ({currentStudentObj?.lop || 'Lớp chưa xếp'})
            </span>
          ) : (
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/80 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <span className="text-xs font-semibold text-zinc-500 pl-1">Lớp:</span>
              <select
                id="select-schedule-class"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  if (e.target.value !== 'ALL') setSelectedStudentMaSV('ALL');
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg border border-zinc-200 dark:border-zinc-700 focus:outline-none"
              >
                <option value="ALL">Tất cả các lớp</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>
                    Lớp {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Xem Thời Khóa Biểu Theo Tuần:
            </span>
          </div>
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setSelectedWeek((w) => (w > 1 ? w - 1 : maxDisplayWeek))}
              title="Tuần trước"
              className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="text-xs font-bold px-2 py-0.5 bg-transparent text-blue-600 dark:text-blue-400 border-0 focus:outline-none cursor-pointer"
              title="Chọn nhanh tuần hiển thị"
            >
              <option value={0} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                Tất cả tuần
              </option>
              {Array.from({ length: Math.max(maxDisplayWeek, 25) }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                  Tuần {w}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSelectedWeek((w) => (w < maxDisplayWeek ? w + 1 : 1))}
              title="Tuần sau"
              className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold">Học kỳ:</span>
            <select
              id="select-schedule-semester"
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Tất cả HK</option>
              {availableSemesterOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold">Năm học:</span>
            <select
              id="select-schedule-namhoc"
              value={filterNamHoc}
              onChange={(e) => setFilterNamHoc(e.target.value)}
              className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Tất cả năm</option>
              {availableNamHocOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenDeleteScheduleModal}
                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                title="Xóa thời khóa biểu theo học kỳ / năm học"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa TKB</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-700">
                <th className="p-3.5 w-44 border-r border-zinc-200 dark:border-zinc-700">Ca học / Khung giờ</th>
                {daysOfWeek.map((day) => {
                  const dayDate = getDayDateStr(selectedWeek, day.key);
                  return (
                    <th key={day.key} className="p-3.5 text-center border-r border-zinc-200 dark:border-zinc-700 min-w-[160px]">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{day.label}</div>
                      <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full inline-block border border-blue-200/60 dark:border-blue-800/60">
                        {dayDate}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr className="bg-blue-100/80 dark:bg-blue-950/90 font-bold text-blue-900 dark:text-blue-200 border-b border-blue-200 dark:border-blue-800">
                    <td colSpan={8} className="p-2 text-center text-xs uppercase tracking-wider font-black">
                      <div className="flex items-center justify-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <span>BUỔI SÁNG (Tiết 1 - 5: 07h00 - 11h00)</span>
                      </div>
                    </td>
                  </tr>
                  {[1, 2, 3, 4, 5].map((pNum) => (
                    <tr key={`morning-p-${pNum}`} className="min-h-[55px] border-b border-zinc-200 dark:border-zinc-800">
                      <td className="p-2.5 font-medium text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/40 align-middle w-40">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                          Tiết {pNum}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5">
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
                          const sTiet = lich?.soTiet || item.soTiet || (item.soTinChi && Number(item.soTinChi) > 0 ? Number(item.soTinChi) : 3);
                          return tStart < pNum && (tStart + sTiet - 1) >= pNum;
                        });

                        // Check Holiday for this day
                        const matchedHoliday = getHolidayForDay(selectedWeek > 0 ? selectedWeek : 1, day.key);
                        if (matchedHoliday) {
                          if (pNum === 1) {
                            return (
                              <td
                                key={day.key}
                                rowSpan={5}
                                className="p-2.5 border-r border-zinc-200 dark:border-zinc-700 align-top bg-emerald-50/50 dark:bg-emerald-950/30 transition-colors"
                              >
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xs border border-emerald-500/80 space-y-2 relative group">
                                  {isAdminOrLecturer && (
                                    <div className="absolute top-2 right-2 opacity-90 group-hover:opacity-100 flex items-center gap-1 transition-all z-10">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingHolidayItem(matchedHoliday);
                                          setIsHolidayModalOpen(true);
                                        }}
                                        title="Sửa kỳ nghỉ lễ"
                                        className="p-1 rounded bg-black/30 hover:bg-black/50 text-white cursor-pointer transition-colors"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (window.confirm(`Xóa lịch nghỉ lễ "${matchedHoliday.dipLe}"?`)) {
                                            await apiService.deleteHoliday(matchedHoliday.id);
                                            await loadHolidays();
                                            showModuleToast(`Đã xóa lịch nghỉ lễ "${matchedHoliday.dipLe}"`);
                                          }
                                        }}
                                        title="Xóa kỳ nghỉ lễ"
                                        className="p-1 rounded bg-black/30 hover:bg-black/50 text-white cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-yellow-300 text-emerald-900 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                      ★
                                    </div>
                                    <div className={isAdminOrLecturer ? 'pr-14' : 'pr-1'}>
                                      <div className="font-extrabold text-[11px] uppercase tracking-tight leading-tight">
                                        {matchedHoliday.dipLe}
                                      </div>
                                      <div className="text-[10px] text-emerald-100 font-bold mt-0.5">
                                        {matchedHoliday.tuNgay === matchedHoliday.denNgay
                                          ? matchedHoliday.tuNgay
                                          : `${matchedHoliday.tuNgay} → ${matchedHoliday.denNgay}`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-[10px] font-semibold bg-black/20 px-2 py-1 rounded-lg text-emerald-50">
                                    🎉 Nghỉ toàn bộ tiết học theo quy định
                                  </div>
                                  {matchedHoliday.ghiChu && (
                                    <div className="text-[9.5px] italic text-emerald-100/90 line-clamp-2">
                                      {matchedHoliday.ghiChu}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          }
                          return null; // Covered by Tiết 1 rowSpan=5
                        }

                        // Monday Assembly Flag Handling
                        if (day.key === 2) {
                          const flagInfo = getFlagCeremonyInfo(selectedWeek);

                          if (!flagInfo.isFlagHidden && startingCourses.length === 0 && !isCoveredByEarlier) {
                            if (pNum === 1) {
                              return (
                                <td
                                  key={day.key}
                                  rowSpan={selectedWeek > 0 ? flagInfo.flagSpan : 1}
                                  className={`p-2 border-r border-zinc-200 dark:border-zinc-700 align-top ${
                                    flagInfo.isSchool ? 'bg-red-50/50 dark:bg-red-950/20' : 'bg-amber-50/50 dark:bg-amber-950/20'
                                  }`}
                                >
                                  <div
                                    className={`p-2.5 rounded-xl text-white shadow-xs border relative group space-y-1.5 transition-all ${
                                      flagInfo.isSchool
                                        ? 'bg-gradient-to-br from-red-600 to-rose-700 border-red-500 shadow-red-500/10'
                                        : 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 shadow-amber-500/10'
                                    }`}
                                  >
                                    {isAdminOrLecturer && (
                                      <div className="absolute top-1.5 right-1.5 opacity-90 group-hover:opacity-100 flex items-center gap-1 transition-all z-10">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleFlagType(selectedWeek);
                                          }}
                                          title={`Bấm để chuyển nhanh sang: ${
                                            flagInfo.actualType === 'NHA_TRUONG' ? 'Chào cờ Tiểu đoàn (1 tiết)' : 'Chào cờ Nhà trường (2 tiết)'
                                          }`}
                                          className="p-1 rounded bg-black/30 hover:bg-black/50 text-white cursor-pointer transition-transform active:rotate-180"
                                        >
                                          <RotateCw className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Xóa / ẩn tiết "${selectedWeek === 0 ? 'Chào cờ Thứ 2' : flagInfo.flagTitle}" khỏi thời khóa biểu?`)) {
                                              handleHideFlagCeremony(flagInfo.flagKey);
                                              handleHideFlagCeremony(`flag_w${flagInfo.activeW}`);
                                            }
                                          }}
                                          title="Xóa tiết Chào cờ"
                                          className="p-1 rounded bg-black/30 hover:bg-black/50 text-white cursor-pointer transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                    <div className="flex items-start gap-1.5">
                                      <div className={`w-5 h-5 rounded-full font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                        flagInfo.isSchool ? 'bg-yellow-400 text-red-800' : 'bg-yellow-300 text-amber-900'
                                      }`}>
                                        ★
                                      </div>
                                      <div className={isAdminOrLecturer ? 'pr-12' : 'pr-1'}>
                                        <div className="font-black text-[11px] uppercase leading-tight tracking-tight">
                                          {selectedWeek === 0 ? 'CHÀO CỜ THỨ 2' : flagInfo.flagTitle}
                                        </div>
                                        <div className="text-[10px] opacity-95 font-medium mt-0.5">
                                          {flagInfo.isSchool ? '2 tiết (07:00 - 08:35)' : '1 tiết (07:00 - 07:45)'}
                                        </div>
                                        {flagInfo.isSchool && (
                                          <div className="text-[9.5px] opacity-90 font-medium">
                                            Sân chào cờ
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              );
                            }
                            if (pNum === 2 && selectedWeek > 0 && flagInfo.flagSpan === 2) {
                              return null; // Covered by Tiết 1 rowSpan=2
                            }
                          }
                        }

                        if (isCoveredByEarlier) {
                          return null;
                        }
                        if (startingCourses.length > 0) {
                          const maxSpan = Math.max(
                            ...startingCourses.map((c) => {
                              const lich = c.lichHoc?.find((l) => l.thu === day.key);
                              const sTiet = lich?.soTiet || c.soTiet || (c.soTinChi && Number(c.soTinChi) > 0 ? Number(c.soTinChi) : 3);
                              const tStart = lich?.tietBatDau || c.tietBatDau || 1;
                              return Math.min(sTiet, 5 - tStart + 1);
                            })
                          );
                          return (
                            <td
                              key={day.key}
                              rowSpan={maxSpan}
                              className="p-2 border-r border-zinc-200 dark:border-zinc-700 align-top hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20 transition-colors"
                            >
                              <div className="space-y-2">
                                {startingCourses.map((course) => (
                                  <div
                                    key={course.id || (course as any).tkbID || course.maMH}
                                    className="p-2.5 rounded-xl bg-blue-50/95 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 shadow-xs space-y-1 relative group"
                                  >
                                    {isAdminOrLecturer && (
                                      <div className="absolute top-1.5 right-1.5 opacity-80 group-hover:opacity-100 flex items-center gap-1 transition-all z-10">
                                        <button
                                          onClick={(e) => {
                                           e.stopPropagation();
                                            setEditingScheduleItem(course);
                                          }}
                                          title="Sửa môn"
                                          className="p-1 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/80 text-blue-600 dark:text-blue-300 cursor-pointer"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        {onDeleteSchedule && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (window.confirm(`Xóa môn "${course.tenMH}"?`)) {
                                                const targetId = course.id || (course as any).tkbID || course.maMH;
                                                onDeleteSchedule(targetId, course.maMH);
                                              }
                                            }}
                                            title="Xóa môn"
                                            className="p-1 rounded bg-red-100 hover:bg-red-200 dark:bg-red-900/80 text-red-600 dark:text-red-300 cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    <div className={`font-bold text-blue-950 dark:text-blue-100 text-xs leading-tight ${isAdminOrLecturer ? 'pr-12' : 'pr-1'}`}>
                                      {course.tenMH}
                                    </div>
                                    {(() => {
                                      const lich = course.lichHoc?.find((l) => l.thu === day.key) || course.lichHoc?.[0];
                                      const tietStartVal = lich?.tietBatDau || course.tietBatDau || pNum;
                                      const soTietVal = lich?.soTiet || course.soTiet || (course.soTinChi && Number(course.soTinChi) > 0 ? Number(course.soTinChi) : 3);
                                      const tietEndVal = tietStartVal + soTietVal - 1;
                                      return (
                                        <div className="space-y-1">
                                          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono font-bold">
                                            <span className="text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/80 px-1.5 py-0.5 rounded">
                                              Tiết {tietStartVal} - {tietEndVal} ({soTietVal} tiết)
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-blue-700 dark:text-blue-300">
                                            <span>{course.maMH}</span>
                                            {course.lop && (
                                              <span className="bg-blue-200/70 dark:bg-blue-900/80 px-1 py-0.2 rounded font-bold truncate max-w-[90px]">
                                                Lớp {course.lop}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 text-[10px] text-zinc-700 dark:text-zinc-200 font-bold pt-0.5">
                                            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                            <span className="truncate">Phòng: {course.phongHoc || lich?.phong || 'Chưa xếp'}</span>
                                          </div>
                                          {course.giangVien && (
                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                                              <User className="w-2.5 h-2.5" />
                                              {course.giangVien}
                                            </div>
                                          )}
                                          {(() => {
                                            const mhNotices = examNotices.filter((n) => {
                                              if (n.maMH !== course.maMH) return false;
                                              if (n.tuanKiemTra && selectedWeek > 0 && Number(n.tuanKiemTra) !== selectedWeek) {
                                                return false;
                                              }
                                              if (n.thuKiemTra && Number(n.thuKiemTra) !== day.key) {
                                                return false;
                                              }
                                              if (n.ngayKiemTra) {
                                                const cellDateStr = getDayDateStr(selectedWeek, day.key);
                                                let noticeDayMonth = '';
                                                if (n.ngayKiemTra.includes('-')) {
                                                  const p = n.ngayKiemTra.split('-');
                                                  if (p.length === 3) noticeDayMonth = `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}`;
                                                } else if (n.ngayKiemTra.includes('/')) {
                                                  const p = n.ngayKiemTra.split('/');
                                                  if (p.length >= 2) noticeDayMonth = `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}`;
                                                }
                                                if (noticeDayMonth && cellDateStr && noticeDayMonth !== cellDateStr) {
                                                  return false;
                                                }
                                              }
                                              return true;
                                            });
                                            if (mhNotices.length === 0) return null;
                                            return (
                                              <div className="mt-1 space-y-1">
                                                {mhNotices.map((notice) => (
                                                  <div
                                                    key={notice.id}
                                                    className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-start gap-1 shadow-xs ${
                                                      notice.loai === '15_PHUT'
                                                        ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                                        : notice.loai === 'GIUA_KY'
                                                        ? 'bg-purple-100 dark:bg-purple-950/90 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800'
                                                        : 'bg-blue-100 dark:bg-blue-950/90 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                                                    }`}
                                                    title={`${notice.tieuDe}: ${notice.noiDung}`}
                                                  >
                                                    <BellRing className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                    <div className="line-clamp-2">
                                                      <span className="font-extrabold underline mr-1">
                                                        {notice.loai === '15_PHUT' ? 'KT 15p:' : notice.loai === 'GIUA_KY' ? 'KT Giữa kỳ:' : 'Thông báo:'}
                                                      </span>
                                                      {notice.tieuDe}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          })()}
                                          {isAdminOrLecturer && (
                                            <div className="pt-1 flex items-center gap-1 border-t border-blue-200/60 dark:border-blue-800/60">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openAttendanceForSchedule(course, day.key);
                                                }}
                                                className="px-1.5 py-0.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-bold flex items-center gap-0.5"
                                                title="Điểm danh lớp môn này"
                                              >
                                                <UserCheck className="w-2.5 h-2.5" /> Điểm danh
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openExamNoticeForSchedule(course, day.key);
                                                }}
                                                className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 rounded text-[9px] font-bold flex items-center gap-0.5"
                                                title="Đăng thông báo kiểm tra 15p / Giữa kỳ"
                                              >
                                                <BellRing className="w-2.5 h-2.5" /> Đăng KT
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={day.key}
                            rowSpan={1}
                            className="p-1 border-r border-zinc-200 dark:border-zinc-700 align-middle hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                          >
                            {isAdminOrLecturer ? (
                              <button
                                onClick={() => handleQuickAddSlot(day.key, pNum)}
                                className="w-full h-8 flex items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-[10px] font-semibold text-zinc-400 hover:text-blue-600 transition-all cursor-pointer opacity-30 hover:opacity-100"
                                title={`Thêm môn vào ${day.label}, Tiết ${pNum}`}
                              >
                                <Plus className="w-3 h-3" /> Thêm
                              </button>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-amber-100/80 dark:bg-amber-950/90 font-bold text-amber-900 dark:text-amber-200 border-y border-amber-200 dark:border-amber-800">
                    <td colSpan={8} className="p-2 text-center text-xs uppercase tracking-wider font-black">
                      <div className="flex items-center justify-center gap-2">
                        <Moon className="w-4 h-4 text-amber-600" />
                        <span>BUỔI CHIỀU (Tiết 7 - 9: 13h30 - 16h00)</span>
                      </div>
                    </td>
                  </tr>
                  {[7, 8, 9].map((pNum) => (
                    <tr key={`afternoon-p-${pNum}`} className="min-h-[55px] border-b border-zinc-200 dark:border-zinc-800">
                      <td className="p-2.5 font-medium text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/40 align-middle w-40">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                          Tiết {pNum}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5">
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
                          const sTiet = lich?.soTiet || item.soTiet || (item.soTinChi && Number(item.soTinChi) > 0 ? Number(item.soTinChi) : 3);
                          return tStart < pNum && (tStart + sTiet - 1) >= pNum;
                        });

                        // Check holiday for afternoon
                        const matchedHoliday = getHolidayForDay(selectedWeek > 0 ? selectedWeek : 1, day.key);
                        if (matchedHoliday) {
                          if (pNum === 7) {
                            return (
                              <td
                                key={day.key}
                                rowSpan={3}
                                className="p-2 border-r border-zinc-200 dark:border-zinc-700 align-top bg-emerald-50/40 dark:bg-emerald-950/20"
                              >
                                <div className="p-2 rounded-xl bg-emerald-100/90 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-center space-y-0.5">
                                  <div className="font-extrabold text-[10.5px] uppercase flex items-center justify-center gap-1">
                                    <span>🎉 Nghỉ lễ buổi chiều</span>
                                  </div>
                                  <div className="text-[9.5px] font-medium text-emerald-700 dark:text-emerald-300 truncate">
                                    {matchedHoliday.dipLe}
                                  </div>
                                </div>
                              </td>
                            );
                          }
                          return null; // Covered by pNum 7 rowSpan=3
                        }
                        if (isCoveredByEarlier) {
                          return null;
                        }
                        if (startingCourses.length > 0) {
                          const maxSpan = Math.max(
                            ...startingCourses.map((c) => {
                              const lich = c.lichHoc?.find((l) => l.thu === day.key);
                              const sTiet = lich?.soTiet || c.soTiet || (c.soTinChi && Number(c.soTinChi) > 0 ? Number(c.soTinChi) : 3);
                              const tStart = lich?.tietBatDau || c.tietBatDau || 7;
                              return Math.min(sTiet, 9 - tStart + 1);
                            })
                          );
                          return (
                            <td
                              key={day.key}
                              rowSpan={maxSpan}
                              className="p-2 border-r border-zinc-200 dark:border-zinc-700 align-top hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20 transition-colors"
                            >
                              <div className="space-y-2">
                                {startingCourses.map((course) => (
                                  <div
                                    key={course.id || (course as any).tkbID || course.maMH}
                                    className="p-2.5 rounded-xl bg-amber-50/95 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 shadow-xs space-y-1 relative group"
                                  >
                                    {isAdminOrLecturer && (
                                      <div className="absolute top-1.5 right-1.5 opacity-80 group-hover:opacity-100 flex items-center gap-1 transition-all z-10">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingScheduleItem(course);
                                          }}
                                          title="Sửa môn"
                                          className="p-1 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 cursor-pointer"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        {onDeleteSchedule && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (window.confirm(`Xóa môn "${course.tenMH}"?`)) {
                                                const targetId = course.id || (course as any).tkbID || course.maMH;
                                                onDeleteSchedule(targetId, course.maMH);
                                              }
                                            }}
                                            title="Xóa môn"
                                            className="p-1 rounded bg-red-100 hover:bg-red-200 dark:bg-red-900/80 text-red-600 dark:text-red-300 cursor-pointer"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    <div className={`font-bold text-amber-950 dark:text-amber-100 text-xs leading-tight ${isAdminOrLecturer ? 'pr-12' : 'pr-1'}`}>
                                      {course.tenMH}
                                    </div>
                                    {(() => {
                                      const lich = course.lichHoc?.find((l) => l.thu === day.key) || course.lichHoc?.[0];
                                      const tietStartVal = lich?.tietBatDau || course.tietBatDau || pNum;
                                      const soTietVal = lich?.soTiet || course.soTiet || (course.soTinChi && Number(course.soTinChi) > 0 ? Number(course.soTinChi) : 3);
                                      const tietEndVal = tietStartVal + soTietVal - 1;
                                      return (
                                        <div className="space-y-1">
                                          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono font-bold">
                                            <span className="text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/80 px-1.5 py-0.5 rounded">
                                              Tiết {tietStartVal} - {tietEndVal} ({soTietVal} tiết)
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-amber-800 dark:text-amber-300">
                                            <span>{course.maMH}</span>
                                            {course.lop && (
                                              <span className="bg-amber-200/70 dark:bg-amber-900/80 px-1 py-0.2 rounded font-bold truncate max-w-[90px]">
                                                Lớp {course.lop}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 text-[10px] text-zinc-700 dark:text-zinc-200 font-bold pt-0.5">
                                            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                            <span className="truncate">Phòng: {course.phongHoc || lich?.phong || 'Chưa xếp'}</span>
                                          </div>
                                          {course.giangVien && (
                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                                              <User className="w-2.5 h-2.5" />
                                              {course.giangVien}
                                            </div>
                                          )}
                                          {(() => {
                                            const mhNotices = examNotices.filter((n) => {
                                              if (n.maMH !== course.maMH) return false;
                                              if (n.tuanKiemTra && selectedWeek > 0 && Number(n.tuanKiemTra) !== selectedWeek) {
                                                return false;
                                              }
                                              if (n.thuKiemTra && Number(n.thuKiemTra) !== day.key) {
                                                return false;
                                              }
                                              if (n.ngayKiemTra) {
                                                const cellDateStr = getDayDateStr(selectedWeek, day.key);
                                                let noticeDayMonth = '';
                                                if (n.ngayKiemTra.includes('-')) {
                                                  const p = n.ngayKiemTra.split('-');
                                                  if (p.length === 3) noticeDayMonth = `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}`;
                                                } else if (n.ngayKiemTra.includes('/')) {
                                                  const p = n.ngayKiemTra.split('/');
                                                  if (p.length >= 2) noticeDayMonth = `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}`;
                                                }
                                                if (noticeDayMonth && cellDateStr && noticeDayMonth !== cellDateStr) {
                                                  return false;
                                                }
                                              }
                                              return true;
                                            });
                                            if (mhNotices.length === 0) return null;
                                            return (
                                              <div className="mt-1 space-y-1">
                                                {mhNotices.map((notice) => (
                                                  <div
                                                    key={notice.id}
                                                    className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-start gap-1 shadow-xs ${
                                                      notice.loai === '15_PHUT'
                                                        ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                                        : notice.loai === 'GIUA_KY'
                                                        ? 'bg-purple-100 dark:bg-purple-950/90 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800'
                                                        : 'bg-blue-100 dark:bg-blue-950/90 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                                                    }`}
                                                    title={`${notice.tieuDe}: ${notice.noiDung}`}
                                                  >
                                                    <BellRing className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                    <div className="line-clamp-2">
                                                      <span className="font-extrabold underline mr-1">
                                                        {notice.loai === '15_PHUT' ? 'KT 15p:' : notice.loai === 'GIUA_KY' ? 'KT Giữa kỳ:' : 'Thông báo:'}
                                                      </span>
                                                      {notice.tieuDe}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          })()}
                                          {isAdminOrLecturer && (
                                            <div className="pt-1 flex items-center gap-1 border-t border-amber-200/60 dark:border-amber-800/60">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openAttendanceForSchedule(course, day.key);
                                                }}
                                                className="px-1.5 py-0.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-bold flex items-center gap-0.5"
                                                title="Điểm danh lớp môn này"
                                              >
                                                <UserCheck className="w-2.5 h-2.5" /> Điểm danh
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openExamNoticeForSchedule(course, day.key);
                                                }}
                                                className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 rounded text-[9px] font-bold flex items-center gap-0.5"
                                                title="Đăng thông báo kiểm tra 15p / Giữa kỳ"
                                              >
                                                <BellRing className="w-2.5 h-2.5" /> Đăng KT
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={day.key}
                            rowSpan={1}
                            className="p-1 border-r border-zinc-200 dark:border-zinc-700 align-middle hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                          >
                            {isAdminOrLecturer ? (
                              <button
                                onClick={() => handleQuickAddSlot(day.key, pNum)}
                                className="w-full h-8 flex items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 text-[10px] font-semibold text-zinc-400 hover:text-amber-600 transition-all cursor-pointer opacity-30 hover:opacity-100"
                                title={`Thêm môn vào ${day.label}, Tiết ${pNum}`}
                              >
                                <Plus className="w-3 h-3" /> Thêm
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
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center p-4 pt-20 sm:pt-24 pb-6 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-xl p-6 shadow-2xl relative max-h-[calc(100vh-7rem)] flex flex-col">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Thêm Mới Thời Khóa Biểu Thủ Công
              </h3>
            </div>
            <form onSubmit={handleSubmitAdd} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div>
                  <label className="font-semibold block mb-1">Lớp học áp dụng *</label>
                  <select
                    value={form.lop}
                    onChange={(e) => setForm({ ...form, lop: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
                  >
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        Lớp {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Phạm vi áp dụng</label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.applyToClass}
                        onChange={(e) => setForm({ ...form, applyToClass: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        Áp dụng toàn bộ sinh viên trong lớp
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                  <label className="font-semibold block">Môn học *</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
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
                          coSo: 'Cơ sở chính',
                        }));
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-900 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Điền nhanh tiết Chào cờ Tiểu đoàn (1 tiết)"
                    >
                      <span>★ Chào cờ Tiểu đoàn (1T)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          maMH: 'CHAO_CO',
                          tenMH: 'Chào cờ Nhà trường',
                          soTinChi: 0,
                          thu: 2,
                          tietBatDau: 1,
                          soTiet: 2,
                          phongHoc: 'Sân chào cờ',
                          giangVien: 'Ban Giám hiệu / Nhà trường',
                          coSo: 'Cơ sở chính',
                        }));
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-950/80 hover:bg-red-200 text-red-900 dark:text-red-200 rounded border border-red-300 dark:border-red-700 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Điền nhanh tiết Chào cờ Nhà trường (2 tiết)"
                    >
                      <span>🏫 Chào cờ Nhà trường (2T)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingHolidayItem(null);
                        setIsHolidayModalOpen(true);
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-200 rounded border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Thêm lịch nghỉ lễ (admin ghi cụ thể dịp lễ và chỉ chọn khoảng ngày nghỉ, không cần chọn tiết)"
                    >
                      <span>🎉 + Thêm Nghỉ lễ</span>
                    </button>
                    {subjects && subjects.length > filteredFormSubjects.length && (
                      <button
                        type="button"
                        onClick={() => setShowAllSubjectsInForm(!showAllSubjectsInForm)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {showAllSubjectsInForm ? `Chỉ hiện môn lớp ${form.lop}` : `Hiện tất cả (${subjects.length} môn)`}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={form.maMH}
                    onChange={(e) => handleQuickCourseSelect(e.target.value)}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-xs font-semibold"
                  >
                    <option value="">-- Chọn môn từ Danh mục môn học ({filteredFormSubjects.length} môn phù hợp) --</option>
                    {filteredFormSubjects && filteredFormSubjects.length > 0 ? (
                      filteredFormSubjects.map((sub) => (
                        <option key={sub.maMH} value={sub.maMH}>
                          {sub.maMH} - {sub.tenMH} ({sub.soTinChi} TC){(sub.hocKy || sub.namHoc) ? ` [${[sub.hocKy, sub.namHoc].filter(Boolean).join('  ')}]` : ''}{sub.lop && sub.lop !== 'ALL' ? ` (${sub.lop})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Chưa có môn học cho lớp này trong Danh mục môn học</option>
                    )}
                  </select>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Mã HP (VD: CNTT101)"
                    value={form.maMH}
                    onChange={(e) => handleMaMHInputChange(e.target.value)}
                    className="p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-semibold text-xs"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Tên môn học / Hoạt Động"
                    value={form.tenMH}
                    onChange={(e) => setForm({ ...form, tenMH: e.target.value })}
                    className="col-span-2 p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-semibold text-xs"
                    required
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      placeholder="Số TC (0 nếu HĐ)"
                      disabled={form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ')}
                      value={form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ') ? 0 : form.soTinChi}
                      onChange={(e) => setForm({ ...form, soTinChi: Number(e.target.value) })}
                      className={`w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-semibold text-xs ${
                        form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ')
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                          : subjects.some((s) => s.maMH.trim().toLowerCase() === form.maMH.trim().toLowerCase())
                          ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : ''
                      }`}
                      title={form.maMH === 'CHAO_CO' || form.tenMH?.toLowerCase().includes('chào cờ') ? 'Chào cờ' : 'Số tín chỉ'}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900 space-y-3">
                {(() => {
                  const matchedSub = subjects.find((s) => s.maMH.trim().toLowerCase() === form.maMH.trim().toLowerCase());
                  if (matchedSub && (matchedSub.hocKy || matchedSub.namHoc)) {
                    return (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/60 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          Đã tự động điền <strong>Học kỳ ({form.hocKy})</strong> và <strong>Năm học ({form.namHoc})</strong> theo môn học <strong>{matchedSub.tenMH}</strong> đã chọn.
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="font-semibold block mb-1 text-xs">Học kỳ</label>
                    <select
                      value={form.hocKy}
                      onChange={(e) => setForm({ ...form, hocKy: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg text-xs font-semibold"
                    >
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
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                      <label className="font-semibold text-xs">Năm học *</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsManualNamHoc(!isManualNamHoc)}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isManualNamHoc ? ' Chọn từ danh sách' : '+ Thêm năm học thủ công'}
                        </button>
                      </div>
                    </div>
                    {isManualNamHoc ? (
                      <input
                        type="text"
                        placeholder="Nhập năm học thủ công (VD: 2026-2027, 2027-2028)"
                        value={manualNamHocInput}
                        onChange={(e) => setManualNamHocInput(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border border-blue-400 rounded-lg font-mono font-bold text-blue-700 dark:text-blue-300 text-xs"
                        required
                      />
                    ) : (
                      <select
                        value={form.namHoc}
                        onChange={(e) => {
                          if (e.target.value === '__MANUAL__') {
                            setIsManualNamHoc(true);
                          } else {
                            setForm({ ...form, namHoc: e.target.value });
                          }
                        }}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-mono font-bold text-xs"
                      >
                        {availableNamHocOptions.map((y) => (
                          <option key={y} value={y}>
                            Năm học {y}
                          </option>
                        ))}
                        {!availableNamHocOptions.includes(form.namHoc) && form.namHoc && (
                          <option value={form.namHoc}>Năm học {form.namHoc}</option>
                        )}
                        <option value="__MANUAL__">+ Thêm năm học mới thủ công...</option>
                      </select>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-blue-100 dark:border-blue-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-blue-950 dark:text-blue-100">
                      Cấu hình tuần học *
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="weekMode"
                          checked={weekSelectionMode === 'range'}
                          onChange={() => setWeekSelectionMode('range')}
                          className="text-blue-600"
                        />
                        <span>Theo khoảng tuần</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="weekMode"
                          checked={weekSelectionMode === 'custom_list'}
                          onChange={() => setWeekSelectionMode('custom_list')}
                          className="text-blue-600"
                        />
                        <span>Chọn từng tuần thủ công</span>
                      </label>
                    </div>
                  </div>
                  {weekSelectionMode === 'range' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="font-semibold block mb-1">Tuần bắt đầu *</label>
                          <input
                            type="number"
                            min={1}
                            value={form.tuanTu}
                            onChange={(e) => setForm({ ...form, tuanTu: Math.max(1, Number(e.target.value)) })}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">Tuần kết thúc *</label>
                          <input
                            type="number"
                            min={1}
                            value={form.tuanDen}
                            onChange={(e) => setForm({ ...form, tuanDen: Math.max(1, Number(e.target.value)) })}
                            className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
                            required
                          />
                        </div>
                        <div className="col-span-2 text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/40 p-2 rounded-lg flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>
                            Tổng số: {Math.max(Number(form.tuanDen) - Number(form.tuanTu) + 1, 1)} tuần (Tuần {form.tuanTu} ➔ Tuần {form.tuanDen})
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                          Tích chọn các tuần áp dụng lịch học này:
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const list = Array.from({ length: 15 }, (_, i) => i + 1);
                              setSelectedCustomWeeks(list);
                              setCustomWeekTextInput(list.join(', '));
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border hover:bg-zinc-200 cursor-pointer"
                          >
                            1-15
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const list = Array.from({ length: 20 }, (_, i) => i + 1);
                              setSelectedCustomWeeks(list);
                              setCustomWeekTextInput(list.join(', '));
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border hover:bg-zinc-200 cursor-pointer"
                          >
                            1-20
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const list = Array.from({ length: 30 }, (_, i) => i + 1);
                              setSelectedCustomWeeks(list);
                              setCustomWeekTextInput(list.join(', '));
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border hover:bg-zinc-200 cursor-pointer"
                          >
                            1-30
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const list = Array.from({ length: 52 }, (_, i) => i + 1);
                              setSelectedCustomWeeks(list);
                              setCustomWeekTextInput(list.join(', '));
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border hover:bg-zinc-200 cursor-pointer"
                          >
                            1-52
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const list = Array.from({ length: customWeekMaxDisplay }, (_, i) => (i + 1) * 2).filter((w) => w <= customWeekMaxDisplay);
                              setSelectedCustomWeeks(list);
                              setCustomWeekTextInput(list.join(', '));
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border hover:bg-zinc-200 cursor-pointer"
                          >
                            Chẵn
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const list = Array.from({ length: customWeekMaxDisplay }, (_, i) => i * 2 + 1).filter((w) => w <= customWeekMaxDisplay);
                              setSelectedCustomWeeks(list);
                              setCustomWeekTextInput(list.join(', '));
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border hover:bg-zinc-200 cursor-pointer"
                          >
                            Lẻ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomWeeks([]);
                              setCustomWeekTextInput('');
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1 max-h-40 overflow-y-auto p-1 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        {Array.from({ length: customWeekMaxDisplay }, (_, i) => i + 1).map((w) => {
                          const isSel = selectedCustomWeeks.includes(w);
                          return (
                            <button
                              type="button"
                              key={w}
                              onClick={() => toggleCustomWeekSelect(w)}
                              className={`p-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                              }`}
                            >
                              T{w}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                          Nhập danh sách tuần tự do:
                        </span>
                        <input
                          type="text"
                          placeholder="Ví dụ: 1, 2, 3, 5, 8, 12, 24, 30, 45"
                          value={customWeekTextInput}
                          onChange={(e) => handleCustomWeekTextInput(e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-zinc-900 border rounded-lg text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-400 font-semibold pt-1">
                        <span>
                          Đã chọn {selectedCustomWeeks.length} tuần: {selectedCustomWeeks.length > 0 ? selectedCustomWeeks.join(', ') : 'Chưa chọn'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomWeekMaxDisplay((prev) => (prev <= 20 ? 52 : prev <= 30 ? 52 : 20))}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-bold"
                        >
                          {customWeekMaxDisplay <= 30 ? '+ Mở rộng hiển thị 52 tuần' : 'Thu gọn về 20 tuần'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t border-blue-100 dark:border-blue-900/60 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Ngày bắt đầu Tuần 1 * (nhập thủ công):
                      </label>
                      <input
                        type="date"
                        value={formWeek1StartDate}
                        onChange={(e) => setFormWeek1StartDate(e.target.value)}
                        className="p-1.5 bg-white dark:bg-zinc-900 border rounded-lg font-bold font-mono text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/80 space-y-1.5">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-[11px]">
                        Tuần (thứ 2 - thứ 7):
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {daysOfWeek.map((day) => (
                          <div key={day.key} className="text-center">
                            <span className="text-[10px] font-bold text-zinc-500 block">{day.label}</span>
                            <input
                              type="text"
                              value={formManualDayOverrides[day.key] || ''}
                              onChange={(e) =>
                                setFormManualDayOverrides({
                                  ...formManualDayOverrides,
                                  [day.key]: e.target.value,
                                })
                              }
                              className="w-full text-center p-1 font-mono font-bold text-[11px] bg-zinc-50 dark:bg-zinc-800 border rounded-md"
                              placeholder="dd/mm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Thứ học *</label>
                  <select
                    value={form.thu}
                    onChange={(e) => setForm({ ...form, thu: Number(e.target.value) })}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-bold"
                  >
                    {daysOfWeek.map((day) => (
                      <option key={day.key} value={day.key}>
                        {day.label} ({formManualDayOverrides[day.key] || getDayDateStr(form.tuanTu, day.key)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Tiết bắt đầu *</label>
                  <select
                    value={form.tietBatDau}
                    onChange={(e) => setForm({ ...form, tietBatDau: Number(e.target.value) })}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-bold"
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
                    ].map((item) => (
                      <option key={item.tiet} value={item.tiet}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Số tiết học *</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.soTiet}
                    onChange={(e) => setForm({ ...form, soTiet: Number(e.target.value) })}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-bold"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Giảng viên giảng dạy</label>
                  <input
                    type="text"
                    value={form.giangVien}
                    onChange={(e) => setForm({ ...form, giangVien: e.target.value })}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Phòng học / Giảng đường</label>
                  <input
                    type="text"
                    value={form.phongHoc}
                    onChange={(e) => setForm({ ...form, phongHoc: e.target.value })}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg font-mono font-bold"
                  />
                </div>
              </div>
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận Thêm TKB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center p-4 pt-20 sm:pt-24 pb-6 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl p-6 shadow-2xl relative max-h-[calc(100vh-7rem)] flex flex-col">
            <button
              onClick={() => {
                setIsImportModalOpen(false);
                setImportedDataPreview([]);
                setImportFile(null);
                setImportError(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-4 shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Import Thời Khóa Biểu Bằng File Excel
                </h3>
                <p className="text-xs text-zinc-500">
                  Tải danh sách lịch học môn học từ tập tin Excel (.xlsx, .xls) vào hệ thống
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs mb-4">
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
                  Lớp mặc nh (nếu file thiếu):
                </label>
                <select
                  value={importDefaultLop}
                  onChange={(e) => setImportDefaultLop(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
                >
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      Lớp {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
                  Học kỳ mặc nh:
                </label>
                <select
                  value={importDefaultHocKy}
                  onChange={(e) => setImportDefaultHocKy(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
                >
                  <option value="HK1">Học kỳ 1</option>
                  <option value="HK2">Học kỳ 2</option>
                  <option value="HK3">Học kỳ 3</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
                  Năm học mặc nh:
                </label>
                <select
                  value={importDefaultNamHoc}
                  onChange={(e) => setImportDefaultNamHoc(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-zinc-900 border rounded-lg font-bold"
                >
                  {availableNamHocOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 rounded-2xl text-center relative mb-4">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Kéo thả file Excel TKB vào ây hoặc <span className="text-emerald-600 dark:text-emerald-400 underline">bấm f chọn file</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Hỗ trợ định dạng .xlsx, .xls (Cột tiêu đề: Mã HP, Tên môn học, Số TC, Thứ, Tiết bắt đầu, Số tiết, Tuần bắt đầu, Tuần kết thúc, Danh sách tuần, Ngày bắt đầu...)
                  </p>
                </div>
                <div className="pt-2 z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadSampleTemplate();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải File Excel Mẫu (.xlsx)
                  </button>
                </div>
              </div>
            </div>
            {importError && (
              <div className="p-3 mb-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{importError}</span>
              </div>
            )}
            {importedDataPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Xem trưc danh sách môn học parsed được ({importedDataPreview.length} môn)
                  </span>
                  <span className="text-[11px] text-zinc-500">File: {importFile?.name}</span>
                </div>
                <div className="max-h-60 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-xl">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold sticky top-0 border-b border-zinc-200 dark:border-zinc-700">
                        <th className="p-2 w-8 text-center">#</th>
                        <th className="p-2">Mã HP</th>
                        <th className="p-2">Tên môn học</th>
                        <th className="p-2">TC</th>
                        <th className="p-2">Lớp</th>
                        <th className="p-2">HK & Năm</th>
                        <th className="p-2">Thứ / Tiết</th>
                        <th className="p-2">Tuần học</th>
                        <th className="p-2">Phòng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                      {importedDataPreview.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <td className="p-2 text-center text-zinc-400">{idx + 1}</td>
                          <td className="p-2 font-mono font-bold text-blue-600 dark:text-blue-400">{item.maMH}</td>
                          <td className="p-2 font-bold text-zinc-900 dark:text-white">{item.tenMH}</td>
                          <td className="p-2 text-center">{item.soTinChi}</td>
                          <td className="p-2 font-semibold text-purple-600 dark:text-purple-400">{item.lop}</td>
                          <td className="p-2">{item.hocKy} ({item.namHoc})</td>
                          <td className="p-2 font-bold">Thứ {item.thu} (Tiết {item.tietBatDau}-{item.tietBatDau + item.soTiet - 1})</td>
                          <td className="p-2 font-semibold text-emerald-700 dark:text-emerald-400">
                            {item.danhSachTuan ? `Tuần ${item.danhSachTuan.slice(0, 5).join(',')}${item.danhSachTuan.length > 5 ? '...' : ''}` : `Tuần ${item.tuanTu}-${item.tuanDen}`}
                          </td>
                          <td className="p-2 font-mono">{item.phongHoc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="pt-4 mt-4 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Thời khóa biểu sau khi import sẽ áp dụng trực tiếp cho lớp học tương ứng.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportedDataPreview([]);
                    setImportFile(null);
                  }}
                  className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={importedDataPreview.length === 0 || isImporting}
                  onClick={handleExecuteImportExcel}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isImporting ? (
                    <span>Đang import...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Xác nhận Import ({importedDataPreview.length} môn)
                    </>
                  )}
                </button>
              </div>
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
      {isDeleteScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsDeleteScheduleModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-1 shrink-0">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/60 rounded-xl text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Xóa Thời Khóa Biểu
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Chọn năm học và học kỳ để xóa thời khóa biểu đã chọn khỏi hệ thống.
                </p>
              </div>
            </div>

            {/* Form Selection */}
            <div className="mt-4 space-y-3.5 shrink-0">
              {/* Học kỳ */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Học kỳ:
                </label>
                <select
                  value={deleteTargetHocKy}
                  onChange={(e) => setDeleteTargetHocKy(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="ALL">Tất cả HK</option>
                  {availableSemesterOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Năm học */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Năm học:
                </label>
                <select
                  value={deleteTargetNamHoc}
                  onChange={(e) => setDeleteTargetNamHoc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="ALL">Tất cả năm học</option>
                  {availableNamHocOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lớp học */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Lớp học:
                </label>
                <select
                  value={deleteTargetLop}
                  onChange={(e) => setDeleteTargetLop(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="ALL">Tất cả các lớp</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview of items to be deleted */}
            <div className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                <span className="text-zinc-700 dark:text-zinc-300">
                  Số môn học sẽ bị xóa:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                    matchingDeleteItems.length > 0
                      ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {matchingDeleteItems.length} môn
                </span>
              </div>

              {matchingDeleteItems.length > 0 ? (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-y-auto max-h-36 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs bg-zinc-50/60 dark:bg-zinc-800/40 p-1">
                  {matchingDeleteItems.map((item, idx) => (
                    <div key={item.id || idx} className="p-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-900 dark:text-white truncate">
                          {item.tenMH || item.maMH}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                          <span className="font-mono">{item.maMH}</span>
                          <span>•</span>
                          <span>{item.lop || 'Tất cả lớp'}</span>
                          <span>•</span>
                          <span>Thứ {item.thu} (Tiết {item.tietBatDau} - {item.tietBatDau + (item.soTiet || 1) - 1})</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
                        {item.namHoc} • {item.hocKy}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Không có môn học thời khóa biểu nào khớp với bộ lọc đã chọn.
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsDeleteScheduleModalOpen(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={matchingDeleteItems.length === 0 || isDeletingSchedule}
                onClick={handleExecuteDeleteSchedule}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isDeletingSchedule ? 'Đang xóa...' : `Xóa ${matchingDeleteItems.length} môn TKB`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold border border-zinc-700 animate-in slide-in-from-bottom-5">
          {toastMsg}
        </div>
      )}
    </div>
  );
};

