import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './db/client';

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      event: 'server.started',
      port: env.PORT,
      environment: env.NODE_ENV,
      publicQueueUrl: `/q/${env.SHOP_SLUG}`,
    },
    'QTrack API is listening',
  );
});

async function shutdown(signal: string) {
  logger.info({ event: 'server.shutdown_started', signal }, 'Shutting down QTrack API');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info({ event: 'server.shutdown_complete' }, 'QTrack API stopped');
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
