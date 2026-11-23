import React, { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Building,
  Calendar,
  ChevronRight,
  Download,
  Eye,
  Filter,
  GraduationCap,
  RotateCcw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import {
  Diem,
  DiemDanh,
  HocKy,
  MonHoc,
  RenLuyen,
  SinhVien,
  ThiLaiHocLai,
  ThoiKhoaBieu,
  ThongBaoKiemTra,
} from '../../../types';
import { convertGradeScale, getTrainingClassification } from '../../../utils/gradeHelper';
import { SPECIALIZED_FACULTIES } from '../../../utils/classHelper';
import { EmptyState, PaginationBar } from '../../common';
import { AcademicGradeStatsCard } from '../AcademicGradeStatsCard';
import { DashboardAlertCenter } from './DashboardAlertCenter';
import { DashboardKpiItem, DashboardKpiRow } from './DashboardKpiRow';
import {
  DashboardAlertItem,
  ExportCurrentFilterRequest,
  formatShortDateVi,
  getTimePresetLabel,
  GlobalTimePreset,
  isDateWithinGlobalTime,
  TIME_PRESET_OPTIONS,
} from './dashboardTypes';

interface AdminOverviewDashboardProps {
  activeSemester: string;
  semesters: HocKy[];
  students: SinhVien[];
  grades: Diem[];
  schedule: ThoiKhoaBieu[];
  subjects: MonHoc[];
  trainingPoints: RenLuyen[];
  retakes: ThiLaiHocLai[];
  attendanceList: DiemDanh[];
  examNotices: ThongBaoKiemTra[];
  lastUpdatedLabel: string;
  onSwitchView?: (view: string) => void;
  onOpenFullProfile?: (maSV: string) => void;
  onOpenClassDrilldown: (classCode?: string) => void;
  onExportWithFilters: (req: ExportCurrentFilterRequest) => void;
}

export const AdminOverviewDashboard: React.FC<AdminOverviewDashboardProps> = ({
  activeSemester,
  semesters,
  students,
  grades,
  schedule,
  subjects,
  trainingPoints,
  retakes,
  attendanceList,
  examNotices,
  lastUpdatedLabel,
  onSwitchView,
  onOpenFullProfile,
  onOpenClassDrilldown,
  onExportWithFilters,
}) => {
  // Global Time & Hierarchical Scope Filters
  const [timePreset, setTimePreset] = useState<GlobalTimePreset>('SEMESTER');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [filterSemester, setFilterSemester] = useState<string>('ALL');
  const [filterCampus, setFilterCampus] = useState<string>('ALL');
  const [filterFaculty, setFilterFaculty] = useState<string>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>(() => String(new Date().getMonth() + 1));

  // Action queue table state
  const [queueSearch, setQueueSearch] = useState<string>('');
  const [queuePage, setQueuePage] = useState<number>(1);
  const [queuePageSize, setQueuePageSize] = useState<number>(8);

  // Dynamic catalog options strictly from existing DB records
  const availableSemesters = useMemo(() => {
    const map = new Map<string, string>();
    semesters.forEach((hk) => {
      if (hk.hocKyID) {
        map.set(hk.hocKyID, hk.tenHocKy ? `${hk.tenHocKy} (${hk.hocKyID})` : hk.hocKyID);
      }
    });
    grades.forEach((g) => {
      if (g.hocKy && !map.has(g.hocKy)) map.set(g.hocKy, g.hocKy);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [semesters, grades]);

  const availableCampuses = useMemo(() => {
    const set = new Set<string>();
    schedule.forEach((sch) => {
      (sch.lichHoc || []).forEach((slot) => {
        if (slot.coSo?.trim()) set.add(slot.coSo.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [schedule]);

  const campusClassSet = useMemo(() => {
    if (filterCampus === 'ALL') return null;
    const set = new Set<string>();
    schedule.forEach((sch) => {
      const hasCampus = (sch.lichHoc || []).some((slot) => slot.coSo?.trim() === filterCampus);
      if (hasCampus && sch.lop) set.add(sch.lop);
    });
    return set;
  }, [schedule, filterCampus]);

  const availableFaculties = useMemo(() => {
    const set = new Set<string>(SPECIALIZED_FACULTIES);
    students.forEach((s) => {
      if (campusClassSet && (!s.lop || !campusClassSet.has(s.lop))) return;
      if (s.khoa) set.add(s.khoa);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [students, campusClassSet]);

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (campusClassSet && (!s.lop || !campusClassSet.has(s.lop))) return;
      if (filterFaculty !== 'ALL' && s.khoa !== filterFaculty) return;
      if (s.lop) set.add(s.lop);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [students, campusClassSet, filterFaculty]);

  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((sub) => {
      if (filterFaculty !== 'ALL' && sub.khoa && sub.khoa !== filterFaculty && sub.khoaPhuTrach !== filterFaculty) {
        return;
      }
      if (filterClass !== 'ALL' && sub.lop && sub.lop !== 'all' && sub.lop !== filterClass) {
        return;
      }
      if (sub.maMH) map.set(sub.maMH, sub.tenMH || sub.maMH);
    });
    grades.forEach((g) => {
      if (g.maMH && !map.has(g.maMH)) map.set(g.maMH, g.tenMH || g.maMH);
    });
    return Array.from(map.entries())
      .map(([maMH, tenMH]) => ({ maMH, tenMH }))
      .sort((a, b) => a.maMH.localeCompare(b.maMH));
  }, [subjects, grades, filterFaculty, filterClass]);

  const availableMonths = useMemo(() => {
    const set = new Set<number>([new Date().getMonth() + 1]);
    trainingPoints.forEach((r) => {
      if (typeof r.thang === 'number' && r.thang >= 1 && r.thang <= 12) set.add(r.thang);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [trainingPoints]);

  const hasActiveFilters =
    timePreset !== 'SEMESTER' ||
    filterSemester !== 'ALL' ||
    filterCampus !== 'ALL' ||
    filterFaculty !== 'ALL' ||
    filterClass !== 'ALL' ||
    filterSubject !== 'ALL';

  const handleResetFilters = () => {
    setTimePreset('SEMESTER');
    setCustomStart('');
    setCustomEnd('');
    setFilterSemester('ALL');
    setFilterCampus('ALL');
    setFilterFaculty('ALL');
    setFilterClass('ALL');
    setFilterSubject('ALL');
    setQueuePage(1);
  };

  // Filtered Core Entities (Global Filter applies consistently across all KPIs, tables, alerts)
  const scopedStudents = useMemo(() => {
    return students.filter((s) => {
      if (campusClassSet && (!s.lop || !campusClassSet.has(s.lop))) return false;
      if (filterFaculty !== 'ALL' && s.khoa !== filterFaculty) return false;
      if (filterClass !== 'ALL' && s.lop !== filterClass) return false;
      return true;
    });
  }, [students, campusClassSet, filterFaculty, filterClass]);

  const scopedStudentIds = useMemo(
    () => new Set(scopedStudents.map((s) => s.maSV.toLowerCase())),
    [scopedStudents]
  );

  const scopedClassSet = useMemo(
    () => new Set(scopedStudents.map((s) => s.lop).filter(Boolean)),
    [scopedStudents]
  );

  const scopedGrades = useMemo(() => {
    return grades.filter((g) => {
      if (!scopedStudentIds.has((g.maSV || '').toLowerCase())) return false;
      if (filterSemester !== 'ALL' && g.hocKy && g.hocKy !== filterSemester) return false;
      if (filterSubject !== 'ALL' && g.maMH !== filterSubject) return false;
      return true;
    });
  }, [grades, scopedStudentIds, filterSemester, filterSubject]);

  const scopedAttendance = useMemo(() => {
    return attendanceList.filter((a) => {
      if (!scopedStudentIds.has((a.maSV || '').toLowerCase())) return false;
      if (filterSubject !== 'ALL' && a.maMH !== filterSubject) return false;
      if (!isDateWithinGlobalTime(a.ngay, timePreset, customStart, customEnd)) return false;
      return true;
    });
  }, [attendanceList, scopedStudentIds, filterSubject, timePreset, customStart, customEnd]);

  const scopedExamNotices = useMemo(() => {
    return examNotices.filter((n) => {
      if (filterSubject !== 'ALL' && n.maMH !== filterSubject) return false;
      if (filterClass !== 'ALL' && n.lop && n.lop !== filterClass) return false;
      if (filterSemester !== 'ALL' && n.hocKy && n.hocKy !== filterSemester) return false;
      if (timePreset !== 'SEMESTER') {
        const refDate = n.ngayKiemTra || n.createdAt;
        if (!isDateWithinGlobalTime(refDate, timePreset, customStart, customEnd)) return false;
      }
      return true;
    });
  }, [examNotices, filterSubject, filterClass, filterSemester, timePreset, customStart, customEnd]);

  const scopedRetakes = useMemo(() => {
    return retakes.filter((r) => {
      if (!scopedStudentIds.has((r.maSV || '').toLowerCase())) return false;
      if (filterSubject !== 'ALL' && r.maMH !== filterSubject) return false;
      if (filterSemester !== 'ALL' && r.hocKy && r.hocKy !== filterSemester) return false;
      if (timePreset !== 'SEMESTER' && r.ngayDangKy) {
        if (!isDateWithinGlobalTime(r.ngayDangKy, timePreset, customStart, customEnd)) return false;
      }
      return true;
    });
  }, [retakes, scopedStudentIds, filterSubject, filterSemester, timePreset, customStart, customEnd]);

  const targetTrainingMonth = useMemo(() => {
    if (timePreset === 'TODAY' || timePreset === 'WEEK' || timePreset === 'MONTH') {
      return new Date().getMonth() + 1;
    }
    return Number(filterMonth);
  }, [timePreset, filterMonth]);

  const scopedTraining = useMemo(() => {
    return trainingPoints.filter((r) => {
      if (!scopedStudentIds.has((r.maSV || '').toLowerCase())) return false;
      if (!Number.isNaN(targetTrainingMonth) && r.thang !== targetTrainingMonth) return false;
      return true;
    });
  }, [trainingPoints, scopedStudentIds, targetTrainingMonth]);

  // Academic KPI Summary
  const academicMetrics = useMemo(() => {
    let sum4 = 0;
    let passed = 0;
    let failed = 0;
    let validCount = 0;

    scopedGrades.forEach((g) => {
      const s4 =
        typeof g.diemThang4 === 'number' && !Number.isNaN(g.diemThang4)
          ? g.diemThang4
          : typeof g.diemTongKet10 === 'number' && !Number.isNaN(g.diemTongKet10)
          ? convertGradeScale(g.diemTongKet10).thang4
          : null;
      if (s4 === null) return;
      validCount++;
      sum4 += s4;
      if (s4 >= 1.0) passed++;
      else failed++;
    });

    return {
      validCount,
      passed,
      failed,
      avg4: validCount > 0 ? Math.round((sum4 / validCount) * 100) / 100 : null,
      passRate: validCount > 0 ? Math.round((passed / validCount) * 1000) / 10 : null,
    };
  }, [scopedGrades]);

  // Grade Entry Progress by Subject (detect incomplete classes/subjects)
  const gradeEntryProgress = useMemo(() => {
    const relevantSubjects = subjects.filter((sub) => {
      if (filterSubject !== 'ALL' && sub.maMH !== filterSubject) return false;
      if (filterSemester !== 'ALL' && sub.hocKy && sub.hocKy !== filterSemester) return false;
      if (filterClass !== 'ALL' && sub.lop && sub.lop !== 'all' && sub.lop !== filterClass) return false;
      if (filterFaculty !== 'ALL' && sub.khoa && sub.khoa !== filterFaculty && sub.khoaPhuTrach !== filterFaculty) {
        return false;
      }
      return true;
    });

    const rows = relevantSubjects.map((sub) => {
      const targetStudents = scopedStudents.filter(
        (s) => !sub.lop || sub.lop === 'all' || s.lop === sub.lop
      );
      const targetIds = new Set(targetStudents.map((s) => s.maSV.toLowerCase()));
      const gradedIds = new Set(
        scopedGrades
          .filter((g) => g.maMH === sub.maMH && targetIds.has((g.maSV || '').toLowerCase()))
          .map((g) => g.maSV.toLowerCase())
      );
      const expected = targetStudents.length;
      const entered = gradedIds.size;
      const missing = Math.max(0, expected - entered);
      const percent = expected > 0 ? Math.round((entered / expected) * 100) : 0;
      return {
        maMH: sub.maMH,
        tenMH: sub.tenMH || sub.maMH,
        lop: sub.lop && sub.lop !== 'all' ? sub.lop : 'Nhiều lớp',
        expected,
        entered,
        missing,
        percent,
      };
    });

    // Sort incomplete subjects with expected students first
    return rows
      .filter((r) => r.expected > 0)
      .sort((a, b) => a.percent - b.percent || b.missing - a.missing);
  }, [subjects, scopedStudents, scopedGrades, filterSubject, filterSemester, filterClass, filterFaculty]);

  const incompleteGradeSubjects = useMemo(
    () => gradeEntryProgress.filter((r) => r.missing > 0),
    [gradeEntryProgress]
  );

  // Attendance Breakdown
  const attendanceMetrics = useMemo(() => {
    let totalMissedPeriods = 0;
    let unexcusedPeriods = 0;
    let excusedPeriods = 0;
    const byStudent = new Map<
      string,
      { maSV: string; hoTen: string; lop: string; periods: number; unexcused: number }
    >();

    scopedAttendance.forEach((a) => {
      const periods = Number(a.soTietNghi || 0);
      totalMissedPeriods += periods;
      if (a.coPhep) excusedPeriods += periods;
      else unexcusedPeriods += periods;

      const key = (a.maSV || '').toLowerCase();
      if (!key) return;
      const stu = scopedStudents.find((s) => s.maSV.toLowerCase() === key);
      const curr = byStudent.get(key) || {
        maSV: a.maSV,
        hoTen: a.hoTenSV || stu?.hoTen || a.maSV,
        lop: a.lop || stu?.lop || 'Chưa rõ lớp',
        periods: 0,
        unexcused: 0,
      };
      curr.periods += periods;
      if (!a.coPhep) curr.unexcused += periods;
      byStudent.set(key, curr);
    });

    const studentAbsenceList = Array.from(byStudent.values()).sort((a, b) => b.periods - a.periods);
    const highAbsenceStudents = studentAbsenceList.filter((s) => s.periods >= 6);
    const criticalAbsenceStudents = studentAbsenceList.filter((s) => s.periods >= 9);

    return {
      recordCount: scopedAttendance.length,
      totalMissedPeriods,
      unexcusedPeriods,
      excusedPeriods,
      studentAbsenceList,
      highAbsenceStudents,
      criticalAbsenceStudents,
    };
  }, [scopedAttendance, scopedStudents]);

  // Training / Conduct Breakdown (reusing official getTrainingClassification)
  const trainingMetrics = useMemo(() => {
    if (scopedTraining.length === 0) {
      return {
        hasData: false,
        total: 0,
        avgScore: null as number | null,
        counts: { xuatSac: 0, tot: 0, kha: 0, trungBinh: 0, yeuKem: 0 },
        goodRate: 0,
      };
    }

    let sum = 0;
    const counts = { xuatSac: 0, tot: 0, kha: 0, trungBinh: 0, yeuKem: 0 };
    scopedTraining.forEach((r) => {
      const score = Number(r.diemRL || 0);
      sum += score;
      const rank = getTrainingClassification(score);
      if (rank === 'Xuất sắc') counts.xuatSac++;
      else if (rank === 'Tốt') counts.tot++;
      else if (rank === 'Khá') counts.kha++;
      else if (rank === 'Trung bình') counts.trungBinh++;
      else counts.yeuKem++;
    });

    const total = scopedTraining.length;
    return {
      hasData: true,
      total,
      avgScore: Math.round((sum / total) * 10) / 10,
      counts,
      goodRate: Math.round(((counts.xuatSac + counts.tot) / total) * 1000) / 10,
    };
  }, [scopedTraining]);

  // Exams & Notifications split
  const examItems = useMemo(
    () => scopedExamNotices.filter((n) => n.loai !== 'THONG_BAO'),
    [scopedExamNotices]
  );
  const announcementItems = useMemo(
    () =>
      [...scopedExamNotices].sort((a, b) =>
        (b.createdAt || b.ngayKiemTra || '').localeCompare(a.createdAt || a.ngayKiemTra || '')
      ),
    [scopedExamNotices]
  );
  const pendingRetakes = useMemo(
    () => scopedRetakes.filter((r) => r.trangThai === 'CHO_DUYET'),
    [scopedRetakes]
  );

  // Actionable Exception Queue (Students needing attention)
  const actionQueueStudents = useMemo(() => {
    const list: Array<{
      maSV: string;
      hoTen: string;
      lop: string;
      khoa: string;
      failedCount: number;
      missedPeriods: number;
      lowTrainingScore: number | null;
      severity: 'CRITICAL' | 'WARNING';
      reasons: string[];
    }> = [];

    scopedStudents.forEach((st) => {
      const code = st.maSV.toLowerCase();
      const stGrades = scopedGrades.filter((g) => g.maSV.toLowerCase() === code);
      const failedCount = stGrades.filter((g) => {
        const s4 =
          typeof g.diemThang4 === 'number' && !Number.isNaN(g.diemThang4)
            ? g.diemThang4
            : convertGradeScale(g.diemTongKet10 || 0).thang4;
        return s4 < 1.0 || g.trangThai === 'FAILED';
      }).length;

      const stAtt = scopedAttendance.filter((a) => a.maSV.toLowerCase() === code);
      const missedPeriods = stAtt.reduce((sum, a) => sum + Number(a.soTietNghi || 0), 0);

      const stRL = scopedTraining.filter((r) => r.maSV.toLowerCase() === code);
      const recentRL = stRL.length > 0 ? stRL[stRL.length - 1].diemRL : null;
      const lowTrainingScore = recentRL !== null && recentRL < 50 ? recentRL : null;

      const reasons: string[] = [];
      if (failedCount > 0) reasons.push(`Chưa đạt ${failedCount} học phần (< 1.0)`);
      if (missedPeriods >= 6) reasons.push(`Vắng ${missedPeriods} tiết`);
      if (lowTrainingScore !== null) reasons.push(`Điểm rèn luyện ${lowTrainingScore}đ (< 50)`);

      if (reasons.length > 0) {
        const isCritical = failedCount >= 2 || missedPeriods >= 9 || lowTrainingScore !== null;
        list.push({
          maSV: st.maSV,
          hoTen: st.hoTen,
          lop: st.lop || 'Chưa xếp lớp',
          khoa: st.khoa || 'Chưa rõ khoa',
          failedCount,
          missedPeriods,
          lowTrainingScore,
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          reasons,
        });
      }
    });

    return list.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'CRITICAL' ? -1 : 1;
      return b.failedCount - a.failedCount || b.missedPeriods - a.missedPeriods;
    });
  }, [scopedStudents, scopedGrades, scopedAttendance, scopedTraining]);

  const filteredQueueStudents = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    if (!q) return actionQueueStudents;
    return actionQueueStudents.filter(
      (s) =>
        s.maSV.toLowerCase().includes(q) ||
        s.hoTen.toLowerCase().includes(q) ||
        s.lop.toLowerCase().includes(q) ||
        s.reasons.some((r) => r.toLowerCase().includes(q))
    );
  }, [actionQueueStudents, queueSearch]);

  const paginatedQueueStudents = useMemo(() => {
    const start = (queuePage - 1) * queuePageSize;
    return filteredQueueStudents.slice(start, start + queuePageSize);
  }, [filteredQueueStudents, queuePage, queuePageSize]);

  // Build Alert Center items strictly from real filtered data (WHAT / WHO / WHY / SEVERITY / ACTION)
  const alertItems: DashboardAlertItem[] = useMemo(() => {
    const items: DashboardAlertItem[] = [];

    const failingStudents = actionQueueStudents.filter((s) => s.failedCount > 0);
    if (failingStudents.length > 0) {
      items.push({
        id: 'admin-academic-risk',
        severity: failingStudents.some((s) => s.failedCount >= 2) ? 'CRITICAL' : 'WARNING',
        category: 'ACADEMIC',
        what: `${failingStudents.length} sinh viên có học phần chưa đạt (Hệ 4 < 1.0)`,
        who: `${scopedClassSet.size} lớp trong phạm vi lọc`,
        why: `Tổng ${academicMetrics.failed} lượt điểm F cần theo dõi học vụ & thi lại`,
        actionLabel: 'Xem kết quả theo lớp',
        targetView: 'CLASS_DRILLDOWN',
        count: failingStudents.length,
      });
    }

    if (attendanceMetrics.criticalAbsenceStudents.length > 0) {
      items.push({
        id: 'admin-attendance-critical',
        severity: 'CRITICAL',
        category: 'ATTENDANCE',
        what: `${attendanceMetrics.criticalAbsenceStudents.length} sinh viên vắng từ 9 tiết trở lên`,
        who: attendanceMetrics.criticalAbsenceStudents
          .slice(0, 2)
          .map((s) => `${s.hoTen} (${s.lop})`)
          .join(', '),
        why: `Tổng ${attendanceMetrics.unexcusedPeriods} tiết vắng không phép trong kỳ lọc`,
        actionLabel: 'Kiểm tra điểm danh',
        targetView: 'attendance',
        count: attendanceMetrics.criticalAbsenceStudents.length,
      });
    } else if (attendanceMetrics.highAbsenceStudents.length > 0) {
      items.push({
        id: 'admin-attendance-warning',
        severity: 'WARNING',
        category: 'ATTENDANCE',
        what: `${attendanceMetrics.highAbsenceStudents.length} sinh viên có số tiết vắng cần theo dõi (≥ 6 tiết)`,
        who: attendanceMetrics.highAbsenceStudents
          .slice(0, 2)
          .map((s) => `${s.hoTen} (${s.lop})`)
          .join(', '),
        why: `Ghi nhận ${attendanceMetrics.totalMissedPeriods} tiết vắng trong phạm vi lọc`,
        actionLabel: 'Xem chi tiết chuyên cần',
        targetView: 'attendance',
        count: attendanceMetrics.highAbsenceStudents.length,
      });
    }

    if (incompleteGradeSubjects.length > 0) {
      const topMissing = incompleteGradeSubjects[0];
      items.push({
        id: 'admin-incomplete-grades',
        severity: 'WARNING',
        category: 'ACADEMIC',
        what: `${incompleteGradeSubjects.length} học phần chưa hoàn tất nhập điểm`,
        who: `${topMissing.tenMH} (${topMissing.lop}) còn thiếu ${topMissing.missing} SV`,
        why: 'Cần đôn đốc giảng viên hoàn thiện bảng điểm học phần',
        actionLabel: 'Kiểm tra bảng điểm',
        targetView: 'grades',
        count: incompleteGradeSubjects.length,
      });
    }

    if (pendingRetakes.length > 0) {
      items.push({
        id: 'admin-pending-retakes',
        severity: 'WARNING',
        category: 'RETAKE',
        what: `${pendingRetakes.length} đơn đăng ký thi lại / học lại đang chờ duyệt`,
        who: `${new Set(pendingRetakes.map((r) => r.maSV)).size} sinh viên đã gửi yêu cầu`,
        why: 'Cần phê duyệt kịp thời trước thời hạn tổ chức thi lại',
        actionLabel: 'Duyệt đơn thi lại',
        targetView: 'retakes',
        count: pendingRetakes.length,
      });
    }

    if (trainingMetrics.counts.yeuKem > 0) {
      items.push({
        id: 'admin-low-training',
        severity: 'CRITICAL',
        category: 'TRAINING',
        what: `${trainingMetrics.counts.yeuKem} sinh viên xếp loại rèn luyện Yếu / Kém (< 50 điểm)`,
        who: `Kỳ đánh giá tháng ${targetTrainingMonth}`,
        why: 'Điểm rèn luyện thấp hơn ngưỡng đạt chuẩn học kỳ',
        actionLabel: 'Xem bảng rèn luyện',
        targetView: 'training',
        count: trainingMetrics.counts.yeuKem,
      });
    }

    if (examItems.length > 0) {
      const nextExam = examItems[0];
      items.push({
        id: 'admin-upcoming-exams',
        severity: 'INFO',
        category: 'EXAM',
        what: `${examItems.length} lịch thi / kiểm tra trong phạm vi lọc`,
        who: nextExam.tenMH || nextExam.maMH,
        why: nextExam.tieuDe,
        actionLabel: 'Xem lịch thi & kiểm tra',
        targetView: 'schedule',
        dateLabel: nextExam.ngayKiemTra ? formatShortDateVi(nextExam.ngayKiemTra) : undefined,
      });
    }

    return items;
  }, [
    actionQueueStudents,
    scopedClassSet.size,
    academicMetrics.failed,
    attendanceMetrics,
    incompleteGradeSubjects,
    pendingRetakes,
    trainingMetrics.counts.yeuKem,
    targetTrainingMonth,
    examItems,
  ]);

  const handleAlertAction = (alert: DashboardAlertItem) => {
    if (alert.studentCode && onOpenFullProfile) {
      onOpenFullProfile(alert.studentCode);
      return;
    }
    if (alert.targetView === 'CLASS_DRILLDOWN') {
      onOpenClassDrilldown(alert.className);
      return;
    }
    if (alert.targetView && onSwitchView) {
      onSwitchView(alert.targetView);
    }
  };

  // Tier 1 — Know Now KPIs (5 actionable KPIs)
  const kpiItems: DashboardKpiItem[] = [
    {
      id: 'kpi-academic',
      label: 'Kết quả học tập (Hệ 4)',
      value: academicMetrics.avg4 !== null ? academicMetrics.avg4.toFixed(2) : 'Chưa có',
      context:
        academicMetrics.validCount > 0
          ? `Đạt ${academicMetrics.passRate}% (${academicMetrics.passed}/${academicMetrics.validCount} lượt ≥ 1.0)`
          : `${scopedStudents.length} SV · ${scopedClassSet.size} lớp`,
      statusLabel:
        academicMetrics.validCount === 0
          ? 'Chưa có dữ liệu điểm'
          : academicMetrics.failed > 0
          ? `${academicMetrics.failed} lượt chưa đạt`
          : '100% đạt yêu cầu',
      statusTone:
        academicMetrics.validCount === 0
          ? 'neutral'
          : academicMetrics.failed > 0
          ? 'warning'
          : 'good',
      actionHint: 'Theo lớp',
      onClick: () => onOpenClassDrilldown(),
    },
    {
      id: 'kpi-attendance',
      label: 'Chuyên cần & Vắng học',
      value: `${attendanceMetrics.totalMissedPeriods} Vắng`,
      statusLabel:
        attendanceMetrics.criticalAbsenceStudents.length > 0
          ? `${attendanceMetrics.criticalAbsenceStudents.length} SV vắng ≥ 9 tiết`
          : attendanceMetrics.highAbsenceStudents.length > 0
          ? `${attendanceMetrics.highAbsenceStudents.length} SV vắng ≥ 6 tiết`
          : 'Trong ngưỡng ổn định',
      statusTone:
        attendanceMetrics.criticalAbsenceStudents.length > 0
          ? 'critical'
          : attendanceMetrics.highAbsenceStudents.length > 0
          ? 'warning'
          : 'good',
      actionHint: 'Điểm danh',
      onClick: () => onSwitchView?.('attendance'),
    },
    {
      id: 'kpi-training',
      label: `Rèn luyện tháng ${targetTrainingMonth}`,
      value: trainingMetrics.avgScore !== null ? `${trainingMetrics.avgScore}/100` : 'Chưa có',
      context: trainingMetrics.hasData
        ? `${trainingMetrics.total} SV đã đánh giá · ${trainingMetrics.goodRate}% XS & Tốt`
        : 'Chưa có phiếu đánh giá tháng này',
      statusLabel: !trainingMetrics.hasData
        ? 'Chưa đánh giá'
        : trainingMetrics.counts.yeuKem > 0
        ? `${trainingMetrics.counts.yeuKem} SV Yếu / Kém`
        : 'Không có SV Yếu / Kém',
      statusTone: !trainingMetrics.hasData
        ? 'neutral'
        : trainingMetrics.counts.yeuKem > 0
        ? 'critical'
        : 'good',
      actionHint: 'Rèn luyện',
      onClick: () => onSwitchView?.('training'),
    },
    {
      id: 'kpi-exams-retakes',
      label: 'Thi, Kiểm tra & Thi lại',
      value: examItems.length,
      context: `${pendingRetakes.length} đơn thi lại chờ duyệt · ${scopedRetakes.length} tổng đăng ký`,
      statusLabel:
        pendingRetakes.length > 0
          ? `${pendingRetakes.length} đơn cần phê duyệt`
          : examItems.length > 0
          ? 'Đã có lịch kiểm tra'
          : 'Chưa có lịch thi mới',
      statusTone: pendingRetakes.length > 0 ? 'warning' : examItems.length > 0 ? 'info' : 'neutral',
      actionHint: 'Xử lý',
      onClick: () => onSwitchView?.(pendingRetakes.length > 0 ? 'retakes' : 'schedule'),
    },
    {
      id: 'kpi-exceptions',
      label: 'Cần xử lý & Cảnh báo',
      value: actionQueueStudents.length,
      context: `${incompleteGradeSubjects.length} học phần chưa đủ điểm · ${alertItems.filter((a) => a.severity === 'CRITICAL').length} khẩn cấp`,
      statusLabel:
        actionQueueStudents.length > 0
          ? `${actionQueueStudents.filter((s) => s.severity === 'CRITICAL').length} trường hợp ưu tiên cao`
          : 'Không có trường hợp cảnh báo',
      statusTone:
        actionQueueStudents.some((s) => s.severity === 'CRITICAL')
          ? 'critical'
          : actionQueueStudents.length > 0
          ? 'warning'
          : 'good',
      actionHint: 'Danh sách',
      onClick: () => {
        document.getElementById('admin-action-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    },
  ];

  const activeTimeLabel = getTimePresetLabel(
    timePreset,
    customStart,
    customEnd,
    filterSemester !== 'ALL'
      ? availableSemesters.find((hk) => hk.value === filterSemester)?.label || filterSemester
      : activeSemester
  );

  return (
    <div className="space-y-5">
      {/* GLOBAL FILTER BAR (Time + Scope Hierarchy + Export Current Filter) */}
      <section
        aria-label="Bộ lọc toàn cục Dashboard quản trị"
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Global Time Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Bộ lọc thời gian toàn cục"
              className="inline-flex flex-wrap items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md"
            >
              {TIME_PRESET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={timePreset === opt.value}
                  onClick={() => {
                    setTimePreset(opt.value);
                    setQueuePage(1);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                    timePreset === opt.value
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {timePreset === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="date"
                  aria-label="Từ ngày"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="date"
                  aria-label="Đến ngày"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          {/* Meta timestamp & Export according to active filter */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
              Phạm vi: <strong className="text-slate-800 dark:text-slate-200 font-sans">{activeTimeLabel}</strong>
              <span className="mx-1.5 text-slate-300 dark:text-slate-700">·</span>
              Cập nhật {lastUpdatedLabel}
            </span>

            <button
              type="button"
              onClick={() =>
                onExportWithFilters({
                  semester: filterSemester,
                  faculty: filterFaculty,
                  className: filterClass,
                  month: String(targetTrainingMonth),
                  reportType: 'ACADEMIC',
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xuất báo cáo theo bộ lọc</span>
            </button>
          </div>
        </div>

        {/* Hierarchical Scope Cascade: Toàn trường -> Cơ sở -> Khoa -> Lớp -> Học phần */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Phạm vi:</span>
          </span>

          <select
            aria-label="Lọc theo học kỳ"
            value={filterSemester}
            onChange={(e) => {
              setFilterSemester(e.target.value);
              setQueuePage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="ALL">Tất cả học kỳ</option>
            {availableSemesters.map((hk) => (
              <option key={hk.value} value={hk.value}>
                {hk.label}
              </option>
            ))}
          </select>

          {availableCampuses.length > 0 && (
            <select
              aria-label="Lọc theo cơ sở"
              value={filterCampus}
              onChange={(e) => {
                setFilterCampus(e.target.value);
                setFilterFaculty('ALL');
                setFilterClass('ALL');
                setQueuePage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="ALL">Tất cả cơ sở</option>
              {availableCampuses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <select
            aria-label="Lọc theo khoa"
            value={filterFaculty}
            onChange={(e) => {
              setFilterFaculty(e.target.value);
              setFilterClass('ALL');
              setFilterSubject('ALL');
              setQueuePage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="ALL">Toàn trường (Tất cả khoa)</option>
            {availableFaculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc theo lớp"
            value={filterClass}
            onChange={(e) => {
              setFilterClass(e.target.value);
              setQueuePage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="ALL">Tất cả lớp ({availableClasses.length})</option>
            {availableClasses.map((c) => (
              <option key={c} value={c}>
                Lớp {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc theo học phần"
            value={filterSubject}
            onChange={(e) => {
              setFilterSubject(e.target.value);
              setQueuePage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer max-w-[220px]"
          >
            <option value="ALL">Tất cả học phần</option>
            {availableSubjects.map((sub) => (
              <option key={sub.maMH} value={sub.maMH}>
                {sub.maMH} · {sub.tenMH}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc tháng rèn luyện"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer font-mono"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                RL Tháng {m}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </section>

      {/* TIER 1: KNOW NOW (5 Actionable KPIs) */}
      <DashboardKpiRow items={kpiItems} />

      {/* TIER 2: WHAT IS HAPPENING? (12-col: 8 cols Academic Analytics + 4 cols Alert Center) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 space-y-4">
          <AcademicGradeStatsCard
            students={scopedStudents}
            grades={scopedGrades}
            attentionCount={actionQueueStudents.length}
            semesterLabel={
              filterSemester !== 'ALL'
                ? availableSemesters.find((hk) => hk.value === filterSemester)?.label || filterSemester
                : undefined
            }
          />

          {/* Tiến độ nhập điểm học phần */}
          <section
            aria-label="Tiến độ nhập điểm học phần"
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Tiến độ nhập điểm theo học phần
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('grades')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                <span>Mở bảng điểm</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {gradeEntryProgress.length === 0 ? (
              <EmptyState message="Chưa có học phần nào trong phạm vi đang lọc để thống kê tiến độ nhập điểm." />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {gradeEntryProgress.slice(0, 6).map((row) => (
                  <div
                    key={`${row.maMH}-${row.lop}`}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {row.tenMH}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                        {row.maMH} · {row.lop} · {row.entered}/{row.expected} SV đã có điểm
                        {row.missing > 0 && (
                          <span className="text-amber-700 dark:text-amber-400 font-sans font-medium ml-1.5">
                            (Thiếu {row.missing})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:w-48 shrink-0">
                      <div className="flex-1 h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded ${
                            row.percent >= 100
                              ? 'bg-emerald-600'
                              : row.percent >= 50
                              ? 'bg-blue-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, row.percent)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {row.percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Dedicated Exception-First Alert Center (4 cols) */}
        <div className="xl:col-span-4">
          <DashboardAlertCenter
            title="Trung tâm cảnh báo"
            alerts={alertItems}
            onAlertAction={handleAlertAction}
          />
        </div>
      </div>

      {/* TIER 2B: SECONDARY OPERATIONAL MODULES (Attendance / Exams / Training) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance Module */}
        <section
          aria-label="Tổng quan chuyên cần"
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Chuyên cần
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('attendance')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Chi tiết
              </button>
            </div>

            {attendanceMetrics.recordCount === 0 ? (
              <EmptyState message={`Chưa có dữ liệu chuyên cần trong phạm vi "${activeTimeLabel}".`} />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  <span>
                    Tổng vắng: <strong className="text-slate-900 dark:text-slate-100">{attendanceMetrics.totalMissedPeriods}</strong> tiết
                  </span>
                  <span>
                    Không phép: <strong className="text-rose-700 dark:text-rose-400">{attendanceMetrics.unexcusedPeriods}</strong>
                  </span>
                  <span>
                    Có phép: <strong className="text-slate-800 dark:text-slate-200">{attendanceMetrics.excusedPeriods}</strong>
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceMetrics.studentAbsenceList.slice(0, 4).map((st) => (
                    <div key={st.maSV} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenFullProfile?.(st.maSV)}
                          className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-400 truncate block text-left cursor-pointer"
                        >
                          {st.hoTen}
                        </button>
                        <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {st.maSV} · {st.lop}
                        </span>
                      </div>
                      <span
                        className={`font-mono tabular-nums font-semibold shrink-0 ${
                          st.periods >= 9
                            ? 'text-rose-700 dark:text-rose-400'
                            : st.periods >= 6
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {st.periods} tiết
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Exams & Retakes Module */}
        <section
          aria-label="Lịch thi và kiểm tra"
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Thi & Kiểm tra
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('schedule')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Lịch thi
              </button>
            </div>

            {examItems.length === 0 && pendingRetakes.length === 0 ? (
              <EmptyState message={`Chưa có lịch thi hoặc đơn thi lại trong phạm vi "${activeTimeLabel}".`} />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  <span>
                    Lịch kiểm tra: <strong className="text-slate-900 dark:text-slate-100">{examItems.length}</strong>
                  </span>
                  <span>
                    Thi lại chờ duyệt: <strong className={pendingRetakes.length > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}>{pendingRetakes.length}</strong>
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {examItems.slice(0, 4).map((ex) => (
                    <div key={ex.id} className="py-2 text-xs space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {ex.tieuDe}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                        <span>{ex.tenMH || ex.maMH}</span>
                        {ex.lop && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{ex.lop}</span>
                          </>
                        )}
                        {ex.ngayKiemTra && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-blue-700 dark:text-blue-400">
                              {formatShortDateVi(ex.ngayKiemTra)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Training / Conduct Module */}
        <section
          aria-label="Tổng quan điểm rèn luyện"
          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Điểm rèn luyện tháng {targetTrainingMonth}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('training')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Chi tiết
              </button>
            </div>

            {!trainingMetrics.hasData ? (
              <EmptyState message={`Chưa có dữ liệu điểm rèn luyện tháng ${targetTrainingMonth}.`} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  <span>
                    Đã đánh giá: <strong className="text-slate-900 dark:text-slate-100">{trainingMetrics.total}</strong> SV
                  </span>
                  <span>
                    TB: <strong className="text-blue-700 dark:text-blue-400">{trainingMetrics.avgScore}</strong>/100
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {[
                    { label: 'Xuất sắc (≥ 90)', count: trainingMetrics.counts.xuatSac, bar: 'bg-emerald-600' },
                    { label: 'Tốt (80 – 89)', count: trainingMetrics.counts.tot, bar: 'bg-blue-600' },
                    { label: 'Khá (65 – 79)', count: trainingMetrics.counts.kha, bar: 'bg-indigo-500' },
                    { label: 'Trung bình (50 – 64)', count: trainingMetrics.counts.trungBinh, bar: 'bg-amber-500' },
                    { label: 'Yếu / Kém (< 50)', count: trainingMetrics.counts.yeuKem, bar: 'bg-rose-600' },
                  ].map((tier) => {
                    const pct = Math.round((tier.count / trainingMetrics.total) * 1000) / 10;
                    return (
                      <div key={tier.label} className="py-1.5 flex items-center gap-3">
                        <span className="w-32 text-slate-700 dark:text-slate-300 shrink-0">{tier.label}</span>
                        <div className="flex-1 h-1.5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded ${tier.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-16 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                          {tier.count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* TIER 3: WHAT SHOULD I DO? (8 cols Actionable Exception List + 4 cols Notifications) */}
      <div id="admin-action-queue" className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start scroll-mt-4">
        {/* Action Queue Table */}
        <section
          aria-label="Danh sách sinh viên cần chú ý và xử lý"
          className="xl:col-span-8 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Cần xử lý — Đối tượng có vấn đề ({filteredQueueStudents.length})
                </h2>
              </div>
            </div>

            <input
              type="search"
              aria-label="Tìm sinh viên cần xử lý"
              value={queueSearch}
              onChange={(e) => {
                setQueueSearch(e.target.value);
                setQueuePage(1);
              }}
              placeholder="Tìm mã SV, họ tên, lớp..."
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 w-full sm:w-56 focus:outline-none focus:border-blue-600"
            />
          </div>

          {filteredQueueStudents.length === 0 ? (
            <div className="p-6">
              <EmptyState message="Không có sinh viên nào thuộc diện cảnh báo trong phạm vi đang lọc." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Sinh viên</th>
                      <th className="py-2.5 px-3">Lớp · Khoa</th>
                      <th className="py-2.5 px-3">Mức độ</th>
                      <th className="py-2.5 px-3">Nguyên nhân cảnh báo</th>
                      <th className="py-2.5 px-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {paginatedQueueStudents.map((st) => (
                      <tr
                        key={st.maSV}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {st.hoTen}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-blue-700 dark:text-blue-400">
                            {st.maSV}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                            {st.lop}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                            {st.khoa}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              st.severity === 'CRITICAL'
                                ? 'text-rose-700 dark:text-rose-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {st.severity === 'CRITICAL' ? 'Khẩn cấp' : 'Cần chú ý'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {st.reasons.join(' · ')}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {onOpenFullProfile && (
                              <button
                                type="button"
                                onClick={() => onOpenFullProfile(st.maSV)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Hồ sơ</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenClassDrilldown(st.lop)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              <Building className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Lớp</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                currentPage={queuePage}
                pageSize={queuePageSize}
                totalItems={filteredQueueStudents.length}
                onPageChange={setQueuePage}
                onPageSizeChange={(size) => {
                  setQueuePageSize(size);
                  setQueuePage(1);
                }}
              />
            </>
          )}
        </section>

        {/* Notifications Panel */}
        <section
          aria-label="Thông báo mới nhất"
          className="xl:col-span-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Thông báo học vụ ({announcementItems.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onSwitchView?.('schedule')}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
            >
              Tất cả
            </button>
          </div>

          {announcementItems.length === 0 ? (
            <div className="p-6">
              <EmptyState message="Chưa có thông báo học vụ nào trong khoảng thời gian đang chọn." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {announcementItems.slice(0, 6).map((item) => (
                <li key={item.id} className="p-3.5 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.tieuDe}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {formatShortDateVi(item.ngayKiemTra || item.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.noiDung || `${item.tenMH || item.maMH}${item.lop ? ` · Lớp ${item.lop}` : ''}`}
                  </p>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3 h-3" aria-hidden="true" />
                      {item.tenMH || item.maMH}
                    </span>
                    {item.giangVienTao && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.giangVienTao}</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
