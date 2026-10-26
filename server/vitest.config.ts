import { defineConfig } from 'vitest/config';

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://qtrack:qtrack@localhost:5432/qtrack';
process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173';
process.env.SESSION_SECRET ??= 'test-session-secret-that-is-long-enough';
process.env.LOG_LEVEL ??= 'error';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    sequence: { concurrent: false },
  },
});
