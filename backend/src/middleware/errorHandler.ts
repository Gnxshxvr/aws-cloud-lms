import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../services/loggerService.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`Error processing request ${req.method} ${req.url}: ${err.message}`, {
    stack: err.stack,
    body: req.body,
  });

  if (err instanceof ZodError) {
    const issues = (err as any).issues || (err as any).errors || [];
    res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: issues.map((e: any) => ({ field: (e.path || []).join('.'), message: e.message })),
    });
    return;
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'File upload exceeds maximum allowed size.',
      });
      return;
    }
    res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.isPublic || statusCode < 500 ? err.message : 'An unexpected server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { error: err.message, stack: err.stack } : {}),
  });
}
