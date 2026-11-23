import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  Eye,
  MapPin,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import {
  Diem,
  DiemDanh,
  MonHoc,
  RenLuyen,
  SinhVien,
  ThoiKhoaBieu,
  ThongBaoKiemTra,
  User,
} from '../../../types';
import { convertGradeScale } from '../../../utils/gradeHelper';
import { Breadcrumb, EmptyState } from '../../common';
import { DashboardAlertCenter } from './DashboardAlertCenter';
import { DashboardKpiItem, DashboardKpiRow } from './DashboardKpiRow';
import {
  DashboardAlertItem,
  ExportCurrentFilterRequest,
  formatShortDateVi,
  formatThuLabel,
  getTimePresetLabel,
  getTodayThuCode,
  GlobalTimePreset,
  isDateWithinGlobalTime,
  TIME_PRESET_OPTIONS,
} from './dashboardTypes';

interface LecturerOverviewDashboardProps {
  currentUser: User | null;
  activeSemester: string;
  students: SinhVien[];
  grades: Diem[];
  schedule: ThoiKhoaBieu[];
  subjects: MonHoc[];
  trainingPoints: RenLuyen[];
  attendanceList: DiemDanh[];
  examNotices: ThongBaoKiemTra[];
  lastUpdatedLabel: string;
  onSwitchView?: (view: string) => void;
  onOpenFullProfile?: (maSV: string) => void;
  onExportWithFilters: (req: ExportCurrentFilterRequest) => void;
}

interface CourseClassGroup {
  key: string;
  maMH: string;
  tenMH: string;
  lop: string;
  studentCount: number;
  gradedCount: number;
  missingGrades: number;
  failedCount: number;
  missedPeriods: number;
  highAbsenceStudents: number;
  gradeProgressPct: number;
}

