import { z } from 'zod';
import { normalizePhone } from '../utils/phone';

export const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const entryTokenSchema = z.string().min(40).max(100).regex(/^[A-Za-z0-9_-]+$/);

export const joinQueueSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(10)
    .max(30)
    .transform((phone, context) => {
      const normalized = normalizePhone(phone);
      if (!normalized) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid phone number.' });
        return z.NEVER;
      }
      return { raw: phone, normalized };
    }),
});

export const loginSchema = z.object({ password: z.string().min(1).max(200) });

export const advanceSchema = z.object({ expectedServingEntryId: z.string().min(1).nullable() });

export const entryIdSchema = z.string().min(1).max(100);
