import { normalizeKey } from "./excel";
import type { ColumnDef } from "./imports";

/**
 * IMPORT FAYLINING SARLAVHALARINI TEKSHIRISH
 * ==========================================
 * Ilgari fayl "o'qilmagan" ko'rinsa, foydalanuvchi sababini bilmasdi:
 * jadval to'lardi, lekin har bir qator qizil "F.I.Sh. bo'sh" bo'lardi.
 * Aslida sabab bitta — ustun sarlavhalari mos kelmagan (masalan
 * o'qituvchilar bo'limiga o'quvchilar shabloni yuklangan).
 *
 * Shu modul faylni qatorlab tekshirishdan OLDIN ishlaydi va tushunarli
 * bitta xabar qaytaradi.
 */

/** Faylda mavjud bo'lgan normallashtirilgan sarlavhalar to'plami. */
function headerKeys(headers: string[]): Set<string> {
  const set = new Set<string>();
  headers.forEach((header) => {
    const key = normalizeKey(header);
    if (key !== "") set.add(key);
  });
  return set;
}

/** Majburiy ustunlardan qaysilari faylda yo'q (birinchi alias nomi bilan). */
export function findMissingRequiredColumns(
  headers: string[],
  columns: ColumnDef[]
): string[] {
  const present = headerKeys(headers);
  return columns
    .filter((column) => column.required === true)
    .filter((column) => !column.aliases.some((alias) => present.has(normalizeKey(alias))))
    .map((column) => column.aliases[0]);
}

/** Fayl boshqa bo'limning shabloniga o'xshaydimi? */
function looksLikeOtherTemplate(headers: string[], otherHeaders: string[]): boolean {
  const present = headerKeys(headers);
  const matches = otherHeaders.filter((header) => present.has(normalizeKey(header)));
  return matches.length >= 2;
}

/**
 * Majburiy ustunlar bor-yo'qligini tekshiradi.
 *
 * @returns xato matni (foydalanuvchiga ko'rsatiladi) yoki `null` — hammasi joyida.
 */
export function checkImportHeaders(args: {
  headers: string[];
  columns: ColumnDef[];
  /** Boshqa bo'lim shabloni sarlavhalari — adashib yuklaganini aniqlash uchun. */
  otherTemplateHeaders: string[];
  /** Boshqa bo'lim nomi ("o'quvchilar" / "o'qituvchilar"). */
  otherTemplateName: string;
}): string | null {
  const { headers, columns, otherTemplateHeaders, otherTemplateName } = args;

  const missing = findMissingRequiredColumns(headers, columns);
  if (missing.length === 0) return null;

  const found = headers.filter((header) => header.trim() !== "");
  const parts = [
    `Faylda kerakli ustun topilmadi: ${missing.join(", ")}.`,
    found.length > 0
      ? `Fayldagi ustunlar: ${found.join(", ")}.`
      : "Faylning birinchi qatori bo'sh — u ustun sarlavhalari bo'lishi kerak.",
  ];

  if (looksLikeOtherTemplate(headers, otherTemplateHeaders)) {
    parts.push(
      `Bu ${otherTemplateName} shabloniga o'xshaydi. Shu bo'limning "Shablonni yuklab olish" tugmasidan to'g'ri shablonni oling.`
    );
  } else {
    parts.push(
      "Shablonni yuklab olib, birinchi qatordagi sarlavhalarni o'zgartirmasdan to'ldiring."
    );
  }

  return parts.join(" ");
}
