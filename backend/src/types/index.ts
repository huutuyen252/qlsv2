// Type definitions for QLSV system

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'teacher' | 'student' | 'staff';
  email: string;
  password?: string;
  avatar?: string;
  studentCode?: string;
  faculty?: string;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  permissions?: Record<string, boolean>;
  createdAt?: string;
}

export interface SinhVien {
  maSV: string;
  hoTen: string;
  avatar?: string;
  ngaySinh: string;
  gioiTinh: string;
  lop: string;
  khoa: string;
  soDienThoai: string;
  email: string;
  diaChi: string;
  hoSoFile?: string;
  hoSoFileName?: string;
  hoSoFiles?: any;
  ngayNhapHoc: string;
  trangThai: string;
}

export interface MonHoc {
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
  trangThai: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    status: number;
  };
}
