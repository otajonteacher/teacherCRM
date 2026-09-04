import { z } from "zod";
import { StudentStatus } from "@prisma/client";

/**
 * O'QUVCHILAR — KIRISH VALIDATSIYASI
 * ==================================
 *
 * Bu fayl faqat "ma'lumot shakli" ni tekshiradi. "Bu odam shu o'quvchini
 * ko'rishi/o'zgartirishi mumkinmi?" savoli — auth-guard.ts va scope.ts
 * (`assertCanAccessStudent`) mas'uliyatida.
 */

function emptyToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().max(200).optional());

/** "YYYY-MM-DD" — `<input type="date">` shu shaklda yuboradi. */
const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Sana kalendarda HAQIQATAN mavjudmi?
 *
 * Shakl tekshiruvi yetarli emas: "2026-02-31" naqshga mos keladi, lekin
 * bunday kun yo'q. `Date` uni 3-martga surib yuboradi — ya'ni jimgina
 * boshqa sana saqlanadi. Shuning uchun qaytib matnga aylantirib solishtiramiz.
 */
function isRealDate(text: string): boolean {
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === text;
}

/**
 * Tug'ilgan sana mantiqqa to'g'ri keladimi: 1900-yildan bugungi kungacha.
 *
 * Kelajakdagi sana ham, 1800-yil ham xato kiritish belgisi. Bunday qiymat
 * keyinchalik yosh bo'yicha hisobot va saralashni buzadi.
 */
function isSaneBirthDate(text: string): boolean {
  const year = Number(text.slice(0, 4));
  const currentYear = new Date().getUTCFullYear();
  return year >= 1900 && year <= currentYear;
}

/**
 * Tug'ilgan sana.
 *
 * TUZATILDI: ilgari bu maydon oddiy matn edi (`max(200)`), ya'ni istalgan
 * 200 belgili qiymat bazaga o'tib ketardi — masalan "salom" yoki
 * "2026-02-31". Bunday qiymat keyin `new Date(...)` da `Invalid Date` ga
 * aylanib, sahifani buzishi yoki noto'g'ri sana saqlanishi mumkin edi.
 */
const dateOfBirthField = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(
      DATE_TEXT_PATTERN,
      "Tug'ilgan sana YYYY-MM-DD ko'rinishida bo'lishi kerak."
    )
    .refine(isRealDate, "Bunday sana kalendarda mavjud emas.")
    .refine(
      isSaneBirthDate,
      "Tug'ilgan sana 1900-yildan bugungi kungacha bo'lishi kerak."
    )
    .optional()
);

/**
 * Telefon raqami.
 *
 * TUZATILDI: ilgari oddiy matn edi. Endi kamida 7 raqam talab qilinadi —
 * aks holda "aaa" kabi qiymat saqlanib, keyin SMS yuborish (`absence-notice`)
 * bo'sh joyga ketardi. Format qat'iy emas, chunki ota-onalar raqamni turlicha
 * yozadi (+998, bo'shliq, qavs) — lekin raqam BO'LISHI shart.
 */
const phoneField = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .max(30)
    .refine(
      (value) => (value.match(/\d/g) ?? []).length >= 7,
      "Telefon raqamida kamida 7 raqam bo'lishi kerak."
    )
    .optional()
);

export const studentWriteSchema = z.object({
  firstName: z.preprocess(emptyToUndefined, z.string().min(1).max(80)),
  lastName: z.preprocess(emptyToUndefined, z.string().min(1).max(80)),
  dateOfBirth: dateOfBirthField,
  gender: z.preprocess(emptyToUndefined, z.enum(["male", "female"]).optional()),
  address: optionalText,
  classId: optionalText,
  status: z.preprocess(
    (value) => emptyToUndefined(value) ?? StudentStatus.ACTIVE,
    z.nativeEnum(StudentStatus)
  ),
  guardianName: optionalText,
  guardianPhone: phoneField,
  guardianRelation: optionalText,
});

export const studentUpdateSchema = studentWriteSchema.extend({
  id: z.preprocess(emptyToUndefined, z.string().min(1)),
});

export type StudentWriteInput = z.infer<typeof studentWriteSchema>;
