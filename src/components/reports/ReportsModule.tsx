import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { apiService } from '../../services/apiService';
import { UserRole, Diem, SinhVien, MonHoc, DiemDanh, ThongBaoKiemTra, ThoiKhoaBieu, HocKy, NamHoc } from '../../types';
import {
  BarChart3,
  Award,
  PieChart,
  Printer,
  GraduationCap,
  TrendingUp,
  FileCheck,
  Building,
  BookOpen,
  CheckCircle2,
  XCircle,
  Calendar,
  Filter,
  List,
  LayoutGrid,
  ChevronRight,
  Info,
  X,
  Users,
  FileSpreadsheet,
  ArrowLeft,
  Download,
  Eye,
  Search,
  Folder,
  FileText,
  Table,
  ShieldAlert,
  BellRing,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { getAcademicPeriod } from '../../utils/academicCalendar';

interface ReportsModuleProps {
  userRole?: UserRole;
  currentStudentCode?: string;
  activeSemester?: string;
  semesters?: HocKy[];
  academicYears?: NamHoc[];
  students?: SinhVien[];
  grades?: Diem[];
  schedule?: ThoiKhoaBieu[];
  subjects?: MonHoc[];
  trainingPoints?: any[];
}

// Data model for classes & training metrics
interface ClassMetricItem {
  maLop: string;
  tenLop: string;
  siSo: number;
  khoa: string;
  covan: string;
  renLuyenTotal: number; // Combined % Khá + Tốt + Xuất Sắc
  renLuyenBreakdown: {
    xuatSac: number;
    tot: number;
    kha: number;
    trungBinh: number;
    yeuKem: number;
  };
  donThiLai: number;
  thiLaiBreakdown: Array<{ mon: string; soLuong: number; lyDo: string }>;
  tyLeQuaMon: number;
  quaMonBreakdown: {
    loaiA: number; // 8.5 - 10
    loaiB: number; // 7.0 - 8.4
    loaiC: number; // 5.5 - 6.9
    loaiDF: number; // < 5.5
  };
}

const mockClassMetrics: ClassMetricItem[] = [];

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  userRole = 'STUDENT',
  currentStudentCode = '',
  activeSemester = getAcademicPeriod().code,
  semesters = [],
  academicYears = [],
  students = [],
  grades = [],
  schedule = [],
  subjects = [],
  trainingPoints = [],
}) => {
  const allSubjectList = subjects || [];
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allGrades, setAllGrades] = useState<Diem[]>(grades);
  const [attendanceList, setAttendanceList] = useState<DiemDanh[]>([]);
  const [examNotices, setExamNotices] = useState<ThongBaoKiemTra[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const semesterSeparator = activeSemester.indexOf('-');
  const currentActiveSemester = semesterSeparator >= 0 ? activeSemester.slice(0, semesterSeparator) : activeSemester;
  const currentActiveYear = semesterSeparator >= 0 ? activeSemester.slice(semesterSeparator + 1) : '';

  // Filters for Training Indices Section
  const [filterSemester, setFilterSemester] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [adminViewMode, setAdminViewMode] = useState<'OVERVIEW' | 'CLASS_LIST'>('OVERVIEW');

  // Modals for details
  const [activeDetailModal, setActiveDetailModal] = useState<
    'REN_LUYEN' | 'THI_LAI' | 'QUA_MON' | 'CLASS_DETAIL' | null
  >(null);
  const [modalTargetClass, setModalTargetClass] = useState<ClassMetricItem | null>(null);

  // State for Admin Class Grade Files Explorer
  const [selectedAdminClassCode, setSelectedAdminClassCode] = useState<string | null>(null);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');
  const [subjectGradeSheetModal, setSubjectGradeSheetModal] = useState<{
    maLop: string;
    tenLop: string;
    monHoc: MonHoc;
    studentGrades: {
      stt: number;
      maSV: string;
      hoTen: string;
      lop: string;
      maMH: string;
      tenMH: string;
      soTinChi: number;
      hocKy: string;
      namHoc: string;
      diemChuyenCan: number;
      diemGiuaKy: number;
      diemCuoiKy: number;
      diemTongKet10: number;
      diemThang4: number;
      diemChu: string;
      trangThai: 'PASSED' | 'FAILED';
    }[];
  } | null>(null);
  const [modalStudentSearch, setModalStudentSearch] = useState<string>('');

  // Dynamic class metrics calculated strictly from real entered data
  const dynamicClassMetrics: ClassMetricItem[] = React.useMemo(() => {
    const map = new Map<string, { maLop: string; tenLop: string; siSo: number; covan: string; khoa: string }>();

    (students || []).forEach((st) => {
      if (st.lop && !map.has(st.lop)) {
        map.set(st.lop, {
          maLop: st.lop,
          tenLop: `Lớp ${st.lop}`,
          siSo: (students || []).filter((s) => s.lop === st.lop).length,
          covan: 'Giảng viên Chủ nhiệm',
          khoa: st.khoa || 'Khoa Chuyên môn',
        });
      }
    });

    const classItems = Array.from(map.values());
    if (classItems.length === 0) return [];

    return classItems.map((c) => {
      const classStudents = (students || []).filter((s) => s.lop === c.maLop);
      const studentIds = new Set(classStudents.map((s) => s.maSV.toLowerCase()));

      const classGrades = (allGrades || []).filter((g) => {
        if (!studentIds.has(g.maSV.toLowerCase())) return false;
        if (filterSemester !== 'ALL' && g.hocKy && g.hocKy !== filterSemester) return false;
        return true;
      });
      const totalGrades = classGrades.length;
      const passedGrades = classGrades.filter((g) => g.trangThai === 'PASSED').length;
      const tyLeQuaMon = totalGrades > 0 ? Math.round((passedGrades / totalGrades) * 1000) / 10 : 0;

      const loaiA = totalGrades > 0 ? Math.round((classGrades.filter((g) => g.diemTongKet10 >= 8.5).length / totalGrades) * 1000) / 10 : 0;
      const loaiB = totalGrades > 0 ? Math.round((classGrades.filter((g) => g.diemTongKet10 >= 7.0 && g.diemTongKet10 < 8.5).length / totalGrades) * 1000) / 10 : 0;
      const loaiC = totalGrades > 0 ? Math.round((classGrades.filter((g) => g.diemTongKet10 >= 5.5 && g.diemTongKet10 < 7.0).length / totalGrades) * 1000) / 10 : 0;
      const loaiDF = totalGrades > 0 ? Math.round((classGrades.filter((g) => g.diemTongKet10 < 5.5).length / totalGrades) * 1000) / 10 : 0;

      // Calculate Training Point breakdown for this class filtered by semester & month
      let rlXS = 0, rlTot = 0, rlKha = 0, rlTB = 0, rlYeuKem = 0;
      let evaluatedCount = 0;

      if (classStudents.length > 0) {
        classStudents.forEach((st) => {
          const stRL = (trainingPoints || []).filter((r) => {
            if (!r || !r.maSV || r.maSV.toLowerCase() !== st.maSV.toLowerCase()) return false;
            if (filterSemester !== 'ALL' && r.hocKy && r.hocKy !== filterSemester) return false;
            if (filterMonth !== 'ALL' && r.thang !== Number(filterMonth)) return false;
            return true;
          });

          // ONLY evaluate if actual training point record exists for this student
          if (stRL.length > 0) {
            const validScores = stRL.map(r => Number(r.diemRL ?? (r as any).totalScore ?? 0)).filter(s => !isNaN(s) && s > 0);
            if (validScores.length > 0) {
              const score = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
              evaluatedCount++;
              if (score >= 90) rlXS++;
              else if (score >= 80) rlTot++;
              else if (score >= 70) rlKha++;
              else if (score >= 50) rlTB++;
              else rlYeuKem++;
            }
          }
        });
      }

      const xuatSac = evaluatedCount > 0 ? Math.round((rlXS / evaluatedCount) * 100) : 0;
      const tot = evaluatedCount > 0 ? Math.round((rlTot / evaluatedCount) * 100) : 0;
      const kha = evaluatedCount > 0 ? Math.round((rlKha / evaluatedCount) * 100) : 0;
      const trungBinh = evaluatedCount > 0 ? Math.round((rlTB / evaluatedCount) * 100) : 0;
      const yeuKem = evaluatedCount > 0 ? Math.round((rlYeuKem / evaluatedCount) * 100) : 0;
      const renLuyenTotal = evaluatedCount > 0 ? xuatSac + tot + kha : 0;

      return {
        maLop: c.maLop,
        tenLop: c.tenLop,
        siSo: c.siSo,
        khoa: c.khoa,
        covan: c.covan,
        renLuyenTotal,
        renLuyenBreakdown: { xuatSac, tot, kha, trungBinh, yeuKem },
        donThiLai: classGrades.filter(g => g.trangThai === 'FAILED').length,
        thiLaiBreakdown: [],
        tyLeQuaMon,
        quaMonBreakdown: { loaiA, loaiB, loaiC, loaiDF },
      };
    });
  }, [students, allGrades, trainingPoints, filterSemester, filterMonth]);

  // Combined unique list of classes
  const allClassesList = React.useMemo(() => {
    const map = new Map<string, { maLop: string; tenLop: string; siSo: number; covan: string; khoa: string }>();

    dynamicClassMetrics.forEach((cm) => {
      map.set(cm.maLop, {
        maLop: cm.maLop,
        tenLop: cm.tenLop,
        siSo: cm.siSo,
        covan: cm.covan,
        khoa: cm.khoa,
      });
    });

    (students || []).forEach((st) => {
      if (st.lop && !map.has(st.lop)) {
        map.set(st.lop, {
          maLop: st.lop,
          tenLop: `Lớp Chuyên Ngành ${st.lop}`,
          siSo: (students || []).filter((s) => s.lop === st.lop).length,
          covan: 'Giảng viên Chủ nhiệm',
          khoa: st.khoa || 'Khoa Chuyên môn',
        });
      }
    });

    return Array.from(map.values());
  }, [students, dynamicClassMetrics]);

  const getSubjectsForClass = (classCode: string) => {
    const normalizedClass = classCode.trim().toLowerCase();
    return allSubjectList.filter((subject) => {
      const subjectClass = subject.lop?.trim().toLowerCase();
      return !subjectClass || subjectClass === 'all' || subjectClass === normalizedClass;
    });
  };

  // Helper to generate or fetch grade sheet for a class & subject
  const getSubjectGradeListForClass = (maLop: string, monHoc: MonHoc) => {
    if (!monHoc || !monHoc.maMH) return [];
    let classStudents = (students || []).filter((s) => s.lop === maLop);
    if (classStudents.length === 0) {
      classStudents = (students || []).filter(
        (s) => s.lop.toLowerCase().includes(maLop.toLowerCase()) || maLop.toLowerCase().includes(s.lop.toLowerCase())
      );
    }

    return classStudents.map((st, idx) => {
      const existing = (allGrades || []).find(
        (g) => g.maSV.toLowerCase() === st.maSV.toLowerCase() && g.maMH === monHoc.maMH
      );

      if (existing) {
        return {
          stt: idx + 1,
          maSV: st.maSV,
          hoTen: st.hoTen,
          lop: maLop,
          maMH: monHoc.maMH,
          tenMH: monHoc.tenMH,
          soTinChi: monHoc.soTinChi,
          hocKy: existing.hocKy || 'HK1',
          namHoc: existing.namHoc || '2025-2026',
          diemChuyenCan: existing.diemChuyenCan,
          diemGiuaKy: existing.diemGiuaKy,
          diemCuoiKy: existing.diemCuoiKy,
          diemTongKet10: existing.diemTongKet10,
          diemThang4: existing.diemThang4,
          diemChu: existing.diemChu,
          trangThai: existing.trangThai,
        };
      }

      return {
        stt: idx + 1,
        maSV: st.maSV,
        hoTen: st.hoTen,
        lop: maLop,
        maMH: monHoc.maMH,
        tenMH: monHoc.tenMH,
        soTinChi: monHoc.soTinChi,
        hocKy: 'HK1',
        namHoc: '2025-2026',
        diemChuyenCan: 0,
        diemGiuaKy: 0,
        diemCuoiKy: 0,
        diemTongKet10: 0,
        diemThang4: 0,
        diemChu: 'F',
        trangThai: 'FAILED' as const,
      };
    });
  };

  // Helper to export Excel
  const handleExportSubjectExcel = (maLop: string, monHoc: MonHoc, studentGrades: any[]) => {
    const exportData = studentGrades.map((g) => ({
      'STT': g.stt,
      'Mã Sinh Viên': g.maSV,
      'Họ và Tên': g.hoTen,
      'Lớp Học': g.lop || maLop,
      'Mã Môn Học': g.maMH,
      'Tên Môn Học': g.tenMH,
      'Số Tín Chỉ': g.soTinChi,
      'Học Kỳ': g.hocKy,
      'Năm Học': g.namHoc,
      'Chuyên Cần (10%)': g.diemChuyenCan,
      'Giữa Kỳ (30%)': g.diemGiuaKy,
      'Cuối Kỳ (60%)': g.diemCuoiKy,
      'Điểm Tổng Kết (10)': g.diemTongKet10,
      'Điểm Thang 4': g.diemThang4,
      'Điểm Chữ': g.diemChu,
      'Kết Quả': g.trangThai === 'PASSED' ? 'ĐẠT' : 'KHÔNG ĐẠT',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `BangDiem_${monHoc.maMH}`);
    XLSX.writeFile(workbook, `BangDiem_${maLop}_${monHoc.maMH}.xlsx`);
  };

  useEffect(() => {
    loadSummary();
    loadAttendanceAndNotices();
    if (grades && grades.length > 0) {
      setAllGrades(grades);
    } else {
      loadGrades();
    }
  }, [grades]);

  const loadAttendanceAndNotices = async () => {
    try {
      const [resAtt, resNotices] = await Promise.all([
        apiService.getAttendance(),
        apiService.getExamNotices(),
      ]);
      if (resAtt.success && resAtt.data) setAttendanceList(resAtt.data);
      if (resNotices.success && resNotices.data) setExamNotices(resNotices.data);
    } catch {
      console.log('Using initial attendance/notices fallback');
    }
  };

  const loadGrades = async () => {
    const res = await apiService.getGrades();
    if (res.success && res.data) {
      setAllGrades(res.data);
    }
  };

  const loadSummary = async () => {
    setLoading(true);
    const res = await apiService.getSummaryReport();
    if (res.success && res.summary) {
      setSummary(res.summary);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const isStudent = userRole === 'STUDENT';
  const myStudentCode = currentStudentCode.toLowerCase();

  // Find student profile if student role
  const currentStudent = students.find(
    (s) => s.maSV.toLowerCase() === myStudentCode
  );

  // Class for current student
  const studentClassCode = currentStudent?.lop || '';
  const studentClassItem =
    dynamicClassMetrics.find((c) => c.maLop === studentClassCode) || null;

  // Effective class filter (strictly locked to student class if STUDENT role)
  const effectiveClassFilter = isStudent ? studentClassCode : selectedClassFilter;

  // Calculate dynamic academic standing (GPA 4.0 scale) from recorded grades
  const dynamicAcademicStanding = React.useMemo(() => {
    let xuatSac = 0, gioi = 0, kha = 0, tbk = 0, trungBinh = 0, yeu = 0, kem = 0, chuaCoDiem = 0;
    const targetStudents = effectiveClassFilter !== 'ALL'
      ? (students || []).filter((s) => s.lop === effectiveClassFilter)
      : (students || []);

    targetStudents.forEach((s) => {
      const sGrades = (allGrades || []).filter((g) => g.maSV.toLowerCase() === s.maSV.toLowerCase());
      if (sGrades.length > 0) {
        const totalW = sGrades.reduce((sum, g) => sum + (g.diemThang4 || 0) * (g.soTinChi || 3), 0);
        const totalC = sGrades.reduce((sum, g) => sum + (g.soTinChi || 3), 0);
        const gpa = totalC > 0 ? totalW / totalC : 0;

        if (gpa >= 3.60) xuatSac++;
        else if (gpa >= 3.20) gioi++;
        else if (gpa >= 2.80) kha++;
        else if (gpa >= 2.40) tbk++;
        else if (gpa >= 2.00) trungBinh++;
        else if (gpa >= 1.00) yeu++;
        else kem++;
      } else {
        chuaCoDiem++;
      }
    });

    return {
      xuatSac,
      gioi,
      kha,
      tbk,
      trungBinh,
      yeu,
      kem,
      chuaCoDiem,
      totalCount: targetStudents.length,
    };
  }, [students, allGrades, effectiveClassFilter]);

  const standing = dynamicAcademicStanding;
  const totalSt = dynamicAcademicStanding.totalCount;

  // Filter grades for current student if STUDENT role
  const studentGrades = isStudent
    ? allGrades.filter((g) => g.maSV.toLowerCase() === myStudentCode)
    : allGrades;

  // Semesters list for student grade table
  const availableSemesters = Array.from(
    new Set(studentGrades.map((g) => `${g.hocKy} (${g.namHoc})`))
  );

  // Filter student grades by selected semester
  const filteredGradesList = studentGrades.filter((g) => {
    if (selectedSemester === 'ALL') return true;
    return `${g.hocKy} (${g.namHoc})` === selectedSemester;
  });

  // Calculate student course progress, absence rate (>10% and >=20%), and exam notices for student (Filtered for current ongoing semester)
  const studentCourseProgressList = React.useMemo(() => {
    if (!isStudent || !myStudentCode) return [];

    const enrolledMap = new Map<string, { maMH: string; tenMH: string; soTinChi: number; giangVien: string; hocKy?: string }>();

    // 1. From Schedule - filter strictly by current ongoing semester (currentActiveSemester)
    (schedule || []).forEach((sch) => {
      const schHocKy = sch.hocKy || 'HK1';
      if (schHocKy === currentActiveSemester || schHocKy.includes(currentActiveSemester)) {
        if (sch.maMH && !enrolledMap.has(sch.maMH)) {
          enrolledMap.set(sch.maMH, {
            maMH: sch.maMH,
            tenMH: sch.tenMH || sch.maMH,
            soTinChi: sch.soTinChi || 3,
            giangVien: sch.giangVien || 'Giảng viên Bộ môn',
            hocKy: schHocKy,
          });
        }
      }
    });

    // 2. Load/supplement from allSubjectList so ALL imported subjects are displayed
    const normalizedStudentClass = currentStudent?.lop?.trim().toLowerCase() || '';
    const targetSubjects = allSubjectList.filter((mh) => {
      const matchesClass = !mh.lop || mh.lop === 'ALL' ||
        (!normalizedStudentClass || mh.lop.trim().toLowerCase() === normalizedStudentClass);
      const matchesSemester = !mh.hocKy || mh.hocKy.trim().toLowerCase() === currentActiveSemester.trim().toLowerCase();
      const matchesYear = !currentActiveYear || !mh.namHoc || mh.namHoc.trim() === currentActiveYear.trim();
      return matchesClass && matchesSemester && matchesYear;
    });
    const subjectsToUse = targetSubjects;

    subjectsToUse.forEach((mh) => {
      if (!enrolledMap.has(mh.maMH)) {
        enrolledMap.set(mh.maMH, {
          maMH: mh.maMH,
          tenMH: mh.tenMH,
          soTinChi: mh.soTinChi || 3,
          giangVien: 'Giảng viên Phụ trách',
          hocKy: mh.hocKy || currentActiveSemester,
        });
      }
    });

    // 3. Include any additional subjects in studentGrades
    studentGrades
      .filter((g) => g.hocKy?.trim().toLowerCase() === currentActiveSemester.trim().toLowerCase())
      .filter((g) => !currentActiveYear || g.namHoc?.trim() === currentActiveYear.trim())
      .forEach((g) => {
      if (g.maMH && !enrolledMap.has(g.maMH)) {
        enrolledMap.set(g.maMH, {
          maMH: g.maMH,
          tenMH: g.tenMH || g.maMH,
          soTinChi: g.soTinChi || 3,
          giangVien: 'Giảng viên Bộ môn',
          hocKy: g.hocKy || currentActiveSemester,
        });
      }
      });

    const svAtt = attendanceList.filter((a) => a.maSV.toLowerCase() === myStudentCode);

    return Array.from(enrolledMap.values()).map((course) => {
      const credits = course.soTinChi || 3;
      const totalPeriods = credits * 15; // 1 tín chỉ = 15 tiết

      const courseAtt = svAtt.filter((a) => a.maMH === course.maMH);
      const missedPeriods = courseAtt.reduce((acc, curr) => acc + (curr.soTietNghi || 0), 0);

      const absencePercentage = (missedPeriods / totalPeriods) * 100;
      const attendedPeriods = Math.max(0, totalPeriods - missedPeriods);
      const attendanceRate = (attendedPeriods / totalPeriods) * 100;

      const gradeObj = studentGrades.find((g) => g.maMH === course.maMH);

      const isWarning10 = absencePercentage >= 10 && absencePercentage < 20;
      const isDanger20 = absencePercentage >= 20;

      return {
        ...course,
        totalPeriods,
        missedPeriods,
        absencePercentage,
        attendedPeriods,
        attendanceRate,
        gradeObj,
        isWarning10,
        isDanger20,
      };
    });
  }, [isStudent, myStudentCode, schedule, attendanceList, studentGrades, currentActiveSemester, currentActiveYear, allSubjectList, currentStudent?.lop]);

  // Filter list of subjects with absence >= 10%
  const studentAbsenceWarnings10 = React.useMemo(() => {
    return studentCourseProgressList.filter((item) => item.absencePercentage >= 10);
  }, [studentCourseProgressList]);

  // Exam notices for student's subjects (upcoming week)
  const studentExamNotices = React.useMemo(() => {
    if (!isStudent) return [];
    const courseCodes = new Set(studentCourseProgressList.map((c) => c.maMH));
    return (examNotices || []).filter((notice) => courseCodes.has(notice.maMH));
  }, [isStudent, studentCourseProgressList, examNotices]);

  // Semesters list derived strictly from actual entered data
  const availableReportSemesters = React.useMemo(() => {
    const semSet = new Set<string>();
    (trainingPoints || []).forEach((r) => {
      if (r && r.hocKy) semSet.add(r.hocKy.trim());
    });
    (allGrades || []).forEach((g) => {
      if (g && g.hocKy) semSet.add(g.hocKy.trim());
    });
    (schedule || []).forEach((s) => {
      if (s && s.hocKy) semSet.add(s.hocKy.trim());
    });
    return Array.from(semSet).sort();
  }, [trainingPoints, allGrades, schedule]);

  // Month list based on filterSemester derived strictly from real trainingPoints data
  const availableReportMonths = React.useMemo(() => {
    const monthMap = new Map<number, string>();
    (trainingPoints || []).forEach((r) => {
      if (r && r.thang) {
        if (filterSemester === 'ALL' || !r.hocKy || r.hocKy === filterSemester) {
          monthMap.set(Number(r.thang), `Tháng ${r.thang}`);
        }
      }
    });
    const sorted = Array.from(monthMap.keys()).sort((a, b) => a - b);
    return sorted.map((m) => ({ value: String(m), label: `Tháng ${m}` }));
  }, [trainingPoints, filterSemester]);

  // Compute stats based on effective class filter
  const activeClassItem =
    effectiveClassFilter !== 'ALL'
      ? dynamicClassMetrics.find((c) => c.maLop === effectiveClassFilter) || (isStudent ? studentClassItem : null)
      : null;

  // Calculate overall Training Point breakdown when ALL classes selected
  const overallRenLuyenBreakdown = React.useMemo(() => {
    let rlXS = 0, rlTot = 0, rlKha = 0, rlTB = 0, rlYeuKem = 0;
    let evaluatedCount = 0;
    const allSt = students || [];
    if (allSt.length > 0) {
      allSt.forEach((st) => {
        const stRL = (trainingPoints || []).filter((r) => {
          if (!r || !r.maSV || r.maSV.toLowerCase() !== st.maSV.toLowerCase()) return false;
          if (filterSemester !== 'ALL' && r.hocKy && r.hocKy !== filterSemester) return false;
          if (filterMonth !== 'ALL' && r.thang !== Number(filterMonth)) return false;
          return true;
        });

        if (stRL.length > 0) {
          const validScores = stRL.map(r => Number(r.diemRL ?? (r as any).totalScore ?? 0)).filter(s => !isNaN(s) && s > 0);
          if (validScores.length > 0) {
            const score = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
            evaluatedCount++;
            if (score >= 90) rlXS++;
            else if (score >= 80) rlTot++;
            else if (score >= 70) rlKha++;
            else if (score >= 50) rlTB++;
            else rlYeuKem++;
          }
        }
      });
    }

    const xuatSac = evaluatedCount > 0 ? Math.round((rlXS / evaluatedCount) * 100) : 0;
    const tot = evaluatedCount > 0 ? Math.round((rlTot / evaluatedCount) * 100) : 0;
    const kha = evaluatedCount > 0 ? Math.round((rlKha / evaluatedCount) * 100) : 0;
    const trungBinh = evaluatedCount > 0 ? Math.round((rlTB / evaluatedCount) * 100) : 0;
    const yeuKem = evaluatedCount > 0 ? Math.round((rlYeuKem / evaluatedCount) * 100) : 0;
    const renLuyenTotal = evaluatedCount > 0 ? xuatSac + tot + kha : 0;

    return {
      renLuyenTotal,
      renLuyenBreakdown: { xuatSac, tot, kha, trungBinh, yeuKem },
      evaluatedCount,
    };
  }, [students, trainingPoints, filterSemester, filterMonth]);

  const currentRenLuyenTotal = activeClassItem
    ? activeClassItem.renLuyenTotal
    : overallRenLuyenBreakdown.renLuyenTotal;

  const currentRenLuyenBreakdown = activeClassItem
    ? activeClassItem.renLuyenBreakdown
    : overallRenLuyenBreakdown.renLuyenBreakdown;

  const currentDonThiLai = activeClassItem
    ? activeClassItem.donThiLai
    : dynamicClassMetrics.reduce((acc, c) => acc + c.donThiLai, 0);

  const currentThiLaiBreakdown = activeClassItem
    ? activeClassItem.thiLaiBreakdown
    : [];

  const currentTyLeQuaMon = activeClassItem
    ? activeClassItem.tyLeQuaMon
    : (dynamicClassMetrics.length > 0
        ? Math.round((dynamicClassMetrics.reduce((acc, c) => acc + c.tyLeQuaMon, 0) / dynamicClassMetrics.length) * 10) / 10
        : 0);

  const currentQuaMonBreakdown = activeClassItem
    ? activeClassItem.quaMonBreakdown
    : { loaiA: 0, loaiB: 0, loaiC: 0, loaiDF: 0 };

  // Total classes count based on entered class data
  const totalClassesCount = allClassesList.length;

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center animate-pulse">
        <BarChart3 className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-spin" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Đang tổng hợp báo cáo kết quả đào tạo...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Shown for Admin & Lecturers (REMOVED per user request) */}

      {/* STUDENT SPECIFIC DASHBOARD: ABSENCE WARNINGS (>10%), EXAM NOTICES & COURSE PROGRESS */}
      {isStudent && (
        <div className="space-y-6">
          {/* Current Semester Filter Indicator for Attendance Reports */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/90 dark:bg-blue-950/50 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-xs">
            <div className="flex items-center gap-2.5 text-xs font-bold text-blue-900 dark:text-blue-200">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Phạm vi báo cáo chuyên cần:</span>
              <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-lg text-xs font-black shadow-xs">
                Học kỳ đang học ({currentActiveSemester === 'HK1' ? 'Học kỳ 1' : currentActiveSemester === 'HK2' ? 'Học kỳ 2' : 'Học kỳ Hè'})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                Năm học {currentActiveYear || 'chưa cập nhật'}
              </span>
            </div>
          </div>

          {/* 1. CẢNH BÁO CÁC MÔN NGHỈ HỌC QUÁ 10% SỐ TIẾT */}
          {studentAbsenceWarnings10.length > 0 ? (
            <div className="bg-gradient-to-r from-red-950 via-amber-950 to-red-900 border-2 border-red-500 text-white p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-red-700/60 pb-3">
                <div className="flex items-center gap-2.5 font-black text-sm md:text-base uppercase tracking-wider text-yellow-300">
                  <ShieldAlert className="w-6 h-6 text-yellow-300 animate-bounce shrink-0" />
                  <span>CẢNH BÁO TIẾN TRÌNH: CÓ MÔN HỌC NGHỈ QUÁ 10% SỐ TIẾT!</span>
                </div>
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-md shrink-0">
                  {studentAbsenceWarnings10.length} môn thuộc diện cảnh báo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {studentAbsenceWarnings10.map((w) => (
                  <div
                    key={w.maMH}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                      w.isDanger20
                        ? 'bg-red-900/90 border-red-400 text-white shadow-lg'
                        : 'bg-amber-950/80 border-amber-500 text-amber-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-sm text-yellow-200">
                          {w.tenMH} ({w.maMH})
                        </div>
                        <div className="text-xs opacity-90 mt-0.5">
                          Số tín chỉ: {w.soTinChi} ({w.totalPeriods} tiết) • GV: {w.giangVien}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide shrink-0 ${
                          w.isDanger20
                            ? 'bg-red-600 text-white border border-red-300 animate-pulse'
                            : 'bg-amber-500 text-black font-extrabold'
                        }`}
                      >
                        {w.isDanger20 ? '🚨 DƯỚI DIỆN CẤM THI (≥20%)' : '⚠️ CẢNH BÁO VẮNG (>10%)'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-bold">
                        <span>Số tiết đã vắng: <strong className="text-yellow-300 text-sm font-mono">{w.missedPeriods} / {w.totalPeriods} tiết</strong></span>
                        <span className="text-yellow-300 font-mono font-black">{w.absencePercentage.toFixed(1)}% Vắng</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            w.isDanger20 ? 'bg-red-500' : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.min(100, w.absencePercentage)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-200 italic pt-1.5 border-t border-white/10">
                      {w.isDanger20
                        ? '* Cực kỳ nguy hiểm: Bạn đã nghỉ học quá 20% số tiết. Liên hệ Giảng viên hoặc Cố vấn học tập gấp!'
                        : '* Cảnh báo: Tỷ lệ vắng đã vượt quá 10%. Hãy đi học đầy đủ các buổi còn lại để đảm bảo tư cách dự thi.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>BÁO CÁO CHUYÊN CẦN TỐT: Tất cả các môn học thuộc học kỳ đang học đều có tỷ lệ vắng dưới 10% số tiết!</span>
              </div>
              <span className="bg-emerald-800 text-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                Chuyên cần đảm bảo
              </span>
            </div>
          )}

          {/* 2. THÔNG BÁO CÁC TIẾT KIỂM TRA */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-indigo-700/80 text-white p-5 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
              <div className="flex items-center gap-2.5 font-bold text-sm md:text-base text-indigo-200 uppercase tracking-wider">
                <BellRing className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
                <span>THÔNG BÁO LỊCH KIỂM TRA</span>
              </div>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-bold">
                {studentExamNotices.length > 0 ? `${studentExamNotices.length} bài kiểm tra sắp tới` : 'Lịch tuần học'}
              </span>
            </div>

            {studentExamNotices.length === 0 ? (
              <div className="p-4 bg-indigo-900/30 rounded-xl border border-indigo-800/50 text-xs text-indigo-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Chưa có thông báo kiểm tra 15 phút hoặc giữa kỳ mới được lên lịch.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {studentExamNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="p-4 bg-indigo-900/40 hover:bg-indigo-900/60 rounded-xl border border-indigo-700/60 space-y-2.5 transition-all shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            notice.loai === '15_PHUT'
                              ? 'bg-amber-400 text-slate-950'
                              : notice.loai === 'GIUA_KY'
                              ? 'bg-purple-400 text-slate-950'
                              : 'bg-blue-400 text-slate-950'
                          }`}
                        >
                          {notice.loai === '15_PHUT' ? 'KT 15 Phút' : notice.loai === 'GIUA_KY' ? 'KT Giữa Kỳ' : 'Thông báo'}
                        </span>
                      </div>

                      <div className="font-extrabold text-sm text-white">{notice.tieuDe}</div>
                      <div className="text-[11px] font-bold text-indigo-300">
                        Môn: {notice.tenMH || notice.maMH} ({notice.maMH})
                      </div>
                      <p className="text-xs text-indigo-200 line-clamp-3 leading-relaxed">{notice.noiDung}</p>
                    </div>

                    <div className="pt-2.5 border-t border-indigo-800/60 text-[11px] text-indigo-300 space-y-1">
                      <div className="flex items-center gap-1 font-bold text-yellow-300">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Ngày kiểm tra: {notice.ngayKiemTra || 'Tuần tới'} (Tuần thứ {notice.tuanKiemTra || 'hiện tại'})</span>
                      </div>
                      <div className="flex items-center justify-between opacity-80 text-[10px] pt-0.5">
                        <span>• GV: {notice.giangVienTao || 'Giảng viên phụ trách'}</span>
                        <span className="italic text-indigo-400">Chuẩn bị bài đầy đủ</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. BÁO CÁO TIẾN TRÌNH CÁC MÔN HỌC CHI TIẾT */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Tiến Trình Học Tập
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tiến trình học tập
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentCourseProgressList.map((course) => (
                <div
                  key={course.maMH}
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3.5 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 uppercase">
                          {course.maMH}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1 leading-snug">
                          {course.tenMH}
                        </h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 border ${
                          course.isDanger20
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                            : course.isWarning10
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {course.isDanger20 ? '🚨 Cấm thi (≥20%)' : course.isWarning10 ? '⚠️ Cảnh báo (>10%)' : '🟢 Bình thường'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Số tín chỉ: <strong className="text-slate-800 dark:text-slate-200">{course.soTinChi}</strong> ({course.totalPeriods} tiết) • GV: {course.giangVien}
                    </div>
                  </div>

                  {/* Attendance progress bar */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-300">Tỷ lệ có mặt tại lớp:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-mono font-black">{course.attendanceRate.toFixed(1)}%</span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          course.isDanger20 ? 'bg-red-500' : course.isWarning10 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(0, course.attendanceRate)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>Đã vắng: <strong className="text-rose-600 dark:text-rose-400 font-mono">{course.missedPeriods} tiết</strong> ({course.absencePercentage.toFixed(1)}%)</span>
                      <span>Tham gia: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{course.attendedPeriods} tiết</strong></span>
                    </div>
                  </div>

                  {/* Component scores */}
                  {course.gradeObj ? (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium">Điểm TK:</span>
                        <strong className="text-blue-600 dark:text-blue-400 font-black font-mono text-sm">
                          {course.gradeObj.diemTongKet10} ({course.gradeObj.diemChu})
                        </strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        course.gradeObj.trangThai === 'PASSED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-red-100 text-red-800'
                      }`}>
                        {course.gradeObj.trangThai === 'PASSED' ? 'ĐẠT MÔN' : 'CHƯA ĐẠT'}
                      </span>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-400 italic">
                      * Đang trong tiến trình học tập (Chưa tổng kết)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prominent Top Section: Chỉ Số Đào Tạo & Rèn Luyện (DÀNH CHO QUẢN TRỊ / GIẢNG VIÊN) */}
      {!isStudent && (
        <div className="space-y-6">
          {/* Prominent Top Section: Chỉ Số Đào Tạo & Rèn Luyện */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800 space-y-5">
        {/* Top bar with title and controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-blue-500 rounded-full animate-pulse shrink-0"></div>
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider text-white">
                Bảng Chỉ Số Đào Tạo & Rèn Luyện
              </h3>
            </div>
          </div>

          {/* Admin view switcher */}
          {!isStudent && (
            <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700 shrink-0">
              <button
                id="btn-view-overview"
                onClick={() => setAdminViewMode('OVERVIEW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  adminViewMode === 'OVERVIEW'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Tổng Quan Chỉ Số
              </button>
              <button
                id="btn-view-class-list"
                onClick={() => setAdminViewMode('CLASS_LIST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  adminViewMode === 'CLASS_LIST'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Chỉ Số Từng Lớp (List)
              </button>
            </div>
          )}
        </div>

        {/* Filters bar: Semester, Month, Class */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
          {/* Select Semester */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-400" />
              1. Học Kỳ
            </label>
            <select
              id="select-index-semester"
              value={filterSemester}
              onChange={(e) => {
                setFilterSemester(e.target.value);
                setFilterMonth('ALL');
              }}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả các học kỳ</option>
              {availableReportSemesters.map((s) => (
                <option key={s} value={s}>
                  Học kỳ {s}
                </option>
              ))}
            </select>
          </div>

          {/* Select Month of Semester */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" />
              2. Tháng Của Học Kỳ
            </label>
            <select
              id="select-index-month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả các tháng</option>
              {availableReportMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Select Class (For Admin / Teacher / Student) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Building className="w-3 h-3 text-emerald-400" />
              {isStudent ? '3. Lớp Học Của Bạn' : '3. Chọn Lớp Chuyên Ngành'}
            </label>
            {isStudent ? (
              <div className="w-full bg-slate-900 border border-slate-700 text-blue-300 text-xs font-bold rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="truncate">{studentClassItem.tenLop.startsWith('Lớp') ? studentClassItem.tenLop : `Lớp ${studentClassItem.maLop}`}</span>
                <span className="text-[10px] bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800 shrink-0 ml-1">Lớp của tôi</span>
              </div>
            ) : (
              <select
                id="select-index-class"
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả các lớp (Tổng số {totalClassesCount} lớp)</option>
                {allClassesList.map((c) => (
                  <option key={c.maLop} value={c.maLop}>
                    {c.tenLop.startsWith('Lớp') ? c.tenLop : `Lớp ${c.maLop}`} ({c.siSo} SV)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* OVERVIEW METRICS MODE */}
        {adminViewMode === 'OVERVIEW' || isStudent ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Classes / Student Class */}
            {isStudent ? (
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 flex flex-col justify-between hover:border-slate-600 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                    Lớp Học Của Bạn
                  </span>
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Building className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <div className="text-xl font-mono font-black text-white">
                    {studentClassItem.maLop}
                  </div>
                  <div className="text-xs text-blue-300 font-semibold truncate mt-0.5">
                    {studentClassItem.tenLop}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Sĩ số: <strong className="text-white font-mono">{studentClassItem.siSo} SV</strong> • Cố vấn: {studentClassItem.covan}
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-blue-400 flex items-center gap-1 mt-1">
                  <span>Dữ liệu giới hạn theo lớp học của bạn</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 flex flex-col justify-between hover:border-slate-600 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                    Tổng Số Lớp Chuyên Ngành
                  </span>
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Building className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <div className="text-2xl font-mono font-black text-white">
                    {totalClassesCount} Lớp
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {selectedClassFilter === 'ALL'
                      ? 'Tất cả khoa chuyên ngành'
                      : `Đang lọc: ${selectedClassFilter}`}
                  </div>
                </div>
                <button
                  onClick={() => setAdminViewMode('CLASS_LIST')}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 cursor-pointer"
                >
                  Xem danh sách chỉ số từng lớp <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Card 2: Điểm Rèn Luyện (Khá + Tốt + XS) */}
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                  Điểm Rèn Luyện
                </span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-2xl font-mono font-black text-emerald-400">
                  {currentRenLuyenTotal}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Tổng % Đạt Khá, Tốt & Xuất Sắc
                </div>
              </div>
              <button
                id="btn-detail-ren-luyen"
                onClick={() => {
                  setModalTargetClass(activeClassItem || null);
                  setActiveDetailModal('REN_LUYEN');
                }}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-1 cursor-pointer"
              >
                Xem chi tiết tỷ lệ từng loại <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Card 3: Đơn Thi Lại */}
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                  Thi Lại/Học Lại
                </span>
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <FileCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-2xl font-mono font-black text-amber-400">
                  {currentDonThiLai} Sinh viên
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Tỷ lệ thi lại môn chuyên ngành
                </div>
              </div>
              <button
                id="btn-detail-thi-lai"
                onClick={() => {
                  setModalTargetClass(activeClassItem || null);
                  setActiveDetailModal('THI_LAI');
                }}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-1 cursor-pointer"
              >
                Xem chi tiết <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Card 4: Tỷ Lệ Qua Môn */}
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 flex flex-col justify-between hover:border-slate-600 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                  Tỷ Lệ Qua Môn
                </span>
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-2xl font-mono font-black text-cyan-400">
                  {currentTyLeQuaMon}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Tỷ lệ sinh viên hoàn thành môn
                </div>
              </div>
              <button
                id="btn-detail-qua-mon"
                onClick={() => {
                  setModalTargetClass(activeClassItem || null);
                  setActiveDetailModal('QUA_MON');
                }}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1 cursor-pointer"
              >
                Xem chi tiết phân bổ điểm số <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* CLASS LIST MODE (Dạng List Chỉ Số Từng Lớp Cho Role Admin) */
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
              <span>Danh Sách Chỉ Số Đào Tạo Theo Từng Lớp Chuyên Ngành ({dynamicClassMetrics.length} Lớp)</span>
              <span>
                Kỳ: {filterSemester} • {filterMonth === 'ALL' ? 'Tất cả tháng' : 'Tháng ' + filterMonth}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {dynamicClassMetrics.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-800/50 rounded-xl border border-slate-700">
                  Chưa có dữ liệu lớp học hoặc sinh viên nào được nhập vào hệ thống.
                </div>
              ) : (
                dynamicClassMetrics.map((item) => (
                <div
                  key={item.maLop}
                  className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-500/50 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{item.tenLop}</span>
                      <span className="text-[11px] font-mono font-bold bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                        {item.maLop}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        • Sĩ số: <strong className="text-white font-mono">{item.siSo} SV</strong>
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        • Khoa: <span className="text-slate-300">{item.khoa}</span>
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">Cố vấn học tập: {item.covan}</div>
                  </div>

                  {/* Class Key Metrics Grid */}
                  <div className="flex items-center gap-4 flex-wrap shrink-0">
                    {/* Điểm Rèn Luyện */}
                    <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700/80 text-center min-w-[110px]">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">
                        Đ.Rèn Luyện
                      </div>
                      <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                        {item.renLuyenTotal}%
                      </div>
                      <div className="text-[9px] text-slate-500">Khá/Tốt/XS</div>
                    </div>

                    {/* Số Đơn Thi Lại */}
                    <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700/80 text-center min-w-[90px]">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Thi Lại</div>
                      <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                        {item.donThiLai} SV
                      </div>
                      <div className="text-[9px] text-slate-500">Sinh viên</div>
                    </div>

                    {/* Tỷ lệ Qua Môn */}
                    <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700/80 text-center min-w-[100px]">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Qua Môn</div>
                      <div className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
                        {item.tyLeQuaMon}%
                      </div>
                      <div className="text-[9px] text-slate-500">Đạt môn</div>
                    </div>

                    {/* View Details button for class */}
                    <button
                      onClick={() => {
                        setModalTargetClass(item);
                        setActiveDetailModal('CLASS_DETAIL');
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      Chi Tiết <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )))}
            </div>
          </div>
        )}
      </div>

      {/* Main Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Academic Standing Breakdown Visual Bars */}
        <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              Phân bổ Học lực Sinh viên (Thang GPA 4.0)
            </h3>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Tổng {totalSt} SV
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* 1. Xuất sắc (3.60 - 4.00) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-purple-700 dark:text-purple-400">
                  Xuất sắc (3.60 - 4.00): {standing.xuatSac} sinh viên
                </span>
                <span className="font-mono">
                  {totalSt > 0 ? Math.round((standing.xuatSac / totalSt) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalSt > 0 ? (standing.xuatSac / totalSt) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 2. Giỏi (3.20 - 3.59) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700 dark:text-blue-400">
                  Giỏi (3.20 - 3.59): {standing.gioi} sinh viên
                </span>
                <span className="font-mono">
                  {totalSt > 0 ? Math.round((standing.gioi / totalSt) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalSt > 0 ? (standing.gioi / totalSt) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 3. Khá (2.80 - 3.19) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700 dark:text-emerald-400">
                  Khá (2.80 - 3.19): {standing.kha} sinh viên
                </span>
                <span className="font-mono">
                  {totalSt > 0 ? Math.round((standing.kha / totalSt) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalSt > 0 ? (standing.kha / totalSt) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 4. Trung bình Khá (2.40 - 2.79) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-indigo-700 dark:text-indigo-400">
                  Trung bình Khá (2.40 - 2.79): {standing.tbk || 0} sinh viên
                </span>
                <span className="font-mono">
                  {totalSt > 0 ? Math.round(((standing.tbk || 0) / totalSt) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalSt > 0 ? ((standing.tbk || 0) / totalSt) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 5. Trung bình (2.00 - 2.39) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700 dark:text-amber-400">
                  Trung bình (2.00 - 2.39): {standing.trungBinh} sinh viên
                </span>
                <span className="font-mono">
                  {totalSt > 0 ? Math.round((standing.trungBinh / totalSt) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalSt > 0 ? (standing.trungBinh / totalSt) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 6. Yếu (1.00 - 1.99) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-orange-700 dark:text-orange-400">
                  Yếu (1.00 - 1.99): {standing.yeu} sinh viên
                </span>
                <span className="font-mono">
                  {totalSt > 0 ? Math.round((standing.yeu / totalSt) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalSt > 0 ? (standing.yeu / totalSt) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 7. Kém (< 1.00) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700 dark:text-rose-400">
                  Kém (&lt; 1.00): {standing.kem || 0} sinh viên
                </span>
                <span className="font-mono">
                  {totalSt > 0 ? Math.round(((standing.kem || 0) / totalSt) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalSt > 0 ? ((standing.kem || 0) / totalSt) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 8. Chưa có điểm môn học (GPA) */}
            {standing.chuaCoDiem > 0 && (
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    Chưa có điểm học tập (GPA): {standing.chuaCoDiem} sinh viên
                  </span>
                  <span className="font-mono text-slate-400">
                    {totalSt > 0 ? Math.round((standing.chuaCoDiem / totalSt) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalSt > 0 ? (standing.chuaCoDiem / totalSt) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Training Point Breakdown Visual Bars (Tỷ lệ rèn luyện) */}
        <div className="md:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Phân bổ Điểm Rèn Luyện Sinh Viên
            </h3>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
              Tổng Khá, Tốt & XS: {currentRenLuyenTotal}%
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* 1. Xuất sắc (90 - 100 điểm) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-purple-700 dark:text-purple-400">
                  Xuất sắc (90 - 100 điểm)
                </span>
                <span className="font-mono text-purple-700 dark:text-purple-400 font-bold">
                  {currentRenLuyenBreakdown.xuatSac}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentRenLuyenBreakdown.xuatSac}%` }}
                />
              </div>
            </div>

            {/* 2. Tốt (80 - 89 điểm) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700 dark:text-blue-400">
                  Tốt (80 - 89 điểm)
                </span>
                <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">
                  {currentRenLuyenBreakdown.tot}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentRenLuyenBreakdown.tot}%` }}
                />
              </div>
            </div>

            {/* 3. Khá (70 - 79 điểm) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700 dark:text-emerald-400">
                  Khá (70 - 79 điểm)
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  {currentRenLuyenBreakdown.kha}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentRenLuyenBreakdown.kha}%` }}
                />
              </div>
            </div>

            {/* 4. Trung bình (50 - 69 điểm) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700 dark:text-amber-400">
                  Trung bình (50 - 69 điểm)
                </span>
                <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">
                  {currentRenLuyenBreakdown.trungBinh}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentRenLuyenBreakdown.trungBinh}%` }}
                />
              </div>
            </div>

            {/* 5. Yếu / Kém (< 50 điểm) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700 dark:text-rose-400">
                  Yếu & Kém (&lt; 50 điểm)
                </span>
                <span className="font-mono text-rose-700 dark:text-rose-400 font-bold">
                  {currentRenLuyenBreakdown.yeuKem}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentRenLuyenBreakdown.yeuKem}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Phạm vi: {activeClassItem ? (activeClassItem.tenLop.startsWith('Lớp') ? activeClassItem.tenLop : `Lớp ${activeClassItem.maLop}`) : 'Tất cả các lớp'}
            </span>
            <button
              onClick={() => {
                setModalTargetClass(activeClassItem || null);
                setActiveDetailModal('REN_LUYEN');
              }}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Xem chi tiết <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Recent Grades Section for Student / Admin */}
        <div className="md:col-span-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  {isStudent
                    ? `Kết Quả Học Tập Môn Học (Lớp: ${currentStudent?.lop || 'Chuyên ngành'})`
                    : 'Cập nhật điểm gần đây (Toàn Hệ Thống)'}
                </h3>
              </div>
              {isStudent && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Sinh viên:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {currentStudent?.hoTen || currentStudentCode}
                  </strong>{' '}
                  ({currentStudentCode.toUpperCase()})
                </p>
              )}
            </div>

            {/* Semester selector dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">Học kỳ:</span>
              <select
                id="select-report-semester"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Tất cả các học kỳ</option>
                {availableSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List format of courses for student */}
          {isStudent ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGradesList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Không tìm thấy dữ liệu điểm cho sinh viên thuộc học kỳ này.
                </div>
              ) : (
                filteredGradesList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {item.maMH.slice(-3)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {item.tenMH || item.maMH}
                          </span>
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {item.maMH}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            • {item.soTinChi || 3} Tín chỉ
                          </span>
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                            {item.hocKy} ({item.namHoc})
                          </span>
                        </div>
                        {/* Component Score Chips */}
                        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap pt-0.5">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                            Chuyên cần (10%):{' '}
                            <strong className="text-slate-900 dark:text-white font-mono">
                              {item.diemChuyenCan}
                            </strong>
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                            Giữa kỳ (30%):{' '}
                            <strong className="text-slate-900 dark:text-white font-mono">
                              {item.diemGiuaKy}
                            </strong>
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
                            Cuối kỳ (60%):{' '}
                            <strong className="text-slate-900 dark:text-white font-mono">
                              {item.diemCuoiKy}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400 font-medium">
                          Điểm Tổng Kết
                        </div>
                        <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 leading-none mt-0.5">
                          {item.diemTongKet10}{' '}
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            ({item.diemChu})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Thang 4: {item.diemThang4}
                        </div>
                      </div>

                      <div>
                        {item.trangThai === 'PASSED' ? (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đạt môn
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Chưa đạt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Class-based Grade Management for ADMIN / LECTURER */
            <div className="p-5 flex-1 flex flex-col space-y-4">
              {selectedAdminClassCode === null ? (
                /* LEVEL 1: LIST OF CLASSES */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                        <Folder className="w-4 h-4 text-blue-500" />
                        Danh Sách Bảng Điểm Theo Từng Lớp Chuyên Ngành ({allClassesList.length} Lớp)
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allClassesList.map((classObj) => {
                      const classStudents = (students || []).filter(s => s.lop === classObj.maLop);
                      const studentCount = classStudents.length || classObj.siSo;
                      const classSubjects = getSubjectsForClass(classObj.maLop);

                      return (
                        <div
                          key={classObj.maLop}
                          onClick={() => setSelectedAdminClassCode(classObj.maLop)}
                          className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-bl-full pointer-events-none" />

                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                {classObj.maLop}
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <FileSpreadsheet className="w-3 h-3" />
                                {classSubjects.length} Môn học
                              </span>
                            </div>

                            <h5 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {classObj.tenLop}
                            </h5>

                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mt-2 font-medium">
                              <div className="flex items-center justify-between">
                                <span>Sĩ số sinh viên:</span>
                                <strong className="text-slate-800 dark:text-slate-200 font-mono">{studentCount} SV</strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Khoa chuyên môn:</span>
                                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{classObj.khoa}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Cố vấn học tập:</span>
                                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{classObj.covan}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                            <span>Bấm để mở file bảng điểm các môn</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* LEVEL 2: SUBJECT GRADE FILES FOR SELECTED CLASS */
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50/60 dark:bg-slate-800/80 rounded-xl border border-blue-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedAdminClassCode(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Tất cả các lớp
                      </button>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          <span>Lớp: <span className="font-mono text-blue-600 dark:text-blue-400">{selectedAdminClassCode}</span></span>
                          <span className="text-slate-400 font-normal">|</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {allClassesList.find(c => c.maLop === selectedAdminClassCode)?.tenLop || 'Danh Sách File Bảng Điểm Môn Học'}
                          </span>
                        </h4>
                      </div>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={subjectSearchQuery}
                        onChange={(e) => setSubjectSearchQuery(e.target.value)}
                        placeholder="Tìm môn học (Tên hoặc mã)..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Course File Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getSubjectsForClass(selectedAdminClassCode).filter(
                      (m) =>
                        (m?.tenMH || '').toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
                        (m?.maMH || '').toLowerCase().includes(subjectSearchQuery.toLowerCase())
                    ).map((monHoc) => {
                      const studentGrades = getSubjectGradeListForClass(selectedAdminClassCode, monHoc);
                      const passedCount = studentGrades.filter((g) => g.trangThai === 'PASSED').length;
                      const passPercent = studentGrades.length > 0 ? Math.round((passedCount / studentGrades.length) * 100) : 0;
                      const avg10 = studentGrades.length > 0
                        ? (studentGrades.reduce((sum, g) => sum + g.diemTongKet10, 0) / studentGrades.length).toFixed(1)
                        : '0.0';

                      const fileName = `BangDiem_${selectedAdminClassCode}_${monHoc.maMH}.xlsx`;
                      const currentClassInfo = allClassesList.find(c => c.maLop === selectedAdminClassCode);

                      return (
                        <div
                          key={monHoc.maMH}
                          className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-emerald-500 dark:hover:border-emerald-400 transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* File Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/80 shrink-0">
                                  <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                    {fileName}
                                  </div>
                                  <h5 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 leading-snug">
                                    {monHoc.tenMH}
                                  </h5>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 shrink-0">
                                {monHoc.maMH}
                              </span>
                            </div>

                            {/* Info Stats */}
                            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs mb-3">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Sĩ số bảng điểm</span>
                                <strong className="text-slate-800 dark:text-slate-200 font-mono">{studentGrades.length} SV</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Điểm TB Lớp</span>
                                <strong className="text-blue-600 dark:text-blue-400 font-mono">{avg10} / 10</strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Tỷ lệ đạt</span>
                                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{passPercent}%</strong>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                            <button
                              onClick={() =>
                                setSubjectGradeSheetModal({
                                  maLop: selectedAdminClassCode,
                                  tenLop: currentClassInfo?.tenLop || `Lớp ${selectedAdminClassCode}`,
                                  monHoc,
                                  studentGrades,
                                })
                              }
                              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem Bảng Điểm
                            </button>
                            <button
                              onClick={() => handleExportSubjectExcel(selectedAdminClassCode, monHoc, studentGrades)}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                              title="Tải File Excel Bảng Điểm (.xlsx)"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Tải Excel
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DETAILED METRICS MODAL */}
      {activeDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-white flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  {activeDetailModal === 'REN_LUYEN' && <GraduationCap className="w-5 h-5" />}
                  {activeDetailModal === 'THI_LAI' && <FileCheck className="w-5 h-5" />}
                  {activeDetailModal === 'QUA_MON' && <TrendingUp className="w-5 h-5" />}
                  {activeDetailModal === 'CLASS_DETAIL' && <Building className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {activeDetailModal === 'REN_LUYEN' && 'Chi Tiết Tỷ Lệ Điểm Rèn Luyện'}
                    {activeDetailModal === 'THI_LAI' && 'Chi Tiết Thi Lại/Học Lại'}
                    {activeDetailModal === 'QUA_MON' && 'Chi Tiết Phân Bổ Tỷ Lệ Qua Môn'}
                    {activeDetailModal === 'CLASS_DETAIL' &&
                      `Chỉ Số Chi Tiết: ${modalTargetClass?.tenLop || 'Lớp Chuyên Ngành'}`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {modalTargetClass
                      ? `${modalTargetClass.tenLop.startsWith('Lớp') ? modalTargetClass.tenLop : `Lớp ${modalTargetClass.maLop}`}`
                      : `Phạm vi: ${selectedClassFilter === 'ALL' ? 'Tất cả các lớp' : selectedClassFilter}`}{' '}
                    • Kỳ: {filterSemester} •{' '}
                    {filterMonth === 'ALL' ? 'Tất cả tháng' : 'Tháng ' + filterMonth}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveDetailModal(null);
                  setModalTargetClass(null);
                }}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* 1. REN LUYEN BREAKDOWN */}
              {activeDetailModal === 'REN_LUYEN' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                        Tổng % Đạt Loại Khá, Tốt & Xuất Sắc
                      </div>
                      <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {currentRenLuyenTotal}%
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                      Bao gồm các mức điểm rèn luyện &ge; 70đ
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                      Phân Bổ Tỷ Lệ Theo Từng Loại Rèn Luyện:
                    </h4>

                    {/* Xuất sắc */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-purple-600 dark:text-purple-400">
                          1. Loại Xuất Sắc (90 - 100 điểm)
                        </span>
                        <span className="font-mono">{currentRenLuyenBreakdown.xuatSac}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full"
                          style={{ width: `${currentRenLuyenBreakdown.xuatSac}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Tốt */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          2. Loại Tốt (80 - 89 điểm)
                        </span>
                        <span className="font-mono">{currentRenLuyenBreakdown.tot}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${currentRenLuyenBreakdown.tot}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Khá */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-blue-600 dark:text-blue-400">
                          3. Loại Khá (70 - 79 điểm)
                        </span>
                        <span className="font-mono">{currentRenLuyenBreakdown.kha}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${currentRenLuyenBreakdown.kha}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Trung bình */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-amber-600 dark:text-amber-400">
                          4. Loại Trung Bình (50 - 69 điểm)
                        </span>
                        <span className="font-mono">{currentRenLuyenBreakdown.trungBinh}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full"
                          style={{ width: `${currentRenLuyenBreakdown.trungBinh}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Yếu / Kém */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-rose-600 dark:text-rose-400">
                          5. Loại Yếu / Kém (&lt; 50 điểm)
                        </span>
                        <span className="font-mono">{currentRenLuyenBreakdown.yeuKem}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${currentRenLuyenBreakdown.yeuKem}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. THI LAI BREAKDOWN */}
              {activeDetailModal === 'THI_LAI' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-amber-800 dark:text-amber-300">
                        Tổng Số Hồ Sơ / Đơn Đăng Ký Thi Lại
                      </div>
                      <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                        {currentDonThiLai} Hồ sơ
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      Trạng thái: Đã duyệt & Đang xử lý
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                      Danh Sách Các Môn Học Có Đơn Đăng Ký Thi Lại:
                    </h4>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold">
                          <tr>
                            <th className="p-3">Tên Môn Học</th>
                            <th className="p-3">Số Lượng Đơn</th>
                            <th className="p-3">Lý Do Đăng Ký</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {currentThiLaiBreakdown.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                {item.mon}
                              </td>
                              <td className="p-3 font-mono font-bold text-amber-600">
                                {item.soLuong} đơn
                              </td>
                              <td className="p-3 text-slate-500 font-medium">{item.lyDo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. QUA MON BREAKDOWN */}
              {activeDetailModal === 'QUA_MON' && (
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-cyan-800 dark:text-cyan-300">
                        Tỷ Lệ Qua Môn Trung Bình Toàn Khối
                      </div>
                      <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                        {currentTyLeQuaMon}%
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-cyan-700 dark:text-cyan-300 font-medium">
                      Môn học hoàn thành tích lũy &ge; 5.0 (C trở lên)
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                      Phân Bổ Tỷ Lệ Điểm Số Các Môn Học:
                    </h4>

                    {/* Loại A */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          1. Loại A (8.5 - 10.0 / Xuất sắc)
                        </span>
                        <span className="font-mono">{currentQuaMonBreakdown.loaiA}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${currentQuaMonBreakdown.loaiA}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Loại B */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-blue-600 dark:text-blue-400">
                          2. Loại B (7.0 - 8.4 / Khá - Giỏi)
                        </span>
                        <span className="font-mono">{currentQuaMonBreakdown.loaiB}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full"
                          style={{ width: `${currentQuaMonBreakdown.loaiB}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Loại C */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-indigo-600 dark:text-indigo-400">
                          3. Loại C (5.5 - 6.9 / Trung bình)
                        </span>
                        <span className="font-mono">{currentQuaMonBreakdown.loaiC}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${currentQuaMonBreakdown.loaiC}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Loại D/F */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-rose-600 dark:text-rose-400">
                          4. Loại D/F (&lt; 5.5 / Chưa đạt môn)
                        </span>
                        <span className="font-mono">{currentQuaMonBreakdown.loaiDF}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${currentQuaMonBreakdown.loaiDF}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. CLASS DETAIL MODAL */}
              {activeDetailModal === 'CLASS_DETAIL' && modalTargetClass && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Sĩ Số</div>
                      <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                        {modalTargetClass.siSo} SV
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">
                        Đ.Rèn Luyện
                      </div>
                      <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {modalTargetClass.renLuyenTotal}%
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold">
                        Đơn Thi Lại
                      </div>
                      <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                        {modalTargetClass.donThiLai} Đơn
                      </div>
                    </div>

                    <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 rounded-xl border border-cyan-200 dark:border-cyan-800 text-center">
                      <div className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-bold">
                        Tỷ Lệ Qua Môn
                      </div>
                      <div className="text-lg font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                        {modalTargetClass.tyLeQuaMon}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                      Phân Bổ Tỷ Lệ Điểm Rèn Luyện Lớp {modalTargetClass.maLop}:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-semibold text-center">
                      <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800">
                        <span className="block text-purple-600 font-bold">Xuất sắc</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {modalTargetClass.renLuyenBreakdown.xuatSac}%
                        </span>
                      </div>
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <span className="block text-emerald-600 font-bold">Tốt</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {modalTargetClass.renLuyenBreakdown.tot}%
                        </span>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800">
                        <span className="block text-blue-600 font-bold">Khá</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {modalTargetClass.renLuyenBreakdown.kha}%
                        </span>
                      </div>
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
                        <span className="block text-amber-600 font-bold">Trung bình</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {modalTargetClass.renLuyenBreakdown.trungBinh}%
                        </span>
                      </div>
                      <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 col-span-2 sm:col-span-1">
                        <span className="block text-rose-600 font-bold">Yếu / Kém</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {modalTargetClass.renLuyenBreakdown.yeuKem}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {modalTargetClass.thiLaiBreakdown.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                        Danh Sách Môn Thi Lại Thuộc Lớp:
                      </h4>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        {modalTargetClass.thiLaiBreakdown.map((item, i) => (
                          <div key={i} className="p-3 flex items-center justify-between font-medium">
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {item.mon}
                              </span>
                              <span className="text-slate-400 text-[11px] block">{item.lyDo}</span>
                            </div>
                            <span className="font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-lg">
                              {item.soLuong} đơn
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => {
                  setActiveDetailModal(null);
                  setModalTargetClass(null);
                }}
                className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* SUBJECT GRADE SHEET MODAL FOR ADMIN / LECTURER */}
      {subjectGradeSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden text-slate-900 dark:text-white flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-800 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      BangDiem_{subjectGradeSheetModal.maLop}_{subjectGradeSheetModal.monHoc.maMH}.xlsx
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Lớp: <strong className="text-slate-900 dark:text-white font-mono">{subjectGradeSheetModal.tenLop.startsWith('Lớp') ? subjectGradeSheetModal.tenLop : `Lớp ${subjectGradeSheetModal.maLop}`}</strong>
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                    BẢNG ĐIỂM CHI TIẾT MÔN: {subjectGradeSheetModal.monHoc.tenMH} ({subjectGradeSheetModal.monHoc.maMH})
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() =>
                    handleExportSubjectExcel(
                      subjectGradeSheetModal.maLop,
                      subjectGradeSheetModal.monHoc,
                      subjectGradeSheetModal.studentGrades
                    )
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Xuất File Excel (.xlsx)
                </button>
                <button
                  onClick={() => setSubjectGradeSheetModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-toolbar: Search Student in Grade Sheet */}
            <div className="p-3 bg-slate-100/60 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={modalStudentSearch}
                  onChange={(e) => setModalStudentSearch(e.target.value)}
                  placeholder="Lọc danh sách theo Mã SV hoặc Họ tên..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 font-semibold text-slate-600 dark:text-slate-300 flex-wrap">
                <span>Tổng sĩ số: <strong className="text-slate-900 dark:text-white font-mono">{subjectGradeSheetModal.studentGrades.length} SV</strong></span>
                <span>•</span>
                <span className="text-emerald-600">
                  Số SV đạt: <strong className="font-mono">{subjectGradeSheetModal.studentGrades.filter(g => g.trangThai === 'PASSED').length}</strong>
                </span>
                <span>•</span>
                <span className="text-rose-600">
                  Số SV rớt: <strong className="font-mono">{subjectGradeSheetModal.studentGrades.filter(g => g.trangThai === 'FAILED').length}</strong>
                </span>
              </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold sticky top-0 z-10">
                  <tr>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">STT</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Mã SV</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Họ và Tên</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">CC (10%)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">GK (30%)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">CK (60%)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">Điểm TK (10)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">Điểm HS4</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">Điểm Chữ</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {subjectGradeSheetModal.studentGrades
                    .filter(
                      (g) =>
                        g.hoTen.toLowerCase().includes(modalStudentSearch.toLowerCase()) ||
                        g.maSV.toLowerCase().includes(modalStudentSearch.toLowerCase())
                    )
                    .map((item, idx) => (
                      <tr key={item.maSV} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-medium text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {item.maSV}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {item.hoTen}
                        </td>
                        <td className="p-3 text-center font-mono">{item.diemChuyenCan}</td>
                        <td className="p-3 text-center font-mono">{item.diemGiuaKy}</td>
                        <td className="p-3 text-center font-mono">{item.diemCuoiKy}</td>
                        <td className="p-3 text-center font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                          {item.diemTongKet10}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold">{item.diemThang4}</td>
                        <td className="p-3 text-center font-bold">{item.diemChu}</td>
                        <td className="p-3 text-right">
                          {item.trangThai === 'PASSED' ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              ĐẠT
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              KHÔNG ĐẠT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Dữ liệu bảng điểm đã sẵn sàng để xem trực tiếp hoặc xuất file Excel chuẩn.
              </span>
              <button
                onClick={() => setSubjectGradeSheetModal(null)}
                className="px-5 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
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
