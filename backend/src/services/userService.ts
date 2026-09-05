import { AppError } from '../middleware/errorHandler.js';

const failedLoginAttempts: Record<string, number> = {};
const MAX_LOGIN_ATTEMPTS = 5;

export const authenticateUser = async (username: string, password: string) => {
  try {
    const key = username.trim().toLowerCase();

    // Check failed login attempts
    if (failedLoginAttempts[key] >= MAX_LOGIN_ATTEMPTS) {
      throw new AppError(
        'Tài khoản đã bị khóa do nhập sai mật khẩu quá nhiều lần',
        403,
        'ACCOUNT_LOCKED'
      );
    }

    // TODO: Fetch user from database
    // const user = await getUserByUsername(key);

    // Validate password
    // const isPasswordCorrect = await validatePassword(password, user.password);

    // if (!isPasswordCorrect) {
    //   failedLoginAttempts[key] = (failedLoginAttempts[key] || 0) + 1;
    //   throw new AppError('Mật khẩu không chính xác', 401, 'INVALID_PASSWORD');
    // }

    return {
      user: {
        username,
        role: 'student',
      },
      token: 'mock-token',
    };
  } catch (error) {
    throw error;
  }
};
