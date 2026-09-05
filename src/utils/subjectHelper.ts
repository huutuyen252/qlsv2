import { MonHoc } from '../types';

/**
 * Kiểm tra xem một môn học có thuộc về lớp học / chuyên ngành được chọn hay không.
 * Giúp đồng bộ giữa Danh mục môn học và Thời khóa biểu khi lọc theo lớp.
 */
export function isSubjectMatchingClass(subject: MonHoc, targetClass?: string): boolean {
  if (!targetClass || targetClass === 'ALL' || targetClass === 'Tất cả các lớp') {
    return true;
  }

  const target = targetClass.trim().toLowerCase();

  // Nhận diện ngành / khoa của lớp mục tiêu
  const isTargetCoKhi = target.includes('cơ khí') || target.includes('co khi') || target.includes('ck');
  const isTargetOTo = target.includes('ô tô') || target.includes('o to') || target.includes('oto');
  const isTargetCNTT = target.includes('cntt') || target.includes('tin học') || target.includes('phần mềm') || target.includes('thông tin');
  const isTargetDien = target.includes('điện') || target.includes('dien') || target.includes('dđt') || target.includes('tự động');

  // 1. Kiểm tra trường `lop` cụ thể của môn học
  if (subject.lop && subject.lop.trim() && subject.lop !== 'ALL') {
    const subLop = subject.lop.trim().toLowerCase();

    // Khớp chính xác hoặc chuỗi con
    if (subLop === target || target.includes(subLop) || subLop.includes(target)) {
      return true;
    }

    const isSubCoKhi = subLop.includes('cơ khí') || subLop.includes('co khi') || subLop.includes('ck');
    const isSubOTo = subLop.includes('ô tô') || subLop.includes('o to') || subLop.includes('oto');
    const isSubCNTT = subLop.includes('cntt') || subLop.includes('tin học') || subLop.includes('phần mềm') || subLop.includes('thông tin');
    const isSubDien = subLop.includes('điện') || subLop.includes('dien') || subLop.includes('dđt') || subLop.includes('tự động');

    // Nếu môn học gắn cụ thể với lớp thuộc ngành khác thì loại bỏ
    if (isTargetCoKhi && isSubOTo) return false;
    if (isTargetCoKhi && isSubCNTT) return false;
    if (isTargetCoKhi && isSubDien) return false;

    if (isTargetOTo && isSubCoKhi) return false;
    if (isTargetOTo && isSubCNTT) return false;
    if (isTargetOTo && isSubDien) return false;

    if (isTargetCNTT && isSubCoKhi) return false;
    if (isTargetCNTT && isSubOTo) return false;
    if (isTargetCNTT && isSubDien) return false;

    if (isTargetDien && isSubCoKhi) return false;
    if (isTargetDien && isSubOTo) return false;
    if (isTargetDien && isSubCNTT) return false;

    return false;
  }

  // 2. Kiểm tra Khoa / Bộ môn phụ trách môn học (`khoaPhuTrach` hoặc `khoa`)
  const subKhoa = (subject.khoaPhuTrach || subject.khoa || '').trim().toLowerCase();
  if (subKhoa) {
    const isSubKhoaCoKhi = subKhoa.includes('cơ khí') || subKhoa.includes('co khi');
    const isSubKhoaOTo = subKhoa.includes('ô tô') || subKhoa.includes('o to') || subKhoa.includes('oto');
    const isSubKhoaCNTT = subKhoa.includes('cntt') || subKhoa.includes('tin học') || subKhoa.includes('thông tin');
    const isSubKhoaDien = subKhoa.includes('điện') || subKhoa.includes('dien');

    // Nếu là môn chuyên ngành của Khoa khác thì không hiện
    if (isTargetCoKhi && isSubKhoaOTo && !isSubKhoaCoKhi) return false;
    if (isTargetCoKhi && isSubKhoaCNTT && !isSubKhoaCoKhi) return false;
    if (isTargetCoKhi && isSubKhoaDien && !isSubKhoaCoKhi) return false;

    if (isTargetOTo && isSubKhoaCoKhi && !isSubKhoaOTo) return false;
    if (isTargetOTo && isSubKhoaCNTT && !isSubKhoaOTo) return false;
    if (isTargetOTo && isSubKhoaDien && !isSubKhoaOTo) return false;

    if (isTargetCNTT && isSubKhoaCoKhi && !isSubKhoaCNTT) return false;
    if (isTargetCNTT && isSubKhoaOTo && !isSubKhoaCNTT) return false;
    if (isTargetCNTT && isSubKhoaDien && !isSubKhoaCNTT) return false;

    if (isTargetDien && isSubKhoaCoKhi && !isSubKhoaDien) return false;
    if (isTargetDien && isSubKhoaOTo && !isSubKhoaDien) return false;
    if (isTargetDien && isSubKhoaCNTT && !isSubKhoaDien) return false;
  }

  // Các môn học đại cương chung (Triết, GDQP, Ngoại ngữ, Toán,...) hoặc không quy định lớp sẽ áp dụng chung
  return true;
}
