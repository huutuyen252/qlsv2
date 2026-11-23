import {
  LayoutDashboard,
  User,
  Calendar,
  Award,
  Users,
  Layers,
  BookOpen,
  UploadCloud,
  Shield,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  Database,
  History,
  ShieldCheck,
  LucideIcon
} from 'lucide-react';
import { UserRole } from '../types';

export interface MenuItem {
  id: string;
  title: string;
  description?: string;
  href?: string;
  icon: LucideIcon;
  roles: (UserRole | 'TEACHER')[];
  hiddenInMenu?: boolean; // Nếu true: ẩn khỏi Sidebar thông thường, truy cập qua Avatar Dropdown hoặc URL
  badge?: string;
}

// Menu chính cho Portal người dùng thông thường
export const MAIN_MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Tổng quan & Báo cáo',
    description: 'Thống kê kết quả đào tạo',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'LECTURER', 'TEACHER', 'STUDENT'],
    href: '/dashboard',
  },
  {
    id: 'students',
    title: 'Hồ sơ & Sinh viên',
    description: 'Danh sách, bộ lọc & hồ sơ mở rộng',
    icon: Users,
    roles: ['ADMIN', 'LECTURER', 'TEACHER', 'STUDENT'],
    href: '/students',
  },
  {
    id: 'subjects',
    title: 'Môn học & Học phần',
    description: 'Danh mục môn học & tín chỉ',
    icon: BookOpen,
    roles: ['ADMIN', 'LECTURER', 'TEACHER', 'STUDENT'],
    href: '/subjects',
  },
  {
    id: 'schedule',
    title: 'Thời khóa biểu',
    description: 'Lịch học tuần & phòng học',
    icon: Calendar,
    roles: ['ADMIN', 'LECTURER', 'TEACHER', 'STUDENT'],
    href: '/schedule',
  },
  {
    id: 'grades',
    title: 'Bảng điểm & GPA',
    description: 'Kết quả học tập & rèn luyện',
    icon: Award,
    roles: ['ADMIN', 'LECTURER', 'TEACHER', 'STUDENT'],
    href: '/grades',
  },
  {
    id: 'retakes',
    title: 'Thi lại / Học lại',
    description: 'Đăng ký & xét duyệt thi lại',
    icon: RotateCcw,
    roles: ['ADMIN', 'LECTURER', 'TEACHER', 'STUDENT'],
    href: '/retakes',
  },
  {
    id: 'training',
    title: 'Điểm Rèn luyện',
    description: 'Đánh giá & Nhận xét tháng',
    icon: Sparkles,
    roles: ['ADMIN', 'LECTURER', 'TEACHER', 'STUDENT'],
    href: '/training',
  },
  // ADMIN CONSOLE: Được phân quyền cho ADMIN nhưng ẩn khỏi menu chính thông thường
  {
    id: 'admin',
    title: 'Admin Console',
    description: 'Bảng điều khiển quản trị tối cao',
    icon: Shield,
    roles: ['ADMIN'],
    hiddenInMenu: true,
    href: '/admin',
  },
];

// Menu riêng chỉ hiển thị trong Admin Console Full-Width Layout
export const ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    id: 'admin-overview',
    title: 'Tổng quan hệ thống',
    description: 'Số liệu & Chỉ số hoạt động',
    icon: LayoutDashboard,
    roles: ['ADMIN'],
    href: '/admin/overview',
  },
  {
    id: 'admin-users',
    title: 'Quản lý Người dùng & Phân quyền',
    description: 'Phân cấp tài khoản & Phân quyền RBAC',
    icon: ShieldCheck,
    roles: ['ADMIN'],
    href: '/admin/users',
  },
  {
    id: 'admin-catalogs',
    title: 'Quản lý Danh mục chuẩn',
    description: 'Hành chính 2 cấp, Dân tộc, Tôn giáo',
    icon: Layers,
    roles: ['ADMIN'],
    href: '/admin/catalogs',
  },
  {
    id: 'admin-import',
    title: 'Import Dữ liệu Excel Wizard',
    description: 'Upload, xem trước & mapping cột',
    icon: FileSpreadsheet,
    roles: ['ADMIN'],
    href: '/admin/import',
  },
  {
    id: 'admin-backup',
    title: 'Cấu hình & Sao lưu Hệ thống',
    description: 'Cấu hình tham số, quy chế đào tạo & sao lưu CSDL',
    icon: Database,
    roles: ['ADMIN'],
    href: '/admin/backup',
  },
  {
    id: 'admin-auditlogs',
    title: 'Nhật ký Audit Logs',
    description: 'Lịch sử thao tác & giám sát hệ thống',
    icon: History,
    roles: ['ADMIN'],
    href: '/admin/audit-logs',
  },
];
