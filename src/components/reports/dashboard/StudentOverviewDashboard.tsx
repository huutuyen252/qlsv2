import React, { useMemo, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  MapPin,
} from 'lucide-react';
import {
  Diem,
  DiemDanh,
  MonHoc,
  RenLuyen,
  SinhVien,
  ThiLaiHocLai,
  ThoiKhoaBieu,
  ThongBaoKiemTra,
} from '../../../types';
import {
  convertGradeScale,
  getAcademicClassification,
  getTrainingClassification,
} from '../../../utils/gradeHelper';
import { EmptyState } from '../../common';
import { DashboardAlertCenter } from './DashboardAlertCenter';
import { DashboardKpiItem, DashboardKpiRow } from './DashboardKpiRow';
import {
  DashboardAlertItem,
  formatShortDateVi,
  formatThuLabel,
  getTimePresetLabel,
  getTodayThuCode,
  GlobalTimePreset,
  isDateWithinGlobalTime,
} from './dashboardTypes';

interface StudentOverviewDashboardProps {
  studentCode: string;
  studentObj: SinhVien | null;
  activeSemester: string;
  grades: Diem[];
  schedule: ThoiKhoaBieu[];
  subjects: MonHoc[];
  trainingPoints: RenLuyen[];
  retakes: ThiLaiHocLai[];
  attendanceList: DiemDanh[];
  examNotices: ThongBaoKiemTra[];
  lastUpdatedLabel: string;
  onSwitchView?: (view: string) => void;
}

const STUDENT_TIME_OPTIONS: Array<{ value: GlobalTimePreset; label: string }> = [
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'WEEK', label: 'Tuần này' },
  { value: 'MONTH', label: 'Tháng này' },
  { value: 'SEMESTER', label: 'Học kỳ hiện tại' },
];

function getExamTypeLabel(loai: ThongBaoKiemTra['loai']): string {
  switch (loai) {
    case '15_PHUT':
      return 'Kiểm tra 15 phút';
    case 'GIUA_KY':
      return 'Thi giữa kỳ';
    case 'CUOI_KY':
      return 'Thi cuối kỳ';
    default:
      return 'Thông báo học phần';
  }
}

