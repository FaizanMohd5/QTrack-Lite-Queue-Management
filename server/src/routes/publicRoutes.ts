import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/asyncHandler';
import { getEntryStatus, getPublicQueue, joinQueue } from '../services/queueService';
import { entryTokenSchema, joinQueueSchema, slugSchema } from '../validation/schemas';

export const publicRoutes = Router();

const joinLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many join attempts. Please wait a minute and try again.',
      details: null,
    },
  },
});

publicRoutes.get(
  '/shops/:slug/queue',
  asyncHandler(async (req, res) => {
    const slug = slugSchema.parse(req.params.slug);
    res.json(await getPublicQueue(slug));
  }),
);

publicRoutes.post(
  '/shops/:slug/queue/entries',
  joinLimiter,
  asyncHandler(async (req, res) => {
    const slug = slugSchema.parse(req.params.slug);
    const input = joinQueueSchema.parse(req.body);
    const result = await joinQueue(slug, {
      name: input.name,
      phone: input.phone.raw,
      normalizedPhone: input.phone.normalized,
    });

    req.log.info(
      {
        event: 'queue.entry_joined',
        shopId: result.shopId,
        tokenNumber: result.entry.tokenNumber,
      },
      'Customer joined queue',
    );
    res.status(201).json({ entryToken: result.entryToken, entry: result.entry });
  }),
);

publicRoutes.get(
  '/shops/:slug/queue/entries/:entryToken',
  asyncHandler(async (req, res) => {
    const slug = slugSchema.parse(req.params.slug);
    const token = entryTokenSchema.parse(req.params.entryToken);
    res.json(await getEntryStatus(slug, token));
  }),
);
