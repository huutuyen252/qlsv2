import { Diem, SinhVien, GpaSummary, SemesterGpaSummary, YearGpaSummary } from '../types';
import * as XLSX from 'xlsx';
export function convertGradeScale(diem10: number, isDATN: boolean = false): {
  thang4: number;
  diemChu: string;
  trangThai: 'PASSED' | 'FAILED';
} {
  const tk10 = Math.round(Number(diem10 || 0) * 100) / 100;
  if (tk10 >= 8.5) return { thang4: 4.0, diemChu: 'A', trangThai: 'PASSED' };
  if (tk10 >= 8.0) return { thang4: 3.5, diemChu: 'B+', trangThai: 'PASSED' };
  if (tk10 >= 7.0) return { thang4: 3.0, diemChu: 'B', trangThai: 'PASSED' };
  if (tk10 >= 6.5) return { thang4: 2.5, diemChu: 'C+', trangThai: 'PASSED' };
  if (tk10 >= 5.5) return { thang4: 2.0, diemChu: 'C', trangThai: 'PASSED' };
  if (tk10 >= 5.0) return { thang4: 1.5, diemChu: 'D+', trangThai: isDATN ? 'FAILED' : 'PASSED' };
  if (tk10 >= 4.0) return { thang4: 1.0, diemChu: 'D', trangThai: isDATN ? 'FAILED' : 'PASSED' };
  return { thang4: 0.0, diemChu: 'F', trangThai: 'FAILED' };
}

/**
 * Xếp loại học lực theo Điều 14 Khoản 4 Quy chế 1348/QC-ĐHTĐN:
 * - 3.60 - 4.00: Xuất sắc
 * - 3.20 - 3.59: Giỏi
 * - 2.80 - 3.19: Khá
 * - 2.40 - 2.79: Trung bình Khá
 * - 2.00 - 2.39: Trung bình
 * - 1.00 - 1.99: Yếu
 * - Dưới 1.00: Kém
 */
export function getAcademicClassification(
  gpa4: number,
  totalCredits: number = 1
): 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình Khá' | 'Trung bình' | 'Yếu' | 'Kém' | 'Chưa có điểm' {
  if (totalCredits === 0) return 'Chưa có điểm';
  const gpa = Math.round(Number(gpa4 || 0) * 100) / 100;
  if (gpa >= 3.60) return 'Xuất sắc';
  if (gpa >= 3.20) return 'Giỏi';
  if (gpa >= 2.80) return 'Khá';
  if (gpa >= 2.40) return 'Trung bình Khá';
  if (gpa >= 2.00) return 'Trung bình';
  if (gpa >= 1.00) return 'Yếu';
  return 'Kém';
}

/**
 * Phân loại rèn luyện sinh viên theo Điều 16 Quy chế 1519/QC-TĐN:
 * - 90 - 100: Loại Xuất sắc
 * - 80 - dưới 90: Loại Tốt
 * - 65 - dưới 80: Loại Khá
 * - 50 - dưới 65: Loại Trung bình
 * - 35 - dưới 50: Loại Yếu
 * - Dưới 35: Loại Kém
 */
