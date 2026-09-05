import React from 'react';
import { User, UserRole } from '../../types';
import { ErrorState } from '../common/ErrorState';

interface ProtectedRouteProps {
  currentUser: User | null;
  allowedRoles?: (UserRole | 'TEACHER')[];
  children: React.ReactNode;
  onGoHome?: () => void;
  onLogin?: () => void;
  requiredPermission?: keyof NonNullable<User['permissions']>;
  title?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  currentUser,
  allowedRoles,
  children,
  onGoHome,
  onLogin,
  requiredPermission,
  title,
}) => {
  // Check 1: User is not logged in
  if (!currentUser) {
    return (
      <ErrorState
        type="401"
        title="Yêu cầu đăng nhập"
        message="Vui lòng đăng nhập bằng tài khoản Quản trị viên, Giảng viên hoặc Sinh viên để tiếp tục."
        onLogin={onLogin}
        onGoHome={onGoHome}
      />
    );
  }

  // Normalize user role (e.g., LECTURER / TEACHER equivalence)
  const userRole = currentUser.role;

  // Check 2: Check allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    const isRoleAllowed = allowedRoles.some((r) => {
      if (r === 'TEACHER' && userRole === 'LECTURER') return true;
      if (r === 'LECTURER' && (userRole as string) === 'TEACHER') return true;
      return r === userRole;
    });

    if (!isRoleAllowed) {
      return (
        <ErrorState
          type="403"
          title={title || '403 - Quyền truy cập bị từ chối'}
          message={`Tài khoản của bạn (${currentUser.fullName} - ${currentUser.role}) không có quyền truy cập vào phân hệ này. Quyền yêu cầu: ${allowedRoles.join(', ')}.`}
          onGoHome={onGoHome}
          onGoBack={onGoHome}
        />
      );
    }
  }

  // Check 3: Check specific sub-permission if provided
  if (requiredPermission && currentUser.role !== 'ADMIN') {
    const hasPermission = currentUser.permissions?.[requiredPermission];
    if (!hasPermission) {
      return (
        <ErrorState
          type="403"
          title="Quyền truy cập tính năng bị khóa"
          message={`Tài khoản của bạn chưa được cấp quyền thực hiện tác vụ này (${requiredPermission}). Vui lòng liên hệ Quản trị viên hệ thống để được cấp quyền.`}
          onGoHome={onGoHome}
          onGoBack={onGoHome}
        />
      );
    }
  }

  return <>{children}</>;
};
