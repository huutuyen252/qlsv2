import React from 'react';
import { User, SinhVien, Diem, ThoiKhoaBieu, ThiLaiHocLai, MonHoc } from '../../types';
import {
  Users,
  GraduationCap,
  Award,
  BookOpen,
  Database,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Server,
  FileSpreadsheet,
  Settings,
  Sliders
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
      subValue: `${adminCount} Quản trị · ${teacherCount} Giảng viên · ${studentUserCount} SV`,
      icon: Users,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      tab: 'admin-users',
    },
    {
      title: 'Tổng số sinh viên',
      value: students.length,
      subValue: `${new Set(students.map((s) => s.lop).filter(Boolean)).size} Lớp học hành chính`,
      icon: GraduationCap,
      color: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
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
      {/* Top Banner Status (Zero-Pill, Zero-Slop) */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-6 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-400">
              Học kỳ hiện hành:{' '}
              <strong className="text-slate-100 font-mono">{activeSemester}</strong>
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
            Bảng Điều Khiển Quản Trị Hệ Thống (Admin Console)
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('admin-import')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Dữ Liệu</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('admin-backup')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Cấu Hình & Sao Lưu</span>
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 shadow-xs hover:border-blue-500/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {stat.title}
                </span>
                <div className={`p-1.5 rounded border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                {stat.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                <span>{stat.subValue}</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* System Health & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3.5 flex items-center gap-2 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Phân Hệ Quản Trị Tác Vụ Nhanh</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onNavigateTab('admin-users')}
              className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-500/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Quản lý Người dùng & RBAC
                  </h4>
                </div>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('admin-import')}
              className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-500/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Import Dữ Liệu Excel Wizard
                  </h4>
                </div>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('admin-backup')}
              className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-500/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Cấu hình & Sao lưu Hệ thống
                  </h4>
                </div>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('admin-auditlogs')}
              className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-amber-500/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Nhật ký Hoạt động (Audit Logs)
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Server & Database Environment */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3.5 flex items-center gap-2 uppercase tracking-wider">
              <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Hạ Tầng & Bảo Mật RBAC</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Cơ sở dữ liệu</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PostgreSQL
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Cơ chế Bảo Mật</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                  RBAC + JWT Guard
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Đơn xin thi lại / học lại</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {retakes.length} Đơn
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Tiêu chuẩn UI/UX</span>
                <span className="font-mono text-emerald-600 font-bold">Zero-Pill Enterprise</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center font-mono">
            Admin Console v2.5.0 · TDNU Student Management
          </div>
        </div>
      </div>
    </div>
  );
};
