import { z } from "zod";
import { StudentStatus } from "@prisma/client";

/**
 * O'QUVCHILAR — KIRISH VALIDATSIYASI
 * ==================================
 *
 * Bu fayl faqat "ma'lumot shakli" ni tekshiradi. "Bu odam shu o'quvchini
 * ko'rishi/o'zgartirishi mumkinmi?" savoli — auth-guard.ts va scope.ts
 * (`assertCanAccessStudent`) mas'uliyatida.
 *
 * BITTA MANBA QOIDASI (H5a)
 * -------------------------
 * Tug'ilgan sana va telefon qoidalari shu fayldan EKSPORT qilinadi va
 * `imports.ts` (Excel import) shu yerdan oladi. Ilgari import o'zining
 * alohida, yumshoqroq tekshiruvini yuritardi — natijada forma rad etgan
 * qiymat (masalan 3026-yil yoki "aaa" telefon) import orqali bazaga
 * tushardi. Qoida ikki joyda takrorlanmasa, biri eskirib qolmaydi.
 */

function emptyToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().max(200).optional());

/** "YYYY-MM-DD" — `<input type="date">` shu shaklda yuboradi. */
export const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Sana kalendarda HAQIQATAN mavjudmi?
 *
 * Shakl tekshiruvi yetarli emas: "2026-02-31" naqshga mos keladi, lekin
 * bunday kun yo'q. `Date` uni 3-martga surib yuboradi — ya'ni jimgina
 * boshqa sana saqlanadi. Shuning uchun qaytib matnga aylantirib solishtiramiz.
 */
export function isRealDate(text: string): boolean {
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
export function isSaneBirthDate(text: string): boolean {
  const year = Number(text.slice(0, 4));
  const currentYear = new Date().getUTCFullYear();
  return year >= 1900 && year <= currentYear;
}

/* ------------------------------------------------------------------ */
/* Telefon qoidasi — forma va import uchun bitta manba                 */
/* ------------------------------------------------------------------ */

/** Bazadagi ustun 200 belgi bo'lsa ham, real raqam 30 belgidan uzun bo'lmaydi. */
export const MAX_PHONE_LENGTH = 30;

/** "+998 90 123 45 67" — eng qisqa mantiqiy raqam ham 7 ta raqamdan iborat. */
export const MIN_PHONE_DIGITS = 7;

export function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

export function hasEnoughPhoneDigits(value: string): boolean {
  return countDigits(value) >= MIN_PHONE_DIGITS;
}

export const PHONE_DIGITS_MESSAGE = `Telefon raqamida kamida ${MIN_PHONE_DIGITS} raqam bo'lishi kerak.`;
export const PHONE_LENGTH_MESSAGE = `Telefon raqami ${MAX_PHONE_LENGTH} belgidan uzun bo'lmasligi kerak.`;
export const BIRTH_DATE_FORMAT_MESSAGE =
  "Tug'ilgan sana YYYY-MM-DD ko'rinishida bo'lishi kerak.";
export const BIRTH_DATE_REAL_MESSAGE = "Bunday sana kalendarda mavjud emas.";
export const BIRTH_DATE_RANGE_MESSAGE =
  "Tug'ilgan sana 1900-yildan bugungi kungacha bo'lishi kerak.";

/**
 * Tug'ilgan sana matni uchun qayta ishlatiladigan sxema.
 *
 * TUZATILDI: ilgari bu maydon oddiy matn edi (`max(200)`), ya'ni istalgan
 * 200 belgili qiymat bazaga o'tib ketardi — masalan "salom" yoki
 * "2026-02-31". Bunday qiymat keyin `new Date(...)` da `Invalid Date` ga
 * aylanib, sahifani buzishi yoki noto'g'ri sana saqlanishi mumkin edi.
 */
export const birthDateText = z
  .string()
  .regex(DATE_TEXT_PATTERN, BIRTH_DATE_FORMAT_MESSAGE)
  .refine(isRealDate, BIRTH_DATE_REAL_MESSAGE)
  .refine(isSaneBirthDate, BIRTH_DATE_RANGE_MESSAGE);

/**
 * Telefon matni uchun qayta ishlatiladigan sxema.
 *
 * Format qat'iy emas, chunki ota-onalar raqamni turlicha yozadi (+998,
 * bo'shliq, qavs) — lekin raqam BO'LISHI shart. Aks holda "aaa" kabi qiymat
 * saqlanib, keyin SMS yuborish (`absence-notice`) bo'sh joyga ketardi.
 */
export const phoneText = z
  .string()
  .max(MAX_PHONE_LENGTH, PHONE_LENGTH_MESSAGE)
  .refine(hasEnoughPhoneDigits, PHONE_DIGITS_MESSAGE);

const dateOfBirthField = z.preprocess(emptyToUndefined, birthDateText.optional());

const phoneField = z.preprocess(emptyToUndefined, phoneText.optional());

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
