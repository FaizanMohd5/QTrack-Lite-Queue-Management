import bcrypt from 'bcryptjs';
import { QueueEntryStatus } from '@prisma/client';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/client';
import { serviceDateForTimezone } from './utils/date';
import { createPublicToken, hashPublicToken } from './utils/security';

export async function seed(): Promise<void> {
  if (!env.OWNER_PASSWORD) {
    throw new Error('OWNER_PASSWORD is required when running the seed command');
  }

  const ownerPasswordHash = await bcrypt.hash(env.OWNER_PASSWORD, 12);
  const shop = await prisma.shop.upsert({
    where: { slug: env.SHOP_SLUG },
    update: {
      name: env.SHOP_NAME,
      timezone: env.SHOP_TIMEZONE,
      ownerPasswordHash,
    },
    create: {
      slug: env.SHOP_SLUG,
      name: env.SHOP_NAME,
      timezone: env.SHOP_TIMEZONE,
      ownerPasswordHash,
    },
  });

  logger.info({ event: 'seed.shop_ready', shopId: shop.id, slug: shop.slug }, 'Demo shop is ready');

  if (env.SEED_DEMO_QUEUE !== 'true') return;

  const serviceDate = serviceDateForTimezone(shop.timezone);
  const queueDay = await prisma.queueDay.upsert({
    where: { shopId_serviceDate: { shopId: shop.id, serviceDate } },
    update: {},
    create: { shopId: shop.id, serviceDate },
  });
  const entryCount = await prisma.queueEntry.count({ where: { queueDayId: queueDay.id } });

  if (entryCount > 0) {
    logger.info(
      { event: 'seed.demo_queue_skipped', shopId: shop.id, entryCount },
      'Queue already has data; demo entries were not added',
    );
    return;
  }

  const samples = [
    { name: 'Demo Patient 1', phone: '+919000000001', status: QueueEntryStatus.SERVING },
    { name: 'Demo Patient 2', phone: '+919000000002', status: QueueEntryStatus.WAITING },
    { name: 'Demo Patient 3', phone: '+919000000003', status: QueueEntryStatus.WAITING },
  ];

  await prisma.$transaction(async (tx) => {
    for (const [index, sample] of samples.entries()) {
      await tx.queueEntry.create({
        data: {
          publicTokenHash: hashPublicToken(createPublicToken()),
          queueDayId: queueDay.id,
          tokenNumber: index + 1,
          name: sample.name,
          phone: sample.phone,
          normalizedPhone: sample.phone,
          status: sample.status,
          calledAt: sample.status === QueueEntryStatus.SERVING ? new Date() : null,
        },
      });
    }
    await tx.queueDay.update({
      where: { id: queueDay.id },
      data: { lastTokenNumber: samples.length },
    });
  });

  logger.info(
    { event: 'seed.demo_queue_created', shopId: shop.id, entryCount: samples.length },
    'Created development queue entries',
  );
}

if (require.main === module) {
  seed()
    .catch((error: unknown) => {
      logger.error({ error, event: 'seed.failed' }, 'Database seed failed');
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
