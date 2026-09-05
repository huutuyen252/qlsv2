import { pgTable, text, integer, doublePrecision, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull(),
  email: text('email').notNull(),
  password: text('password'),
  avatar: text('avatar'),
  studentCode: text('student_code'),
  faculty: text('faculty'),
  status: text('status').default('ACTIVE'),
  permissions: jsonb('permissions'),
  createdAt: text('created_at'),
});

export const sinhVien = pgTable('sinh_vien', {
  maSV: text('ma_sv').primaryKey(),
  hoTen: text('ho_ten').notNull(),
  avatar: text('avatar'),
  ngaySinh: text('ngay_sinh').notNull(),
  gioiTinh: text('gioi_tinh').notNull(),
  lop: text('lop').notNull(),
  khoa: text('khoa').notNull(),
  soDienThoai: text('so_dien_thoai').notNull(),
  email: text('email').notNull(),
  diaChi: text('dia_chi').notNull(),
  hoSoFile: text('ho_so_file'),
  hoSoFileName: text('ho_so_file_name'),
  hoSoFiles: jsonb('ho_so_files'),
  ngayNhapHoc: text('ngay_nhap_hoc').notNull(),
  trangThai: text('trang_thai').notNull().default('Đang học'),
});

export const monHoc = pgTable('mon_hoc', {
  maMH: text('ma_mh').primaryKey(),
  tenMH: text('ten_mh').notNull(),
  soTinChi: integer('so_tin_chi').notNull(),
  khoaPhuTrach: text('khoa_phu_trach'),
  khoa: text('khoa'),
  loaiMon: text('loai_mon'),
  hocKy: text('hoc_ky'),
  namHoc: text('nam_hoc'),
  lop: text('lop'),
  lePhiThiLai: integer('le_phi_thi_lai'),
  lePhiHocLai: integer('le_phi_hoc_lai'),
});

export const diem = pgTable('diem', {
  id: text('id').primaryKey(),
  maSV: text('ma_sv').notNull(),
  hoTenSV: text('ho_ten_sv'),
  maMH: text('ma_mh').notNull(),
  tenMH: text('ten_mh'),
  soTinChi: integer('so_tin_chi'),
  hocKy: text('hoc_ky').notNull(),
  namHoc: text('nam_hoc').notNull(),
  diemChuyenCan: doublePrecision('diem_chuyen_can').notNull().default(0),
  diemGiuaKy: doublePrecision('diem_giua_ky').notNull().default(0),
  diemCuoiKy: doublePrecision('diem_cuoi_ky').notNull().default(0),
  diemTongKet10: doublePrecision('diem_tong_ket_10').notNull().default(0),
  diemThang4: doublePrecision('diem_thang_4').notNull().default(0),
  diemChu: text('diem_chu').notNull().default('F'),
  trangThai: text('trang_thai').notNull().default('FAILED'),
});

export const renLuyen = pgTable('ren_luyen', {
  id: text('id').primaryKey(),
  maSV: text('ma_sv').notNull(),
  hoTenSV: text('ho_ten_sv'),
  lop: text('lop'),
  thang: integer('thang').notNull(),
  nam: integer('nam').notNull(),
  diemRL: integer('diem_rl').notNull().default(0),
  xepLoai: text('xep_loai').notNull(),
  nhanXet: text('nhan_xet'),
  nguoiDanhGia: text('nguoi_danh_gia'),
  ngayDanhGia: text('ngay_danh_gia'),
  diemMuc1: integer('diem_muc_1'),
  diemMuc2: integer('diem_muc_2'),
  diemMuc3: integer('diem_muc_3'),
  hocKy: text('hoc_ky'),
});

