import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/appError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route matches ${req.method} ${req.path}.`));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  void _next;
  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid values.',
        requestId: req.id,
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: req.id,
        details: error.details,
      },
    });
    return;
  }

  req.log.error({ error, event: 'request.unhandled_error' }, 'Unhandled request error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      requestId: req.id,
      details: null,
    },
  });
};
