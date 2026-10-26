import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

type SessionPayload = { shopId: string; exp: number };

const encode = (value: string) => Buffer.from(value).toString('base64url');

export function createPublicToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashPublicToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSessionToken(shopId: string): string {
  const payload: SessionPayload = {
    shopId,
    exp: Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = createHmac('sha256', env.SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, suppliedSignature] = token.split('.');
  if (!encodedPayload || !suppliedSignature) return null;

  const expectedSignature = createHmac('sha256', env.SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as SessionPayload;
    if (!payload.shopId || !payload.exp || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
