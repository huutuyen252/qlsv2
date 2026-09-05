export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT';

export interface UserPermission {
  canManageUsers?: boolean;
  canManageStudents?: boolean;
  canEditGrades?: boolean;
  canImportExcel?: boolean;
  canEvaluateTraining?: boolean;
  canApproveRetakes?: boolean;
  canManageSchedule?: boolean;
  canEditHoSo?: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email: string;
  password?: string;
  avatar?: string;
  studentCode?: string;
  faculty?: string;
  status?: 'ACTIVE' | 'LOCKED' | 'PENDING';
  permissions?: UserPermission;
  createdAt?: string;
}

export interface HoSoFile {
  id: string;
  fileName: string;
  customName: string;
  fileUrl: string;
  uploadedAt?: string;
}

export interface SinhVien {
  maSV: string;
  hoTen: string;
  avatar?: string;
  ngaySinh: string;
  gioiTinh: 'Nam' | 'Nữ';
  lop: string;
  khoa: string;
  soDienThoai: string;
  email: string;
  diaChi: string;
  hoSoFile?: string;
  hoSoFileName?: string;
  hoSoFiles?: HoSoFile[];
  ngayNhapHoc: string;
  trangThai: 'Đang học' | 'Bảo lưu' | 'Tốt nghiệp' | 'Đã thôi học' | 'Thôi học';
}

export interface MonHoc {
  id?: string;
  maMH: string;
  tenMH: string;
  soTinChi: number;
  khoaPhuTrach?: string;
  khoa?: string;
  loaiMon?: string;
  hocKy?: string;
  namHoc?: string;
  lop?: string;
  lePhiThiLai?: number;
  lePhiHocLai?: number;
}

export interface Diem {
  id: string;
  maSV: string;
  hoTenSV?: string;
  maMH: string;
  tenMH?: string;
  soTinChi?: number;
  hocKy: string;
  namHoc: string;
  diemChuyenCan: number;
  diemGiuaKy: number;
  diemCuoiKy: number;
  diemTongKet10: number;
  diemThang4: number;
  diemChu: string;
  trangThai: 'PASSED' | 'FAILED';
}

export interface RenLuyen {
  id: string;
  maSV: string;
  hoTenSV?: string;
  lop?: string;
  thang: number;
  nam: number;
  diemRL: number;
  xepLoai: 'Xuất sắc' | 'Tốt' | 'Tt' | 'Khá' | 'TBK' | 'TB' | 'Yếu' | 'Kém' | string;
  nhanXet: string;
  nguoiDanhGia: string;
  ngayDanhGia: string;
  diemMuc1?: number;
  diemMuc2?: number;
  diemMuc3?: number;
  hocKy?: string;
}

export interface LichHocChiTiet {
  thu: number;
  tietBatDau: number;
  soTiet: number;
  phong: string;
  coSo: string;
}

export interface HocKy {
  hocKyID: string;
  tenHocKy: string;
  namHocID: string;
  ngayBatDau?: string;
  ngayKetThuc?: string;
}

export interface NamHoc {
  namHocID: string;
  tenNamHoc: string;
}

export interface Lop {
  lopID: string;
  tenLop: string;
  khoa: string;
  namNhapHoc: number;
}

export interface ThongBaoKiemTra {
  id: string;
  maMH: string;
  tenMH?: string;
  loai: '15_PHUT' | 'GIUA_KY' | 'CUOI_KY' | 'THONG_BAO';
  tieuDe: string;
  noiDung: string;
  ngayKiemTra?: string;
  tuanKiemTra?: number;
  thuKiemTra?: number;
  giangVienTao?: string;
  createdAt?: string;
  hocKy?: string;
  namHoc?: string;
  lop?: string;
}

export interface DiemDanh {
  id: string;
  maSV: string;
  hoTenSV?: string;
  maMH: string;
  tenMH?: string;
  lop?: string;
  ngay: string;
  soTietNghi: number;
  coPhep: boolean;
  ghiChu?: string;
  nguoiDiemDanh?: string;
  createdAt?: string;
}

export interface ThoiKhoaBieu {
  id: string;
  tkbID?: string;
  maSV: string;
  lop?: string;
  lopID?: string;
  hocKy: string;
  hocKyID?: string;
  namHoc: string;
  namHocID?: string;
  tuanTu?: number;
  tuanDen?: number;
  tuan?: number;
  ngayHoc?: string;
  tietHoc?: string;
  thu?: number;
  tietBatDau?: number;
  soTiet?: number;
  danhSachTuan?: number[];
  maMH: string;
  tenMH: string;
  soTinChi: number;
  giangVien: string;
  phongHoc: string;
  lichHoc: LichHocChiTiet[];
  thongBaoKiemTra?: ThongBaoKiemTra[];
}

export interface ThiLaiHocLai {
  id: string;
  maSV: string;
  hoTenSV?: string;
  maMH: string;
  tenMH: string;
  soTinChi: number;
  loaiDangKy: 'THI_LAI' | 'HOC_LAI';
  lanThi: number;
  hocKy: string;
  namHoc: string;
  phiDiem: number;
  trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'DANG_HOC' | 'HOAN_THANH' | 'TU_CHOI';
  ketQua?: 'DAT' | 'CHUA_DAT' | 'CHUA_CO_DIEM';
  ngayDangKy: string;
}

export interface GpaSummary {
  maSV: string;
  hoTen: string;
  lop: string;
  tongTinChiTichLuy: number;
  diemTBTichLuyThang10: number;
  diemTBTichLuyThang4: number;
  xepLoaiHocLuc: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' | 'Chưa có điểm';
  soMonNoTinChi: number;
}

export interface SemesterGpaSummary {
  hocKy: string;
  namHoc: string;
  tongTinChiDangKy: number;
  tongTinChiTichLuy: number;
  diemTBHocKyThang10: number;
  diemTBHocKyThang4: number;
  xepLoaiHocKy: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' | 'Chưa có điểm';
  soMonHoc: number;
  soMonDat: number;
  soMonKhongDat: number;
  danhSachDiem: Diem[];
}

export interface YearGpaSummary {
  namHoc: string;
  tongTinChiDangKy: number;
  tongTinChiTichLuy: number;
  diemTBNamHocThang10: number;
  diemTBNamHocThang4: number;
  xepLoaiNamHoc: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' | 'Chưa có điểm';
  soMonHoc: number;
  hocKySummaries: SemesterGpaSummary[];
}

export interface NghiLe {
  id: string;
  dipLe: string;
  tuNgay: string; // YYYY-MM-DD
  denNgay: string; // YYYY-MM-DD
  ghiChu?: string;
  lop?: string;
  hocKy?: string;
  namHoc?: string;
  createdAt?: string;
}

