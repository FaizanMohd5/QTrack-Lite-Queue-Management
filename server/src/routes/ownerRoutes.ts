import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { prisma } from '../db/client';
import { AppError } from '../errors/appError';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateOwner } from '../middleware/authenticateOwner';
import { advanceQueue, getOwnerQueue, markNoShow } from '../services/queueService';
import { createSessionToken } from '../utils/security';
import { advanceSchema, entryIdSchema, loginSchema } from '../validation/schemas';

export const ownerRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many sign-in attempts. Try again later.',
      details: null,
    },
  },
});

ownerRoutes.post(
  '/session',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { password } = loginSchema.parse(req.body);
    const shop = await prisma.shop.findUnique({ where: { slug: env.SHOP_SLUG } });
    const valid = shop ? await bcrypt.compare(password, shop.ownerPasswordHash) : false;

    if (!shop || !valid) {
      req.log.warn({ event: 'owner.login_failed', slug: env.SHOP_SLUG }, 'Owner sign-in failed');
      throw new AppError(401, 'INVALID_CREDENTIALS', 'The password is incorrect.');
    }

    res.cookie('qtrack_session', createSessionToken(shop.id), {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
      path: '/',
    });
    req.log.info({ event: 'owner.login_succeeded', shopId: shop.id }, 'Owner signed in');
    res.json({ shop: { name: shop.name, slug: shop.slug } });
  }),
);

ownerRoutes.delete('/session', (req, res) => {
  res.clearCookie('qtrack_session', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  req.log.info({ event: 'owner.logout' }, 'Owner signed out');
  res.status(204).send();
});

ownerRoutes.use(authenticateOwner);

ownerRoutes.get(
  '/queue',
  asyncHandler(async (req, res) => {
    res.json(await getOwnerQueue(req.owner!.shopId));
  }),
);

ownerRoutes.post(
  '/queue/next',
  asyncHandler(async (req, res) => {
    const { expectedServingEntryId } = advanceSchema.parse(req.body);
    const result = await advanceQueue(req.owner!.shopId, expectedServingEntryId);
    req.log.info(
      {
        event: 'queue.advanced',
        shopId: req.owner!.shopId,
        completedEntryId: result.completedEntryId,
        nextEntryId: result.next?.id ?? null,
        nextTokenNumber: result.next?.tokenNumber ?? null,
      },
      'Owner advanced queue',
    );
    res.json(result.queue);
  }),
);

ownerRoutes.post(
  '/queue/entries/:entryId/no-show',
  asyncHandler(async (req, res) => {
    const entryId = entryIdSchema.parse(req.params.entryId);
    const result = await markNoShow(req.owner!.shopId, entryId);
    req.log.info(
      { event: 'queue.entry_no_show', shopId: req.owner!.shopId, ...result },
      'Owner marked queue entry as no-show',
    );
    res.json(await getOwnerQueue(req.owner!.shopId));
  }),
);
