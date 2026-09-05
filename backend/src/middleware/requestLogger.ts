import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, path, ip } = req;

  // Log response when sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(
      `[${new Date().toISOString()}] ${method} ${path} - ${statusCode} (${duration}ms) - IP: ${ip}`
    );
  });

  next();
};