export const StudentOverviewDashboard: React.FC<StudentOverviewDashboardProps> = ({
  studentCode,
  studentObj,
  activeSemester,
  grades,
  schedule,
  subjects,
  trainingPoints,
  retakes,
  attendanceList,
  examNotices,
  lastUpdatedLabel,
  onSwitchView,
}) => {
  const [timePreset, setTimePreset] = useState<GlobalTimePreset>('TODAY');
  const myCode = (studentCode || '').trim().toLowerCase();
  const myClass = (studentObj?.lop || '').trim().toLowerCase();

  const semesterSep = activeSemester.indexOf('-');
  const currentActiveSemester = semesterSep >= 0 ? activeSemester.slice(0, semesterSep) : activeSemester;

  // Student's schedule records
  const mySchedule = useMemo(() => {
    if (!myCode) return [];
    return schedule.filter((sch) => {
      const matchStu = sch.maSV && sch.maSV.toLowerCase() === myCode;
      const matchCls = sch.lop && myClass && sch.lop.toLowerCase() === myClass;
      const matchHk = !sch.hocKy || !currentActiveSemester || sch.hocKy === currentActiveSemester || sch.hocKy.includes(currentActiveSemester);
      return (matchStu || matchCls) && matchHk;
    });
  }, [schedule, myCode, myClass, currentActiveSemester]);

  const todayThuCode = getTodayThuCode();

  // Flatten schedule sessions (Today vs Week)
  const myScheduleSessions = useMemo(() => {
    const list: Array<{
      id: string;
      maMH: string;
      tenMH: string;
      giangVien: string;
      thu: number;
      tietBatDau: number;
      soTiet: number;
      phong: string;
      coSo: string;
      isToday: boolean;
    }> = [];

    mySchedule.forEach((sch) => {
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
        list.push({
          id: `${sch.id}-${idx}`,
          maMH: sch.maMH,
          tenMH: sch.tenMH || sch.maMH,
          giangVien: sch.giangVien || 'Khoa phân công',
          thu: slot.thu,
          tietBatDau: slot.tietBatDau,
          soTiet: slot.soTiet,
          phong: slot.phong || sch.phongHoc || 'Chưa xếp phòng',
          coSo: slot.coSo || '',
          isToday: slot.thu === todayThuCode,
        });
      });
    });

    return list.sort((a, b) => a.thu - b.thu || a.tietBatDau - b.tietBatDau);
  }, [mySchedule, todayThuCode]);

  const todaySessions = useMemo(
    () => myScheduleSessions.filter((s) => s.isToday),
    [myScheduleSessions]
  );

  // Student's grades & course progress
  const myGrades = useMemo(() => {
    if (!myCode) return [];
    return grades.filter((g) => (g.maSV || '').toLowerCase() === myCode);
  }, [grades, myCode]);

  const myActiveSemesterGrades = useMemo(() => {
    return myGrades.filter((g) => {
      if (!currentActiveSemester || !g.hocKy) return true;
      return g.hocKy === currentActiveSemester || g.hocKy.includes(currentActiveSemester);
    });
  }, [myGrades, currentActiveSemester]);

  const myAttendance = useMemo(() => {
    if (!myCode) return [];
    return attendanceList.filter((a) => {
      if ((a.maSV || '').toLowerCase() !== myCode) return false;
      if (timePreset !== 'SEMESTER') {
        return isDateWithinGlobalTime(a.ngay, timePreset);
      }
      return true;
    });
  }, [attendanceList, myCode, timePreset]);

  const myAllSemesterAttendance = useMemo(() => {
    if (!myCode) return [];
    return attendanceList.filter((a) => (a.maSV || '').toLowerCase() === myCode);
  }, [attendanceList, myCode]);

  // Courses combined with grades & attendance
  const myCourses = useMemo(() => {
    const map = new Map<
      string,
      {
        maMH: string;
        tenMH: string;
        soTinChi: number;
        giangVien: string;
        phong: string;
        diem?: Diem;
        score4: number | null;
        missedPeriods: number;
        totalPeriods: number;
        absencePct: number;
      }
    >();

    mySchedule.forEach((sch) => {
      if (!sch.maMH || map.has(sch.maMH)) return;
      const credits = sch.soTinChi || 3;
      map.set(sch.maMH, {
        maMH: sch.maMH,
        tenMH: sch.tenMH || sch.maMH,
        soTinChi: credits,
        giangVien: sch.giangVien || 'Khoa phân công',
        phong: sch.lichHoc?.[0]?.phong || sch.phongHoc || 'Chưa xếp phòng',
        score4: null,
        missedPeriods: 0,
        totalPeriods: credits * 15,
        absencePct: 0,
      });
    });

    subjects.forEach((sub) => {
      const matchCls = !sub.lop || sub.lop === 'all' || (myClass && sub.lop.toLowerCase() === myClass);
      const matchHk = !sub.hocKy || !currentActiveSemester || sub.hocKy === currentActiveSemester;
      if (matchCls && matchHk && sub.maMH && !map.has(sub.maMH)) {
        const credits = sub.soTinChi || 3;
        map.set(sub.maMH, {
          maMH: sub.maMH,
          tenMH: sub.tenMH || sub.maMH,
          soTinChi: credits,
          giangVien: 'Khoa phân công',
          phong: 'Chưa xếp phòng',
          score4: null,
          missedPeriods: 0,
          totalPeriods: credits * 15,
          absencePct: 0,
        });
      }
    });

    myActiveSemesterGrades.forEach((g) => {
      const credits = g.soTinChi || 3;
      const existing = map.get(g.maMH);
      const s4 =
        typeof g.diemThang4 === 'number' && !Number.isNaN(g.diemThang4)
          ? g.diemThang4
          : typeof g.diemTongKet10 === 'number' && !Number.isNaN(g.diemTongKet10)
          ? convertGradeScale(g.diemTongKet10).thang4
          : null;
      if (existing) {
        existing.diem = g;
        existing.score4 = s4;
        if (g.tenMH) existing.tenMH = g.tenMH;
        if (g.soTinChi) {
          existing.soTinChi = g.soTinChi;
          existing.totalPeriods = g.soTinChi * 15;
        }
      } else {
        map.set(g.maMH, {
          maMH: g.maMH,
          tenMH: g.tenMH || g.maMH,
          soTinChi: credits,
          giangVien: 'Khoa phân công',
          phong: 'Chưa xếp phòng',
          diem: g,
          score4: s4,
          missedPeriods: 0,
          totalPeriods: credits * 15,
          absencePct: 0,
        });
      }
    });

    map.forEach((course, maMH) => {
      const missed = myAllSemesterAttendance
        .filter((a) => a.maMH === maMH)
        .reduce((sum, a) => sum + Number(a.soTietNghi || 0), 0);
      course.missedPeriods = missed;
      course.absencePct = course.totalPeriods > 0 ? Math.round((missed / course.totalPeriods) * 1000) / 10 : 0;
    });

    return Array.from(map.values());
  }, [mySchedule, subjects, myClass, currentActiveSemester, myActiveSemesterGrades, myAllSemesterAttendance]);

  const mySubjectCodeSet = useMemo(() => new Set(myCourses.map((c) => c.maMH)), [myCourses]);

  // Academic Summary (weighted GPA4 & GPA10)
  const academicSummary = useMemo(() => {
    const graded = myCourses.filter((c) => c.score4 !== null && c.diem);
    const totalCredits = myCourses.reduce((s, c) => s + c.soTinChi, 0);
    if (graded.length === 0) {
      return {
        hasGrades: false,
        gpa4: null as number | null,
        gpa10: null as number | null,
        standing: 'Chưa có điểm',
        passedCredits: 0,
        totalCredits,
        failedCourses: [] as typeof myCourses,
      };
    }

    let w4 = 0;
    let w10 = 0;
    let gradedCredits = 0;
    let passedCredits = 0;
    const failedCourses: typeof myCourses = [];

    graded.forEach((c) => {
      w4 += (c.score4 || 0) * c.soTinChi;
      w10 += (c.diem?.diemTongKet10 || 0) * c.soTinChi;
      gradedCredits += c.soTinChi;
      if ((c.score4 || 0) >= 1.0 && c.diem?.trangThai !== 'FAILED') {
        passedCredits += c.soTinChi;
      } else {
        failedCourses.push(c);
      }
    });

    const gpa4 = gradedCredits > 0 ? Math.round((w4 / gradedCredits) * 100) / 100 : 0;
    const gpa10 = gradedCredits > 0 ? Math.round((w10 / gradedCredits) * 100) / 100 : 0;

    return {
      hasGrades: true,
      gpa4,
      gpa10,
      standing: getAcademicClassification(gpa4, gradedCredits),
      passedCredits,
      totalCredits,
      failedCourses,
    };
  }, [myCourses]);

  // Exams & Notifications relevant to this student
  const myNotices = useMemo(() => {
    return examNotices
      .filter((n) => {
        const matchSub = mySubjectCodeSet.size === 0 || mySubjectCodeSet.has(n.maMH);
        const matchCls = !n.lop || !myClass || n.lop.toLowerCase() === myClass;
        if (!matchSub || !matchCls) return false;
        if (timePreset !== 'SEMESTER') {
          const refDate = n.ngayKiemTra || n.createdAt;
          if (!isDateWithinGlobalTime(refDate, timePreset)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.ngayKiemTra || a.createdAt || '').localeCompare(b.ngayKiemTra || b.createdAt || ''));
  }, [examNotices, mySubjectCodeSet, myClass, timePreset]);

  const myExams = useMemo(() => {
    return myNotices
      .filter((n) => n.loai !== 'THONG_BAO')
      .map((ex) => {
        const courseMatch = myCourses.find((c) => c.maMH === ex.maMH);
        return {
          ...ex,
          phong: courseMatch?.phong || 'Xem thông báo khoa',
          giangVien: ex.giangVienTao || courseMatch?.giangVien || 'Khoa phân công',
        };
      });
  }, [myNotices, myCourses]);

  // Training points for this student
  const myTraining = useMemo(() => {
    if (!myCode) return { current: null as RenLuyen | null, history: [] as RenLuyen[] };
    const list = trainingPoints
      .filter((r) => r.maSV && r.maSV.toLowerCase() === myCode)
      .sort((a, b) => (b.nam || 0) - (a.nam || 0) || (b.thang || 0) - (a.thang || 0));
    const nowM = new Date().getMonth() + 1;
    const nowY = new Date().getFullYear();
    const current = list.find((r) => r.thang === nowM && (!r.nam || r.nam === nowY)) || list[0] || null;
    return { current, history: list.slice(0, 5) };
  }, [trainingPoints, myCode]);

  // Retakes for this student
  const myRetakes = useMemo(() => {
    if (!myCode) return [];
    return retakes.filter((r) => r.maSV && r.maSV.toLowerCase() === myCode);
  }, [retakes, myCode]);

  const totalMissedInWindow = useMemo(
    () => myAttendance.reduce((s, a) => s + Number(a.soTietNghi || 0), 0),
    [myAttendance]
  );

  const highAbsenceCourses = useMemo(
    () => myCourses.filter((c) => c.missedPeriods >= 6 || c.absencePct >= 15),
    [myCourses]
  );

  // Student-specific Alert Center (Actionable personal alerts & tasks)
  const studentAlerts: DashboardAlertItem[] = useMemo(() => {
    const items: DashboardAlertItem[] = [];

    academicSummary.failedCourses.forEach((c) => {
      items.push({
        id: `stu-fail-${c.maMH}`,
        severity: 'CRITICAL',
        category: 'ACADEMIC',
        what: `Học phần chưa đạt: ${c.tenMH}`,
        who: `Điểm Hệ 4: ${c.score4?.toFixed(1) ?? '0.0'} (< 1.0)`,
        why: 'Cần theo dõi kế hoạch đăng ký thi lại hoặc học lại để đảm bảo tiến độ tín chỉ',
        actionLabel: 'Xem Thi lại & Học lại',
        targetView: 'retakes',
      });
    });

    highAbsenceCourses.forEach((c) => {
      items.push({
        id: `stu-att-${c.maMH}`,
        severity: c.missedPeriods >= 9 || c.absencePct >= 20 ? 'CRITICAL' : 'WARNING',
        category: 'ATTENDANCE',
        what: `Cảnh báo chuyên cần môn ${c.tenMH}`,
        who: `Đã vắng ${c.missedPeriods}/${c.totalPeriods} tiết (${c.absencePct}%)`,
        why: 'Số tiết vắng cao có thể ảnh hưởng điều kiện dự thi kết thúc học phần',
        actionLabel: 'Xem chi tiết điểm danh',
        targetView: 'attendance',
      });
    });

    if (myTraining.current && myTraining.current.diemRL < 50) {
      items.push({
        id: 'stu-low-training',
        severity: 'CRITICAL',
        category: 'TRAINING',
        what: `Điểm rèn luyện tháng ${myTraining.current.thang} ở mức thấp (${myTraining.current.diemRL}/100)`,
        who: `Xếp loại: ${getTrainingClassification(myTraining.current.diemRL)}`,
        why: 'Cần tích cực tham gia hoạt động và tuân thủ kỷ luật để cải thiện điểm',
        actionLabel: 'Xem điểm rèn luyện',
        targetView: 'training',
      });
    }

    myRetakes
      .filter((r) => r.trangThai === 'CHO_DUYET')
      .forEach((r) => {
        items.push({
          id: `stu-retake-${r.id}`,
          severity: 'WARNING',
          category: 'RETAKE',
          what: `Đơn ${r.loaiDangKy === 'THI_LAI' ? 'thi lại' : 'học lại'} môn ${r.tenMH} đang chờ duyệt`,
          who: `Mã môn ${r.maMH}${r.phiDiem ? ` · Lệ phí ${r.phiDiem.toLocaleString('vi-VN')} đ` : ''}`,
          why: 'Theo dõi trạng thái phê duyệt và lịch thi bổ sung',
          actionLabel: 'Kiểm tra đơn đăng ký',
          targetView: 'retakes',
        });
      });

    myExams.slice(0, 3).forEach((ex) => {
      items.push({
        id: `stu-exam-${ex.id}`,
        severity: 'INFO',
        category: 'EXAM',
        what: `${getExamTypeLabel(ex.loai)}: ${ex.tenMH || ex.maMH}`,
        who: `Phòng ${ex.phong} · ${ex.tieuDe}`,
        why: ex.noiDung || 'Kiểm tra lịch thi và chuẩn bị thẻ sinh viên / tài liệu theo quy định',
        actionLabel: 'Xem lịch học & thi',
        targetView: 'schedule',
        dateLabel: ex.ngayKiemTra ? formatShortDateVi(ex.ngayKiemTra) : undefined,
      });
    });

    return items;
  }, [academicSummary.failedCourses, highAbsenceCourses, myTraining.current, myRetakes, myExams]);

  // Tier 1: Know Now (4 Student KPIs)
  const kpiItems: DashboardKpiItem[] = [
    {
      id: 'stu-kpi-today',
      label: `Hôm nay (${formatThuLabel(todayThuCode)})`,
      value: todaySessions.length,
      context:
        todaySessions.length > 0
          ? `${todaySessions.reduce((s, x) => s + x.soTiet, 0)} tiết học · Bắt đầu từ tiết ${todaySessions[0].tietBatDau}`
          : 'Không có lịch học hôm nay',
      statusLabel:
        myExams.length > 0 ? `${myExams.length} lịch thi / kiểm tra sắp tới` : 'Không có lịch thi hôm nay',
      statusTone: myExams.length > 0 ? 'info' : 'neutral',
      actionHint: 'TKB',
      onClick: () => onSwitchView?.('schedule'),
    },
    {
      id: 'stu-kpi-gpa',
      label: 'Kết quả học tập (Hệ 4)',
      value: academicSummary.hasGrades && academicSummary.gpa4 !== null ? academicSummary.gpa4.toFixed(2) : 'Chưa có',
      context: academicSummary.hasGrades
        ? `Hệ 10: ${academicSummary.gpa10?.toFixed(2)} · ${academicSummary.passedCredits}/${academicSummary.totalCredits} TC đạt`
        : `${myCourses.length} học phần đăng ký`,
      statusLabel: academicSummary.failedCourses.length > 0
        ? `${academicSummary.failedCourses.length} môn chưa đạt`
        : academicSummary.standing,
      statusTone: academicSummary.failedCourses.length > 0
        ? 'critical'
        : academicSummary.hasGrades
        ? 'good'
        : 'neutral',
      actionHint: 'Bảng điểm',
      onClick: () => onSwitchView?.('grades'),
    },
    {
      id: 'stu-kpi-attendance',
      label: 'Chuyên cần của tôi',
      value: `${totalMissedInWindow} tiết`,
      context: `Phạm vi: ${getTimePresetLabel(timePreset, undefined, undefined, activeSemester)}`,
      statusLabel:
        highAbsenceCourses.length > 0
          ? `${highAbsenceCourses.length} môn cần chú ý chuyên cần`
          : 'Chuyên cần ổn định',
      statusTone: highAbsenceCourses.length > 0 ? 'warning' : 'good',
      actionHint: 'Điểm danh',
      onClick: () => onSwitchView?.('attendance'),
    },
    {
      id: 'stu-kpi-training',
      label: 'Điểm rèn luyện',
      value: myTraining.current ? `${myTraining.current.diemRL}/100` : 'Chưa có',
      context: myTraining.current
        ? `Tháng ${myTraining.current.thang}/${myTraining.current.nam || new Date().getFullYear()}`
        : 'Chưa có dữ liệu đánh giá',
      statusLabel: myTraining.current
        ? getTrainingClassification(myTraining.current.diemRL)
        : 'Chờ cập nhật',
      statusTone: !myTraining.current
        ? 'neutral'
        : myTraining.current.diemRL >= 80
        ? 'good'
        : myTraining.current.diemRL >= 50
        ? 'warning'
        : 'critical',
      actionHint: 'Chi tiết',
      onClick: () => onSwitchView?.('training'),
    },
  ];

  const creditProgressPct =
    academicSummary.totalCredits > 0
      ? Math.round((academicSummary.passedCredits / academicSummary.totalCredits) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* STUDENT GLOBAL TIME FILTER & IDENTITY STRIP */}
      <section
        aria-label="Bộ lọc thời gian sinh viên"
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div
          role="tablist"
          aria-label="Chọn phạm vi thời gian"
          className="inline-flex flex-wrap items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md self-start"
        >
          {STUDENT_TIME_OPTIONS.map((opt) => (
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

        <div className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
          <strong className="text-slate-900 dark:text-slate-100 font-sans">
            {studentObj?.hoTen || studentCode || 'Sinh viên'}
          </strong>
          {studentObj?.lop && (
            <>
              <span className="mx-1.5 text-slate-300 dark:text-slate-700">·</span>
              <span>Lớp {studentObj.lop}</span>
            </>
          )}
          <span className="mx-1.5 text-slate-300 dark:text-slate-700">·</span>
          <span>Cập nhật {lastUpdatedLabel}</span>
        </div>
      </section>

      {/* TIER 1: KNOW NOW */}
      <DashboardKpiRow items={kpiItems} />

      {/* TIER 2: TODAY SCHEDULE & EXAMS (7 cols) + PERSONAL ALERTS & TASKS (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-7 space-y-4">
          {/* 1. Hôm nay tôi có gì? (Lịch học) */}
          <section
            aria-label="Lịch học hôm nay và tuần này"
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {timePreset === 'TODAY'
                      ? `Lịch học hôm nay (${formatThuLabel(todayThuCode)})`
                      : 'Lịch học trong tuần'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('schedule')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Xem TKB đầy đủ
              </button>
            </div>

            {(timePreset === 'TODAY' ? todaySessions : myScheduleSessions).length === 0 ? (
              <EmptyState
                message={
                  timePreset === 'TODAY'
                    ? `Hôm nay (${formatThuLabel(todayThuCode)}) bạn không có tiết học trên lớp.`
                    : 'Chưa có dữ liệu thời khóa biểu cho học kỳ hiện tại.'
                }
              />
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {(timePreset === 'TODAY' ? todaySessions : myScheduleSessions.slice(0, 6)).map((ses) => (
                  <div key={ses.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {ses.tenMH}{' '}
                        <span className="font-mono font-normal text-slate-500 dark:text-slate-400">
                          ({ses.maMH})
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span className="font-mono tabular-nums font-medium text-blue-700 dark:text-blue-400">
                          {formatThuLabel(ses.thu)} · Tiết {ses.tietBatDau}–{ses.tietBatDau + ses.soTiet - 1}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {ses.phong}
                          {ses.coSo ? ` (${ses.coSo})` : ''}
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 shrink-0">
                      GV: {ses.giangVien}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. Lịch thi & Kiểm tra: Môn gì - Thi khi nào - Ở đâu - Cần chuẩn bị gì? */}
          <section
            aria-label="Lịch thi và kiểm tra sắp tới"
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Lịch thi & Kiểm tra ({myExams.length})
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('schedule')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                Chi tiết lịch thi
              </button>
            </div>

            {myExams.length === 0 ? (
              <EmptyState message="Chưa có lịch thi hoặc bài kiểm tra nào trong khoảng thời gian đang chọn." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Môn thi / Hình thức</th>
                      <th className="py-2 px-3">Khi nào</th>
                      <th className="py-2 px-3">Ở đâu</th>
                      <th className="py-2 px-3">Nội dung / Chuẩn bị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {myExams.slice(0, 5).map((ex) => (
                      <tr key={ex.id}>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {ex.tenMH || ex.maMH}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {getExamTypeLabel(ex.loai)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {ex.ngayKiemTra ? formatShortDateVi(ex.ngayKiemTra) : ex.tuanKiemTra ? `Tuần ${ex.tuanKiemTra}` : 'Chưa xếp ngày'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {ex.phong}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {ex.noiDung || ex.tieuDe}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right 5 cols: Personal Alerts & Actionable Tasks */}
        <div className="xl:col-span-5">
          <DashboardAlertCenter
            title="Cần chú ý & Việc cần làm"
            alerts={studentAlerts}
            onAlertAction={(alert) => {
              if (alert.targetView && onSwitchView) onSwitchView(alert.targetView);
            }}
            emptyMessage="Tuyệt vời! Bạn không có cảnh báo hay hạn cần xử lý khẩn cấp nào."
          />
        </div>
      </div>

      {/* TIER 3: ACADEMIC PROGRESS & NEW GRADES (8 cols) + TRAINING & NOTIFICATIONS (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Academic Performance & Attendance per Subject */}
        <section
          aria-label="Kết quả học tập và tiến độ môn học"
          className="xl:col-span-8 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Kết quả học tập & Chuyên cần học kỳ ({myCourses.length} học phần)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Tiến độ tín chỉ đạt: {academicSummary.passedCredits}/{academicSummary.totalCredits} TC ({creditProgressPct}%)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSwitchView?.('grades')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <span>Bảng điểm chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {myCourses.length === 0 ? (
            <div className="p-6">
              <EmptyState message="Chưa có học phần nào được ghi nhận trong học kỳ hiện tại." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Học phần</th>
                    <th className="py-2.5 px-3 text-center">TC</th>
                    <th className="py-2.5 px-3 text-center">Hệ 10</th>
                    <th className="py-2.5 px-3 text-center">Hệ 4</th>
                    <th className="py-2.5 px-3 text-center">Vắng</th>
                    <th className="py-2.5 px-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {myCourses.map((c) => (
                    <tr key={c.maMH} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{c.tenMH}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{c.maMH}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">{c.soTinChi}</td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                        {c.diem ? c.diem.diemTongKet10.toFixed(1) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold">
                        {c.score4 !== null ? c.score4.toFixed(1) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                        <span
                          className={
                            c.missedPeriods >= 6 || c.absencePct >= 15
                              ? 'font-bold text-rose-700 dark:text-rose-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }
                        >
                          {c.missedPeriods} tiết
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {!c.diem ? (
                          <span className="text-slate-500 dark:text-slate-400">Đang học</span>
                        ) : (c.score4 ?? 0) >= 1.0 && c.diem.trangThai !== 'FAILED' ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Đạt</span>
                        ) : (
                          <span className="text-rose-700 dark:text-rose-400 font-semibold">Chưa đạt</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right 4 cols: Training Progress + Notifications + Retake Fees */}
        <div className="xl:col-span-4 space-y-4">
          {/* Training Points */}
          <section
            aria-label="Điểm rèn luyện cá nhân"
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Điểm rèn luyện
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('training')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Chi tiết
              </button>
            </div>

            {!myTraining.current ? (
              <EmptyState message="Chưa có dữ liệu điểm rèn luyện cá nhân." />
            ) : (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    Tháng {myTraining.current.thang}/{myTraining.current.nam || new Date().getFullYear()}
                  </span>
                  <span className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-slate-100">
                    {myTraining.current.diemRL}/100 · {getTrainingClassification(myTraining.current.diemRL)}
                  </span>
                </div>
                <div className="w-full h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded ${
                      myTraining.current.diemRL >= 80
                        ? 'bg-emerald-600'
                        : myTraining.current.diemRL >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-600'
                    }`}
                    style={{ width: `${Math.min(100, myTraining.current.diemRL)}%` }}
                  />
                </div>
                {myTraining.history.length > 1 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {myTraining.history.slice(1, 4).map((h) => (
                      <div key={h.id} className="py-1.5 flex items-center justify-between font-mono tabular-nums">
                        <span className="text-slate-600 dark:text-slate-400">Tháng {h.thang}/{h.nam}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {h.diemRL}đ ({getTrainingClassification(h.diemRL)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Notifications & Retakes */}
          <section
            aria-label="Thông báo mới và lệ phí thi lại"
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Thông báo & Lệ phí phát sinh
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSwitchView?.('retakes')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Thi lại
              </button>
            </div>

            {myRetakes.length > 0 ? (
              <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>{myRetakes.length} môn đăng ký thi/học lại</span>
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {myRetakes.reduce((s, r) => s + (r.phiDiem || 0), 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            ) : (
              <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Không có lệ phí thi lại / học lại phát sinh.</span>
              </div>
            )}

            {myNotices.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chưa có thông báo mới nào từ giảng viên hoặc phòng đào tạo.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {myNotices.slice(0, 4).map((n) => (
                  <li key={n.id} className="py-2 space-y-0.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {n.tieuDe}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {n.tenMH || n.maMH} · {formatShortDateVi(n.ngayKiemTra || n.createdAt)}
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
