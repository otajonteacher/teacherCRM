/**
 * LOGIN RATE LIMIT (Punkt 6)
 * ==========================
 *
 * `authorize()` da cheklov yo'q edi — skript soatda minglab parol sinashi mumkin.
 * Bu modul in-memory sliding window: 15 daqiqada login bo'yicha 5, IP bo'yicha 20.
 *
 * Mahalliy / bitta instance uchun yetarli. Bir nechta server bo'lsa — Upstash Redis.
 *
 * Muhim: limitga tushganda ham javob oddiy login xatosi bilan bir xil.
 * Aks holda hujumchi "bu hisob bor" deb aniqlab oladi.
 */

const WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const IP_MAX_ATTEMPTS = 20;

type Bucket = { timestamps: number[] };

const store = new Map<string, Bucket>();

function prune(bucket: Bucket, now: number): number[] {
  return bucket.timestamps.filter((t) => now - t < WINDOW_MS);
}

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function loginAttemptKeys(login: string, ip: string) {
  return {
    loginKey: `login:${normalizeLogin(login)}`,
    ipKey: `ip:${ip || "unknown"}`,
  };
}

function count(key: string, now: number): number {
  const bucket = store.get(key);
  if (!bucket) return 0;

  const recent = prune(bucket, now);
  if (recent.length === 0) {
    store.delete(key);
    return 0;
  }

  bucket.timestamps = recent;
  return recent.length;
}

function bump(key: string, now: number): void {
  const bucket = store.get(key) ?? { timestamps: [] };
  bucket.timestamps = prune(bucket, now);
  bucket.timestamps.push(now);
  store.set(key, bucket);
}

/** Login yoki IP limtidan oshganmi. */
export function isLoginRateLimited(login: string, ip: string): boolean {
  const now = Date.now();
  const { loginKey, ipKey } = loginAttemptKeys(login, ip);
  return (
    count(loginKey, now) >= LOGIN_MAX_ATTEMPTS ||
    count(ipKey, now) >= IP_MAX_ATTEMPTS
  );
}

/** Muvaffaqiyatsiz urinishni hisobga oladi. */
export function recordLoginFailure(login: string, ip: string): void {
  const now = Date.now();
  const { loginKey, ipKey } = loginAttemptKeys(login, ip);
  bump(loginKey, now);
  bump(ipKey, now);
}

/** Muvaffaqiyatli kirishdan keyin shu login hisoblagichini tozalaydi. */
export function clearLoginFailures(login: string): void {
  const { loginKey } = loginAttemptKeys(login, "unused");
  store.delete(loginKey);
}

/** So'rov IP si. Proxy orqasida x-forwarded-for / x-real-ip. */
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
