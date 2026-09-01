import { redactMeta } from "./audit";
import { env } from "./env";

/**
 * LOG GIGIENASI (Punkt 11)
 * ========================
 *
 * Prod'da faqat strukturaviy JSON. Parol, token, PII `redactMeta` bilan
 * yashiriladi. Foydalanuvchiga stack/SQL chiqarilmaydi — bu faqat server log.
 */

export function logError(
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>
): void {
  const payload = {
    ts: new Date().toISOString(),
    level: "error" as const,
    scope,
    message: error instanceof Error ? error.message : String(error),
    meta: redactMeta(meta ?? null),
  };

  if (env.NODE_ENV === "production") {
    console.error(JSON.stringify(payload));
    return;
  }

  console.error(`[${scope}]`, error, payload.meta ?? "");
}
