import { z } from "zod";
import { idField, toNumber } from "./academics";

/**
 * BAHOLAR — OYLIK JURNAL (6-bosqich)
 * ===================================
 *
 * KO'RINISH: qog'oz jurnalning aynan o'zi. Qatorlar — o'quvchilar, ustunlar —
 * SANALAR, oxirida o'rtacha ball. Har bir fan o'qituvchisi o'z jurnalini
 * ochadi: ingliz tili o'qituvchisiga ingliz tili jurnali, rus tili
 * o'qituvchisiga rus tili jurnali.
 *
 * Nima uchun ustunlar sana: bir jurnal = bir fan. Shuning uchun fan nomini
 * ustunga yozish keraksiz takror bo'lardi. Fanlar ustun bo'lgan ko'rinish —
 * alohida "Jurnal" menyusida bo'ladi (sinf rahbari va admin uchun).
 *
 * KELISHILGAN QAROR: tizim FAQAT 100 BALLIK, butun son 0–100.
 *
 * Ma'lumot modeli davomatdan FARQ QILADI:
 *
 *   Attendance -> lessonId ga bog'langan, @@unique([studentId, lessonId, date])
 *   Grade      -> subjectId ga bog'langan, unique cheklovi YO'Q
 *
 * Ya'ni baho darsga emas, FANGA bog'lanadi — sxemani o'zgartirmaslik uchun
 * shunday kelishildi. Unique cheklovi yo'qligi sababli idempotentlik ilova
 * qatlamida ta'minlanadi: server (fan + chorak + sana + tur + o'quvchi)
 * bo'yicha mavjud bahoni O'ZI topadi. Klientdan baho ID si OLINMAYDI.
 *
 * Bu fayl faqat ma'lumot shakli va hisob-kitob bilan shug'ullanadi.
 * "Bu odam shu fanga baho qo'yishi mumkinmi?" savoli — scope.ts
 * (`assertCanGradeClassSubject`) mas'uliyatida.
 */

/** Baho turlari — Prisma'dagi `GradeType` enum bilan bir xil tartibda. */
export const GRADE_TYPES = ["DAILY", "CONTROL", "EXAM"] as const;

export type GradeTypeValue = (typeof GRADE_TYPES)[number];

/** 100 ballik tizim chegaralari. */
export const GRADE_MIN = 0;
export const GRADE_MAX = 100;

/**
 * Jadvaldagi maydon nomi: "grade:<studentId>:<YYYY-MM-DD>".
 *
 * Jadvalda bir vaqtda ko'p sana ko'rinadi, shuning uchun maydon nomi
 * o'quvchi bilan birga SANANI ham olib yuradi.
 */
export const ENTRY_PREFIX = "grade:";

/** "YYYY-MM-DD" — searchParams va forma maydonlari ishonchsiz manba. */
export const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM" — oy tanlagich qiymati. */
export const MONTH_TEXT_PATTERN = /^\d{4}-\d{2}$/;

/** Berilgan matn haqiqiy baho turimi? (`as const` tuple'da .includes ishlamaydi) */
export function isGradeType(value: unknown): value is GradeTypeValue {
  return GRADE_TYPES.some((type) => type === value);
}

/**
 * Jadval katakchalarini ro'yxatga aylantiradi.
 *
 * Bo'sh katakcha `null` bo'lib o'tadi va bu "bahoni O'CHIRISH" degani —
 * o'qituvchi xato kiritgan bahoni katakchani tozalab olib tashlaydi.
 *
 * Sana shakli buzuq bo'lsa katakcha butunlay tashlanadi: bu yerda xato
 * qaytarish keraksiz, chunki to'g'ri forma bunday qiymat yubormaydi.
 */
function toGridInput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;

  const source = raw as Record<string, unknown>;
  const entries: Array<{
    studentId: string;
    date: string;
    value: unknown;
  }> = [];

  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith(ENTRY_PREFIX)) continue;

    const parts = key.slice(ENTRY_PREFIX.length).split(":");
    if (parts.length !== 2) continue;

    const studentId = parts[0].trim();
    const date = parts[1].trim();
    if (studentId === "" || !DATE_TEXT_PATTERN.test(date)) continue;

    const first = Array.isArray(value) ? value[0] : value;
    const text = typeof first === "string" ? first.trim() : first;

    entries.push({
      studentId,
      date,
      value: text === "" || text === undefined ? null : text,
    });
  }

  return {
    classId: source.classId,
    subjectId: source.subjectId,
    month: source.month,
    type: source.type,
    entries,
  };
}

