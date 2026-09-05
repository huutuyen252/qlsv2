import React from 'react';
import { User, UserRole, SinhVien, Diem, ThoiKhoaBieu, ThiLaiHocLai, MonHoc } from '../../types';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { ADMIN_MENU_ITEMS } from '../../config/menu.config';
import { Breadcrumb } from '../common/Breadcrumb';
import { useTheme } from '../../context/ThemeContext';
import {
  ShieldAlert,
  ArrowLeft,
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Database,
  History,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Building2,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';

interface AdminLayoutProps {
  currentUser: User | null;
  currentAdminTab: string;
  onSelectAdminTab: (tabId: string) => void;
  onExitAdminConsole: () => void;
  onLogout: () => void;
  showToast: (msg: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  currentAdminTab,
  onSelectAdminTab,
  onExitAdminConsole,
  onLogout,
  showToast,
  children,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const currentTabObj = ADMIN_MENU_ITEMS.find((item) => item.id === currentAdminTab) || ADMIN_MENU_ITEMS[0];

  return (
    <ProtectedRoute
      currentUser={currentUser}
      allowedRoles={['ADMIN']}
      title="403 - Yêu cầu Quyền Quản Trị Viên Tối Cao"
      onGoHome={onExitAdminConsole}
    >
      <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
        {/* Admin Header (Full-Width Topbar) */}
        <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 lg:px-8 border-b border-slate-800 shrink-0 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-600/30 text-indigo-400 px-3 py-1 rounded-xl border border-indigo-500/30 text-xs font-black tracking-wide">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>ADMIN CONSOLE</span>
            </div>
            <button
              type="button"
              onClick={onExitAdminConsole}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-slate-700/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về Cổng Thông Tin</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-admin-theme-toggle"
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer border border-slate-700/60"
              title={`Chuyển chế độ ${isDark ? 'Sáng' : 'Tối'}`}
              aria-label="Chuyển chế độ giao diện"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-300" />
              )}
            </button>

            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-white leading-none">
                {currentUser?.fullName || 'Quản Trị Viên'}
              </span>
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase mt-0.5">
                SUPER ADMIN
              </span>
            </div>
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={currentUser?.fullName}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/50"
            />
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area with 12-Column Grid */}
        <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto">
          {/* Admin Sidebar */}
          <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Menu Quản Trị Hệ Thống
              </div>
              <nav className="space-y-1">
                {ADMIN_MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentAdminTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectAdminTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{item.title}</div>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-80" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Bảo mật RBAC 100%</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                  Các hành động tại đây có hiệu lực tức thì trên cơ sở dữ liệu toàn trường.
                </p>
              </div>
            </div>
          </aside>

          {/* Admin Main Body */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
            <Breadcrumb
              isAdmin
              items={[
                { label: 'Admin Console', onClick: () => onSelectAdminTab('admin-overview') },
                { label: currentTabObj.title, active: true },
              ]}
            />

            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentTabObj.title}
                </h1>
                {currentTabObj.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentTabObj.description}
                  </p>
                )}
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};
