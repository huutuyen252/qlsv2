import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../db/dbOperations';
import { User, UserPermission, UserRole } from '../types';

export interface PortalAuthRequest extends Request {
  authUser?: User;
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const queryToken = req.query?.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }
  return null;
}

export async function resolveAuthUser(req: PortalAuthRequest): Promise<User | null> {
  if (req.authUser) return req.authUser;
  const token = extractBearerToken(req);
  if (!token) return null;

  const parts = token.split('.');
  const payload = parts[1] || '';
  const match = payload.match(/^user_(.+)_role_(ADMIN|LECTURER|STUDENT)$/);
  if (!match) return null;

  const userId = match[1];
  const user = await getUserById(userId);
  if (!user || user.status === 'LOCKED') {
    return null;
  }

  req.authUser = user;
  return user;
}

export const requirePortalAuth = async (
  req: PortalAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
      });
    }
    return next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err?.message || 'Lỗi xác thực phiên đăng nhập.',
    });
  }
};

export const requirePortalRoles = (...roles: UserRole[]) => {
  return async (req: PortalAuthRequest, res: Response, next: NextFunction) => {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để thực hiện thao tác này.',
      });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập chức năng này.',
      });
    }
    return next();
  };
};

export const requirePortalPermission = (permissionKey: keyof UserPermission) => {
  return async (req: PortalAuthRequest, res: Response, next: NextFunction) => {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để thực hiện thao tác này.',
      });
    }
    if (user.role === 'ADMIN') {
      return next();
    }
    const defaultLecturerAllowed: (keyof UserPermission)[] = [
      'canManageStudents',
      'canEditGrades',
      'canImportExcel',
      'canEvaluateTraining',
      'canManageSchedule',
    ];
    const hasExplicit = user.permissions?.[permissionKey];
    const allowed =
      user.role === 'LECTURER'
        ? hasExplicit !== undefined
          ? Boolean(hasExplicit)
          : defaultLecturerAllowed.includes(permissionKey)
        : Boolean(hasExplicit);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn chưa được cấp quyền thực hiện thao tác này.',
      });
    }
    return next();
  };
};
