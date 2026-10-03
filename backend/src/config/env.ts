import { z } from 'zod';

const envSchema = z.object({
    PORT: z.string().default('4000'),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('30m'),
});

export type Env = z.infer<typeof envSchema>;
export const env: Env = envSchema.parse(process.env);