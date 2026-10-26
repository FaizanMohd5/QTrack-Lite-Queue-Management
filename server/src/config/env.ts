import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(32),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  SHOP_SLUG: z.string().min(3).default('habib-clinic'),
  SHOP_NAME: z.string().min(2).default('Habib Clinic'),
  SHOP_TIMEZONE: z.string().min(1).default('Asia/Kolkata'),
  OWNER_PASSWORD: z.string().min(10).optional(),
  SEED_DEMO_QUEUE: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment configuration', result.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = result.data;
