// src/components/reports/ReportsModule.tsx
// Phân hệ Tổng Quan & Báo Cáo Đào Tạo - Trường ĐH Trần Đại Nghĩa (TDNU EduAdmin)
// Tuân thủ triệt để nguyên tắc:
// 1. KHÔNG tự tạo dữ liệu mẫu, không hard-code số liệu. Số liệu 100% từ database thực tế.
// 2. Trạng thái rỗng (Empty State) trung thực: hiển thị rõ ràng khi chưa có điểm/rèn luyện/học phí.
// 3. KHÔNG biến hệ thống thành AI app (Không chatbot, robot, Copilot, gradient lòe loẹt).
// 4. STUDENT DASHBOARD: Tập trung vào học kỳ hiện hành (Học tập, Tình trạng môn học, Rèn luyện theo tháng, Học phí/lệ phí thực tế).
// 5. ADMIN DASHBOARD: Tổng quan học tập, Rèn luyện tháng hiện tại, Kết quả theo lớp & Mô hình Drill-Down.
// 6. BÁO CÁO NHANH CHO ADMIN: Chọn phạm vi -> Chọn loại -> Xem trước (Preview A4) -> In/Xuất Excel (.xlsx).

import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { apiService } from '../../services/apiService';
import { triggerPrintWithFallback, downloadPrintableHtml } from '../../utils/printHelper';
import { SPECIALIZED_FACULTIES } from '../../utils/classHelper';
import { ReportView, ReportFilterControl } from './ReportView';
import { AdminOverviewDashboard } from './dashboard/AdminOverviewDashboard';
import { LecturerOverviewDashboard } from './dashboard/LecturerOverviewDashboard';
import { StudentOverviewDashboard } from './dashboard/StudentOverviewDashboard';
import { ExportCurrentFilterRequest } from './dashboard/dashboardTypes';
import {
  UserRole,
  User,
  Diem,
  SinhVien,
  MonHoc,
  DiemDanh,
  ThoiKhoaBieu,
  ThongBaoKiemTra,
  HocKy,
  NamHoc,
  ThiLaiHocLai,
  RenLuyen,
} from '../../types';
import {
  BarChart3,
  Award,
  GraduationCap,
  Building,
  BookOpen,
  CheckCircle2,
  Download,
  Info,
  X,
  FileSpreadsheet,
  ArrowLeft,
  Printer,
  ChevronRight,
  ShieldAlert,
  CreditCard,
} from 'lucide-react';
import { getAcademicPeriod } from '../../utils/academicCalendar';
import {
  PageHeader,
  MetricStrip,
  DataToolbar,
  StatusBadge,
  PaginationBar,
  LoadingState,
  EmptyState,
  FilteredEmptyState,
  ErrorBanner,
  ErrorState,
} from '../common';

interface ReportsModuleProps {
  userRole?: UserRole;
  currentUser?: User | null;
  currentStudentCode?: string;
  activeSemester?: string;
  semesters?: HocKy[];
  academicYears?: NamHoc[];
  students?: SinhVien[];
  grades?: Diem[];
  schedule?: ThoiKhoaBieu[];
  subjects?: MonHoc[];
  trainingPoints?: RenLuyen[];
  retakes?: ThiLaiHocLai[];
  onSwitchView?: (view: string) => void;
  onOpenFullProfile?: (maSV: string) => void;
  initialTab?: 'DASHBOARD' | 'CLASS_DRILLDOWN' | 'QUICK_REPORT';
  isLoadingData?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
}

