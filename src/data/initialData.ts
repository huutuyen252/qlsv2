import { User, SinhVien, MonHoc, Diem, RenLuyen, ThoiKhoaBieu, ThiLaiHocLai, NamHoc, HocKy, Lop } from '../types';
export const INITIAL_NAM_HOC: NamHoc[] = [];
export const INITIAL_HOC_KY: HocKy[] = [];
export const INITIAL_LOP: Lop[] = [];
export const INITIAL_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    fullName: 'Dương Hữu Tuyến',
    role: 'ADMIN',
    email: 'admin@tdnu.edu.vn',
    password: 'admin123',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    faculty: 'Phòng Đào tạo',
    status: 'ACTIVE',
    createdAt: '2025-08-15',
    permissions: {
      canManageUsers: true,
      canManageStudents: true,
      canEditGrades: true,
      canImportExcel: true,
      canEvaluateTraining: true,
      canApproveRetakes: true,
      canManageSchedule: true,
    },
  },
  {
    id: 'u-gv01',
    username: 'gv01',
    fullName: 'TS. Nguyễn Văn Hùng',
    role: 'LECTURER',
    email: 'hungnv@tdnu.edu.vn',
    password: 'gv123',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    faculty: 'Khoa Cơ khí',
    status: 'ACTIVE',
    createdAt: '2025-08-20',
    permissions: {
      canManageUsers: false,
      canManageStudents: true,
      canEditGrades: true,
      canImportExcel: true,
      canEvaluateTraining: true,
      canApproveRetakes: true,
      canManageSchedule: true,
    },
  },
  {
    id: 'u-gv02',
    username: 'gv02',
    fullName: 'ThS. Lê Thị Mai',
    role: 'LECTURER',
    email: 'mailt@tdnu.edu.vn',
    password: '123456',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    faculty: 'Khoa Ô tô',
    status: 'ACTIVE',
    createdAt: '2025-08-20',
    permissions: {
      canManageUsers: false,
      canManageStudents: false,
      canEditGrades: true,
      canImportExcel: true,
      canEvaluateTraining: true,
      canApproveRetakes: false,
      canManageSchedule: true,
    },
  },
];
export const INITIAL_SINH_VIEN: SinhVien[] = [];
export const INITIAL_MON_HOC: MonHoc[] = [];
export const INITIAL_DIEM: Diem[] = [];
export const INITIAL_REN_LUYEN: RenLuyen[] = [];
export const INITIAL_THOI_KHOA_BIEU: ThoiKhoaBieu[] = [];
export const INITIAL_THI_LAI_HOC_LAI: ThiLaiHocLai[] = [];