/**
 * Jadvalni saqlash sxemasi.
 *
 * `max(2000)` — aql bovar qiladigan yuqori chegara (30 o'quvchi × ~12 dars
 * kuni ≈ 360). Bu cheklov Server Action'ga qo'lda yuborilgan katta
 * so'rovdan himoya qiladi.
 */
export const gradeGridSaveSchema = z.preprocess(
  toGridInput,
  z.object({
    classId: idField,
    subjectId: idField,
    month: z.string().regex(MONTH_TEXT_PATTERN),
    type: z.enum(GRADE_TYPES),
    entries: z
      .array(
        z.object({
          studentId: z.string().min(1),
          date: z.string().regex(DATE_TEXT_PATTERN),
          value: z.union([
            z.null(),
            z.preprocess(
              toNumber,
              z.number().int().min(GRADE_MIN).max(GRADE_MAX)
            ),
          ]),
        })
      )
      .max(2000),
  })
);

export type GradeGridSaveInput = z.infer<typeof gradeGridSaveSchema>;

/** Katakcha kaliti — klient va server bir xil kalitdan foydalanadi. */
export function cellKey(studentId: string, date: string): string {
  return `${studentId}|${date}`;
}

// ------------------------------------------------------------------
// Hisob-kitob
// ------------------------------------------------------------------

/**
 * O'rtacha ball (bir kasrli aniqlikda).
 *
 * Baho umuman bo'lmasa `null` qaytadi — 0 deb ko'rsatish yolg'on bo'lardi
 * ("o'zlashtirish yomon" emas, "hali baho qo'yilmagan").
 */
export function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/**
 * 100 ballik bahoning daraja nomi (tarjima kaliti).
 *
 * Faqat KO'RSATISH uchun hisoblanadi — bazada saqlanmaydi. Shunda
 * chegaralarni keyin o'zgartirsa, eski yozuvlarni qayta hisoblash kerak
 * bo'lmaydi.
 */
export function gradeLevelKey(
  value: number
): "excellent" | "good" | "average" | "weak" {
  if (value >= 86) return "excellent";
  if (value >= 71) return "good";
  if (value >= 56) return "average";
  return "weak";
}

// ------------------------------------------------------------------
// Sana yordamchilari (barchasi UTC — davomat moduli bilan bir xil kelishuv)
// ------------------------------------------------------------------

export function dateToText(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function todayText(): string {
  return dateToText(new Date());
}

/** "2026-08-21" → "2026-08" */
export function monthOf(dateText: string): string {
  return dateText.slice(0, 7);
}

export function todayMonth(): string {
  return monthOf(todayText());
}

/** 1 = dushanba ... 7 = yakshanba (Lesson.dayOfWeek bilan bir xil kelishuv). */
export function dayOfWeekFromText(text: string): number {
  const day = new Date(`${text}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Oy ichidagi — FAQAT shu fan darsi bo'ladigan kunlar.
 *
 * Jurnal ustunlari shu ro'yxatdan yasaladi. Natijada jadval keraksiz
 * kengaymaydi: oyda 30 kun emas, masalan haftada 2 dars bo'lsa ~8–9 ustun
 * chiqadi. Yakshanba tabiiy ravishda tushib qoladi, chunki yakshanbaga dars
 * qo'yilmaydi.
 */
export function monthDatesForWeekdays(
  month: string,
  weekdays: number[]
): string[] {
  if (!MONTH_TEXT_PATTERN.test(month)) return [];

  const allowed = new Set(weekdays);
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  const result: string[] = [];
  const cursor = new Date(Date.UTC(year, monthIndex, 1));

  while (cursor.getUTCMonth() === monthIndex) {
    const day = cursor.getUTCDay();
    const dayOfWeek = day === 0 ? 7 : day;
    if (allowed.has(dayOfWeek)) result.push(dateToText(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

/** "2026-08-21" → "21.08" (jadval sarlavhasi uchun qisqa ko'rinish). */
export function shortDateLabel(dateText: string): string {
  return `${dateText.slice(8, 10)}.${dateText.slice(5, 7)}`;
}
