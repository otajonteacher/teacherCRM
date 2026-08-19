import { z } from "zod";

/**
 * MUHIT O'ZGARUVCHILARI (Punkt 10)
 * ================================
 *
 * `DATABASE_URL` yoki `AUTH_SECRET` yo'q/bo'sh bo'lsa, ilova ishga tushib
 * keyin tushunarsiz xato berardi. Shu fayl ishga tushishda tekshiradi.
 *
 * Qoida: maxfiy kalitga `NEXT_PUBLIC_` qo'yilmaydi — u brauzerga tushadi.
 * AI/SMS kalitlari ixtiyoriy: yo'q bo'lsa modul "ulanmagan" holatda qoladi.
 */

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return value;
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string({
      required_error: "DATABASE_URL majburiy.",
    })
    .url("DATABASE_URL to'g'ri URL bo'lishi kerak."),
  AUTH_SECRET: z
    .string({
      required_error: "AUTH_SECRET majburiy.",
    })
    .min(32, "AUTH_SECRET kamida 32 belgi bo'lishi kerak."),
  SEED_PASSWORD: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
  ESKIZ_EMAIL: z.string().email().optional(),
  ESKIZ_PASSWORD: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  SEED_PASSWORD: emptyToUndefined(process.env.SEED_PASSWORD),
  OPENAI_API_KEY: emptyToUndefined(process.env.OPENAI_API_KEY),
  ANTHROPIC_API_KEY: emptyToUndefined(process.env.ANTHROPIC_API_KEY),
  GOOGLE_GENERATIVE_AI_API_KEY: emptyToUndefined(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ),
  ESKIZ_EMAIL: emptyToUndefined(process.env.ESKIZ_EMAIL),
  ESKIZ_PASSWORD: emptyToUndefined(process.env.ESKIZ_PASSWORD),
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Muhit o'zgaruvchilari noto'g'ri:\n${issues}`);
}

export const env = parsed.data;
