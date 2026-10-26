import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { verifySessionToken } from '../utils/security';

export function authenticateOwner(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.qtrack_session as string | undefined;
  const session = token ? verifySessionToken(token) : null;
  if (!session) return next(new AppError(401, 'UNAUTHORIZED', 'Owner sign-in is required.'));

  req.owner = { shopId: session.shopId };
  next();
}
