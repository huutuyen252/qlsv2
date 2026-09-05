import React from 'react';
import { User, SinhVien, Diem, ThoiKhoaBieu, ThiLaiHocLai, MonHoc } from '../../types';
import {
  Users,
  GraduationCap,
  Award,
  Calendar,
  RotateCcw,
  BookOpen,
  Database,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  HardDrive,
  CheckCircle2,
  Server,
  Layers,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';

interface AdminOverviewModuleProps {
  users: User[];
  students: SinhVien[];
  grades: Diem[];
  schedule: ThoiKhoaBieu[];
  retakes: ThiLaiHocLai[];
  subjects: MonHoc[];
  activeSemester: string;
  onNavigateTab: (tabId: string) => void;
}

export const AdminOverviewModule: React.FC<AdminOverviewModuleProps> = ({
  users,
  students,
  grades,
  schedule,
  retakes,
  subjects,
  activeSemester,
  onNavigateTab,
}) => {
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const teacherCount = users.filter((u) => u.role === 'LECTURER' || (u.role as string) === 'TEACHER').length;
  const studentUserCount = users.filter((u) => u.role === 'STUDENT').length;
  const passedGrades = grades.filter((g) => g.trangThai === 'PASSED' || (g.diemTongKet10 && g.diemTongKet10 >= 4)).length;
  const passRate = grades.length > 0 ? ((passedGrades / grades.length) * 100).toFixed(1) : '100';

  const stats = [
    {
      title: 'Tài khoản người dùng',
      value: users.length,
      subValue: `${adminCount} Admin • ${teacherCount} Giảng viên • ${studentUserCount} SV`,
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      tab: 'admin-users',
    },
    {
      title: 'Tổng số sinh viên',
      value: students.length,
      subValue: `${new Set(students.map((s) => s.lop).filter(Boolean)).size} Lớp học hành chính`,
      icon: GraduationCap,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      tab: 'admin-import',
    },
    {
      title: 'Môn học & Học phần',
      value: subjects.length,
      subValue: `${schedule.length} Lớp học phần TKB`,
      icon: BookOpen,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      tab: 'admin-import',
    },
    {
      title: 'Bản ghi điểm số',
      value: grades.length,
      subValue: `Tỷ lệ đạt: ${passRate}% (${passedGrades}/${grades.length})`,
      icon: Award,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      tab: 'admin-import',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Máy chủ Trực tuyến
            </span>
            <span className="text-xs text-slate-400">Học kỳ hiện hành: <strong className="text-white font-mono">{activeSemester}</strong></span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Bảng Điều Khiển Quản Trị Hệ Thống (Admin Console)
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Giám sát tài khoản, phân quyền Role-Based Access Control (RBAC), import dữ liệu quy mô lớn và sao lưu an toàn cơ sở dữ liệu PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('admin-import')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Wizard</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('admin-backup')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-4 h-4" />
            <span>Sao Lưu CSDL</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              onClick={() => onNavigateTab(stat.tab)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-xl border ${stat.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {stat.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                <span>{stat.subValue}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
              </div>
            </div>
          );
        })}
      </div>

      {/* System Health & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Phân hệ Quản trị Tác vụ Nhanh</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div
              onClick={() => onNavigateTab('admin-users')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Quản lý Người dùng & RBAC
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Thêm tài khoản, đổi mật khẩu, cấp quyền Giáo vụ/Giảng viên/Sinh viên.
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('admin-import')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Import Dữ Liệu Excel Wizard
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Quy trình 5 bước: Upload, Preview, Map cột, Validate và Commit.
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('admin-backup')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Sao lưu & Phục hồi CSDL
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tải về file snapshot toàn bộ CSDL hoặc khôi phục dữ liệu an toàn.
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('admin-auditlogs')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Nhật ký Hoạt động (Audit Logs)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Theo dõi lịch sử đăng nhập, xóa sửa dữ liệu & bảo mật hệ thống.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Server & Database Environment */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Hạ Tầng & Bảo Mật RBAC</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Cơ sở dữ liệu</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PostgreSQL
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Cơ chế Bảo Mật</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  RBAC + JWT Guard
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Đơn xin thi lại/học lại</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {retakes.length} Đơn
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Chế độ phân trang</span>
                <span className="font-mono text-emerald-600 font-bold">12-Col Grid Ready</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
            Phiên bản Admin Panel v2.5.0 • TDNU Student Management
          </div>
        </div>
      </div>
    </div>
  );
};
