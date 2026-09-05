import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export class AppError extends Error implements ApiError {
  status: number;
  code: string;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = (err as any).status || 500;
  const code = (err as any).code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal Server Error';

  console.error(`[ERROR] ${status} - ${code}: ${message}`);

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      status,
    },
  });
};
