import type { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * AUDIT JURNALI (Punkt 4)
 * =======================
 *
 * TZ 3.1 talabi: "Har bir muhim amal audit jurnaliga yoziladi (kim, nima, qachon)".
 * `AuditLog` modeli sxemada bor edi, lekin unga yozadigan funksiya yo'q edi —
 * ya'ni talab bajarilmagan hisoblanardi. Shu fayl uni bajaradi.
 *
 * MUHIM TAMOYIL: audit yozuvi hech qachon asosiy amalni buzmaydi.
 * Agar jurnalga yozish xato bersa, foydalanuvchining ishi to'xtamaydi — xato
 * server logiga tushadi. Aks holda jurnal tizimning eng zaif nuqtasiga aylanadi.
 */

/** Jurnalga yoziladigan amallar. */
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGED"
  | "PERMISSION_DENIED"
  | "EXPORT";

export type AuditInput = {
  /** Amalni bajargan foydalanuvchi. Noma'lum bo'lsa (masalan LOGIN_FAILED) — null. */
  userId?: string | null;
  action: AuditAction;
  /** Model nomi: "Student", "Grade", "Payment", ... */
  entity: string;
  entityId?: string | null;
  /** Qo'shimcha kontekst. Maxfiy maydonlar avtomatik redaksiya qilinadi. */
  meta?: Record<string, unknown> | null;
};

/**
 * Maxfiy ma'lumot tushishi mumkin bo'lgan kalitlar — QISM SATR bo'yicha.
 *
 * Bu yerga faqat bir ma'noli, uzun tokenlar kiradi. Ular kalit nomining
 * istalgan joyida uchrasa — qiymat yashiriladi.
 *
 * `credential` ataylab qo'shildi: import ustasi yangi hisoblarning
 * boshlang'ich parollarini `outcome.credentials` ichida olib yuradi va
 * eski shablon (`pass|parol|token|...`) uni USHLAMAS EDI.
 */
const SECRET_SUBSTRING_PATTERN =
  /pass|parol|pwd|token|secret|credential|hash|authorization|bearer|cookie|session|apikey|api[-_]?key|private[-_]?key|signature|recovery/i;

/**
 * Qisqa va ko'p ma'noli tokenlar — faqat TO'LIQ SO'Z sifatida.
 *
 * Nima uchun alohida: agar `pin` ni qism satr sifatida qidirsak,
 * `mapping`, `shipping`, `spinner` kabi butunlay zararsiz kalitlar ham
 * yashirilib ketadi va jurnal foydasiz bo'lib qoladi. Shuning uchun
 * kalit nomi so'zlarga bo'linadi (camelCase / snake_case / kebab-case)
 * va har bir so'z alohida solishtiriladi: `userPin` -> ["user", "pin"].
 */
const SECRET_EXACT_WORDS = new Set([
  "otp",
  "pin",
  "salt",
  "jwt",
  "iv",
  "mfa",
  "totp",
  "auth",
]);

/** Rekursiya chuqurligi chegarasi (tsiklik havolalardan himoya). */
const MAX_DEPTH = 4;

/**
 * Bitta `meta` massividan jurnalga yoziladigan maksimal element soni.
 *
 * Import oqimi 1000+ qatorli massiv uzatishi mumkin. Uni to'liq yozish
 * `AuditLog` jadvalini shishiradi va jurnalni o'qib bo'lmaydigan qiladi.
 */
const MAX_ARRAY_ITEMS = 50;

/** Kalit nomini so'zlarga ajratadi: "userPin_2" -> ["user", "pin", "2"]. */
function keyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

/** Kalit maxfiy ma'lumot olib yurishi mumkinmi? */
export function isSecretKey(key: string): boolean {
  if (SECRET_SUBSTRING_PATTERN.test(key)) return true;
  return keyWords(key).some((word) => SECRET_EXACT_WORDS.has(word));
}

/**
 * Massivni tozalaydi.
 *
 * NIMA UCHUN ALOHIDA FUNKSIYA KERAK BO'LDI: ilgari `redactMeta` massivni
 * `!Array.isArray(value)` sharti bilan ATAYLAB chetlab o'tar va uni
 * o'zgarishsiz jurnalga yozardi. Ya'ni:
 *
 *   logAudit({ meta: { rows: [{ email, password }] } })
 *
 * chaqiruvida `rows` massiv bo'lgani uchun ichidagi `password` maydoni
 * tozalanmay, `AuditLog` ga OCHIQ MATNDA tushardi. Import oqimi aynan
 * shu shaklda ma'lumot uzatadi — ya'ni bu nazariy emas, real oqim edi.
 */
function redactList(list: unknown[], depth: number): unknown[] {
  if (depth > MAX_DEPTH) return [{ truncated: true }];

  const cleaned: unknown[] = list
    .slice(0, MAX_ARRAY_ITEMS)
    .map((item) => {
      if (Array.isArray(item)) return redactList(item, depth + 1);
      if (item && typeof item === "object") {
        return redactMeta(item as Record<string, unknown>, depth + 1);
      }
      return item;
    });

  if (list.length > MAX_ARRAY_ITEMS) {
    cleaned.push({ truncated: list.length - MAX_ARRAY_ITEMS });
  }

  return cleaned;
}

/**
 * `meta` ni tozalaydi — parol, token va shunga o'xshash qiymatlar jurnalga
 * tushmasligi kerak. Jurnal ko'pincha uzoq saqlanadi va ko'p odam ko'radi,
 * shuning uchun u maxfiy ma'lumot uchun eng noqulay joy.
 *
 * Ichma-ich obyektlar VA massivlar tozalanadi (chuqurlik cheklovi bilan —
 * cheksiz rekursiyadan himoya).
 */
export function redactMeta(
  meta: Record<string, unknown> | null | undefined,
  depth = 0
): Record<string, unknown> | null {
  if (!meta) return null;
  if (depth > MAX_DEPTH) return { truncated: true };

  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (isSecretKey(key)) {
      clean[key] = "[redacted]";
      continue;
    }

    if (Array.isArray(value)) {
      clean[key] = redactList(value, depth + 1);
      continue;
    }

    if (value && typeof value === "object") {
      clean[key] = redactMeta(value as Record<string, unknown>, depth + 1);
      continue;
    }

    clean[key] = value;
  }

  return clean;
}

