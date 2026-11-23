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
    if (id === 'dashboard') return 'Tổng quan';
    if (id === 'students' || id === 'subjects') return 'Quản lý sinh viên';
    if (id === 'schedule' || id === 'grades' || id === 'retakes') return 'Đào tạo & Học tập';
    if (id === 'training') return 'Điểm rèn luyện';
    if (id === 'admin') return 'Hệ thống';
    return '';
  };

  return (
    <aside
      id="app-sidebar"
      aria-label="Thanh điều hướng phân hệ đào tạo"
      className={`w-full ${
        isCollapsed ? 'md:w-[72px]' : 'md:w-64'
      } bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b md:border-b-0 md:border-r border-slate-200/90 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-200 select-none z-20`}
    >
      <div className="flex-1 overflow-x-auto md:overflow-x-visible md:overflow-y-auto py-2 md:py-4 scrollbar-none">
        {/* Toggle Collapse Bar (Desktop only) */}
        <div className={`hidden md:flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} mb-2`}>
          {!isCollapsed && (
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide">
              Danh mục đào tạo
            </span>
          )}
          <button
            id="sidebar-toggle-btn"
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation list */}
        <nav
          className={`flex md:flex-col items-center md:items-stretch gap-1 md:gap-0.5 ${
            isCollapsed ? 'px-2 md:px-2.5' : 'px-2 md:px-3'
          }`}
          aria-label="Danh sách phân hệ"
        >
          {visibleMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.id ||
              (item.id === 'retakes' && currentView === 'retake') ||
              (item.id === 'students' && currentView === 'student-detail');
            const itemHref = item.href || `/${item.id}`;
            const groupTitle = getGroupTitle(item.id);
            const prevItem = visibleMenuItems[index - 1];
            const showGroupHeader =
              !isCollapsed && groupTitle && (!prevItem || getGroupTitle(prevItem.id) !== groupTitle);

            return (
              <React.Fragment key={item.id}>
                {showGroupHeader && (
                  <div
                    className={`hidden md:block px-3 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 ${
                      index === 0 ? 'pt-1' : 'pt-4'
                    }`}
                  >
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
                      ? 'justify-center p-2.5'
                      : 'gap-2.5 px-3 py-2 whitespace-nowrap'
                  } text-[13px] rounded-xl transition-colors duration-150 cursor-pointer no-underline focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none shrink-0 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.title}</span>
                  )}
                </a>
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
