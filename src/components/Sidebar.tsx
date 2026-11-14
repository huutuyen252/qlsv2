import React, { useState } from 'react';
import { UserRole } from '../types';
import { MAIN_MENU_ITEMS, MenuItem } from '../config/menu.config';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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
      // ignore
    }
  };

  // Group menu items by academic categories
  const visibleMenuItems = MAIN_MENU_ITEMS.filter((item: MenuItem) => {
    const isRoleAllowed = item.roles.some((r) => {
      if (r === 'TEACHER' && userRole === 'LECTURER') return true;
      if (r === 'LECTURER' && (userRole as string) === 'TEACHER') return true;
      return r === userRole;
    });
    if (!isRoleAllowed) return false;
    if (item.hiddenInMenu && userRole !== 'ADMIN') return false;
    return true;
  });

  const getGroupTitle = (id: string) => {
    if (id === 'dashboard') return 'TỔNG QUAN';
    if (id === 'students' || id === 'subjects') return 'QUẢN LÝ SINH VIÊN';
    if (id === 'schedule' || id === 'grades' || id === 'retakes') return 'ĐÀO TẠO & HỌC TẬP';
    if (id === 'training') return 'ĐIỂM RÈN LUYỆN';
    if (id === 'admin') return 'HỆ THỐNG';
    return '';
  };

  return (
    <aside
      id="app-sidebar"
      aria-label="Thanh điều hướng phân hệ đào tạo"
      className={`w-full ${
        isCollapsed ? 'md:w-16' : 'md:w-60'
      } bg-slate-900 text-slate-300 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-200 select-none z-20`}
    >
      <div className="flex-1 overflow-x-auto md:overflow-x-visible md:overflow-y-auto py-1 md:py-3 scrollbar-none">
        {/* Toggle Collapse Bar (Desktop only) */}
        <div className={`hidden md:flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4'} mb-3`}>
          {!isCollapsed && (
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
              Danh mục đào tạo
            </span>
          )}
          <button
            id="sidebar-toggle-btn"
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-slate-300" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

        {/* Navigation list (Horizontal scroll on mobile, vertical stack on desktop) */}
        <nav className="flex md:flex-col items-center md:items-stretch space-x-1 md:space-x-0 md:space-y-0.5 px-2 md:px-0" aria-label="Danh sách phân hệ">
          {visibleMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'retakes' && currentView === 'retake');
            const itemHref = item.href || `/${item.id}`;
            const groupTitle = getGroupTitle(item.id);
            const prevItem = visibleMenuItems[index - 1];
            const showGroupHeader = !isCollapsed && groupTitle && (!prevItem || getGroupTitle(prevItem.id) !== groupTitle);

            return (
              <React.Fragment key={item.id}>
                {showGroupHeader && (
                  <div className="hidden md:block pt-3 pb-1 px-4 text-[10px] font-bold tracking-wider text-slate-300 uppercase">
                    {groupTitle}
                  </div>
                )}
                <a
                  id={`nav-item-${item.id}`}
                  href={itemHref}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.title}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectView(item.id);
                  }}
                  title={isCollapsed ? item.title : undefined}
                  className={`flex items-center ${
                    isCollapsed
                      ? 'justify-center px-2 py-2.5'
                      : 'gap-2 px-3 py-1.5 md:px-4 md:py-2 whitespace-nowrap'
                  } text-xs font-semibold rounded md:rounded-none transition-colors cursor-pointer no-underline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none shrink-0 ${
                    isActive
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 md:border-0 md:border-l-2 md:border-blue-400 font-bold'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white md:border-l-2 md:border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-300' : 'text-slate-400'}`} />
                  {(!isCollapsed || true) && (
                    <span className={`${isCollapsed ? 'hidden md:hidden' : 'inline'} md:inline truncate`}>
                      {item.title}
                    </span>
                  )}
                </a>
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Clean compact footer (Desktop only) */}
      <div className="hidden md:block p-3 border-t border-slate-800/80 text-center">
        {!isCollapsed ? (
          <p className="text-[10.5px] text-slate-400 font-mono">
            TDNU EduAdmin · v2.5.0
          </p>
        ) : (
          <span className="text-[9px] text-slate-400 font-mono">v2.5</span>
        )}
      </div>
    </aside>
  );
};



