import { MonHoc } from '../types';

/**
 * Kiểm tra xem một môn học có thuộc về lớp học / chuyên ngành được chọn hay không.
 * Đồng bộ theo 2 khoa chuyên ngành: Khoa Kỹ thuật cơ sở và Khoa Ô tô.
 */
export function isSubjectMatchingClass(subject: MonHoc, targetClass?: string): boolean {
  if (!targetClass || targetClass === 'ALL' || targetClass === 'Tất cả các lớp') {
    return true;
  }

  const target = targetClass.trim().toLowerCase();

  // Nhận diện 2 khoa chuyên ngành của lớp mục tiêu
  const isTargetKTCS =
    target.includes('kỹ thuật cơ sở') ||
    target.includes('ky thuat co so') ||
    target.includes('ktcs') ||
    target.includes('cơ sở') ||
    target.includes('co so');
  const isTargetOTo =
    target.includes('ô tô') || target.includes('o to') || target.includes('oto');

  // 1. Kiểm tra trường `lop` cụ thể của môn học
  if (subject.lop && subject.lop.trim() && subject.lop !== 'ALL') {
    const subLop = subject.lop.trim().toLowerCase();

    // Khớp chính xác hoặc chuỗi con
    if (subLop === target || target.includes(subLop) || subLop.includes(target)) {
      return true;
    }

    const isSubKTCS =
      subLop.includes('kỹ thuật cơ sở') ||
      subLop.includes('ky thuat co so') ||
      subLop.includes('ktcs') ||
      subLop.includes('cơ sở') ||
      subLop.includes('co so');
    const isSubOTo =
      subLop.includes('ô tô') || subLop.includes('o to') || subLop.includes('oto');

    if (isTargetKTCS && isSubOTo) return false;
    if (isTargetOTo && isSubKTCS) return false;

    return false;
  }

  // 2. Kiểm tra Khoa / Bộ môn phụ trách môn học (`khoaPhuTrach` hoặc `khoa`)
  const subKhoa = (subject.khoaPhuTrach || subject.khoa || '').trim().toLowerCase();
  if (subKhoa) {
    const isSubKhoaKTCS =
      subKhoa.includes('kỹ thuật cơ sở') ||
      subKhoa.includes('ky thuat co so') ||
      subKhoa.includes('ktcs');
    const isSubKhoaOTo =
      subKhoa.includes('ô tô') || subKhoa.includes('o to') || subKhoa.includes('oto');

    // Nếu là môn chuyên ngành của Khoa khác thì không hiện
    if (isTargetKTCS && isSubKhoaOTo && !isSubKhoaKTCS) return false;
    if (isTargetOTo && isSubKhoaKTCS && !isSubKhoaOTo) return false;
  }

  // Các môn học đại cương chung hoặc không quy định lớp áp dụng chung
  return true;
}