export const LecturerOverviewDashboard: React.FC<LecturerOverviewDashboardProps> = ({
  currentUser,
  activeSemester,
  students,
  grades,
  schedule,
  subjects,
  attendanceList,
  examNotices,
  lastUpdatedLabel,
  onSwitchView,
  onOpenFullProfile,
  onExportWithFilters,
}) => {
  // Global Time & Teaching Scope Filters
  const [timePreset, setTimePreset] = useState<GlobalTimePreset>('TODAY');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('ALL');
  const [selectedClassName, setSelectedClassName] = useState<string>('ALL');

  // Interactive Drill-Down State: Học phần -> Lớp -> Danh sách SV
  const [drillCourseKey, setDrillCourseKey] = useState<string | null>(null);

  const lecturerNameNorm = (currentUser?.fullName || '').trim().toLowerCase();
  const lecturerFaculty = (currentUser?.faculty || '').trim();

  // Match lecturer's assigned schedule items (if giangVien matches lecturerName, use those; otherwise fall back to faculty/visible schedule without inventing data)
  const lecturerSchedule = useMemo(() => {
    const byName = lecturerNameNorm
      ? schedule.filter((sch) => (sch.giangVien || '').trim().toLowerCase().includes(lecturerNameNorm))
      : [];
    if (byName.length > 0) return byName;

    if (lecturerFaculty) {
      const facultySubjects = new Set(
        subjects
          .filter((sub) => sub.khoa === lecturerFaculty || sub.khoaPhuTrach === lecturerFaculty)
          .map((sub) => sub.maMH)
      );
      const byFaculty = schedule.filter((sch) => facultySubjects.has(sch.maMH));
      if (byFaculty.length > 0) return byFaculty;
    }

    return schedule;
  }, [schedule, lecturerNameNorm, lecturerFaculty, subjects]);

  const todayThuCode = getTodayThuCode();

  // Today's teaching sessions (real data from schedule)
  const todayTeachingSessions = useMemo(() => {
    const list: Array<{
      id: string;
      maMH: string;
      tenMH: string;
      lop: string;
      thu: number;
      tietBatDau: number;
      soTiet: number;
      phong: string;
      coSo: string;
    }> = [];

    lecturerSchedule.forEach((sch) => {
      if (selectedSubjectCode !== 'ALL' && sch.maMH !== selectedSubjectCode) return;
      if (selectedClassName !== 'ALL' && sch.lop && sch.lop !== selectedClassName) return;

      const slots =
        sch.lichHoc && sch.lichHoc.length > 0
          ? sch.lichHoc
          : sch.thu
          ? [
              {
                thu: sch.thu,
                tietBatDau: sch.tietBatDau || 1,
                soTiet: sch.soTiet || 3,
                phong: sch.phongHoc || 'Chưa xếp phòng',
                coSo: '',
              },
            ]
          : [];

      slots.forEach((slot, idx) => {
        if (slot.thu === todayThuCode) {
          list.push({
            id: `${sch.id}-${idx}`,
            maMH: sch.maMH,
            tenMH: sch.tenMH || sch.maMH,
            lop: sch.lop || 'Chưa rõ lớp',
            thu: slot.thu,
            tietBatDau: slot.tietBatDau,
            soTiet: slot.soTiet,
            phong: slot.phong || sch.phongHoc || 'Chưa xếp phòng',
            coSo: slot.coSo || '',
          });
        }
      });
    });

    return list.sort((a, b) => a.tietBatDau - b.tietBatDau);
  }, [lecturerSchedule, selectedSubjectCode, selectedClassName, todayThuCode]);

  // Build Course + Class groups taught/managed by lecturer
  const courseClassGroups: CourseClassGroup[] = useMemo(() => {
    const pairMap = new Map<string, { maMH: string; tenMH: string; lop: string }>();

    lecturerSchedule.forEach((sch) => {
      if (!sch.maMH) return;
      const lop = sch.lop || 'Tất cả lớp';
      const key = `${sch.maMH}__${lop}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, { maMH: sch.maMH, tenMH: sch.tenMH || sch.maMH, lop });
      }
    });

    // If schedule is sparse, also include subjects scoped to lecturer's faculty
    if (pairMap.size === 0) {
      subjects
        .filter((sub) => !lecturerFaculty || sub.khoa === lecturerFaculty || sub.khoaPhuTrach === lecturerFaculty)
        .forEach((sub) => {
          const lop = sub.lop && sub.lop !== 'all' ? sub.lop : 'Tất cả lớp';
          const key = `${sub.maMH}__${lop}`;
          if (!pairMap.has(key)) {
            pairMap.set(key, { maMH: sub.maMH, tenMH: sub.tenMH || sub.maMH, lop });
          }
        });
    }

    return Array.from(pairMap.entries())
      .map(([key, info]) => {
        const classStudents =
          info.lop === 'Tất cả lớp'
            ? students
            : students.filter((s) => s.lop === info.lop);
        const stuIds = new Set(classStudents.map((s) => s.maSV.toLowerCase()));

        const courseGrades = grades.filter(
          (g) => g.maMH === info.maMH && stuIds.has((g.maSV || '').toLowerCase())
        );
        const gradedIds = new Set(courseGrades.map((g) => g.maSV.toLowerCase()));
        const failedCount = courseGrades.filter((g) => {
          const s4 =
            typeof g.diemThang4 === 'number' && !Number.isNaN(g.diemThang4)
              ? g.diemThang4
              : convertGradeScale(g.diemTongKet10 || 0).thang4;
          return s4 < 1.0 || g.trangThai === 'FAILED';
        }).length;

        const courseAtt = attendanceList.filter(
          (a) =>
            a.maMH === info.maMH &&
            stuIds.has((a.maSV || '').toLowerCase()) &&
            isDateWithinGlobalTime(a.ngay, timePreset, customStart, customEnd)
        );
        const missedPeriods = courseAtt.reduce((sum, a) => sum + Number(a.soTietNghi || 0), 0);

        const attByStudent = new Map<string, number>();
        courseAtt.forEach((a) => {
          const id = (a.maSV || '').toLowerCase();
          attByStudent.set(id, (attByStudent.get(id) || 0) + Number(a.soTietNghi || 0));
        });
        let highAbsenceStudents = 0;
        attByStudent.forEach((periods) => {
          if (periods >= 6) highAbsenceStudents++;
        });

        const studentCount = classStudents.length;
        const gradedCount = gradedIds.size;
        const missingGrades = Math.max(0, studentCount - gradedCount);
        const gradeProgressPct =
          studentCount > 0 ? Math.round((gradedCount / studentCount) * 100) : 0;

        return {
          key,
          maMH: info.maMH,
          tenMH: info.tenMH,
          lop: info.lop,
          studentCount,
          gradedCount,
          missingGrades,
          failedCount,
          missedPeriods,
          highAbsenceStudents,
          gradeProgressPct,
        };
      })
      .sort((a, b) => a.gradeProgressPct - b.gradeProgressPct || b.highAbsenceStudents - a.highAbsenceStudents);
  }, [lecturerSchedule, subjects, lecturerFaculty, students, grades, attendanceList, timePreset, customStart, customEnd]);

  const availableLecturerSubjects = useMemo(() => {
    const map = new Map<string, string>();
    courseClassGroups.forEach((g) => map.set(g.maMH, g.tenMH));
    return Array.from(map.entries()).map(([maMH, tenMH]) => ({ maMH, tenMH }));
  }, [courseClassGroups]);

  const availableLecturerClasses = useMemo(() => {
    const set = new Set<string>();
    courseClassGroups.forEach((g) => {
      if (selectedSubjectCode !== 'ALL' && g.maMH !== selectedSubjectCode) return;
      if (g.lop !== 'Tất cả lớp') set.add(g.lop);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [courseClassGroups, selectedSubjectCode]);

  const filteredCourseGroups = useMemo(() => {
    return courseClassGroups.filter((g) => {
      if (selectedSubjectCode !== 'ALL' && g.maMH !== selectedSubjectCode) return false;
      if (selectedClassName !== 'ALL' && g.lop !== selectedClassName) return false;
      return true;
    });
  }, [courseClassGroups, selectedSubjectCode, selectedClassName]);

  const activeCourseSubjectSet = useMemo(
    () => new Set(filteredCourseGroups.map((g) => g.maMH)),
    [filteredCourseGroups]
  );

  const lecturerExamNotices = useMemo(() => {
    return examNotices
      .filter((n) => {
        if (activeCourseSubjectSet.size > 0 && !activeCourseSubjectSet.has(n.maMH)) return false;
        if (selectedClassName !== 'ALL' && n.lop && n.lop !== selectedClassName) return false;
        if (timePreset !== 'SEMESTER') {
          const refDate = n.ngayKiemTra || n.createdAt;
          if (!isDateWithinGlobalTime(refDate, timePreset, customStart, customEnd)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.ngayKiemTra || b.createdAt || '').localeCompare(a.ngayKiemTra || a.createdAt || ''));
  }, [examNotices, activeCourseSubjectSet, selectedClassName, timePreset, customStart, customEnd]);

  const upcomingTests = useMemo(
    () => lecturerExamNotices.filter((n) => n.loai !== 'THONG_BAO'),
    [lecturerExamNotices]
  );

  // Drill-down: Students inside the clicked Course-Class group
  const drilledGroup = useMemo(
    () => filteredCourseGroups.find((g) => g.key === drillCourseKey) || null,
    [filteredCourseGroups, drillCourseKey]
  );

  const drilledStudents = useMemo(() => {
    if (!drilledGroup) return [];
    const list =
      drilledGroup.lop === 'Tất cả lớp'
        ? students
        : students.filter((s) => s.lop === drilledGroup.lop);

    return list
      .map((st) => {
        const grade = grades.find(
          (g) =>
            g.maMH === drilledGroup.maMH &&
            g.maSV.toLowerCase() === st.maSV.toLowerCase()
        );
        const stAtt = attendanceList.filter(
          (a) =>
            a.maMH === drilledGroup.maMH &&
            a.maSV.toLowerCase() === st.maSV.toLowerCase() &&
            isDateWithinGlobalTime(a.ngay, timePreset, customStart, customEnd)
        );
        const missedPeriods = stAtt.reduce((sum, a) => sum + Number(a.soTietNghi || 0), 0);
        const score4 = grade
          ? typeof grade.diemThang4 === 'number' && !Number.isNaN(grade.diemThang4)
            ? grade.diemThang4
            : convertGradeScale(grade.diemTongKet10 || 0).thang4
          : null;
        return {
          student: st,
          grade,
          score4,
          missedPeriods,
          needsAttention: (score4 !== null && score4 < 1.0) || missedPeriods >= 6 || !grade,
        };
      })
      .sort((a, b) => {
        if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
        return b.missedPeriods - a.missedPeriods;
      });
  }, [drilledGroup, students, grades, attendanceList, timePreset, customStart, customEnd]);

  // Aggregate Lecturer KPIs
  const totals = useMemo(() => {
    const totalExpected = filteredCourseGroups.reduce((s, g) => s + g.studentCount, 0);
    const totalGraded = filteredCourseGroups.reduce((s, g) => s + g.gradedCount, 0);
    const totalMissing = filteredCourseGroups.reduce((s, g) => s + g.missingGrades, 0);
    const totalFailed = filteredCourseGroups.reduce((s, g) => s + g.failedCount, 0);
    const totalMissed = filteredCourseGroups.reduce((s, g) => s + g.missedPeriods, 0);
    const totalHighAbsence = filteredCourseGroups.reduce((s, g) => s + g.highAbsenceStudents, 0);
    const incompleteCourses = filteredCourseGroups.filter((g) => g.missingGrades > 0).length;
    const progressPct = totalExpected > 0 ? Math.round((totalGraded / totalExpected) * 100) : 0;

    return {
      totalExpected,
      totalGraded,
      totalMissing,
      totalFailed,
      totalMissed,
      totalHighAbsence,
      incompleteCourses,
      progressPct,
    };
  }, [filteredCourseGroups]);

  // Alert Center for Lecturer (Class/Course scoped)
  const lecturerAlerts: DashboardAlertItem[] = useMemo(() => {
    const list: DashboardAlertItem[] = [];

    filteredCourseGroups.forEach((g) => {
      if (g.highAbsenceStudents > 0) {
        list.push({
          id: `lec-att-${g.key}`,
          severity: 'CRITICAL',
          category: 'ATTENDANCE',
          what: `${g.highAbsenceStudents} sinh viên vắng nhiều (≥ 6 tiết)`,
          who: `${g.tenMH} · Lớp ${g.lop}`,
          why: `Tổng ${g.missedPeriods} tiết vắng trong khoảng thời gian đang chọn`,
          actionLabel: 'Xem danh sách lớp',
          subjectCode: g.key,
        });
      }
      if (g.failedCount > 0) {
        list.push({
          id: `lec-fail-${g.key}`,
          severity: 'WARNING',
          category: 'ACADEMIC',
          what: `${g.failedCount} sinh viên chưa đạt học phần (Hệ 4 < 1.0)`,
          who: `${g.tenMH} · Lớp ${g.lop}`,
          why: 'Cần nhắc nhở ôn tập hoặc hướng dẫn đăng ký thi lại',
          actionLabel: 'Xem danh sách SV',
          subjectCode: g.key,
        });
      }
      if (g.missingGrades > 0) {
        list.push({
          id: `lec-grade-${g.key}`,
          severity: 'WARNING',
          category: 'ACADEMIC',
          what: `Chưa hoàn tất nhập điểm (${g.gradedCount}/${g.studentCount} SV)`,
          who: `${g.tenMH} · Lớp ${g.lop}`,
          why: `Còn ${g.missingGrades} sinh viên chưa có điểm tổng kết`,
          actionLabel: 'Nhập điểm ngay',
          targetView: 'grades',
        });
      }
    });

    upcomingTests.slice(0, 3).forEach((ex) => {
      list.push({
        id: `lec-exam-${ex.id}`,
        severity: 'INFO',
        category: 'EXAM',
        what: ex.tieuDe,
        who: `${ex.tenMH || ex.maMH}${ex.lop ? ` · Lớp ${ex.lop}` : ''}`,
        why: ex.noiDung || 'Lịch kiểm tra / đánh giá học phần',
        actionLabel: 'Xem lịch thi',
        targetView: 'schedule',
        dateLabel: ex.ngayKiemTra ? formatShortDateVi(ex.ngayKiemTra) : undefined,
      });
    });

    return list;
  }, [filteredCourseGroups, upcomingTests]);

  const handleAlertAction = (alert: DashboardAlertItem) => {
    if (alert.subjectCode) {
      setDrillCourseKey(alert.subjectCode);
      document.getElementById('lecturer-course-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (alert.targetView && onSwitchView) {
      onSwitchView(alert.targetView);
    }
  };

  const kpiItems: DashboardKpiItem[] = [
    {
      id: 'lec-kpi-today',
      label: `Lịch dạy hôm nay (${formatThuLabel(todayThuCode)})`,
      value: todayTeachingSessions.length,
      context:
        todayTeachingSessions.length > 0
          ? `${todayTeachingSessions.reduce((s, x) => s + x.soTiet, 0)} tiết giảng · Tiết đầu từ tiết ${todayTeachingSessions[0].tietBatDau}`
          : 'Không có tiết giảng theo lịch hôm nay',
      statusLabel: todayTeachingSessions.length > 0 ? 'Sẵn sàng điểm danh' : 'Ngày không có ca dạy',
      statusTone: todayTeachingSessions.length > 0 ? 'info' : 'neutral',
      actionHint: 'Lịch dạy',
      onClick: () => onSwitchView?.('schedule'),
    },
    {
      id: 'lec-kpi-courses',
      label: 'Lớp học phần phụ trách',
      value: filteredCourseGroups.length,
      context: `${totals.totalExpected} lượt sinh viên đang theo học`,
      statusLabel: `${availableLecturerSubjects.length} học phần hoạt động`,
      statusTone: 'neutral',
      actionHint: 'Chi tiết',
      onClick: () => {
        document.getElementById('lecturer-course-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    },
    {
      id: 'lec-kpi-grades',
      label: 'Tiến độ nhập điểm',
      value: `${totals.progressPct}%`,
      context: `${totals.totalGraded}/${totals.totalExpected} lượt SV đã có điểm`,
      statusLabel:
        totals.incompleteCourses > 0
          ? `${totals.incompleteCourses} lớp chưa hoàn tất`
          : 'Đã hoàn tất nhập điểm',
      statusTone: totals.incompleteCourses > 0 ? 'warning' : 'good',
      actionHint: 'Nhập điểm',
      onClick: () => onSwitchView?.('grades'),
    },
    {
      id: 'lec-kpi-attendance',
      label: 'Sinh viên vắng nhiều',
      value: totals.totalHighAbsence,
      context: `${totals.totalMissed} tổng tiết vắng trong kỳ lọc`,
      statusLabel:
        totals.totalHighAbsence > 0
          ? `${totals.totalHighAbsence} SV cần nhắc nhở`
          : 'Không có SV vượt ngưỡng vắng',
      statusTone: totals.totalHighAbsence > 0 ? 'critical' : 'good',
      actionHint: 'Điểm danh',
      onClick: () => onSwitchView?.('attendance'),
    },
    {
      id: 'lec-kpi-exams',
      label: 'Kiểm tra & Kỳ thi',
      value: upcomingTests.length,
      context: `${totals.totalFailed} lượt SV chưa đạt (< 1.0)`,
      statusLabel: upcomingTests.length > 0 ? 'Có lịch kiểm tra sắp tới' : 'Chưa có lịch kiểm tra',
      statusTone: upcomingTests.length > 0 ? 'info' : 'neutral',
      actionHint: 'Xem lịch',
      onClick: () => onSwitchView?.('schedule'),
    },
  ];

  const activeTimeLabel = getTimePresetLabel(timePreset, customStart, customEnd, activeSemester);

  return (
    <div className="space-y-5">
      {/* GLOBAL FILTER BAR FOR LECTURER */}
      <section
        aria-label="Bộ lọc bảng điều khiển giảng viên"
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Bộ lọc thời gian giảng dạy"
              className="inline-flex flex-wrap items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md"
            >
              {TIME_PRESET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={timePreset === opt.value}
                  onClick={() => setTimePreset(opt.value)}
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

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
              {currentUser?.fullName || 'Giảng viên'} · {activeTimeLabel} · Cập nhật {lastUpdatedLabel}
            </span>
            <button
              type="button"
              onClick={() =>
                onExportWithFilters({
                  className: selectedClassName,
                  reportType: 'ACADEMIC',
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xuất báo cáo lớp</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <select
            aria-label="Chọn học phần phụ trách"
            value={selectedSubjectCode}
            onChange={(e) => {
              setSelectedSubjectCode(e.target.value);
              setSelectedClassName('ALL');
              setDrillCourseKey(null);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer max-w-[260px]"
          >
            <option value="ALL">Tất cả học phần phụ trách ({availableLecturerSubjects.length})</option>
            {availableLecturerSubjects.map((s) => (
              <option key={s.maMH} value={s.maMH}>
                {s.maMH} · {s.tenMH}
              </option>
            ))}
          </select>

          <select
            aria-label="Chọn lớp phụ trách"
            value={selectedClassName}
            onChange={(e) => {
              setSelectedClassName(e.target.value);
              setDrillCourseKey(null);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="ALL">Tất cả lớp ({availableLecturerClasses.length})</option>
            {availableLecturerClasses.map((cls) => (
              <option key={cls} value={cls}>
                Lớp {cls}
              </option>
            ))}
          </select>

          {(selectedSubjectCode !== 'ALL' || selectedClassName !== 'ALL' || timePreset !== 'TODAY') && (
            <button
              type="button"
              onClick={() => {
                setTimePreset('TODAY');
                setSelectedSubjectCode('ALL');
                setSelectedClassName('ALL');
                setDrillCourseKey(null);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </section>

      {/* TIER 1: KNOW NOW */}
      <DashboardKpiRow items={kpiItems} />

      {/* TIER 2: TODAY SCHEDULE + COURSE/CLASS DRILL-DOWN (8 cols) & ALERT CENTER (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 space-y-4">
          {/* Lịch dạy hôm nay */}
          <section
            aria-label="Lịch dạy hôm nay"
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Lịch dạy hôm nay — {formatThuLabel(todayThuCode)}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('schedule')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Xem toàn bộ lịch
              </button>
            </div>

            {todayTeachingSessions.length === 0 ? (
              <EmptyState message={`Hôm nay (${formatThuLabel(todayThuCode)}) không có ca giảng dạy nào trong thời khóa biểu.`} />
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {todayTeachingSessions.map((ses) => (
                  <div
                    key={ses.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {ses.tenMH}{' '}
                        <span className="font-mono text-slate-500 dark:text-slate-400 font-normal">
                          ({ses.maMH})
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono tabular-nums">
                        <span>
                          Tiết {ses.tietBatDau}–{ses.tietBatDau + ses.soTiet - 1} ({ses.soTiet} tiết)
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Lớp {ses.lop}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-sans">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {ses.phong}
                          {ses.coSo ? ` (${ses.coSo})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSwitchView?.('attendance')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer whitespace-nowrap"
                      >
                        <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Điểm danh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSwitchView?.('grades')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer whitespace-nowrap"
                      >
                        <span>Nhập điểm</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Drill-down: Học phần -> Lớp -> Sinh viên -> Chi tiết */}
          <section
            id="lecturer-course-section"
            aria-label="Học phần và lớp đang phụ trách"
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden scroll-mt-4"
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {drilledGroup
                      ? `${drilledGroup.tenMH} · Lớp ${drilledGroup.lop}`
                      : `Lớp & Học phần phụ trách (${filteredCourseGroups.length})`}
                  </h2>
                </div>
                {drilledGroup && (
                  <button
                    type="button"
                    onClick={() => setDrillCourseKey(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Quay lại danh sách học phần</span>
                  </button>
                )}
              </div>

              {drilledGroup && (
                <Breadcrumb
                  items={[
                    { label: 'Học phần phụ trách', onClick: () => setDrillCourseKey(null) },
                    { label: `${drilledGroup.maMH} · Lớp ${drilledGroup.lop}` },
                  ]}
                />
              )}
            </div>

            {!drilledGroup ? (
              filteredCourseGroups.length === 0 ? (
                <div className="p-6">
                  <EmptyState message="Chưa có lớp học phần nào được phân công trong phạm vi đang lọc." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Học phần</th>
                        <th className="py-2.5 px-3">Lớp</th>
                        <th className="py-2.5 px-3 text-right">Sĩ số</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Tiến độ nhập điểm</th>
                        <th className="py-2.5 px-3 text-right">Vắng nhiều</th>
                        <th className="py-2.5 px-3 text-right">Chưa đạt</th>
                        <th className="py-2.5 px-3 text-right">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredCourseGroups.map((g) => (
                        <tr
                          key={g.key}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {g.tenMH}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {g.maMH}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                            {g.lop}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {g.studentCount}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded ${
                                    g.gradeProgressPct >= 100 ? 'bg-emerald-600' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${Math.min(100, g.gradeProgressPct)}%` }}
                                />
                              </div>
                              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 w-10 text-right">
                                {g.gradeProgressPct}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            <span
                              className={
                                g.highAbsenceStudents > 0
                                  ? 'font-bold text-rose-700 dark:text-rose-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }
                            >
                              {g.highAbsenceStudents}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            <span
                              className={
                                g.failedCount > 0
                                  ? 'font-bold text-amber-700 dark:text-amber-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }
                            >
                              {g.failedCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setDrillCourseKey(g.key)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
                            >
                              <span>Xem SV</span>
                              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : drilledStudents.length === 0 ? (
              <div className="p-6">
                <EmptyState message="Lớp học phần này chưa có danh sách sinh viên." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Sinh viên</th>
                      <th className="py-2.5 px-3 text-center">Hệ 10</th>
                      <th className="py-2.5 px-3 text-center">Hệ 4</th>
                      <th className="py-2.5 px-3 text-center">Vắng (tiết)</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {drilledStudents.map((row) => (
                      <tr
                        key={row.student.maSV}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {row.student.hoTen}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-blue-700 dark:text-blue-400">
                            {row.student.maSV}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                          {row.grade ? row.grade.diemTongKet10.toFixed(1) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold">
                          {row.score4 !== null ? row.score4.toFixed(1) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                          <span
                            className={
                              row.missedPeriods >= 6
                                ? 'font-bold text-rose-700 dark:text-rose-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {row.missedPeriods}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {!row.grade ? (
                            <span className="text-amber-700 dark:text-amber-400 font-medium">Chưa nhập điểm</span>
                          ) : row.score4 !== null && row.score4 < 1.0 ? (
                            <span className="text-rose-700 dark:text-rose-400 font-semibold">Chưa đạt (&lt; 1.0)</span>
                          ) : row.missedPeriods >= 6 ? (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">Vắng cao</span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Đạt</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {onOpenFullProfile && (
                            <button
                              type="button"
                              onClick={() => onOpenFullProfile(row.student.maSV)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Hồ sơ SV</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right 4 cols: Alert Center + Upcoming Exams/Notices */}
        <div className="xl:col-span-4 space-y-4">
          <DashboardAlertCenter
            title="Cảnh báo lớp phụ trách"
            alerts={lecturerAlerts}
            onAlertAction={handleAlertAction}
          />

          <section
            aria-label="Lịch kiểm tra và thông báo lớp"
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Bài kiểm tra & Thông báo ({lecturerExamNotices.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('schedule')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Quản lý
              </button>
            </div>

            {lecturerExamNotices.length === 0 ? (
              <div className="p-5">
                <EmptyState message="Chưa có lịch kiểm tra hoặc thông báo mới cho các lớp phụ trách." />
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {lecturerExamNotices.slice(0, 5).map((item) => (
                  <li key={item.id} className="p-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.tieuDe}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-blue-700 dark:text-blue-400 shrink-0">
                        {formatShortDateVi(item.ngayKiemTra || item.createdAt)}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      {item.tenMH || item.maMH}
                      {item.lop ? ` · Lớp ${item.lop}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
