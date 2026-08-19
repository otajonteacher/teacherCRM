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
 * Maxfiy ma'lumot tushishi mumkin bo'lgan kalitlar.
 * Bu ro'yxatga tushgan har qanday maydon qiymati "[redacted]" ga almashtiriladi.
 */
const SECRET_KEY_PATTERN =
  /pass|parol|token|secret|hash|authorization|cookie|session|apikey|api_key/i;

/**
 * `meta` ni tozalaydi — parol, token va shunga o'xshash qiymatlar jurnalga
 * tushmasligi kerak. Jurnal ko'pincha uzoq saqlanadi va ko'p odam ko'radi,
 * shuning uchun u maxfiy ma'lumot uchun eng noqulay joy.
 *
 * Ichma-ich obyektlar ham tozalanadi (chuqurlik cheklovi bilan — cheksiz
 * rekursiyadan himoya).
 */
export function redactMeta(
  meta: Record<string, unknown> | null | undefined,
  depth = 0
): Record<string, unknown> | null {
  if (!meta) return null;
  if (depth > 4) return { truncated: true };

  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      clean[key] = "[redacted]";
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      clean[key] = redactMeta(value as Record<string, unknown>, depth + 1);
      continue;
    }

    clean[key] = value;
  }

  return clean;
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
    console.error("[audit] jurnalga yozish muvaffaqiyatsiz:", error);
  }
}