export const thoiKhoaBieu = pgTable('thoi_khoa_bieu', {
  id: text('id').primaryKey(),
  tkbID: text('tkb_id'),
  maSV: text('ma_sv').notNull(),
  lop: text('lop'),
  lopID: text('lop_id'),
  hocKy: text('hoc_ky').notNull(),
  hocKyID: text('hoc_ky_id'),
  namHoc: text('nam_hoc').notNull(),
  namHocID: text('nam_hoc_id'),
  tuanTu: integer('tuan_tu').default(1),
  tuanDen: integer('tuan_den').default(15),
  tuan: integer('tuan').default(1),
  danhSachTuan: jsonb('danh_sach_tuan'),
  maMH: text('ma_mh').notNull(),
  tenMH: text('ten_mh').notNull(),
  soTinChi: integer('so_tin_chi').notNull().default(0),
  giangVien: text('giang_vien'),
  phongHoc: text('phong_hoc'),
  lichHoc: jsonb('lich_hoc').notNull(),
  thongBaoKiemTra: jsonb('thong_bao_kiem_tra'),
});

export const thiLaiHocLai = pgTable('thi_lai_hoc_lai', {
  id: text('id').primaryKey(),
  maSV: text('ma_sv').notNull(),
  hoTenSV: text('ho_ten_sv'),
  maMH: text('ma_mh').notNull(),
  tenMH: text('ten_mh').notNull(),
  soTinChi: integer('so_tin_chi').notNull(),
  loaiDangKy: text('loai_dang_ky').notNull(),
  lanThi: integer('lan_thi').notNull().default(1),
  hocKy: text('hoc_ky').notNull(),
  namHoc: text('nam_hoc').notNull(),
  phiDiem: integer('phi_diem').notNull().default(0),
  trangThai: text('trang_thai').notNull().default('CHO_DUYET'),
  ketQua: text('ket_qua').default('CHUA_CO_DIEM'),
  ngayDangKy: text('ngay_dang_ky').notNull(),
});

export const namHoc = pgTable('nam_hoc', {
  namHocID: text('nam_hoc_id').primaryKey(),
  tenNamHoc: text('ten_nam_hoc').notNull(),
});

export const hocKy = pgTable('hoc_ky', {
  hocKyID: text('hoc_ky_id').primaryKey(),
  tenHocKy: text('ten_hoc_ky').notNull(),
  namHocID: text('nam_hoc_id').notNull(),
  ngayBatDau: text('ngay_bat_dau'),
  ngayKetThuc: text('ngay_ket_thuc'),
});

export const lop = pgTable('lop', {
  lopID: text('lop_id').primaryKey(),
  tenLop: text('ten_lop').notNull(),
  khoa: text('khoa').notNull(),
  namNhapHoc: integer('nam_nhap_hoc').notNull(),
});

export const diemDanh = pgTable('diem_danh', {
  id: text('id').primaryKey(),
  maSV: text('ma_sv').notNull(),
  hoTenSV: text('ho_ten_sv'),
  maMH: text('ma_mh').notNull(),
  tenMH: text('ten_mh'),
  lop: text('lop'),
  ngay: text('ngay').notNull(),
  soTietNghi: integer('so_tiet_nghi').notNull().default(0),
  coPhep: boolean('co_phep').notNull().default(false),
  ghiChu: text('ghi_chu'),
  nguoiDiemDanh: text('nguoi_diem_danh'),
  createdAt: text('created_at'),
});

export const thongBaoKiemTra = pgTable('thong_bao_kiem_tra', {
  id: text('id').primaryKey(),
  maMH: text('ma_mh').notNull(),
  tenMH: text('ten_mh'),
  loai: text('loai').notNull(),
  tieuDe: text('tieu_de').notNull(),
  noiDung: text('noi_dung').notNull(),
  ngayKiemTra: text('ngay_kiem_tra'),
  tuanKiemTra: integer('tuan_kiem_tra'),
  giangVienTao: text('giang_vien_tao'),
  createdAt: text('created_at'),
});

export const nghiLe = pgTable('nghi_le', {
  id: text('id').primaryKey(),
  dipLe: text('dip_le').notNull(),
  tuNgay: text('tu_ngay').notNull(),
  denNgay: text('den_ngay').notNull(),
  ghiChu: text('ghi_chu'),
  lop: text('lop'),
  hocKy: text('hoc_ky'),
  namHoc: text('nam_hoc'),
  createdAt: text('created_at'),
});

