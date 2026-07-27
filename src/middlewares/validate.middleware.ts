// middlewares/validate.middleware.js
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError, ErrorCode } from '../errors/AppError.js';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Try to validate with direct body first (for auth validators)
      await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      // If direct validation fails, try wrapped format (for backward compatibility)
      try {
        await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        next();
      } catch (wrappedError: any) {
        // Both formats failed, return the error
        const message =
          wrappedError.issues?.map((e: any) => e.message).join(', ') || wrappedError.message;
        return next(new AppError(message, 400, ErrorCode.VALIDATION_ERROR));
      }
    }
  };
};