export function getTrainingClassification(score: number): 'Xuất sắc' | 'Tốt' | 'Khá' | 'Trung bình' | 'Yếu' | 'Kém' {
  const s = Math.round(Number(score || 0));
  if (s >= 90) return 'Xuất sắc';
  if (s >= 80) return 'Tốt';
  if (s >= 65) return 'Khá';
  if (s >= 50) return 'Trung bình';
  if (s >= 35) return 'Yếu';
  return 'Kém';
}
export function calculateSemesterSummary(grades: Diem[], hocKy: string, namHoc: string): SemesterGpaSummary {
  const semesterGrades = grades.filter(
    (g) => g.hocKy?.trim().toLowerCase() === hocKy.trim().toLowerCase() &&
           g.namHoc?.trim() === namHoc.trim()
  );
  let totalCredits = 0;
  let earnedCredits = 0;
  let totalWeighted10 = 0;
  let totalWeighted4 = 0;
  let passedCount = 0;
  let failedCount = 0;
  semesterGrades.forEach((g) => {
    const credits = g.soTinChi && g.soTinChi > 0 ? g.soTinChi : 3;
    totalCredits += credits;
    totalWeighted10 += (g.diemTongKet10 || 0) * credits;
    totalWeighted4 += (g.diemThang4 || 0) * credits;
    if (g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0) {
      earnedCredits += credits;
      passedCount++;
    } else {
      failedCount++;
    }
  });
  const gpa10 = totalCredits > 0 ? Math.round((totalWeighted10 / totalCredits) * 100) / 100 : 0;
  const gpa4 = totalCredits > 0 ? Math.round((totalWeighted4 / totalCredits) * 100) / 100 : 0;
  return {
    hocKy,
    namHoc,
    tongTinChiDangKy: totalCredits,
    tongTinChiTichLuy: earnedCredits,
    diemTBHocKyThang10: gpa10,
    diemTBHocKyThang4: gpa4,
    xepLoaiHocKy: getAcademicClassification(gpa4, totalCredits),
    soMonHoc: semesterGrades.length,
    soMonDat: passedCount,
    soMonKhongDat: failedCount,
    danhSachDiem: semesterGrades,
  };
}
export function calculateYearSummary(grades: Diem[], namHoc: string): YearGpaSummary {
  const yearGrades = grades.filter((g) => g.namHoc?.trim() === namHoc.trim());
  const semesters = Array.from(new Set(yearGrades.map((g) => g.hocKy).filter(Boolean))).sort();
  const hocKySummaries = semesters.map((hk) => calculateSemesterSummary(yearGrades, hk, namHoc));
  let totalCredits = 0;
  let earnedCredits = 0;
  let totalWeighted10 = 0;
  let totalWeighted4 = 0;
  yearGrades.forEach((g) => {
    const credits = g.soTinChi && g.soTinChi > 0 ? g.soTinChi : 3;
    totalCredits += credits;
    totalWeighted10 += (g.diemTongKet10 || 0) * credits;
    totalWeighted4 += (g.diemThang4 || 0) * credits;
    if (g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0) {
      earnedCredits += credits;
    }
  });
  const gpa10 = totalCredits > 0 ? Math.round((totalWeighted10 / totalCredits) * 100) / 100 : 0;
  const gpa4 = totalCredits > 0 ? Math.round((totalWeighted4 / totalCredits) * 100) / 100 : 0;
  return {
    namHoc,
    tongTinChiDangKy: totalCredits,
    tongTinChiTichLuy: earnedCredits,
    diemTBNamHocThang10: gpa10,
    diemTBNamHocThang4: gpa4,
    xepLoaiNamHoc: getAcademicClassification(gpa4, totalCredits),
    soMonHoc: yearGrades.length,
    hocKySummaries,
  };
}
export function calculateCumulativeSummary(
  grades: Diem[],
  studentInfo?: { maSV: string; hoTen: string; lop: string }
): GpaSummary {
  let totalEarnedCredits = 0;
  let totalCredits = 0;
  let totalWeighted10 = 0;
  let totalWeighted4 = 0;
  let failedCount = 0;
  grades.forEach((g) => {
    const credits = g.soTinChi && g.soTinChi > 0 ? g.soTinChi : 3;
    totalCredits += credits;
    totalWeighted10 += (g.diemTongKet10 || 0) * credits;
    totalWeighted4 += (g.diemThang4 || 0) * credits;
    if (g.trangThai === 'PASSED' || (g.diemTongKet10 || 0) >= 4.0) {
      totalEarnedCredits += credits;
    } else {
      failedCount++;
    }
  });
  const gpa10 = totalCredits > 0 ? Math.round((totalWeighted10 / totalCredits) * 100) / 100 : 0;
  const gpa4 = totalCredits > 0 ? Math.round((totalWeighted4 / totalCredits) * 100) / 100 : 0;
  return {
    maSV: studentInfo?.maSV || grades[0]?.maSV || '',
    hoTen: studentInfo?.hoTen || grades[0]?.hoTenSV || 'Sinh viên',
    lop: studentInfo?.lop || '',
    tongTinChiTichLuy: totalEarnedCredits,
    diemTBTichLuyThang10: gpa10,
    diemTBTichLuyThang4: gpa4,
    xepLoaiHocLuc: getAcademicClassification(gpa4, totalCredits),
    soMonNoTinChi: failedCount,
  };
}
export function exportTranscriptExcel(
  grades: Diem[],
  student: SinhVien | null | undefined,
  title: string,
  fileName: string
) {
  const studentMaSV = student?.maSV || grades[0]?.maSV || 'N/A';
  const studentHoTen = student?.hoTen || grades[0]?.hoTenSV || 'N/A';
  const studentLop = student?.lop || 'N/A';
  const studentKhoa = student?.khoa || 'N/A';
  const rows = grades.map((g, index) => ({
    'STT': index + 1,
    'Mã Môn': g.maMH,
    'Tên Môn Học': g.tenMH || '',
    'Số Tín Chỉ': g.soTinChi || 3,
    'Học Kỳ': g.hocKy,
    'Năm Học': g.namHoc,
    'Điểm Chuyên Cần (10%)': g.diemChuyenCan,
    'Điểm Giữa Kỳ (30%)': g.diemGiuaKy,
    'Điểm Cuối Kỳ (60%)': g.diemCuoiKy,
    'Điểm Hệ 10': g.diemTongKet10,
    'Điểm Hệ 4': g.diemThang4,
    'Điểm Chữ': g.diemChu,
    'Kết Quả': g.trangThai === 'PASSED' ? 'Đạt' : 'Không đạt',
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BangDiem');
  XLSX.writeFile(workbook, `${fileName}_${studentMaSV}_${Date.now()}.xlsx`);
}

