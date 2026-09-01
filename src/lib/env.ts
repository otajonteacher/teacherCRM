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

/**
 * Bo'sh qiymatni `undefined` ga aylantiradi va chetdagi bo'shliqlarni kesadi.
 *
 * Nima uchun `trim` MUHIM: Windows `cmd` da `set QUERY_LOG=1 && npm run dev`
 * yozilsa, qiymat `"1 "` bo'lib ketadi — `&&` dan oldingi bo'shliq ham
 * qiymatga qo'shiladi. Xuddi shu narsa `.env` faylida qatordan keyin
 * bo'shliq qolib ketsa ham sodir bo'ladi. Kesmasak, ilova tushunarsiz
 * "Invalid enum value" xatosi bilan to'xtaydi.
 */
function cleanEnv(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * `next build` ham `NODE_ENV=production` bilan ishlaydi, lekin build paytida
 * ilova hech qanday so'rovga javob bermaydi — demak `AUTH_URL` ham kerak emas.
 * Xuddi shu narsa CI uchun ham to'g'ri (u faqat tekshiruv o'tkazadi).
 *
 * Shu sababli `AUTH_URL` majburiyligi **ishlash vaqtida** (server ko'tarilganda)
 * qo'llanadi — himoya kuchi kamaymaydi, lekin build/CI bejiz to'xtamaydi.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const isCi = cleanEnv(process.env.CI) === "true";
const skipRuntimeOnlyChecks = isBuildPhase || isCi;

const envSchema = z
  .object({
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

    /**
     * Ilovaning tashqi manzili, masalan `https://crm.maktab.uz`.
     *
     * XAVFSIZLIK: ishlab chiqarishda (server ko'tarilganda) MAJBURIY. Auth.js
     * callback va yo'naltirish manzillarini `Host`/`X-Forwarded-Host`
     * sarlavhasidan olsa, hujumchi o'z domenini ko'rsatib sessiya havolasini
     * o'g'irlashi mumkin (host header injection → fishing). `AUTH_URL` qat'iy
     * berilganda ilova hech qachon boshqa domenga yo'naltirmaydi.
     */
    AUTH_URL: z
      .string()
      .url("AUTH_URL to'g'ri URL bo'lishi kerak, masalan https://crm.maktab.uz")
      .optional(),

    /**
     * `true` — Auth.js `Host` sarlavhasiga ishonadi (self-hosted rejim).
     * Kod ichida `trustHost: true` qo'yilgan; bu o'zgaruvchi faqat hujjat
     * uchun qabul qilinadi.
     */
    AUTH_TRUST_HOST: z.enum(["true", "false"]).optional(),

    SEED_PASSWORD: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
    ESKIZ_EMAIL: z.string().email().optional(),
    ESKIZ_PASSWORD: z.string().min(1).optional(),

    // —— Vaqtinchalik o'lchov sozlamalari (0-to'lqin 0.2) ——
    // Faqat lokal ishlatiladi; ishlab chiqarishda e'tiborga olinmaydi.
    /** `1` → har Prisma so'rovi va davomiyligi logga chiqadi. */
    QUERY_LOG: z.enum(["0", "1"]).optional(),
    /** "SEKIN" deb belgilash chegarasi, millisekundda (sukut: 100). */
    QUERY_LOG_MS: z.coerce.number().int().positive().optional(),
    /** `1` → SQL parametrlari ham chiqadi. Maxfiy ma'lumot bo'lishi mumkin. */
    QUERY_LOG_PARAMS: z.enum(["0", "1"]).optional(),
  })
  .superRefine((value, ctx) => {
    // Build va CI bosqichida ilova so'rovga javob bermaydi → tekshiruv kerak emas.
    if (value.NODE_ENV !== "production" || skipRuntimeOnlyChecks) return;

    // 1) AUTH_URL ishlab chiqarishda majburiy.
    if (!value.AUTH_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_URL"],
        message:
          "ishlab chiqarishda majburiy. Masalan: AUTH_URL=https://crm.maktab.uz " +
          "(lokal sinov uchun http://localhost:3000). Sababi: Auth.js " +
          "yo'naltirish manzilini Host sarlavhasidan olmasligi kerak.",
      });
      return;
    }

    // 2) Ishlab chiqarishda HTTPS shart (localhost bundan mustasno) —
    //    aks holda sessiya cookie'si ochiq kanalda uzatiladi.
    let parsedUrl: URL | undefined;
    try {
      parsedUrl = new URL(value.AUTH_URL);
    } catch {
      return;
    }

    const isLocal =
      parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";

    if (parsedUrl.protocol !== "https:" && !isLocal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_URL"],
        message:
          "ishlab chiqarishda https:// bo'lishi kerak — aks holda sessiya " +
          "cookie'si shifrlanmagan kanalda uzatiladi.",
      });
    }
  });

const parsed = envSchema.safeParse({
  NODE_ENV: cleanEnv(process.env.NODE_ENV),
  DATABASE_URL: cleanEnv(process.env.DATABASE_URL),
  AUTH_SECRET: cleanEnv(process.env.AUTH_SECRET),
  AUTH_URL: cleanEnv(process.env.AUTH_URL),
  AUTH_TRUST_HOST: cleanEnv(process.env.AUTH_TRUST_HOST),
  SEED_PASSWORD: cleanEnv(process.env.SEED_PASSWORD),
  OPENAI_API_KEY: cleanEnv(process.env.OPENAI_API_KEY),
  ANTHROPIC_API_KEY: cleanEnv(process.env.ANTHROPIC_API_KEY),
  GOOGLE_GENERATIVE_AI_API_KEY: cleanEnv(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ),
  ESKIZ_EMAIL: cleanEnv(process.env.ESKIZ_EMAIL),
  ESKIZ_PASSWORD: cleanEnv(process.env.ESKIZ_PASSWORD),
  QUERY_LOG: cleanEnv(process.env.QUERY_LOG),
  QUERY_LOG_MS: cleanEnv(process.env.QUERY_LOG_MS),
  QUERY_LOG_PARAMS: cleanEnv(process.env.QUERY_LOG_PARAMS),
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Muhit o'zgaruvchilari noto'g'ri:\n${issues}`);
}

export const env = parsed.data;
