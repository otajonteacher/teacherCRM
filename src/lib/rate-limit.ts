/**
 * LOGIN RATE LIMIT (Punkt 6)
 * ==========================
 *
 * `authorize()` da cheklov yo'q edi — skript soatda minglab parol sinashi mumkin.
 * 15 daqiqada login bo'yicha 5, IP bo'yicha 20 urinish.
 *
 * Sanash mantig'i endi `rate-limit-core.ts` da (Edge-safe, xotira chegarasi bor).
 * Bu fayl faqat login qoidalarini va Node tomonidagi IP o'qishni beradi.
 *
 * Muhim: limitga tushganda ham javob oddiy login xatosi bilan bir xil.
 * Aks holda hujumchi "bu hisob bor" deb aniqlab oladi.
 */

import { countRecent, record, resetKey } from "./rate-limit-core";

const WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const IP_MAX_ATTEMPTS = 20;

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function loginAttemptKeys(login: string, ip: string) {
  return {
    loginKey: `login:${normalizeLogin(login)}`,
    ipKey: `ip:${ip || "unknown"}`,
  };
}

/** Login yoki IP limitidan oshganmi. */
export function isLoginRateLimited(login: string, ip: string): boolean {
  const { loginKey, ipKey } = loginAttemptKeys(login, ip);
  return (
    countRecent(loginKey, WINDOW_MS) >= LOGIN_MAX_ATTEMPTS ||
    countRecent(ipKey, WINDOW_MS) >= IP_MAX_ATTEMPTS
  );
}

/** Muvaffaqiyatsiz urinishni hisobga oladi. */
export function recordLoginFailure(login: string, ip: string): void {
  const { loginKey, ipKey } = loginAttemptKeys(login, ip);
  record(loginKey, WINDOW_MS);
  record(ipKey, WINDOW_MS);
}

/** Muvaffaqiyatli kirishdan keyin shu login hisoblagichini tozalaydi. */
export function clearLoginFailures(login: string): void {
  const { loginKey } = loginAttemptKeys(login, "unused");
  resetKey(loginKey);
}

/** So'rov IP si (Node runtime). Proxy orqasida x-forwarded-for / x-real-ip. */
export async function getRequestIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() || "unknown";
    }
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}
