import { z } from "zod";
import { dateField, idField, toNumber } from "./academics";

/**
 * BAHOLAR — VALIDATSIYA VA HISOB-KITOB (6-bosqich)
 * ================================================
 *
 * KELISHILGAN QAROR: tizim FAQAT 100 BALLIK. 5 ballik variant yo'q, sozlama
 * ham yo'q — shuning uchun bu yerda bitta oraliq bor: 0-100 butun son.
 *
 * Ma'lumot modeli davomatdan FARQ QILADI, buni bilib turish muhim:
 *
 *   Attendance -> lessonId ga bog'langan, @@unique([studentId, lessonId, date])
 *   Grade      -> subjectId ga bog'langan, unique cheklovi YO'Q
 *
 * Ya'ni baho aniq darsga emas, FANGA bog'lanadi. Egasi bilan shu kelishildi:
 * sxemani o'zgartirmaslik uchun. Amalda o'qituvchi darsni tanlaydi, tizim esa
 * o'sha darsning fanini olib bahoni fan + sana + chorak bo'yicha yozadi.
 *
 * Unique cheklovi yo'qligi sababli IDEMPOTENTLIK ilova qatlamida
 * ta'minlanadi: saqlashdan oldin server (fan + chorak + sana + tur) bo'yicha
 * mavjud bahoni o'zi topadi va uni yangilaydi. Klientdan baho ID si
 * OLINMAYDI — aks holda hujumchi begona baho ID sini yuborib boshqa
 * o'quvchining bahosini o'zgartirishi mumkin bo'lardi.
 *
 * MUHIM: bu fayl faqat "ma'lumot shakli" va "hisob-kitob" bilan shug'ullanadi.
 * "Bu odam shu darsga baho qo'yishi mumkinmi?" savoli — scope.ts
 * (`assertCanGradeLesson`) mas'uliyatida.
 */

/** Baho turlari — Prisma'dagi `GradeType` enum bilan bir xil tartibda. */
export const GRADE_TYPES = ["DAILY", "CONTROL", "EXAM"] as const;

export type GradeTypeValue = (typeof GRADE_TYPES)[number];

/** 100 ballik tizim chegaralari. */
export const GRADE_MIN = 0;
export const GRADE_MAX = 100;

/**
 * Formadagi maydon nomi: "grade:<studentId>".
 *
 * Davomatdagi `entry:` bilan ataylab boshqacha prefiks — ikkita modul bir
 * sahifada uchrashib qolsa maydonlar aralashmasligi kerak.
 */
export const ENTRY_PREFIX = "grade:";

/** "YYYY-MM-DD" ko'rinishini tekshirish uchun (searchParams ishonchsiz manba). */
export const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Berilgan matn haqiqiy baho turimi? (`as const` tuple'da .includes ishlamaydi) */
export function isGradeType(value: unknown): value is GradeTypeValue {
  return GRADE_TYPES.some((type) => type === value);
}

/**
 * FormData'dagi "grade:<studentId>" maydonlarini ro'yxatga aylantiradi.
 *
 * Bo'sh qiymat `null` bo'lib o'tadi va bu "bahoni O'CHIRISH" degani —
 * o'qituvchi xato kiritgan bahoni maydonni tozalab olib tashlashi kerak.
 * Belgilanmagan o'quvchi umuman yuborilmaydi, ya'ni yarim to'ldirilgan
 * jurnalni ham saqlash mumkin.
 */
function toGradeInput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;

  const source = raw as Record<string, unknown>;
  const entries: Array<{ studentId: string; value: unknown }> = [];

  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith(ENTRY_PREFIX)) continue;

    const studentId = key.slice(ENTRY_PREFIX.length).trim();
    if (studentId === "") continue;

    const first = Array.isArray(value) ? value[0] : value;
    const text = typeof first === "string" ? first.trim() : first;

    entries.push({
      studentId,
      value: text === "" || text === undefined ? null : text,
    });
  }

  return {
    lessonId: source.lessonId,
    date: source.date,
    type: source.type,
    entries,
  };
}

/**
 * Bahoni saqlash sxemasi.
 *
 * `max(300)` — bitta sinf uchun aql bovar qiladigan yuqori chegara. Bu
 * cheklov Server Action'ga qo'lda yuborilgan katta so'rovdan himoya qiladi.
 */
export const gradeSaveSchema = z.preprocess(
  toGradeInput,
  z.object({
    lessonId: idField,
    date: dateField,
    type: z.enum(GRADE_TYPES),
    entries: z
      .array(
        z.object({
          studentId: z.string().min(1),
          value: z.union([
            z.null(),
            z.preprocess(
              toNumber,
              z.number().int().min(GRADE_MIN).max(GRADE_MAX)
            ),
          ]),
        })
      )
      .max(300),
  })
);

export type GradeSaveInput = z.infer<typeof gradeSaveSchema>;

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
 * Bu faqat KO'RSATISH uchun hisoblanadi — bazada saqlanmaydi. Shunda
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

/** Baho oraliqda va butun sonmi? (server tomonda zod ham tekshiradi) */
export function isValidGradeValue(value: number): boolean {
  return Number.isInteger(value) && value >= GRADE_MIN && value <= GRADE_MAX;
}

// ------------------------------------------------------------------
// Sana yordamchilari
// ------------------------------------------------------------------

/**
 * Barcha hisob-kitob UTC yarim tunida bajariladi — davomat moduli bilan bir
 * xil kelishuv. `Grade.date` maydoni `@db.Date` emas, lekin bir kunlik
 * yozuvlarni aniq solishtirish uchun baribir yarim tunga tekislanadi.
 */

export function dateToText(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function todayText(): string {
  return dateToText(new Date());
}

/** 1 = dushanba ... 7 = yakshanba (Lesson.dayOfWeek bilan bir xil kelishuv). */
export function dayOfWeekFromText(text: string): number {
  const day = new Date(`${text}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}
