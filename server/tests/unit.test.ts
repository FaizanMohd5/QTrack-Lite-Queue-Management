import { describe, expect, it } from 'vitest';
import { serviceDateForTimezone } from '../src/utils/date';
import { normalizePhone } from '../src/utils/phone';
import { createSessionToken, hashPublicToken, verifySessionToken } from '../src/utils/security';

describe('phone normalization', () => {
  it('normalizes common Indian phone formats to E.164', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
    expect(normalizePhone('91-98765-43210')).toBe('+919876543210');
    expect(normalizePhone('+91 (98765) 43210')).toBe('+919876543210');
  });

  it('rejects invalid values', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('not-a-phone')).toBeNull();
  });
});

describe('service date', () => {
  it('uses the shop timezone rather than the host timezone', () => {
    const instant = new Date('2026-10-25T20:00:00.000Z');
    expect(serviceDateForTimezone('Asia/Kolkata', instant).toISOString()).toBe(
      '2026-10-26T00:00:00.000Z',
    );
  });
});

describe('opaque tokens and owner sessions', () => {
  it('hashes public tokens deterministically without storing the raw token', () => {
    expect(hashPublicToken('secret-token')).toBe(hashPublicToken('secret-token'));
    expect(hashPublicToken('secret-token')).not.toContain('secret-token');
  });

  it('accepts signed sessions and rejects tampering', () => {
    const token = createSessionToken('shop_123');
    expect(verifySessionToken(token)?.shopId).toBe('shop_123');
    expect(verifySessionToken(`${token}tampered`)).toBeNull();
  });
});
