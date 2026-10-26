import { randomUUID } from 'node:crypto';
import { Prisma, QueueEntryStatus } from '@prisma/client';
import { prisma } from '../db/client';
import { AppError } from '../errors/appError';
import { serviceDateForTimezone } from '../utils/date';
import { createPublicToken, hashPublicToken } from '../utils/security';

type JoinInput = {
  name: string;
  phone: string;
  normalizedPhone: string;
};

const activeStatuses: QueueEntryStatus[] = [QueueEntryStatus.WAITING, QueueEntryStatus.SERVING];

async function getOrCreateQueueDay(
  tx: Prisma.TransactionClient,
  shopId: string,
  serviceDate: Date,
) {
  await tx.$executeRaw`
    INSERT INTO "QueueDay" ("id", "shopId", "serviceDate", "lastTokenNumber", "createdAt")
    VALUES (${randomUUID()}, ${shopId}, ${serviceDate}, 0, CURRENT_TIMESTAMP)
    ON CONFLICT ("shopId", "serviceDate") DO NOTHING
  `;

  return tx.queueDay.findUniqueOrThrow({
    where: { shopId_serviceDate: { shopId, serviceDate } },
  });
}

function publicEntry(entry: {
  tokenNumber: number;
  status: QueueEntryStatus;
  createdAt: Date;
}, peopleAhead: number) {
  return {
    tokenNumber: entry.tokenNumber,
    status: entry.status,
    peopleAhead,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function getPublicQueue(slug: string) {
  const shop = await prisma.shop.findUnique({ where: { slug } });
  if (!shop) throw new AppError(404, 'SHOP_NOT_FOUND', 'Shop not found.');

  const serviceDate = serviceDateForTimezone(shop.timezone);
  const day = await prisma.queueDay.findUnique({
    where: { shopId_serviceDate: { shopId: shop.id, serviceDate } },
  });

  if (!day) {
    return {
      shop: { name: shop.name, slug: shop.slug },
      isOpen: shop.isQueueOpen,
      nowServing: null,
      waitingCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  const [serving, waitingCount] = await Promise.all([
    prisma.queueEntry.findFirst({
      where: { queueDayId: day.id, status: QueueEntryStatus.SERVING },
      select: { tokenNumber: true },
    }),
    prisma.queueEntry.count({ where: { queueDayId: day.id, status: QueueEntryStatus.WAITING } }),
  ]);

  return {
    shop: { name: shop.name, slug: shop.slug },
    isOpen: shop.isQueueOpen,
    nowServing: serving?.tokenNumber ?? null,
    waitingCount,
    updatedAt: new Date().toISOString(),
  };
}

export async function joinQueue(slug: string, input: JoinInput) {
  const shop = await prisma.shop.findUnique({ where: { slug } });
  if (!shop) throw new AppError(404, 'SHOP_NOT_FOUND', 'Shop not found.');
  if (!shop.isQueueOpen) throw new AppError(409, 'QUEUE_CLOSED', 'This queue is currently closed.');

  const serviceDate = serviceDateForTimezone(shop.timezone);

  return prisma.$transaction(async (tx) => {
    const day = await getOrCreateQueueDay(tx, shop.id, serviceDate);

    await tx.$queryRaw`SELECT "id" FROM "QueueDay" WHERE "id" = ${day.id} FOR UPDATE`;

    const duplicate = await tx.queueEntry.findFirst({
      where: {
        queueDayId: day.id,
        normalizedPhone: input.normalizedPhone,
        status: { in: activeStatuses },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError(409, 'ALREADY_IN_QUEUE', 'This phone number already has an active token.');
    }

    const counter = await tx.queueDay.update({
      where: { id: day.id },
      data: { lastTokenNumber: { increment: 1 } },
      select: { lastTokenNumber: true },
    });
    const entryToken = createPublicToken();
    const entry = await tx.queueEntry.create({
      data: {
        publicTokenHash: hashPublicToken(entryToken),
        queueDayId: day.id,
        tokenNumber: counter.lastTokenNumber,
        name: input.name,
        phone: input.normalizedPhone,
        normalizedPhone: input.normalizedPhone,
      },
    });
    const peopleAhead = await tx.queueEntry.count({
      where: {
        queueDayId: day.id,
        tokenNumber: { lt: entry.tokenNumber },
        status: { in: activeStatuses },
      },
    });

    return { shopId: shop.id, entryToken, entry: publicEntry(entry, peopleAhead) };
  });
}

export async function getEntryStatus(slug: string, entryToken: string) {
  const tokenHash = hashPublicToken(entryToken);
  const entry = await prisma.queueEntry.findUnique({
    where: { publicTokenHash: tokenHash },
    include: { queueDay: { include: { shop: true } } },
  });

  if (!entry || entry.queueDay.shop.slug !== slug) {
    throw new AppError(404, 'ENTRY_NOT_FOUND', 'Queue entry not found.');
  }

  const peopleAhead = activeStatuses.includes(entry.status)
    ? await prisma.queueEntry.count({
        where: {
          queueDayId: entry.queueDayId,
          tokenNumber: { lt: entry.tokenNumber },
          status: { in: activeStatuses },
        },
      })
    : 0;

  return { entry: publicEntry(entry, peopleAhead), updatedAt: new Date().toISOString() };
}

export async function getOwnerQueue(shopId: string) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new AppError(404, 'SHOP_NOT_FOUND', 'Shop not found.');

  const serviceDate = serviceDateForTimezone(shop.timezone);
  const day = await prisma.queueDay.findUnique({
    where: { shopId_serviceDate: { shopId, serviceDate } },
  });

  const select = {
    id: true,
    tokenNumber: true,
    name: true,
    phone: true,
    status: true,
    createdAt: true,
    calledAt: true,
  } satisfies Prisma.QueueEntrySelect;

  const [serving, waiting] = day
    ? await Promise.all([
        prisma.queueEntry.findFirst({
          where: { queueDayId: day.id, status: QueueEntryStatus.SERVING },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select,
        }),
        prisma.queueEntry.findMany({
          where: { queueDayId: day.id, status: QueueEntryStatus.WAITING },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select,
        }),
      ])
    : [null, []];

  return {
    shop: { name: shop.name, slug: shop.slug, isOpen: shop.isQueueOpen },
    serviceDate: serviceDate.toISOString().slice(0, 10),
    serving,
    waiting,
    updatedAt: new Date().toISOString(),
  };
}

export async function advanceQueue(shopId: string, expectedServingEntryId: string | null) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new AppError(404, 'SHOP_NOT_FOUND', 'Shop not found.');
  const serviceDate = serviceDateForTimezone(shop.timezone);

  const result = await prisma.$transaction(async (tx) => {
    const day = await getOrCreateQueueDay(tx, shopId, serviceDate);
    await tx.$queryRaw`SELECT "id" FROM "QueueDay" WHERE "id" = ${day.id} FOR UPDATE`;

    const current = await tx.queueEntry.findFirst({
      where: { queueDayId: day.id, status: QueueEntryStatus.SERVING },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    if ((current?.id ?? null) !== expectedServingEntryId) {
      throw new AppError(
        409,
        'QUEUE_STATE_CHANGED',
        'The queue changed before this action completed. Refresh and try again.',
      );
    }

    if (current) {
      await tx.queueEntry.update({
        where: { id: current.id },
        data: { status: QueueEntryStatus.DONE, completedAt: new Date() },
      });
    }

    const candidates = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "QueueEntry"
      WHERE "queueDayId" = ${day.id} AND "status" = 'WAITING'::"QueueEntryStatus"
      ORDER BY "createdAt" ASC, "id" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    const nextId = candidates[0]?.id ?? null;
    const next = nextId
      ? await tx.queueEntry.update({
          where: { id: nextId },
          data: { status: QueueEntryStatus.SERVING, calledAt: new Date() },
          select: { id: true, tokenNumber: true, name: true },
        })
      : null;

    return { completedEntryId: current?.id ?? null, next };
  });

  return { ...result, queue: await getOwnerQueue(shopId) };
}

export async function markNoShow(shopId: string, entryId: string) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new AppError(404, 'SHOP_NOT_FOUND', 'Shop not found.');
  const serviceDate = serviceDateForTimezone(shop.timezone);

  const entry = await prisma.queueEntry.findFirst({
    where: { id: entryId, queueDay: { shopId, serviceDate }, status: { in: activeStatuses } },
  });
  if (!entry) throw new AppError(404, 'ACTIVE_ENTRY_NOT_FOUND', 'Active queue entry not found.');

  await prisma.queueEntry.update({
    where: { id: entry.id },
    data: { status: QueueEntryStatus.NO_SHOW, completedAt: new Date() },
  });
  return { entryId: entry.id, tokenNumber: entry.tokenNumber };
}
