import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { MAIN_MENU_ITEMS, MenuItem } from '../config/menu.config';
import { ShieldCheck, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  userRole?: UserRole;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  userRole = 'STUDENT',
  isCollapsed: propIsCollapsed,
  onToggleCollapse,
}) => {
  // Local state persistence for collapsed state
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('app_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    const next = !isCollapsed;
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(next);
    }
    try {
      localStorage.setItem('app_sidebar_collapsed', String(next));
    } catch {
      // ignore storage errors
    }
  };

  // Tự động lọc các mục menu dựa trên props.userRole và thuộc tính hiddenInMenu
  const visibleMenuItems = MAIN_MENU_ITEMS.filter((item: MenuItem) => {
    // 1. Kiểm tra vai trò người dùng có trong danh sách roles được phép hay không
    const isRoleAllowed = item.roles.some((r) => {
      if (r === 'TEACHER' && userRole === 'LECTURER') return true;
      if (r === 'LECTURER' && (userRole as string) === 'TEACHER') return true;
      return r === userRole;
    });

    if (!isRoleAllowed) return false;

    // 2. Nếu có cờ hiddenInMenu, ẩn đối với đối tượng không phải là Quản trị viên (ADMIN)
    if (item.hiddenInMenu && userRole !== 'ADMIN') {
      return false;
    }

    return true;
  });

  return (
    <aside
      id="app-sidebar"
      aria-label="Thanh điều hướng phân hệ đào tạo"
      className={`w-full ${
        isCollapsed ? 'md:w-20 p-3 lg:p-3.5' : 'md:w-64 p-4 lg:p-5'
      } bg-slate-900/95 text-white border-r border-slate-800/80 flex flex-col justify-between shrink-0 shadow-xl backdrop-blur-md transition-all duration-300 ease-in-out`}
    >
      <div className="space-y-6">
        <div>
          {/* Header row with h2 title and collapse/expand button */}
          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center px-1' : 'justify-between px-2.5'
            } mb-3.5 min-h-[32px]`}
          >
            {!isCollapsed && (
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate select-none">
                Phân Hệ Đào Tạo
              </h2>
            )}
            
            <button
              id="sidebar-toggle-btn"
              type="button"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              title={
                isCollapsed
                  ? 'Mở rộng thanh điều hướng (Phóng to thanh bên)'
                  : 'Thu gọn thanh điều hướng (Mở rộng không gian làm việc chính)'
              }
              className={`p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/90 active:scale-95 transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                isCollapsed ? 'bg-slate-800/70 text-blue-400 border-slate-700/50 hover:border-blue-500/40' : '-mr-1'
              }`}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-blue-400 hover:text-blue-300" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-300 hover:text-white" />
              )}
            </button>
          </div>

          <nav className="space-y-1.5" aria-label="Danh sách phân hệ">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  title={isCollapsed ? item.title : undefined}
                  className={`group w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
                  } rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/25 ring-1 ring-blue-400/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-700 group-hover:text-blue-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    {!isCollapsed && (
                      <div className="truncate">
                        <div className="text-xs leading-tight truncate font-semibold">
                          {item.title}
                        </div>
                        {item.description && (
                          <div
                            className={`text-[10px] truncate mt-0.5 ${
                              isActive ? 'text-blue-100 font-medium' : 'text-slate-400 group-hover:text-slate-300'
                            }`}
                          >
                            {item.description}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {!isCollapsed && isActive && (
                    <ChevronRight className="w-4 h-4 text-white/80 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="pt-4 mt-auto border-t border-slate-800/80">
        {isCollapsed ? (
          <div
            title="Cổng Dữ Liệu An Toàn - Xác thực RBAC"
            className="p-2 bg-slate-800/40 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center gap-1 cursor-default"
          >
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-slate-900 animate-pulse"></span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-800/40 rounded-2xl border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-500/20 animate-pulse"></div>
              <div>
                <p className="text-[11px] font-bold text-slate-200 leading-tight">
                  Cổng Dữ Liệu An Toàn
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Xác thực RBAC</span>
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>
    </aside>
  );
};