/**
 * Xato MATNIDAN maxfiy qiymatlarni olib tashlaydi.
 *
 * Nima uchun kerak: `redactMeta` faqat `meta` ni tozalaydi, xato matnini
 * emas. Prisma esa xato matniga real qiymatlarni qo'shadi, masalan:
 *
 *   Unique constraint failed... Invalid `db.user.create()`:
 *   { email: "ali@maktab.uz", passwordHash: "$2b$10$..." }
 *   ... postgresql://postgres:parol@db.host:5432/crm
 *
 * Bu matn to'g'ridan-to'g'ri server logiga tushardi. Log fayllari
 * ko'pincha uchinchi tomon xizmatiga (Vercel, Sentry) uzatiladi —
 * ya'ni bazadagi qiymat tashqariga chiqib ketadi.
 *
 * Tartib muhim: avval URL (uning ichida ham @ ham raqam bor), keyin
 * qolganlari.
 */
export function sanitizeErrorMessage(input: string): string {
  return input
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"']+/gi, "[url]")
    .replace(/\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}/g, "[hash]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\+?\d[\d\s()-]{7,}\d/g, "[raqam]")
    .slice(0, 500);
}

/**
 * Noma'lum xatoni logga yozish uchun XAVFSIZ satrga aylantiradi.
 *
 * `logger.ts` ni chaqira olmaymiz: `logger.ts` shu fayldan `redactMeta` ni
 * import qiladi, teskari import aylanma bog'liqlik (circular import) hosil
 * qiladi. Shuning uchun mantiq shu yerda turadi va `logger.ts` uni
 * shu yerdan oladi — manba bitta.
 */
export function describeErrorSafely(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${sanitizeErrorMessage(error.message)}`;
  }
  return "noma'lum xato";
}

/**
 * Identifikatorni qismini yashiradi: "admin@school.uz" → "ad***@school.uz".
 *
 * Nima uchun kerak: muvaffaqiyatsiz login urinishlarini kuzatish uchun qaysi
 * hisobga urinilganini bilish zarur (Punkt 6 — brute-force himoyasi), lekin
 * to'liq email/telefonni jurnalga yozish maxfiylik talabiga zid.
 */
export function maskIdentifier(value: string): string {
  if (value.length <= 2) return "***";

  const atIndex = value.indexOf("@");
  if (atIndex > 0) {
    return `${value.slice(0, 2)}***${value.slice(atIndex)}`;
  }

  // Telefon: oxirgi 4 raqam qoldiriladi
  return `***${value.slice(-4)}`;
}

/**
 * O'zgargan maydon NOMLARINI qaytaradi — qiymatlarini emas.
 *
 * Audit uchun "telefon o'zgardi" degan ma'lumot yetarli; eski va yangi telefon
 * raqamini jurnalga yozish PII to'planishiga olib keladi.
 */
export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];

  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key);
    }
  }

  return changed;
}

/**
 * Audit jurnaliga yozadi.
 *
 * Hech qachon `throw` qilmaydi — asosiy amalni buzmasligi uchun.
 *
 * @example
 * await logAudit({
 *   userId: user.id,
 *   action: "UPDATE",
 *   entity: "Student",
 *   entityId: student.id,
 *   meta: { fields: changedFields(before, after) },
 * });
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: (redactMeta(input.meta) ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  } catch (error) {
    // Jurnal xatosi asosiy amalni to'xtatmaydi — faqat server logiga tushadi.
    //
    // DIQQAT: bu yerga xom `error` obyektini BERIB BO'LMAYDI. Prisma xatosi
    // matnida yozilmoqchi bo'lgan qator qiymatlari (email, hash) va ulanish
    // satri bo'ladi — ya'ni maxfiylikni saqlash uchun yozilgan funksiyaning
    // o'zi maxfiylikni buzardi.
    console.error(
      "[audit] jurnalga yozish muvaffaqiyatsiz:",
      describeErrorSafely(error)
    );
  }
}
