import { z } from "zod";
import { dateField, idField, toDate } from "./academics";

/**
 * DAVOMAT — VALIDATSIYA VA HISOB-KITOB (5-bosqich)
 * ================================================
 *
 * Davomat kuniga o'nlab marta to'ldiriladi, shuning uchun eng muhim talab —
 * TEZLIK: butun sinf bitta ekranda, har bir o'quvchi uchun to'rtta tugma,
 * pastda bitta "Saqlash".
 *
 * Ma'lumot modeli: `Attendance` yozuvi "o'quvchi + dars + sana" uchligiga
 * bog'langan (`@@unique([studentId, lessonId, date])`). Ya'ni bir dars uchun
 * bir kunda bir o'quvchida faqat bitta belgi bo'ladi. Shu tufayli saqlash
 * IDEMPOTENT: forma ikki marta yuborilsa ham dublikat paydo bo'lmaydi,
 * mavjud belgi shunchaki yangilanadi (`upsert`).
 *
 * MUHIM: bu fayl faqat "ma'lumot shakli" va "hisob-kitob" bilan shug'ullanadi.
 * "Bu odam shu darsga davomat qo'yishi mumkinmi?" savoli — auth-guard.ts va
 * scope.ts (`assertCanAccessLesson`) mas'uliyatida.
 */

/** Davomat holatlari — Prisma'dagi `AttendanceStatus` enum bilan bir xil tartibda. */
export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
] as const;

export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number];

/**
 * Formadagi radio maydon nomi: "entry:<studentId>".
 *
 * Nima uchun shunday: har bir o'quvchi o'zining alohida radio guruhiga ega
 * bo'lishi kerak (bir xil `name` bo'lsa butun sinf bitta guruhga aylanib,
 * faqat bitta o'quvchi belgilanadi). Shuning uchun maydon nomiga o'quvchi ID
 * si qo'shiladi, serverda esa prefiks bo'yicha yig'ib olinadi.
 */
export const ENTRY_PREFIX = "entry:";

/** "YYYY-MM-DD" ko'rinishini tekshirish uchun (searchParams ishonchsiz manba). */
export const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * FormData'dagi "entry:<studentId>" maydonlarini ro'yxatga aylantiradi.
 * Belgilanmagan o'quvchi umuman yuborilmaydi — ya'ni yarim to'ldirilgan
 * jurnalni ham saqlash mumkin (o'qituvchi keyin davom ettiradi).
 */
function toAttendanceInput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;

  const source = raw as Record<string, unknown>;
  const entries: Array<{ studentId: string; status: unknown }> = [];

  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith(ENTRY_PREFIX)) continue;

    const studentId = key.slice(ENTRY_PREFIX.length).trim();
    if (studentId === "") continue;

    entries.push({
      studentId,
      status: Array.isArray(value) ? value[0] : value,
    });
  }

  return { lessonId: source.lessonId, date: source.date, entries };
}

/**
 * Davomatni saqlash sxemasi.
 *
 * `max(300)` — bitta sinf uchun aql bovar qiladigan yuqori chegara. Bu
 * cheklov Server Action'ga qo'lda yuborilgan katta so'rovdan himoya qiladi.
 */
export const attendanceSaveSchema = z.preprocess(
  toAttendanceInput,
  z.object({
    lessonId: idField,
    date: dateField,
    entries: z
      .array(
        z.object({
          studentId: z.string().min(1),
          status: z.enum(ATTENDANCE_STATUSES),
        })
      )
      .max(300),
  })
);

export type AttendanceSaveInput = z.infer<typeof attendanceSaveSchema>;

// ------------------------------------------------------------------
// Statistika
// ------------------------------------------------------------------

export type StatusCounts = Record<AttendanceStatusValue, number>;

export function emptyCounts(): StatusCounts {
  return { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
}

export function countStatuses(statuses: AttendanceStatusValue[]): StatusCounts {
  const counts = emptyCounts();
  for (const status of statuses) counts[status] += 1;
  return counts;
}

export function totalMarks(counts: StatusCounts): number {
  return counts.PRESENT + counts.ABSENT + counts.LATE + counts.EXCUSED;
}

/**
 * Davomat foizi (bir kasrli aniqlikda).
 *
 * Kelishuv: kechikkan o'quvchi darsda BO'LGAN hisoblanadi (LATE foizga
 * kiradi), "sababli" esa darsda BO'LMAGAN, lekin uzrli (EXCUSED foizga
 * kirmaydi, ammo intizom hisobotida jarima emas).
 *
 * Belgi umuman bo'lmasa `null` qaytadi — 0% deb ko'rsatish yolg'on bo'lardi
 * ("davomat yomon" emas, "hali kiritilmagan").
 */
export function attendancePercent(counts: StatusCounts): number | null {
  const total = totalMarks(counts);
  if (total === 0) return null;
  return Math.round(((counts.PRESENT + counts.LATE) / total) * 1000) / 10;
}

/** O'tkazib yuborilgan darslar soni (sababsiz + sababli). */
export function missedLessons(counts: StatusCounts): number {
  return counts.ABSENT + counts.EXCUSED;
}

/**
 * Bir kunda bir necha dars bo'ladi. Jurnal katagida hammasini ko'rsatish
 * o'rniga eng "og'ir" holat ko'rsatiladi — shunda muammoli kun darhol
 * ko'zga tashlanadi.
 */
const SEVERITY: readonly AttendanceStatusValue[] = [
  "ABSENT",
  "EXCUSED",
  "LATE",
  "PRESENT",
];

export function worstStatus(
  statuses: AttendanceStatusValue[]
): AttendanceStatusValue | null {
  for (const candidate of SEVERITY) {
    if (statuses.some((status) => status === candidate)) return candidate;
  }
  return null;
}

// ------------------------------------------------------------------
// Sana yordamchilari
// ------------------------------------------------------------------

/**
 * Barcha hisob-kitob UTC yarim tunida bajariladi — `Attendance.date` maydoni
 * `@db.Date` turida, ya'ni vaqt mintaqasi surilishi natijani bir kunga
 * o'zgartirib qo'ymasligi kerak. `toDate` ham xuddi shu tamoyilda ishlaydi.
 */

export function dateToText(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function todayText(): string {
  return dateToText(new Date());
}

/** 1 = dushanba ... 7 = yakshanba (Lesson.dayOfWeek bilan bir xil kelishuv). */
export function dayOfWeekFromText(text: string): number {
  const day = toDate(text).getUTCDay();
  return day === 0 ? 7 : day;
}

export function addDaysText(text: string, days: number): string {
  const date = toDate(text);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToText(date);
}

/** Berilgan sana tushgan haftaning dushanbasi. */
export function weekStartText(text: string): string {
  return addDaysText(text, -(dayOfWeekFromText(text) - 1));
}

/** Dushanbadan shanbagacha 6 kun (yakshanba dars kuni emas). */
export function weekDaysText(weekStart: string): string[] {
  return [0, 1, 2, 3, 4, 5].map((offset) => addDaysText(weekStart, offset));
}
