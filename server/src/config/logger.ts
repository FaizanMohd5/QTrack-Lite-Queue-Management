import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'qtrack-api', environment: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'password',
      '*.password',
      'phone',
      '*.phone',
      'entryToken',
      '*.entryToken',
    ],
    censor: '[REDACTED]',
  },
});
