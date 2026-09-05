import { Request, Response } from 'express';
import * as userService from '../services/userService.js';
import { AppError } from '../middleware/errorHandler.js';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError(
        'Vui lòng nhập tên đăng nhập và mật khẩu',
        400,
        'MISSING_CREDENTIALS'
      );
    }

    const result = await userService.authenticateUser(username, password);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    throw error;
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Đã đăng xuất thành công',
    });
  } catch (error) {
    throw error;
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Implement refresh token logic
    res.json({
      success: true,
      message: 'Token refreshed',
    });
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // Implement get current user logic
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    throw error;
  }
};
