import { seed } from '../src/seed';
import { logger } from '../src/config/logger';
import { prisma } from '../src/db/client';

seed()
  .catch((error: unknown) => {
    logger.error({ error, event: 'seed.failed' }, 'Database seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
