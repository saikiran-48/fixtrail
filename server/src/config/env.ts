import 'dotenv/config';
import { z } from 'zod';

// Parsed once at startup. If a required value is missing, the process exits
// immediately with a clear message, instead of failing later on the first request.
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    // Atlas (cloud) uses mongodb+srv://, a local container uses mongodb://.
    MONGODB_URI: z
      .string()
      .regex(/^mongodb(\+srv)?:\/\//, 'MONGODB_URI must start with mongodb:// or mongodb+srv://'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
    // Email-only login (no password). Fine for a test deployment, unsafe for real residents.
    DEMO_LOGIN: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    // Must be set to true on purpose to allow DEMO_LOGIN in production.
    DEMO_LOGIN_ACKNOWLEDGED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV === 'production' && cfg.DEMO_LOGIN && !cfg.DEMO_LOGIN_ACKNOWLEDGED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DEMO_LOGIN'],
        message:
          'Email-only login is insecure. For a test deployment, set DEMO_LOGIN_ACKNOWLEDGED=true as well. Otherwise set DEMO_LOGIN=false.',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
