import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Kiểm tra xem một chuỗi có phải là hash bcrypt hợp lệ hay không.
 * Bcrypt hash bắt đầu bằng $2a$, $2b$, hoặc $2y$ với độ dài chuẩn 60 ký tự.
 */
export function isBcryptHash(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(text.trim());
}

/**
 * Mã hóa mật khẩu thành chuỗi hash Bcrypt trước khi lưu trữ vào database.
 * Nếu đã là hash bcrypt thì giữ nguyên.
 */
export function hashPassword(plainPassword: string): string {
  if (!plainPassword) return '';
  const trimmed = plainPassword.trim();
  if (isBcryptHash(trimmed)) {
    return trimmed;
  }
  const salt = bcrypt.genSaltSync(BCRYPT_SALT_ROUNDS);
  return bcrypt.hashSync(trimmed, salt);
}

/**
 * So sánh mật khẩu người dùng nhập vào với mật khẩu / hash lưu trong hệ thống.
 * Hỗ trợ so sánh an toàn bằng bcrypt.compareSync với hash bcrypt,
 * đồng thời tương thích ngược an toàn với mật khẩu chưa mã hóa trước đó.
 */
export function verifyPassword(plainPassword: string, storedPasswordOrHash?: string | null): boolean {
  if (!plainPassword || !storedPasswordOrHash) return false;
  const cleanInput = plainPassword.trim();
  const cleanStored = storedPasswordOrHash.trim();

  if (isBcryptHash(cleanStored)) {
    try {
      return bcrypt.compareSync(cleanInput, cleanStored);
    } catch (err) {
      console.error('[Security] Lỗi so sánh mật khẩu bcrypt:', err);
      return false;
    }
  }

  // Tương thích ngược với mật khẩu dạng plaintext trong CSDL cũ
  return cleanInput === cleanStored;
}

/**
 * Giải mã hoặc suy luận mật khẩu dạng văn bản thuần cho Quản trị viên (Admin).
 * Kiểm tra plainPassword lưu sẵn, hoặc kiểm tra các mật khẩu mặc định/phổ biến đối với Bcrypt hash.
 */
export function resolvePlainPassword(user?: {
  password?: string;
  plainPassword?: string;
  role?: string;
  username?: string;
  studentCode?: string;
} | null): string {
  if (!user) return '123456';
  if (user.plainPassword && user.plainPassword.trim() && !isBcryptHash(user.plainPassword)) {
    return user.plainPassword.trim();
  }
  const defaultForRole = user.role === 'ADMIN' ? 'admin123' : user.role === 'LECTURER' ? 'gv123' : '123456';
  if (!user.password || !user.password.trim()) {
    return defaultForRole;
  }
  const pwd = user.password.trim();
  if (!isBcryptHash(pwd)) {
    return pwd;
  }

  // Đối với Bcrypt hash, đối chiếu với danh sách các mật khẩu mặc định và khả dĩ
  const candidates: string[] = Array.from(
    new Set(
      [
        defaultForRole,
        '123456',
        'admin123',
        'gv123',
        user.username,
        user.studentCode,
        '12345678',
        'admin',
        'tdnu123',
        'tdnu@123',
        'password',
      ].filter((item): item is string => !!item && typeof item === 'string')
    )
  );

  for (const candidate of candidates) {
    try {
      if (bcrypt.compareSync(candidate, pwd)) {
        return candidate;
      }
    } catch {
      // bỏ qua lỗi so sánh
    }
  }

  return defaultForRole;
}
