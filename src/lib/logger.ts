import { redactMeta, sanitizeErrorMessage } from "./audit";
import { env } from "./env";

/**
 * LOG GIGIENASI (Punkt 11)
 * ========================
 *
 * Prod'da faqat strukturaviy JSON. Parol, token, PII `redactMeta` bilan
 * yashiriladi. Foydalanuvchiga stack/SQL chiqarilmaydi — bu faqat server log.
 *
 * MAXFIYLIK QOIDASI (PR D): `meta` ni tozalash YETARLI EMAS.
 * Xatoning O'Z MATNI ham maxfiy qiymat olib yuradi — Prisma xato matniga
 * yozilmoqchi bo'lgan qatorni va ba'zan `DATABASE_URL` ni qo'shadi.
 * Shuning uchun `message` ham `sanitizeErrorMessage` dan o'tadi.
 *
 * `sanitizeErrorMessage` ataylab `audit.ts` da turadi: bu fayl allaqachon
 * o'sha yerdan `redactMeta` ni oladi, teskari import esa aylanma
 * bog'liqlik hosil qilardi.
 */

export function logError(
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>
): void {
  const rawMessage = error instanceof Error ? error.message : String(error);

  const payload = {
    ts: new Date().toISOString(),
    level: "error" as const,
    scope,
    message: sanitizeErrorMessage(rawMessage),
    meta: redactMeta(meta ?? null),
  };

  if (env.NODE_ENV === "production") {
    console.error(JSON.stringify(payload));
    return;
  }

  // Lokal ishlab chiqishda xom `error` (stack bilan) ataylab chiqariladi —
  // nosozlikni topish uchun kerak. Bu log hech qayerga uzatilmaydi.
  console.error(`[${scope}]`, error, payload.meta ?? "");
}
