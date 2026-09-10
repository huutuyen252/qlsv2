/**
 * Navigation & URL Synchronization Utilities
 * Giúp đồng bộ giữa React state và thanh địa chỉ trình duyệt (Browser URL bar).
 * Hỗ trợ các mục trong Phân hệ Đào tạo, Admin Console, browser back/forward (popstate),
 * và tải trực tiếp từ URL đường dẫn cụ thể (direct deep link / bookmark).
 */

export interface RouteMeta {
  path: string;
  title: string;
  view: string;
  adminTab?: string;
}

export const VIEW_ROUTES: Record<string, { path: string; title: string }> = {
  dashboard: {
    path: '/dashboard',
    title: 'Tổng quan & Báo cáo | Quản Lý Sinh Viên',
  },
  students: {
    path: '/students',
    title: 'Hồ sơ & Sinh viên | Quản Lý Sinh Viên',
  },
  schedule: {
    path: '/schedule',
    title: 'Thời khóa biểu | Quản Lý Sinh Viên',
  },
  grades: {
    path: '/grades',
    title: 'Bảng điểm & GPA | Quản Lý Sinh Viên',
  },
  training: {
    path: '/training',
    title: 'Điểm Rèn luyện | Quản Lý Sinh Viên',
  },
  subjects: {
    path: '/subjects',
    title: 'Môn học & Phân hệ Đào tạo | Quản Lý Sinh Viên',
  },
  retakes: {
    path: '/retakes',
    title: 'Thi lại / Học lại | Quản Lý Sinh Viên',
  },
  retake: {
    path: '/retakes',
    title: 'Thi lại / Học lại | Quản Lý Sinh Viên',
  },
  reports: {
    path: '/reports',
    title: 'Báo cáo thống kê | Quản Lý Sinh Viên',
  },
  users: {
    path: '/admin/users',
    title: 'Quản lý Người dùng & Phân quyền | Admin Console',
  },
  admin: {
    path: '/admin',
    title: 'Admin Console | Quản Lý Sinh Viên',
  },
};

export const ADMIN_TAB_ROUTES: Record<string, { path: string; title: string }> = {
  'admin-overview': {
    path: '/admin/overview',
    title: 'Tổng quan hệ thống | Admin Console',
  },
  'admin-users': {
    path: '/admin/users',
    title: 'Quản lý Người dùng & Phân quyền | Admin Console',
  },
  'admin-import': {
    path: '/admin/import',
    title: 'Import Dữ liệu Excel Wizard | Admin Console',
  },
  'admin-backup': {
    path: '/admin/backup',
    title: 'Sao lưu & Phục hồi CSDL | Admin Console',
  },
  'admin-auditlogs': {
    path: '/admin/audit-logs',
    title: 'Nhật ký Audit Logs | Admin Console',
  },
};

/**
 * Phân tích đường dẫn URL trên thanh trình duyệt (window.location.pathname)
 * thành view và sub-tab tương ứng
 */
export function parseRouteFromPath(pathname: string): { view: string; adminTab?: string } {
  const normalized = pathname.trim().toLowerCase().replace(/\/+$/, '') || '/';

  // Exact & alias matching cho Phân hệ Đào tạo
  if (normalized === '/' || normalized === '/dashboard' || normalized === '/tong-quan' || normalized === '/overview') {
    return { view: 'dashboard' };
  }

  if (normalized === '/students' || normalized === '/sinh-vien' || normalized === '/ho-so') {
    return { view: 'students' };
  }

  if (normalized === '/schedule' || normalized === '/thoi-khoa-bieu' || normalized === '/lich-hoc') {
    return { view: 'schedule' };
  }

  if (normalized === '/grades' || normalized === '/diem' || normalized === '/bang-diem' || normalized === '/gpa') {
    return { view: 'grades' };
  }

  if (normalized === '/training' || normalized === '/ren-luyen' || normalized === '/diem-ren-luyen') {
    return { view: 'training' };
  }

  if (
    normalized === '/subjects' ||
    normalized === '/mon-hoc' ||
    normalized === '/dao-tao' ||
    normalized === '/phan-he-dao-tao' ||
    normalized === '/hoc-phan'
  ) {
    return { view: 'subjects' };
  }

  if (
    normalized === '/retakes' ||
    normalized === '/retake' ||
    normalized === '/thi-lai' ||
    normalized === '/hoc-lai' ||
    normalized === '/thi-lai-hoc-lai'
  ) {
    return { view: 'retakes' };
  }

  if (normalized === '/reports' || normalized === '/bao-cao') {
    return { view: 'reports' };
  }

  // Admin routes
  if (normalized === '/users' || normalized === '/admin/users' || normalized === '/admin-users') {
    return { view: 'users', adminTab: 'admin-users' };
  }

  if (normalized.startsWith('/admin')) {
    if (normalized === '/admin/import' || normalized === '/admin-import') {
      return { view: 'admin', adminTab: 'admin-import' };
    }
    if (normalized === '/admin/backup' || normalized === '/admin-backup') {
      return { view: 'admin', adminTab: 'admin-backup' };
    }
    if (
      normalized === '/admin/audit-logs' ||
      normalized === '/admin/auditlogs' ||
      normalized === '/admin-auditlogs'
    ) {
      return { view: 'admin', adminTab: 'admin-auditlogs' };
    }
    if (normalized === '/admin/overview') {
      return { view: 'admin', adminTab: 'admin-overview' };
    }
    return { view: 'admin', adminTab: 'admin-overview' };
  }

  // Fallback: check localStorage view
  try {
    const saved = localStorage.getItem('app_current_view');
    if (saved && (VIEW_ROUTES[saved] || saved === 'retake')) {
      const canonical = saved === 'retake' ? 'retakes' : saved;
      return { view: canonical };
    }
  } catch {
    // ignore
  }

  return { view: 'dashboard' };
}

/**
 * Lấy URL path và tiêu đề trang tương ứng với view và admin sub-tab
 */
export function getRouteMeta(view: string, adminTab?: string): { path: string; title: string } {
  if (view === 'admin' && adminTab && ADMIN_TAB_ROUTES[adminTab]) {
    return ADMIN_TAB_ROUTES[adminTab];
  }
  if (view === 'users' || (view === 'admin' && adminTab === 'admin-users')) {
    return {
      path: '/admin/users',
      title: 'Quản lý Người dùng & Phân quyền | Admin Console',
    };
  }
  if (VIEW_ROUTES[view]) {
    return VIEW_ROUTES[view];
  }
  return {
    path: '/dashboard',
    title: 'Tổng quan & Báo cáo | Quản Lý Sinh Viên',
  };
}

/**
 * Cập nhật thanh địa chỉ URL của trình duyệt (Browser Address Bar)
 * mà không gây giật hay reload trang, kèm theo tiêu đề trang
 */
export function updateBrowserUrl(view: string, adminTab?: string, replace: boolean = false): void {
  try {
    const meta = getRouteMeta(view, adminTab);
    const currentPath = window.location.pathname;

    // Cập nhật document title
    if (meta.title && document.title !== meta.title) {
      document.title = meta.title;
    }

    // Nếu đường dẫn trên thanh trình duyệt chưa khớp, pushState hoặc replaceState
    if (currentPath !== meta.path) {
      const stateObj = { view, adminTab };
      if (replace) {
        window.history.replaceState(stateObj, meta.title, meta.path);
      } else {
        window.history.pushState(stateObj, meta.title, meta.path);
      }
    }
  } catch (err) {
    console.warn('Could not update browser history URL:', err);
  }
}
