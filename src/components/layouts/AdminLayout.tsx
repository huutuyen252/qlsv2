import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { ADMIN_MENU_ITEMS } from '../../config/menu.config';
import { Breadcrumb } from '../common/Breadcrumb';
import { useTheme } from '../../context/ThemeContext';
import {
  ShieldAlert,
  ArrowLeft,
  LogOut,
  ChevronRight,
  ShieldCheck,
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
        {/* Admin Header (Unified 52px Topbar matching AppShell) */}
        <header className="h-[52px] bg-slate-900 text-white flex items-center justify-between px-4 lg:px-6 border-b border-slate-800 shrink-0 sticky top-0 z-40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-500/40 bg-blue-600/20 text-blue-400 text-[11px] font-bold tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              <span>ADMIN CONSOLE</span>
            </div>
            <button
              type="button"
              onClick={onExitAdminConsole}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về Cổng Thông Tin</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="btn-admin-theme-toggle"
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer border border-transparent hover:border-slate-700"
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
              <span className="text-xs font-semibold text-white leading-tight">
                {currentUser?.fullName || 'Quản Trị Viên'}
              </span>
              <span className="text-[10px] text-blue-400 font-mono uppercase">
                QUẢN TRỊ VIÊN
              </span>
            </div>
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={currentUser?.fullName || 'Avatar'}
              className="w-7 h-7 rounded object-cover border border-slate-700"
            />
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Đăng xuất"
              aria-label="Đăng xuất tài khoản"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Workspace Body */}
        <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden min-h-0">
          {/* Admin Sidebar */}
          <aside className="w-full md:w-60 bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 py-1 md:py-3 shrink-0 flex flex-col justify-between select-none z-20">
            <div>
              <div className="hidden md:block px-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quản trị hệ thống
              </div>
              <nav className="flex md:flex-col items-center md:items-stretch overflow-x-auto md:overflow-x-visible space-x-1 md:space-x-0 md:space-y-0.5 px-2 md:px-0 scrollbar-none" aria-label="Danh mục quản trị">
                {ADMIN_MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentAdminTab === item.id;
                  const itemHref = item.href || `/admin/${item.id.replace('admin-', '')}`;
                  return (
                    <a
                      key={item.id}
                      href={itemHref}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectAdminTab(item.id);
                      }}
                      className={`flex items-center justify-between px-3 py-1.5 md:px-4 md:py-2 text-xs font-medium transition-colors cursor-pointer no-underline select-none rounded md:rounded-none md:border-l-2 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'border border-blue-600/40 md:border-0 md:border-l-2 md:border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold'
                          : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {isActive && <ChevronRight className="hidden md:block w-3.5 h-3.5 shrink-0 opacity-80" />}
                    </a>
                  );
                })}
              </nav>
            </div>

            <div className="hidden md:block p-3 border-t border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-mono">
                Admin Console · TDNU
              </span>
            </div>
          </aside>

          {/* Admin Main View */}
          <main id="admin-main-content" tabIndex={-1} className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto min-w-0 outline-none">
            <Breadcrumb
              isAdmin
              items={[
                { label: 'Admin Console', onClick: () => onSelectAdminTab('admin-overview') },
                { label: currentTabObj.title, active: true },
              ]}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentAdminTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};
