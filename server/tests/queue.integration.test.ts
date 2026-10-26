import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/client';
import { advanceQueue, joinQueue } from '../src/services/queueService';

const runDatabaseTests = process.env.RUN_DB_TESTS === 'true';
const integration = describe.skipIf(!runDatabaseTests);
const slug = `integration-${Date.now()}`;
let shopId = '';

integration('queue concurrency with PostgreSQL', () => {
  beforeAll(async () => {
    const shop = await prisma.shop.create({
      data: {
        slug,
        name: 'Integration Test Shop',
        timezone: 'Asia/Kolkata',
        ownerPasswordHash: await bcrypt.hash('integration-password', 4),
      },
    });
    shopId = shop.id;
  });

  afterAll(async () => {
    if (shopId) await prisma.shop.delete({ where: { id: shopId } });
    await prisma.$disconnect();
  });

  it('allocates distinct sequential tokens to parallel joins', async () => {
    const joins = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        joinQueue(slug, {
          name: `Customer ${index + 1}`,
          phone: `+91910000000${index}`,
          normalizedPhone: `+91910000000${index}`,
        }),
      ),
    );

    expect(joins.map((result) => result.entry.tokenNumber).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it('allows only one concurrent advance for the same observed state', async () => {
    const outcomes = await Promise.allSettled([advanceQueue(shopId, null), advanceQueue(shopId, null)]);
    const fulfilled = outcomes.filter((result) => result.status === 'fulfilled');
    const rejected = outcomes.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'QUEUE_STATE_CHANGED',
    });
  });
});
