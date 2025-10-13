import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { logger } from './utils/logger.js';

loadEnv({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(5000),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_STT_MODEL: z.string().default('whisper-1'),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  ELEVENLABS_API_KEY: z.string().optional(),
  GOOGLE_PROJECT_ID: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  USE_MOCK: z
    .union([z.boolean(), z.string()])
    .default(false)
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      return val.toLowerCase() === 'true';
    }),
  MOCK_IVR_PROFILE: z.string().default('telecom-basic'),
  PUBLIC_WS_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:5000'),
  DATABASE_URL: z.string().default('./data/app.db'),
  CALL_MAX_MINUTES: z.coerce.number().min(1).default(10),
  WS_HEARTBEAT_MS: z.coerce.number().min(1000).default(10_000),
  AUDIO_CHUNK_MS: z.coerce.number().min(50).default(200)
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);

if (env.USE_MOCK) {
  logger.warn(
    {
      profile: env.MOCK_IVR_PROFILE
    },
    'Running in MOCK mode – no external services will be used.'
  );
}