// Data model for class metrics
interface ClassMetricItem {
  maLop: string;
  tenLop: string;
  siSo: number;
  khoa: string;
  covan: string;
  diemTBHocTap: number; // 0-10
  tyLeQuaMon: number; // 0-100%
  diemRLLopTB: number; // 0-100
  soSVCandChuY: number;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  userRole = 'STUDENT',
  currentUser = null,
  currentStudentCode = '',
  activeSemester = getAcademicPeriod().code,
  semesters = [],
  academicYears: _academicYears = [],
  students = [],
  grades = [],
  schedule = [],
  subjects = [],
  trainingPoints = [],
  retakes = [],
  onSwitchView,
  onOpenFullProfile,
  initialTab = 'DASHBOARD',
  isLoadingData = false,
  loadError = null,
  onRetryLoad,
}) => {
  const isStudent = userRole === 'STUDENT';
  const isLecturer = userRole === 'LECTURER';
  const myStudentCode = (currentStudentCode || '').trim().toLowerCase();

  // Active semester breakdown
  const semesterSeparator = activeSemester.indexOf('-');
  const currentActiveSemester = semesterSeparator >= 0 ? activeSemester.slice(0, semesterSeparator) : activeSemester;
  const currentActiveYear = semesterSeparator >= 0 ? activeSemester.slice(semesterSeparator + 1) : '';

  // Core State
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [allGrades, setAllGrades] = useState<Diem[]>(grades);
  const [attendanceList, setAttendanceList] = useState<DiemDanh[]>([]);
  const [examNotices, setExamNotices] = useState<ThongBaoKiemTra[]>([]);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>(() =>
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  );

  // Navigation mode for Admin: 'DASHBOARD' | 'CLASS_DRILLDOWN' | 'QUICK_REPORT'
  const [adminTab, setAdminTab] = useState<'DASHBOARD' | 'CLASS_DRILLDOWN' | 'QUICK_REPORT'>(initialTab);

  useEffect(() => {
    setAdminTab(initialTab);
    if (initialTab !== 'CLASS_DRILLDOWN') {
      setDrilldownClassCode(null);
      setDrilldownStudent(null);
    }
  }, [initialTab]);

  // Filter States for Admin Dashboard
  const [filterSemester, setFilterSemester] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>(() => String(new Date().getMonth() + 1));
  const [filterFaculty, setFilterFaculty] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  // Drill-down State (Level 2: Selected Class, Level 3: Selected Student)
  const [drilldownClassCode, setDrilldownClassCode] = useState<string | null>(null);
  const [drilldownStudent, setDrilldownStudent] = useState<SinhVien | null>(null);

  // Quick Report Generator State
  const [reportScopeSemester, setReportScopeSemester] = useState<string>('ALL');
  const [reportScopeFaculty, setReportScopeFaculty] = useState<string>('ALL');
  const [reportScopeClass, setReportScopeClass] = useState<string>('ALL');
  const [reportScopeMonth, setReportScopeMonth] = useState<string>(() => String(new Date().getMonth() + 1));
  const [reportType, setReportType] = useState<'ACADEMIC' | 'TRAINING' | 'ATTENTION' | 'RETAKES_FEES'>('ACADEMIC');
  const [reportUnitName, setReportUnitName] = useState<string>('PHÒNG ĐÀO TẠO VÀ QUẢN LÝ SINH VIÊN');
  const [reportDocumentCode, setReportDocumentCode] = useState<string>('');
  const [showReportSignatures, setShowReportSignatures] = useState<boolean>(true);
  const [reporterTitle, setReporterTitle] = useState<string>('NGƯỜI LẬP BÁO CÁO');
  const [reporterName, setReporterName] = useState<string>('');
  const [managerTitle, setManagerTitle] = useState<string>('TRƯỞNG PHÒNG ĐÀO TẠO');
  const [managerName, setManagerName] = useState<string>('');
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const printPageRef = useRef<HTMLDivElement>(null);

  // Search query & Pagination states
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [classSearchQuery, setClassSearchQuery] = useState<string>('');
  const [attentionPage, setAttentionPage] = useState<number>(1);
  const [attentionPageSize, setAttentionPageSize] = useState<number>(10);
  const [classPage, setClassPage] = useState<number>(1);
  const [classPageSize, setClassPageSize] = useState<number>(10);
  const [drilldownPage, setDrilldownPage] = useState<number>(1);
  const [drilldownPageSize, setDrilldownPageSize] = useState<number>(10);

  // Escape handler for Drilldown modal
  useEffect(() => {
    if (!drilldownStudent) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrilldownStudent(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [drilldownStudent]);

  // Initial Data Fetching
  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [resAtt, resGrades, resNotices] = await Promise.all([
        apiService.getAttendance(),
        grades.length > 0 ? Promise.resolve({ success: true, data: grades }) : apiService.getGrades(),
        apiService.getExamNotices().catch(() => ({ success: false, data: [] as ThongBaoKiemTra[] })),
      ]);
      if (resAtt?.success && resAtt.data) setAttendanceList(resAtt.data);
      if (resNotices?.success && resNotices.data) setExamNotices(resNotices.data);
      if (resGrades?.success && resGrades.data) {
        setAllGrades(resGrades.data);
      } else if (!resGrades?.success) {
        const errMsg =
          resGrades && 'message' in resGrades && typeof (resGrades as { message?: unknown }).message === 'string'
            ? (resGrades as { message: string }).message
            : undefined;
        setFetchError(errMsg || 'Không thể tải dữ liệu điểm số.');
      }
      setLastUpdatedLabel(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setFetchError('Không thể kết nối máy chủ khi tải dữ liệu báo cáo.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWithCurrentFilters = (req: ExportCurrentFilterRequest) => {
    if (req.semester) setReportScopeSemester(req.semester);
    if (req.faculty) setReportScopeFaculty(req.faculty);
    if (req.className) setReportScopeClass(req.className);
    if (req.month) setReportScopeMonth(req.month);
    if (req.reportType) setReportType(req.reportType);
    setAdminTab('QUICK_REPORT');
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!isMounted) return;
      await fetchData();
    };
    load();

    const handleUpdate = () => {
      if (isMounted) fetchData();
    };
    window.addEventListener('app-data-updated', handleUpdate);
    window.addEventListener('attendance-updated', handleUpdate);
    window.addEventListener('exam-notices-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('app-data-updated', handleUpdate);
      window.removeEventListener('attendance-updated', handleUpdate);
      window.removeEventListener('exam-notices-updated', handleUpdate);
    };
  }, [grades, activeSemester]);

  // Dynamic Faculties (always includes the 2 specialized faculties)
  const uniqueFaculties = useMemo(() => {
    const set = new Set<string>(SPECIALIZED_FACULTIES);
    (students || []).forEach((s) => s.khoa && set.add(s.khoa));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [students]);

  // Dynamic Classes (scoped by faculty for dashboard & quick report)
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    (students || []).forEach((s) => {
      if (filterFaculty !== 'ALL' && s.khoa !== filterFaculty) return;
      if (s.lop) set.add(s.lop);
    });
    return Array.from(set).sort();
  }, [students, filterFaculty]);

  const reportUniqueClasses = useMemo(() => {
    const set = new Set<string>();
    (students || []).forEach((s) => {
      if (reportScopeFaculty !== 'ALL' && s.khoa !== reportScopeFaculty) return;
      if (s.lop) set.add(s.lop);
    });
    return Array.from(set).sort();
  }, [students, reportScopeFaculty]);

  // Dynamic Semesters from HocKy table + Grade records
  const availableSemesters = useMemo(() => {
    const map = new Map<string, string>();
    (semesters || []).forEach((hk) => {
      if (hk.hocKyID) {
        map.set(hk.hocKyID, hk.tenHocKy ? `${hk.tenHocKy} (${hk.hocKyID})` : hk.hocKyID);
      }
    });
    (allGrades || []).forEach((g) => {
      if (g.hocKy && !map.has(g.hocKy)) {
        map.set(g.hocKy, g.hocKy);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [semesters, allGrades]);

  // Dynamic Months from Training Points + Current Month
  const availableMonths = useMemo(() => {
    const set = new Set<number>();
    set.add(new Date().getMonth() + 1);
    (trainingPoints || []).forEach((r) => {
      if (typeof r.thang === 'number' && r.thang >= 1 && r.thang <= 12) {
        set.add(r.thang);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [trainingPoints]);

  // =========================================================================
  // 1. STUDENT METRICS & LOGIC (STUDENT DASHBOARD)
  // =========================================================================
  const currentStudentObj = useMemo(() => {
    if (!isStudent || !myStudentCode) return null;
    return (students || []).find((s) => s.maSV.toLowerCase() === myStudentCode);
  }, [isStudent, myStudentCode, students]);

  // Student's grades in active semester
  const studentActiveSemesterGrades = useMemo(() => {
    if (!isStudent || !myStudentCode) return [];
    return (allGrades || []).filter((g) => {
      if (g.maSV.toLowerCase() !== myStudentCode) return false;
      if (currentActiveSemester && g.hocKy) {
        return g.hocKy === currentActiveSemester || g.hocKy.includes(currentActiveSemester);
      }
      return true;
    });
  }, [isStudent, myStudentCode, allGrades, currentActiveSemester]);

  // Student's registered courses in active semester from schedule & grades
  const studentActiveSemesterCourses = useMemo(() => {
    if (!isStudent) return [];
    const courseMap = new Map<
      string,
      {
        maMH: string;
        tenMH: string;
        soTinChi: number;
        giangVien: string;
        diem?: Diem;
        missedPeriods: number;
        totalPeriods: number;
        absencePct: number;
      }
    >();

    // 1. From Schedule
    (schedule || []).forEach((sch) => {
      const matchesStudent = sch.maSV && sch.maSV.toLowerCase() === myStudentCode;
      const matchesLop = sch.lop && currentStudentObj?.lop && sch.lop.toLowerCase() === currentStudentObj.lop.toLowerCase();
      const matchesHk = !sch.hocKy || sch.hocKy === currentActiveSemester || sch.hocKy.includes(currentActiveSemester);

      if ((matchesStudent || matchesLop) && matchesHk && sch.maMH) {
        if (!courseMap.has(sch.maMH)) {
          courseMap.set(sch.maMH, {
            maMH: sch.maMH,
            tenMH: sch.tenMH || sch.maMH,
            soTinChi: sch.soTinChi || 3,
            giangVien: sch.giangVien || 'Khoa phân công',
            missedPeriods: 0,
            totalPeriods: (sch.soTinChi || 3) * 15,
            absencePct: 0,
          });
        }
      }
    });

    // 2. From Subjects (if student class matches)
    (subjects || []).forEach((sub) => {
      const matchesLop = !sub.lop || sub.lop === 'all' || (currentStudentObj?.lop && sub.lop.toLowerCase() === currentStudentObj.lop.toLowerCase());
      const matchesHk = !sub.hocKy || sub.hocKy === currentActiveSemester;
      if (matchesLop && matchesHk && sub.maMH) {
        if (!courseMap.has(sub.maMH)) {
          courseMap.set(sub.maMH, {
            maMH: sub.maMH,
            tenMH: sub.tenMH,
            soTinChi: sub.soTinChi || 3,
            giangVien: 'Khoa phân công',
            missedPeriods: 0,
            totalPeriods: (sub.soTinChi || 3) * 15,
            absencePct: 0,
          });
        }
      }
    });

    // 3. Attach Grades & Attendance
    const studentAtt = (attendanceList || []).filter((a) => a.maSV?.toLowerCase() === myStudentCode);

    courseMap.forEach((item, maMH) => {
      const matchingGrade = studentActiveSemesterGrades.find((g) => g.maMH === maMH);
      if (matchingGrade) {
        item.diem = matchingGrade;
        if (matchingGrade.tenMH) item.tenMH = matchingGrade.tenMH;
        if (matchingGrade.soTinChi) {
          item.soTinChi = matchingGrade.soTinChi;
          item.totalPeriods = matchingGrade.soTinChi * 15;
        }
      }

      const attRecords = studentAtt.filter((a) => a.maMH === maMH);
      const missed = attRecords.reduce((sum, r) => sum + (r.soTietNghi || 0), 0);
      item.missedPeriods = missed;
      item.absencePct = item.totalPeriods > 0 ? (missed / item.totalPeriods) * 100 : 0;
    });

    // Also include any courses that have grades but were not in schedule
    studentActiveSemesterGrades.forEach((g) => {
      if (!courseMap.has(g.maMH)) {
        const totalPeriods = (g.soTinChi || 3) * 15;
        const attRecords = studentAtt.filter((a) => a.maMH === g.maMH);
        const missed = attRecords.reduce((sum, r) => sum + (r.soTietNghi || 0), 0);
        courseMap.set(g.maMH, {
          maMH: g.maMH,
          tenMH: g.tenMH || g.maMH,
          soTinChi: g.soTinChi || 3,
          giangVien: 'Khoa phân công',
          diem: g,
          missedPeriods: missed,
          totalPeriods,
          absencePct: totalPeriods > 0 ? (missed / totalPeriods) * 100 : 0,
        });
      }
    });

    return Array.from(courseMap.values());
  }, [isStudent, myStudentCode, schedule, subjects, currentStudentObj, currentActiveSemester, studentActiveSemesterGrades, attendanceList]);

  // Student Academic Stats (Học tập học kỳ hiện tại)
  const studentAcademicSummary = useMemo(() => {
    if (!isStudent) return null;
    const courses = studentActiveSemesterCourses;
    const coursesWithGrades = courses.filter((c) => c.diem && typeof c.diem.diemTongKet10 === 'number' && !isNaN(c.diem.diemTongKet10));

    const totalRegisteredCredits = courses.reduce((sum, c) => sum + c.soTinChi, 0);

    if (coursesWithGrades.length === 0) {
      return {
        hasGrades: false,
        totalRegisteredCredits,
        passedCredits: 0,
        gpa10: null,
        gpa4: null,
        academicStanding: 'Chưa có điểm',
        passedCoursesCount: 0,
        totalCoursesCount: courses.length,
      };
    }

    let weighted10 = 0;
    let weighted4 = 0;
    let gradedCredits = 0;
    let passedCredits = 0;
    let passedCoursesCount = 0;

    coursesWithGrades.forEach((c) => {
      const g = c.diem!;
      const credits = c.soTinChi;
      weighted10 += (g.diemTongKet10 || 0) * credits;
      weighted4 += (g.diemThang4 || 0) * credits;
      gradedCredits += credits;

      if (g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0) {
        passedCredits += credits;
        passedCoursesCount++;
      }
    });

    const gpa10 = gradedCredits > 0 ? Math.round((weighted10 / gradedCredits) * 100) / 100 : 0;
    const gpa4 = gradedCredits > 0 ? Math.round((weighted4 / gradedCredits) * 100) / 100 : 0;

    let academicStanding = 'Chưa có điểm';
    if (gpa10 >= 9.0) academicStanding = 'Xuất sắc';
    else if (gpa10 >= 8.0) academicStanding = 'Giỏi';
    else if (gpa10 >= 7.0) academicStanding = 'Khá';
    else if (gpa10 >= 5.5) academicStanding = 'Trung bình';
    else if (gpa10 >= 4.0) academicStanding = 'Yếu';
    else academicStanding = 'Kém';

    return {
      hasGrades: true,
      totalRegisteredCredits,
      passedCredits,
      gpa10,
      gpa4,
      academicStanding,
      passedCoursesCount,
      totalCoursesCount: courses.length,
    };
  }, [isStudent, studentActiveSemesterCourses]);

  // Student Training Points by Month
  const studentTrainingData = useMemo(() => {
    if (!isStudent || !myStudentCode) return { currentMonthRecord: null, recentHistory: [], allRecords: [] };
    const myRecords = (trainingPoints || []).filter(
      (r) => r.maSV && r.maSV.toLowerCase() === myStudentCode
    );

    const now = new Date();
    const currM = now.getMonth() + 1;
    const currY = now.getFullYear();

    // Check if record exists for current month
    const currentMonthRecord = myRecords.find((r) => r.thang === currM && (!r.nam || r.nam === currY)) || null;

    // Sort recent history descending
    const sorted = [...myRecords].sort((a, b) => {
      const yA = a.nam || currY;
      const yB = b.nam || currY;
      if (yA !== yB) return yB - yA;
      return (b.thang || 0) - (a.thang || 0);
    });

    return {
      currentMonthRecord,
      recentHistory: sorted.slice(0, 5),
      allRecords: sorted,
    };
  }, [isStudent, myStudentCode, trainingPoints]);

  // Student Tuition & Retake Fees
  const studentTuitionData = useMemo(() => {
    if (!isStudent || !myStudentCode) return { hasData: false, totalFee: 0, retakeItems: [] };
    const myRetakes = (retakes || []).filter(
      (r) => r.maSV && r.maSV.toLowerCase() === myStudentCode
    );

    const totalFee = myRetakes.reduce((sum, r) => sum + (r.phiDiem || 0), 0);
    return {
      hasData: myRetakes.length > 0,
      totalFee,
      retakeItems: myRetakes,
    };
  }, [isStudent, myStudentCode, retakes]);

  // =========================================================================
  // 2. ADMIN METRICS & LOGIC (ADMIN DASHBOARD)
  // =========================================================================

  // Scope filter students
  const filteredStudents = useMemo(() => {
    return (students || []).filter((s) => {
      if (filterFaculty !== 'ALL' && s.khoa !== filterFaculty) return false;
      if (selectedClassFilter !== 'ALL' && s.lop !== selectedClassFilter) return false;
      return true;
    });
  }, [students, filterFaculty, selectedClassFilter]);

  const filteredStudentIds = useMemo(() => {
    return new Set(filteredStudents.map((s) => s.maSV.toLowerCase()));
  }, [filteredStudents]);

  // Scope filter grades
  const filteredGrades = useMemo(() => {
    return (allGrades || []).filter((g) => {
      if (!filteredStudentIds.has(g.maSV.toLowerCase())) return false;
      if (filterSemester !== 'ALL' && g.hocKy && g.hocKy !== filterSemester) return false;
      return true;
    });
  }, [allGrades, filteredStudentIds, filterSemester]);

  // Academic Overview KPIs (100% real math, no mock)
  const adminAcademicKPIs = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const totalGrades = filteredGrades.length;

    if (totalGrades === 0) {
      return {
        totalStudents,
        totalClasses: new Set(filteredStudents.map((s) => s.lop).filter(Boolean)).size,
        avgGPA10: null,
        passRate: null,
        passedGradesCount: 0,
        failedGradesCount: 0,
        totalGradesCount: 0,
      };
    }

    const passedGrades = filteredGrades.filter(
      (g) => g.trangThai === 'PASSED' || (typeof g.diemTongKet10 === 'number' && g.diemTongKet10 >= 4.0)
    );
    const failedGrades = filteredGrades.filter(
      (g) => g.trangThai === 'FAILED' || (typeof g.diemTongKet10 === 'number' && g.diemTongKet10 < 4.0)
    );

    const sum10 = filteredGrades.reduce((sum, g) => sum + (g.diemTongKet10 || 0), 0);
    const avgGPA10 = Math.round((sum10 / totalGrades) * 100) / 100;
    const passRate = Math.round((passedGrades.length / totalGrades) * 1000) / 10;

    return {
      totalStudents,
      totalClasses: new Set(filteredStudents.map((s) => s.lop).filter(Boolean)).size,
      avgGPA10,
      passRate,
      passedGradesCount: passedGrades.length,
      failedGradesCount: failedGrades.length,
      totalGradesCount: totalGrades,
    };
  }, [filteredStudents, filteredGrades]);

  // Attention cases (Students needing attention: failed subjects, high absences >= 10%, or low training points < 50)
  const attentionStudentsList = useMemo(() => {
    const list: Array<{
      maSV: string;
      hoTen: string;
      lop: string;
      khoa: string;
      failedSubjectsCount: number;
      missedPeriodsTotal: number;
      hasAbsenceDanger: boolean;
      trainingScoreRecent: number | null;
      attentionReason: string;
    }> = [];

    filteredStudents.forEach((st) => {
      const stCode = st.maSV.toLowerCase();
      const stGrades = (allGrades || []).filter((g) => g.maSV.toLowerCase() === stCode);
      const failedCount = stGrades.filter(
        (g) => g.trangThai === 'FAILED' || (typeof g.diemTongKet10 === 'number' && g.diemTongKet10 < 4.0)
      ).length;

      const stAtt = (attendanceList || []).filter((a) => a.maSV?.toLowerCase() === stCode);
      const missedPeriods = stAtt.reduce((sum, a) => sum + (a.soTietNghi || 0), 0);
      const hasAbsenceDanger = missedPeriods >= 9; // ~15-20% of typical course

      const stRL = (trainingPoints || []).filter((r) => r.maSV && r.maSV.toLowerCase() === stCode);
      const recentRL = stRL.length > 0 ? stRL[stRL.length - 1].diemRL : null;
      const isLowRL = recentRL !== null && recentRL < 50;

      const reasons: string[] = [];
      if (failedCount > 0) reasons.push(`Nợ ${failedCount} môn`);
      if (missedPeriods >= 6) reasons.push(`Vắng ${missedPeriods} tiết`);
      if (isLowRL) reasons.push(`Điểm RL yếu (${recentRL}đ)`);

      if (reasons.length > 0) {
        list.push({
          maSV: st.maSV,
          hoTen: st.hoTen,
          lop: st.lop || 'Chưa xếp lớp',
          khoa: st.khoa || 'Chuyên môn',
          failedSubjectsCount: failedCount,
          missedPeriodsTotal: missedPeriods,
          hasAbsenceDanger,
          trainingScoreRecent: recentRL,
          attentionReason: reasons.join(' • '),
        });
      }
    });

    return list;
  }, [filteredStudents, allGrades, attendanceList, trainingPoints]);

  // Current Month Training Overview for Admin
  const adminTrainingOverview = useMemo(() => {
    const targetMonth = Number(filterMonth);
    const monthlyRecords = (trainingPoints || []).filter((r) => {
      if (!filteredStudentIds.has(r.maSV?.toLowerCase())) return false;
      if (!isNaN(targetMonth) && r.thang !== targetMonth) return false;
      return true;
    });

    if (monthlyRecords.length === 0) {
      return {
        hasData: false,
        totalEvaluated: 0,
        distribution: { xuatSac: 0, tot: 0, kha: 0, trungBinh: 0, yeuKem: 0 },
        avgScore: null,
      };
    }

    let xs = 0, tot = 0, kha = 0, tb = 0, yk = 0;
    let sumScore = 0;

    monthlyRecords.forEach((r) => {
      const s = Number(r.diemRL || 0);
      sumScore += s;
      if (s >= 90) xs++;
      else if (s >= 80) tot++;
      else if (s >= 70) kha++;
      else if (s >= 50) tb++;
      else yk++;
    });

    const total = monthlyRecords.length;
    const avgScore = total > 0 ? Math.round(sumScore / total) : 0;

    return {
      hasData: true,
      totalEvaluated: total,
      distribution: {
        xuatSac: xs,
        tot,
        kha,
        trungBinh: tb,
        yeuKem: yk,
      },
      avgScore,
    };
  }, [trainingPoints, filteredStudentIds, filterMonth]);

  // Class Results Table & Drill-Down Metric Items
  const classMetricList: ClassMetricItem[] = useMemo(() => {
    const classMap = new Map<string, SinhVien[]>();
    (students || []).forEach((s) => {
      if (s.lop) {
        if (!classMap.has(s.lop)) classMap.set(s.lop, []);
        classMap.get(s.lop)!.push(s);
      }
    });

    return Array.from(classMap.entries()).map(([maLop, classStList]) => {
      const studentIds = new Set(classStList.map((s) => s.maSV.toLowerCase()));
      const classGrades = (allGrades || []).filter((g) => studentIds.has(g.maSV.toLowerCase()));

      let diemTBHocTap = 0;
      let tyLeQuaMon = 0;
      if (classGrades.length > 0) {
        const sum10 = classGrades.reduce((sum, g) => sum + (g.diemTongKet10 || 0), 0);
        diemTBHocTap = Math.round((sum10 / classGrades.length) * 100) / 100;
        const passedCount = classGrades.filter((g) => g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0).length;
        tyLeQuaMon = Math.round((passedCount / classGrades.length) * 1000) / 10;
      }

      // Training Points average for class
      const classRL = (trainingPoints || []).filter((r) => r.maSV && studentIds.has(r.maSV.toLowerCase()));
      let diemRLLopTB = 0;
      if (classRL.length > 0) {
        const sumRL = classRL.reduce((sum, r) => sum + (r.diemRL || 0), 0);
        diemRLLopTB = Math.round(sumRL / classRL.length);
      }

      // Attention count in class
      const attentionCount = attentionStudentsList.filter((a) => a.lop === maLop).length;

      return {
        maLop,
        tenLop: `Lớp ${maLop}`,
        siSo: classStList.length,
        khoa: classStList[0]?.khoa || 'Chuyên môn',
        covan: 'Cố vấn học tập',
        diemTBHocTap,
        tyLeQuaMon,
        diemRLLopTB,
        soSVCandChuY: attentionCount,
      };
    });
  }, [students, allGrades, trainingPoints, attentionStudentsList]);

  // Selected class for drilldown
  const drilldownClassObj = useMemo(() => {
    if (!drilldownClassCode) return null;
    return classMetricList.find((c) => c.maLop === drilldownClassCode) || null;
  }, [drilldownClassCode, classMetricList]);

  // Students in selected drilldown class
  const drilldownClassStudents = useMemo(() => {
    if (!drilldownClassCode) return [];
    return (students || [])
      .filter((s) => s.lop === drilldownClassCode)
      .filter((s) => {
        if (!searchStudentQuery.trim()) return true;
        const q = searchStudentQuery.toLowerCase();
        return s.maSV.toLowerCase().includes(q) || s.hoTen.toLowerCase().includes(q);
      });
  }, [drilldownClassCode, students, searchStudentQuery]);

  // =========================================================================
  // 3. QUICK REPORT GENERATION LOGIC (A4 PRINT & EXCEL EXPORT)
  // =========================================================================

  const reportFilteredStudents = useMemo(() => {
    return (students || []).filter((s) => {
      if (reportScopeFaculty !== 'ALL' && s.khoa !== reportScopeFaculty) return false;
      if (reportScopeClass !== 'ALL' && s.lop !== reportScopeClass) return false;
      return true;
    });
  }, [students, reportScopeFaculty, reportScopeClass]);

  const reportStudentIds = useMemo(() => {
    return new Set(reportFilteredStudents.map((s) => s.maSV.toLowerCase()));
  }, [reportFilteredStudents]);

  // Export to Excel function using real data only
  const handleExportExcel = () => {
    let exportData: any[] = [];
    let fileName = `TDNU_BaoCao_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (reportType === 'ACADEMIC') {
      exportData = reportFilteredStudents.map((st, idx) => {
        const stGrades = (allGrades || []).filter((g) => {
          if (g.maSV.toLowerCase() !== st.maSV.toLowerCase()) return false;
          if (reportScopeSemester !== 'ALL' && g.hocKy !== reportScopeSemester) return false;
          return true;
        });

        const totalCredits = stGrades.reduce((sum, g) => sum + (g.soTinChi || 3), 0);
        const sum10 = stGrades.reduce((sum, g) => sum + (g.diemTongKet10 || 0) * (g.soTinChi || 3), 0);
        const gpa10 = totalCredits > 0 ? (sum10 / totalCredits).toFixed(2) : 'Chưa có điểm';
        const passedCredits = stGrades
          .filter((g) => g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0)
          .reduce((sum, g) => sum + (g.soTinChi || 3), 0);

        return {
          STT: idx + 1,
          'Mã Sinh Viên': st.maSV,
          'Họ và Tên': st.hoTen,
          'Lớp Học': st.lop,
          'Khoa / Ngành': st.khoa,
          'Tổng Số Môn': stGrades.length,
          'Tín Chỉ Tích Lũy': passedCredits,
          'Điểm TB (Hệ 10)': gpa10,
          'Trạng Thái Học Vụ': st.trangThai,
        };
      });
    } else if (reportType === 'TRAINING') {
      const targetMonth = Number(reportScopeMonth);
      exportData = reportFilteredStudents.map((st, idx) => {
        const stRL = (trainingPoints || []).find((r) => {
          if (r.maSV?.toLowerCase() !== st.maSV.toLowerCase()) return false;
          if (!isNaN(targetMonth) && r.thang !== targetMonth) return false;
          return true;
        });

        return {
          STT: idx + 1,
          'Mã Sinh Viên': st.maSV,
          'Họ và Tên': st.hoTen,
          'Lớp Học': st.lop,
          'Khoa / Ngành': st.khoa,
          'Tháng Đánh Giá': targetMonth,
          'Điểm Rèn Luyện': stRL ? stRL.diemRL : 'Chưa đánh giá',
          'Xếp Loại': stRL ? stRL.xepLoai : 'Chưa có dữ liệu',
          'Người Đánh Giá': stRL ? stRL.nguoiDanhGia : '-',
        };
      });
    } else if (reportType === 'ATTENTION') {
      const attentionList = attentionStudentsList.filter((a) => reportStudentIds.has(a.maSV.toLowerCase()));
      exportData = attentionList.map((a, idx) => ({
        STT: idx + 1,
        'Mã Sinh Viên': a.maSV,
        'Họ và Tên': a.hoTen,
        'Lớp Học': a.lop,
        'Khoa': a.khoa,
        'Số Môn Nợ': a.failedSubjectsCount,
        'Số Tiết Vắng': a.missedPeriodsTotal,
        'Điểm Rèn Luyện Gần Nhất': a.trainingScoreRecent ?? 'Chưa có',
        'Lý Do Cần Chú Ý': a.attentionReason,
      }));
    } else if (reportType === 'RETAKES_FEES') {
      const relevantRetakes = (retakes || []).filter((r) => reportStudentIds.has(r.maSV.toLowerCase()));
      exportData = relevantRetakes.map((r, idx) => ({
        STT: idx + 1,
        'Mã Sinh Viên': r.maSV,
        'Họ và Tên SV': r.hoTenSV || r.maSV,
        'Mã Môn': r.maMH,
        'Tên Môn Học': r.tenMH,
        'Loại Đăng Ký': r.loaiDangKy === 'THI_LAI' ? 'Thi Lại' : 'Học Lại',
        'Lệ Phí (VNĐ)': r.phiDiem ? r.phiDiem.toLocaleString('vi-VN') : '0',
        'Trạng Thái': r.trangThai === 'DA_DUYET' ? 'Đã duyệt' : 'Chờ duyệt',
        'Ngày Đăng Ký': r.ngayDangKy || '-',
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoCao');
    XLSX.writeFile(workbook, fileName);
  };

  const filteredClassMetrics = useMemo(() => {
    const q = classSearchQuery.trim().toLowerCase();
    return classMetricList.filter((c) => {
      if (filterFaculty !== 'ALL' && c.khoa !== filterFaculty) return false;
      if (selectedClassFilter !== 'ALL' && c.maLop !== selectedClassFilter) return false;
      if (q && !c.maLop.toLowerCase().includes(q) && !c.khoa.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [classMetricList, filterFaculty, selectedClassFilter, classSearchQuery]);

  // Reset pagination when filters/search change
  useEffect(() => {
    setAttentionPage(1);
  }, [filterSemester, filterFaculty, selectedClassFilter, filterMonth]);

  useEffect(() => {
    setClassPage(1);
  }, [filterFaculty, selectedClassFilter, classSearchQuery]);

  useEffect(() => {
    setDrilldownPage(1);
  }, [drilldownClassCode, searchStudentQuery]);

  const paginatedAttentionList = useMemo(() => {
    const start = (attentionPage - 1) * attentionPageSize;
    return attentionStudentsList.slice(start, start + attentionPageSize);
  }, [attentionStudentsList, attentionPage, attentionPageSize]);

  const paginatedClassList = useMemo(() => {
    const start = (classPage - 1) * classPageSize;
    return filteredClassMetrics.slice(start, start + classPageSize);
  }, [filteredClassMetrics, classPage, classPageSize]);

  const paginatedDrilldownStudents = useMemo(() => {
    const start = (drilldownPage - 1) * drilldownPageSize;
    return drilldownClassStudents.slice(start, start + drilldownPageSize);
  }, [drilldownClassStudents, drilldownPage, drilldownPageSize]);

  const hasAdminFilters =
    filterSemester !== 'ALL' ||
    filterFaculty !== 'ALL' ||
    selectedClassFilter !== 'ALL';

  const clearAdminFilters = () => {
    setFilterSemester('ALL');
    setFilterFaculty('ALL');
    setSelectedClassFilter('ALL');
  };

  const reportAttentionRows = useMemo(() => {
    return attentionStudentsList.filter((a) => reportStudentIds.has(a.maSV.toLowerCase()));
  }, [attentionStudentsList, reportStudentIds]);

  const reportRetakeRows = useMemo(() => {
    return (retakes || []).filter((r) => reportStudentIds.has(r.maSV.toLowerCase()));
  }, [retakes, reportStudentIds]);

  const defaultMonthValue = String(new Date().getMonth() + 1);
  const hasActiveReportFilters =
    reportScopeSemester !== 'ALL' ||
    reportScopeFaculty !== 'ALL' ||
    reportScopeClass !== 'ALL' ||
    reportScopeMonth !== defaultMonthValue;

  const resetReportFilters = () => {
    setReportScopeSemester('ALL');
    setReportScopeFaculty('ALL');
    setReportScopeClass('ALL');
    setReportScopeMonth(defaultMonthValue);
  };

  const reportViewFilters: ReportFilterControl[] = useMemo(
    () => [
      {
        id: 'report-semester',
        label: 'Học kỳ',
        value: reportScopeSemester,
        options: [{ value: 'ALL', label: 'Tất cả học kỳ' }, ...availableSemesters],
        onChange: setReportScopeSemester,
        quickOptions: [
          { value: 'ALL', label: 'Tất cả' },
          ...availableSemesters.slice(0, 2).map((hk) => ({ value: hk.value, label: hk.value })),
        ],
      },
      {
        id: 'report-faculty',
        label: 'Khoa / Ngành',
        value: reportScopeFaculty,
        options: [
          { value: 'ALL', label: 'Tất cả khoa' },
          ...uniqueFaculties.map((f) => ({ value: f, label: f })),
        ],
        onChange: (val) => {
          setReportScopeFaculty(val);
          setReportScopeClass('ALL');
        },
      },
      {
        id: 'report-class',
        label: 'Lớp hành chính',
        value: reportScopeClass,
        options: [
          { value: 'ALL', label: 'Tất cả lớp' },
          ...reportUniqueClasses.map((c) => ({ value: c, label: c })),
        ],
        onChange: setReportScopeClass,
        quickOptions: [
          { value: 'ALL', label: 'Tất cả' },
          ...reportUniqueClasses.slice(0, 3).map((c) => ({ value: c, label: c })),
        ],
      },
      {
        id: 'report-month',
        label: 'Tháng',
        value: reportScopeMonth,
        options: availableMonths.map((m) => ({ value: String(m), label: `Tháng ${m}` })),
        onChange: setReportScopeMonth,
      },
    ],
    [
      reportScopeSemester,
      availableSemesters,
      reportScopeFaculty,
      uniqueFaculties,
      reportScopeClass,
      reportUniqueClasses,
      reportScopeMonth,
      availableMonths,
    ]
  );

  const reportFileName = `TDNU_BaoCao_${reportType}_${new Date().toISOString().slice(0, 10)}.html`;
  const reportDocumentTitle =
    reportType === 'ACADEMIC'
      ? 'Báo cáo tổng hợp kết quả học tập sinh viên'
      : reportType === 'TRAINING'
      ? `Báo cáo đánh giá điểm rèn luyện tháng ${reportScopeMonth}`
      : reportType === 'ATTENTION'
      ? 'Danh sách sinh viên cần chú ý & cảnh báo học vụ'
      : 'Báo cáo thống kê đơn thi lại, học lại & lệ phí';

  const handlePrint = () => {
    setPrintNotice(null);
    triggerPrintWithFallback({
      element: printPageRef.current,
      title: reportDocumentTitle,
      filename: reportFileName,
      onFallback: () => {
        setPrintNotice(
          'Khung xem trước đang chặn hộp thoại in trực tiếp. Hệ thống đã tự động tải xuống tệp bản in A4 (.html) — mở tệp vừa tải và nhấn Ctrl+P để in hoặc lưu PDF.'
        );
      },
    });
  };

  const handleDownloadPrintableHtml = () => {
    const ok = downloadPrintableHtml(printPageRef.current, {
      title: reportDocumentTitle,
      filename: reportFileName,
    });
    if (ok) {
      setPrintNotice('Đã tải xuống tệp bản in A4 (.html). Mở tệp và nhấn Ctrl+P để in hoặc lưu PDF.');
    }
  };

  const combinedError = loadError || fetchError;
  const isInitialLoading =
    (isLoadingData || loading) &&
    students.length === 0 &&
    allGrades.length === 0 &&
    trainingPoints.length === 0;

  if (isStudent && adminTab !== 'DASHBOARD') {
    return (
      <ErrorState
        type="403"
        onGoHome={() => {
          setAdminTab('DASHBOARD');
          onSwitchView?.('dashboard');
        }}
      />
    );
  }

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={isStudent ? 'Tổng Quan Học Tập & Rèn Luyện' : 'Tổng Quan & Báo Cáo Đào Tạo'}
          icon={BarChart3}
        />
        <LoadingState rows={6} />
      </div>
    );
  }

  if (combinedError && students.length === 0 && allGrades.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={isStudent ? 'Tổng Quan Học Tập & Rèn Luyện' : 'Tổng Quan & Báo Cáo Đào Tạo'}
          icon={BarChart3}
        />
        <ErrorState
          type="error"
          message={combinedError}
          onRetry={() => {
            onRetryLoad?.();
            fetchData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print">
        <PageHeader
          title={
            isStudent
              ? 'Tổng Quan Học Tập & Rèn Luyện'
              : adminTab === 'QUICK_REPORT'
              ? 'Xuất Báo Cáo Học Vụ'
              : adminTab === 'CLASS_DRILLDOWN'
              ? 'Kết Quả Theo Lớp'
              : isLecturer
              ? 'Tổng Quan Giảng Dạy'
              : 'Tổng Quan Đào Tạo'
          }
          icon={BarChart3}
          actions={
            !isStudent ? (
              <div
                role="tablist"
                aria-label="Chế độ xem tổng quan và báo cáo"
                className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={adminTab === 'DASHBOARD'}
                  onClick={() => {
                    setAdminTab('DASHBOARD');
                    setDrilldownClassCode(null);
                    setDrilldownStudent(null);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    adminTab === 'DASHBOARD'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Tổng quan</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={adminTab === 'CLASS_DRILLDOWN'}
                  onClick={() => setAdminTab('CLASS_DRILLDOWN')}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    adminTab === 'CLASS_DRILLDOWN'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Kết quả theo lớp</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={adminTab === 'QUICK_REPORT'}
                  onClick={() => setAdminTab('QUICK_REPORT')}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    adminTab === 'QUICK_REPORT'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Xuất báo cáo</span>
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                {activeSemester}
              </span>
            )
          }
        />
      </div>

      {combinedError && (
        <ErrorBanner
          message={combinedError}
          onRetry={() => {
            onRetryLoad?.();
            fetchData();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* ROLE-SPECIFIC DASHBOARDS (STUDENT / LECTURER / ADMIN)                     */}
      {/* ========================================================================= */}
      {isStudent && (
        <StudentOverviewDashboard
          studentCode={currentStudentCode}
          studentObj={currentStudentObj || null}
          activeSemester={activeSemester}
          grades={allGrades}
          schedule={schedule}
          subjects={subjects}
          trainingPoints={trainingPoints}
          retakes={retakes}
          attendanceList={attendanceList}
          examNotices={examNotices}
          lastUpdatedLabel={lastUpdatedLabel}
          onSwitchView={onSwitchView}
        />
      )}

      {!isStudent && isLecturer && adminTab === 'DASHBOARD' && (
        <LecturerOverviewDashboard
          currentUser={currentUser}
          activeSemester={activeSemester}
          students={students}
          grades={allGrades}
          schedule={schedule}
          subjects={subjects}
          trainingPoints={trainingPoints}
          attendanceList={attendanceList}
          examNotices={examNotices}
          lastUpdatedLabel={lastUpdatedLabel}
          onSwitchView={onSwitchView}
          onOpenFullProfile={onOpenFullProfile}
          onExportWithFilters={handleExportWithCurrentFilters}
        />
      )}

      {!isStudent && !isLecturer && adminTab === 'DASHBOARD' && (
        <AdminOverviewDashboard
          activeSemester={activeSemester}
          semesters={semesters}
          students={students}
          grades={allGrades}
          schedule={schedule}
          subjects={subjects}
          trainingPoints={trainingPoints}
          retakes={retakes}
          attendanceList={attendanceList}
          examNotices={examNotices}
          lastUpdatedLabel={lastUpdatedLabel}
          onSwitchView={onSwitchView}
          onOpenFullProfile={onOpenFullProfile}
          onOpenClassDrilldown={(classCode) => {
            setAdminTab('CLASS_DRILLDOWN');
            setDrilldownClassCode(classCode || null);
          }}
          onExportWithFilters={handleExportWithCurrentFilters}
        />
      )}

      {/* ========================================================================= */}
      {/* ADMIN CLASS DRILL-DOWN                                                    */}
      {/* ========================================================================= */}
      {!isStudent && adminTab === 'CLASS_DRILLDOWN' && (
        <div className="space-y-4">
          {!drilldownClassCode && (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-3">
                <DataToolbar
                  searchValue={classSearchQuery}
                  onSearchChange={setClassSearchQuery}
                  searchPlaceholder="Tìm theo mã lớp hoặc khoa..."
                  hasActiveFilters={Boolean(classSearchQuery) || hasAdminFilters}
                  onClearFilters={() => {
                    setClassSearchQuery('');
                    clearAdminFilters();
                  }}
                  filters={
                    <>
                      <select
                        aria-label="Lọc theo khoa"
                        value={filterFaculty}
                        onChange={(e) => {
                          setFilterFaculty(e.target.value);
                          setSelectedClassFilter('ALL');
                        }}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-1.5 font-medium cursor-pointer"
                      >
                        <option value="ALL">Tất cả khoa</option>
                        {uniqueFaculties.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>

                      <select
                        aria-label="Lọc theo lớp"
                        value={selectedClassFilter}
                        onChange={(e) => setSelectedClassFilter(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-1.5 font-medium cursor-pointer"
                      >
                        <option value="ALL">Tất cả lớp</option>
                        {uniqueClasses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </>
                  }
                />
              </div>

              {classMetricList.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu lớp học." />
              ) : filteredClassMetrics.length === 0 ? (
                <FilteredEmptyState
                  onClearFilters={() => {
                    setClassSearchQuery('');
                    clearAdminFilters();
                  }}
                />
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Lớp</th>
                          <th className="py-2.5 px-3">Khoa / Ngành</th>
                          <th className="py-2.5 px-3 text-center">Sĩ Số</th>
                          <th className="py-2.5 px-3 text-center">Điểm TB</th>
                          <th className="py-2.5 px-3 text-center">Tỷ Lệ Đạt</th>
                          <th className="py-2.5 px-3 text-center">Điểm RL TB</th>
                          <th className="py-2.5 px-3 text-center">Cần Chú Ý</th>
                          <th className="py-2.5 px-3 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {paginatedClassList.map((c) => (
                          <tr
                            key={c.maLop}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setDrilldownClassCode(c.maLop);
                                setSearchStudentQuery('');
                              }
                            }}
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          >
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 font-mono">
                              {c.maLop}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                              {c.khoa}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                              {c.siSo}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                              {c.diemTBHocTap > 0 ? (
                                <strong className="text-slate-900 dark:text-slate-100">{c.diemTBHocTap.toFixed(2)}</strong>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">Chưa có</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                              {c.tyLeQuaMon > 0 ? (
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{c.tyLeQuaMon}%</span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">Chưa có</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-blue-700 dark:text-blue-400">
                              {c.diemRLLopTB > 0 ? `${c.diemRLLopTB}` : 'Chưa có'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                              {c.soSVCandChuY > 0 ? (
                                <StatusBadge label={`${c.soSVCandChuY} SV`} variant="danger" />
                              ) : (
                                <span className="text-emerald-700 dark:text-emerald-400">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setDrilldownClassCode(c.maLop);
                                  setSearchStudentQuery('');
                                }}
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <span>Chi tiết</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    currentPage={classPage}
                    pageSize={classPageSize}
                    totalItems={filteredClassMetrics.length}
                    onPageChange={setClassPage}
                    onPageSizeChange={setClassPageSize}
                  />
                </div>
              )}
            </>
          )}

          {/* LEVEL 2: DRILL-DOWN CHI TIẾT LỚP */}
          {drilldownClassCode && drilldownClassObj && (
            <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDrilldownClassCode(null);
                      setDrilldownStudent(null);
                    }}
                    className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Danh sách lớp</span>
                  </button>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {drilldownClassObj.maLop} · {drilldownClassObj.khoa}
                  </h2>
                </div>

                <div className="w-full sm:w-64">
                  <DataToolbar
                    searchValue={searchStudentQuery}
                    onSearchChange={setSearchStudentQuery}
                    searchPlaceholder="Tìm theo Mã SV hoặc Họ tên..."
                  />
                </div>
              </div>

              {drilldownClassStudents.length === 0 ? (
                searchStudentQuery ? (
                  <FilteredEmptyState onClearFilters={() => setSearchStudentQuery('')} />
                ) : (
                  <EmptyState message="Chưa có sinh viên trong lớp này." />
                )
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">STT</th>
                          <th className="py-2.5 px-3">Mã SV</th>
                          <th className="py-2.5 px-3">Họ và Tên</th>
                          <th className="py-2.5 px-3 text-center">Giới Tính</th>
                          <th className="py-2.5 px-3">Ngày Sinh</th>
                          <th className="py-2.5 px-3 text-center">Điểm TB</th>
                          <th className="py-2.5 px-3 text-center">Môn Nợ</th>
                          <th className="py-2.5 px-3 text-center">Điểm RL</th>
                          <th className="py-2.5 px-3 text-center">Chuyên Cần</th>
                          <th className="py-2.5 px-3 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {paginatedDrilldownStudents.map((st, idx) => {
                          const stGrades = (allGrades || []).filter((g) => g.maSV.toLowerCase() === st.maSV.toLowerCase());
                          const totalC = stGrades.reduce((sum, g) => sum + (g.soTinChi || 3), 0);
                          const sum10 = stGrades.reduce((sum, g) => sum + (g.diemTongKet10 || 0) * (g.soTinChi || 3), 0);
                          const gpa10 = totalC > 0 ? (sum10 / totalC).toFixed(2) : 'Chưa có';
                          const failedCount = stGrades.filter((g) => g.trangThai === 'FAILED' || (g.diemTongKet10 || 0) < 4.0).length;

                          const stRL = (trainingPoints || []).filter((r) => r.maSV && r.maSV.toLowerCase() === st.maSV.toLowerCase());
                          const recentRL = stRL.length > 0 ? stRL[stRL.length - 1].diemRL : null;

                          const stAtt = (attendanceList || []).filter((a) => a.maSV?.toLowerCase() === st.maSV.toLowerCase());
                          const missedPeriods = stAtt.reduce((sum, a) => sum + (a.soTietNghi || 0), 0);

                          return (
                            <tr key={st.maSV} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors">
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                                {(drilldownPage - 1) * drilldownPageSize + idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{st.maSV}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{st.hoTen}</td>
                              <td className="py-2.5 px-3 text-center text-slate-700 dark:text-slate-300">{st.gioiTinh}</td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono tabular-nums">{st.ngaySinh}</td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                                {gpa10}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                {failedCount > 0 ? (
                                  <StatusBadge label={`Nợ ${failedCount}`} variant="danger" />
                                ) : (
                                  <span className="text-emerald-700 dark:text-emerald-400">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold">
                                {recentRL !== null ? (
                                  <span className={recentRL < 50 ? 'text-rose-700 dark:text-rose-400' : 'text-blue-700 dark:text-blue-400'}>
                                    {recentRL}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 font-normal">Chưa có</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                {missedPeriods > 0 ? (
                                  <span className={missedPeriods >= 6 ? 'text-rose-700 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                                    Vắng {missedPeriods}t
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 dark:text-emerald-400">Đầy đủ</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setDrilldownStudent(st)}
                                  className="px-2 py-1 rounded text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  Xem điểm
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    currentPage={drilldownPage}
                    pageSize={drilldownPageSize}
                    totalItems={drilldownClassStudents.length}
                    onPageChange={setDrilldownPage}
                    onPageSizeChange={setDrilldownPageSize}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK REPORT GENERATOR                                                    */}
      {/* ========================================================================= */}
      {!isStudent && adminTab === 'QUICK_REPORT' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-4 no-print">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="w-full sm:w-72 text-xs">
                <label htmlFor="report-type" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Loại báo cáo
                </label>
                <select
                  id="report-type"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'ACADEMIC' | 'TRAINING' | 'ATTENTION' | 'RETAKES_FEES')}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-2 font-semibold cursor-pointer"
                >
                  <option value="ACADEMIC">Kết quả Học tập & GPA</option>
                  <option value="TRAINING">Điểm Rèn luyện</option>
                  <option value="ATTENTION">Sinh viên Cần chú ý</option>
                  <option value="RETAKES_FEES">Thi lại, Học lại & Lệ phí</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={reportFilteredStudents.length === 0}
                  className="px-3.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPrintableHtml}
                  disabled={reportFilteredStudents.length === 0}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Tải bản in (HTML)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={reportFilteredStudents.length === 0}
                  className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Báo Cáo (A4)</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Cấu hình văn bản & Chữ ký (A4)
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showReportSignatures}
                    onChange={(e) => setShowReportSignatures(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-700"
                  />
                  <span>Hiển thị phần ký tên</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
                <div>
                  <label htmlFor="report-unit-name" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đơn vị ban hành
                  </label>
                  <input
                    id="report-unit-name"
                    type="text"
                    value={reportUnitName}
                    onChange={(e) => setReportUnitName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="report-doc-code" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số hiệu văn bản
                  </label>
                  <input
                    id="report-doc-code"
                    type="text"
                    value={reportDocumentCode}
                    onChange={(e) => setReportDocumentCode(e.target.value)}
                    placeholder="Để trống nếu không có"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="reporter-title" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chức danh người lập
                  </label>
                  <input
                    id="reporter-title"
                    type="text"
                    disabled={!showReportSignatures}
                    value={reporterTitle}
                    onChange={(e) => setReporterTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-50 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="reporter-name" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên người báo cáo
                  </label>
                  <input
                    id="reporter-name"
                    type="text"
                    disabled={!showReportSignatures}
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Để trống hoặc tự nhập"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-50 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="manager-title" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chức danh trưởng phòng
                  </label>
                  <input
                    id="manager-title"
                    type="text"
                    disabled={!showReportSignatures}
                    value={managerTitle}
                    onChange={(e) => setManagerTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-50 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="manager-name" className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên trưởng phòng
                  </label>
                  <input
                    id="manager-name"
                    type="text"
                    disabled={!showReportSignatures}
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Để trống hoặc tự nhập"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-50 text-slate-900 dark:text-slate-100 text-xs rounded px-2.5 py-1.5"
                  />
                </div>
              </div>
            </div>

            {printNotice && (
              <div
                role="status"
                className="flex items-start justify-between gap-2 p-2.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-xs text-blue-900 dark:text-blue-200"
              >
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-700 dark:text-blue-400" />
                  <span>{printNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrintNotice(null)}
                  aria-label="Đóng thông báo in"
                  className="p-0.5 rounded text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <ReportView
            ref={printPageRef}
            title={reportDocumentTitle}
            subtitle={`Phạm vi: ${reportScopeFaculty === 'ALL' ? 'Toàn trường' : reportScopeFaculty} · ${
              reportScopeClass === 'ALL' ? 'Tất cả lớp' : `Lớp ${reportScopeClass}`
            } · Học kỳ: ${reportScopeSemester === 'ALL' ? 'Tất cả học kỳ' : reportScopeSemester}`}
            unitName={reportUnitName}
            documentCode={reportDocumentCode || undefined}
            filters={reportViewFilters}
            hasActiveFilters={hasActiveReportFilters}
            onResetFilters={resetReportFilters}
            filterSummary={`Số sinh viên: ${reportFilteredStudents.length}`}
            isEmpty={reportFilteredStudents.length === 0}
            emptyMessage="Chưa có dữ liệu phù hợp để lập báo cáo."
            signatures={{
              show: showReportSignatures,
              leftTitle: reporterTitle,
              leftNote: reporterTitle ? '(Ký và ghi rõ họ tên)' : '',
              leftName: reporterName,
              rightTitle: managerTitle,
              rightNote: managerTitle ? '(Ký, đóng dấu và ghi rõ họ tên)' : '',
              rightName: managerName,
            }}
          >
              <div>
                {reportType === 'ACADEMIC' && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                        <tr>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center w-10">STT</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Mã SV</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Họ và Tên</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Lớp</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Số Môn</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Tín Chỉ Đạt</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Điểm TB (10)</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportFilteredStudents.map((st, i) => {
                          const stGrades = (allGrades || []).filter((g) => {
                            if (g.maSV.toLowerCase() !== st.maSV.toLowerCase()) return false;
                            if (reportScopeSemester !== 'ALL' && g.hocKy !== reportScopeSemester) return false;
                            return true;
                          });

                          const totalC = stGrades.reduce((sum, g) => sum + (g.soTinChi || 3), 0);
                          const sum10 = stGrades.reduce((sum, g) => sum + (g.diemTongKet10 || 0) * (g.soTinChi || 3), 0);
                          const gpa10 = totalC > 0 ? (sum10 / totalC).toFixed(2) : '-';
                          const passedC = stGrades
                            .filter((g) => g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0)
                            .reduce((sum, g) => sum + (g.soTinChi || 3), 0);

                          return (
                            <tr key={st.maSV}>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums">{i + 1}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 font-mono font-semibold">{st.maSV}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2">{st.hoTen}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 font-mono">{st.lop}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums">{stGrades.length}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums">{passedC}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums font-semibold">{gpa10}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center">{st.trangThai}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {reportType === 'TRAINING' && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                        <tr>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center w-10">STT</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Mã SV</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Họ và Tên</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Lớp</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Tháng</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Điểm RL</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Xếp Loại</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Nhận Xét</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportFilteredStudents.map((st, i) => {
                          const targetMonth = Number(reportScopeMonth);
                          const stRL = (trainingPoints || []).find((r) => {
                            if (r.maSV?.toLowerCase() !== st.maSV.toLowerCase()) return false;
                            if (!isNaN(targetMonth) && r.thang !== targetMonth) return false;
                            return true;
                          });

                          return (
                            <tr key={st.maSV}>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums">{i + 1}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 font-mono font-semibold">{st.maSV}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2">{st.hoTen}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 font-mono">{st.lop}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums">{reportScopeMonth}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums font-semibold">
                                {stRL ? `${stRL.diemRL}` : 'Chưa có'}
                              </td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center">
                                {stRL ? stRL.xepLoai : 'Chưa đánh giá'}
                              </td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-[11px] text-slate-600 dark:text-slate-300">
                                {stRL ? stRL.nhanXet || '-' : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {reportType === 'ATTENTION' && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                        <tr>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center w-10">STT</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Mã SV</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Họ và Tên</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Lớp</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Môn Nợ</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Tiết Vắng</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Điểm RL</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Lý Do</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportAttentionRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="border border-slate-300 dark:border-slate-700 p-4 text-center text-slate-500 dark:text-slate-400">
                              Không có sinh viên cần chú ý trong phạm vi đã chọn.
                            </td>
                          </tr>
                        ) : (
                          reportAttentionRows.map((a, i) => (
                            <tr key={a.maSV}>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums">{i + 1}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 font-mono font-semibold">{a.maSV}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2">{a.hoTen}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 font-mono">{a.lop}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                                {a.failedSubjectsCount}
                              </td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums">
                                {a.missedPeriodsTotal}
                              </td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums">
                                {a.trainingScoreRecent ?? 'Chưa có'}
                              </td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-rose-800 dark:text-rose-300 font-semibold text-[11px]">
                                {a.attentionReason}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {reportType === 'RETAKES_FEES' && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                        <tr>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center w-10">STT</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Mã SV</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Họ Tên SV</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2">Môn Đăng Ký</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Hình Thức</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-right">Lệ Phí (VNĐ)</th>
                          <th className="border border-slate-300 dark:border-slate-700 p-2 text-center">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportRetakeRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="border border-slate-300 dark:border-slate-700 p-4 text-center text-slate-500 dark:text-slate-400">
                              Không có đơn thi lại / học lại trong phạm vi đã chọn.
                            </td>
                          </tr>
                        ) : (
                          reportRetakeRows.map((r, i) => (
                            <tr key={r.id}>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-mono tabular-nums">{i + 1}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 font-mono font-semibold">{r.maSV}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2">{r.hoTenSV || r.maSV}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2">
                                {r.tenMH} ({r.maMH})
                              </td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center">
                                {r.loaiDangKy === 'THI_LAI' ? 'Thi Lại' : 'Học Lại'}
                              </td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-right font-mono tabular-nums font-semibold">
                                {r.phiDiem ? `${r.phiDiem.toLocaleString('vi-VN')} đ` : 'Chờ định mức'}
                              </td>
                              <td className="border border-slate-300 dark:border-slate-700 p-2 text-center">
                                {r.trangThai === 'DA_DUYET' ? 'Đã duyệt' : 'Chờ duyệt'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </ReportView>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BẢNG ĐIỂM CHI TIẾT SINH VIÊN (DRILL-DOWN LEVEL 3)                  */}
      {/* ========================================================================= */}
      {drilldownStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDrilldownStudent(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Bảng Điểm: {drilldownStudent.hoTen} ({drilldownStudent.maSV})
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {drilldownStudent.lop} · {drilldownStudent.khoa}
                </span>
              </div>
              <button
                type="button"
                aria-label="Đóng bảng điểm"
                onClick={() => setDrilldownStudent(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded">
              {allGrades.filter((g) => g.maSV.toLowerCase() === drilldownStudent.maSV.toLowerCase()).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  Chưa có dữ liệu điểm số.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Mã MH</th>
                      <th className="py-2 px-3 font-semibold">Tên Môn Học</th>
                      <th className="py-2 px-2 text-center font-semibold">TC</th>
                      <th className="py-2 px-2 text-center font-semibold">CC</th>
                      <th className="py-2 px-2 text-center font-semibold">GK</th>
                      <th className="py-2 px-2 text-center font-semibold">CK</th>
                      <th className="py-2 px-2 text-center font-semibold">Tổng 10</th>
                      <th className="py-2 px-2 text-center font-semibold">Chữ</th>
                      <th className="py-2 px-3 text-center font-semibold">Kết Quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {allGrades
                      .filter((g) => g.maSV.toLowerCase() === drilldownStudent.maSV.toLowerCase())
                      .map((g) => (
                        <tr key={g.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                          <td className="py-2 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100">{g.maMH}</td>
                          <td className="py-2 px-3 text-slate-900 dark:text-slate-100">{g.tenMH || g.maMH}</td>
                          <td className="py-2 px-2 text-center font-mono tabular-nums">{g.soTinChi || 3}</td>
                          <td className="py-2 px-2 text-center font-mono tabular-nums">{g.diemChuyenCan}</td>
                          <td className="py-2 px-2 text-center font-mono tabular-nums">{g.diemGiuaKy}</td>
                          <td className="py-2 px-2 text-center font-mono tabular-nums">{g.diemCuoiKy}</td>
                          <td className="py-2 px-2 text-center font-mono tabular-nums font-bold text-blue-700 dark:text-blue-400">
                            {g.diemTongKet10}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-semibold">{g.diemChu}</td>
                          <td className="py-2 px-3 text-center">
                            <StatusBadge
                              label={g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0 ? 'ĐẠT' : 'HỎNG'}
                              variant={g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0 ? 'success' : 'danger'}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDrilldownStudent(null)}
                className="px-4 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
