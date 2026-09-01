/**
 * UMUMIY SO'ROV CHEKLOVI — YADRO (Edge-safe)
 * ==========================================
 *
 * NIMA UCHUN ALOHIDA FAYL?
 * `rate-limit.ts` ichida `next/headers` ishlatiladi — u Edge runtime'dagi
 * middleware bundle'iga tushsa build buziladi. Shuning uchun sanash mantig'i
 * shu yerda: bu fayl HECH QANDAY Next.js moduliga bog'liq emas, shu sababli
 * middleware (Edge), Server Action (Node) va route handler — hammasi
 * bemalol ishlata oladi.
 *
 * ALGORITM: sliding window. Har kalit uchun oxirgi urinishlar vaqti
 * saqlanadi, oynadan chiqqanlari tashlab yuboriladi.
 *
 * XOTIRA HIMOYASI (muhim!)
 * Hujumchi har safar boshqa IP bilan kelsa, Map cheksiz o'sib server
 * xotirasini yeb qo'yishi mumkin edi — ya'ni cheklovning o'zi DoS yo'liga
 * aylanardi. Shuning uchun `MAX_KEYS` chegarasi bor: oshib ketsa eng eski
 * kalitlar (Map qo'shilish tartibini saqlaydi) o'chiriladi.
 *
 * CHEKLOV: xotirada saqlanadi — bitta instance uchun. Bir nechta server
 * (Vercel, Kubernetes) bo'lsa Upstash Redis ga o'tish kerak.
 * Shu holat `docs/07-xavfsizlik.md` da yozib qo'yilgan.
 */

export type RateRule = {
  /** Oynada ruxsat etilgan maksimal so'rov soni. */
  limit: number;
  /** Oyna uzunligi (millisekund). */
  windowMs: number;
};

type Bucket = { timestamps: number[] };

const MAX_KEYS = 20_000;
const EVICT_TO = 18_000;

const store = new Map<string, Bucket>();

function prune(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

/** Map juda kattalashsa eng eski kalitlarni tashlab yuboradi. */
function evictIfNeeded(): void {
  if (store.size <= MAX_KEYS) return;
  for (const key of store.keys()) {
    if (store.size <= EVICT_TO) break;
    store.delete(key);
  }
}

/** Oyna ichidagi urinishlar soni. */
export function countRecent(key: string, windowMs: number): number {
  const bucket = store.get(key);
  if (!bucket) return 0;

  const recent = prune(bucket.timestamps, Date.now(), windowMs);
  if (recent.length === 0) {
    store.delete(key);
    return 0;
  }

  bucket.timestamps = recent;
  return recent.length;
}

/** Bitta urinishni yozib qo'yadi. */
export function record(key: string, windowMs: number): void {
  const now = Date.now();
  const bucket = store.get(key) ?? { timestamps: [] };
  bucket.timestamps = prune(bucket.timestamps, now, windowMs);
  bucket.timestamps.push(now);
  store.set(key, bucket);
  evictIfNeeded();
}

/** Kalit hisoblagichini butunlay tozalaydi. */
export function resetKey(key: string): void {
  store.delete(key);
}

/**
 * So'rovni "iste'mol qiladi".
 *
 * @returns `true` — ruxsat berildi, `false` — chegaradan oshdi.
 */
export function consume(key: string, rule: RateRule): boolean {
  if (countRecent(key, rule.windowMs) >= rule.limit) return false;
  record(key, rule.windowMs);
  return true;
}

/**
 * So'rov IP manzili. Proxy orqasida `x-forwarded-for` birinchi qiymati.
 *
 * Eslatma: bu sarlavhalarni mijoz soxtalashtirishi mumkin. Ishonchli
 * bo'lishi uchun ilova faqat ishonchli proxy (Vercel/Nginx) orqasida
 * turishi kerak — bu ham hujjatda yozilgan.
 */
export function ipFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}
