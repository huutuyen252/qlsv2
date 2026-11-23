import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../db/dbOperations';
import { User, UserPermission, UserRole } from '../types';

export interface PortalAuthRequest extends Request {
  authUser?: User;
}

const TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET ||
  process.env.SESSION_SECRET ||
  'tdnu_edu_internal_hmac_secret_2026_v2';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

export function issueSignedPortalToken(user: Pick<User, 'id' | 'role' | 'username'>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Date.now();
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      usr: user.username,
      iat: now,
      exp: now + TOKEN_TTL_MS,
    })
  );
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${payload}`)
    .digest();
  return `${header}.${payload}.${base64UrlEncode(signature)}`;
}

export function verifySignedPortalToken(token: string): { sub: string; role: UserRole; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', TOKEN_SECRET).update(`${headerB64}.${payloadB64}`).digest()
    );
    const actualBuf = Buffer.from(sigB64);
    const expectedBuf = Buffer.from(expectedSig);
    if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
      return null;
    }
    const decoded = JSON.parse(base64UrlDecode(payloadB64));
    if (!decoded?.sub || !decoded?.exp || Date.now() > Number(decoded.exp)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
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

  const verified = verifySignedPortalToken(token);
  if (!verified) return null;

  const user = await getUserById(verified.sub);
  if (!user || user.status === 'LOCKED') {
    return null;
  }

  req.authUser = user;
  return user;
}

export function hasPortalPermission(user: User | undefined | null, permissionKey: keyof UserPermission): boolean {
  if (!user || user.status === 'LOCKED') return false;
  if (user.role === 'ADMIN') return true;

  const defaultLecturerAllowed: (keyof UserPermission)[] = [
    'canManageStudents',
    'canEditGrades',
    'canImportExcel',
    'canEvaluateTraining',
    'canManageSchedule',
  ];

  const hasExplicit = user.permissions?.[permissionKey];
  if (user.role === 'LECTURER') {
    return hasExplicit !== undefined
      ? Boolean(hasExplicit)
      : defaultLecturerAllowed.includes(permissionKey);
  }
  return Boolean(hasExplicit);
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
    if (!hasPortalPermission(user, permissionKey)) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn chưa được cấp quyền thực hiện thao tác này.',
      });
    }
    return next();
  };
};
