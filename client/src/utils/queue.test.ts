import { describe, expect, it } from 'vitest';
import { peopleAheadMessage } from './queue';

describe('peopleAheadMessage', () => {
  it('uses useful singular and plural messages', () => {
    expect(peopleAheadMessage(0)).toBe('You are next.');
    expect(peopleAheadMessage(1)).toBe('1 person ahead of you.');
    expect(peopleAheadMessage(3)).toBe('3 people ahead of you.');
  });
});
