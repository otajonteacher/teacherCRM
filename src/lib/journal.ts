import { z } from "zod";
import { dateField, idField, toNumber } from "./academics";
import { ATTENDANCE_STATUSES, type AttendanceStatusValue } from "./attendance";
import { GRADE_MAX, GRADE_MIN } from "./grades";

/**
 * KUNLIK JURNAL — VALIDATSIYA VA HISOB-KITOB
 * ==========================================
 *
 * Qog'oz jurnalning aynan o'zi, bir kun uchun:
 *
 *   | O'quvchi | Davomat | Matematika | Matematika 2 | Ona tili | ... | O'rtacha | O'rin |
 *
 * Ustunlar — SHU KUNNING DARSLARI. Bir fandan kunda ikki dars bo'lsa ikki
 * ustun chiqadi va ikkinchisi "Matematika 2" deb nomlanadi. Shu sababli baho
 * fanga emas, DARSGA bog'lanadi (`Grade.lessonId`).
 *
 * XAVFSIZLIK QOIDASI (egasining talabi): o'qituvchi FAQAT o'zi o'tadigan
 * dars ustuniga baho qo'yadi. Boshqa ustun inputi bloklanadi va tooltip
 * chiqadi. Lekin bu — shunchaki qulaylik: haqiqiy himoya serverda, chunki
 * bloklangan inputni brauzer konsolidan ochib qo'yish mumkin. Server
 * `gradingLessonScope` bilan o'z darslarini o'zi topadi va begona dars
 * ustuniga kelgan qiymatni jimgina tashlab yuboradi.
 *
 * DAVOMAT: `Attendance` darsga bog'langan, shuning uchun jurnaldagi yagona
 * "Davomat" ustuni foydalanuvchining SHU KUNDAGI O'Z darslariga yoziladi.
 * Ya'ni har bir o'qituvchi o'z darsining davomatini o'zi qiladi — va agar
 * o'quvchiga baho qo'yilsa, u avtomatik "keldi" deb belgilanadi (baho olgan
 * bola darsda bo'lgan).
 *
 * Bu fayl faqat ma'lumot shakli va hisob-kitob bilan shug'ullanadi.
 * "Bu odam shu darsga baho qo'yishi mumkinmi?" savoli — scope.ts
 * (`assertCanGradeClassSubject`, `gradingLessonScope`) mas'uliyatida.
 */

// ------------------------------------------------------------------
// Davomat qisqartmalari (kelishilgan: K / SZ / SL / KCH)
// ------------------------------------------------------------------

/**
 * Jadval katagiga yoziladigan qisqartmalar.
 *
 * Nima uchun qisqartma: davomat qiladigan kishi butun sinf uchun tez-tez
 * yozadi, "kelmadi (sababsiz)" deb yozib o'tirmaydi. Jadval tagidagi legenda
 * qisqartmalarning ma'nosini ko'rsatib turadi.
 */
export const ATTENDANCE_ABBREVIATIONS: Record<AttendanceStatusValue, string> = {
  PRESENT: "K",
  ABSENT: "SZ",
  EXCUSED: "SL",
  LATE: "KCH",
};

/** Legenda tartibi — ko'p uchraydigan holat birinchi. */
export const ATTENDANCE_LEGEND_ORDER: readonly AttendanceStatusValue[] = [
  "PRESENT",
  "ABSENT",
  "EXCUSED",
  "LATE",
];

export function abbreviationOf(status: AttendanceStatusValue): string {
  return ATTENDANCE_ABBREVIATIONS[status];
}

/**
 * Katakchaga yozilgan qisqartmani holatga aylantiradi.
 *
 * Katta-kichik harf va bo'sh joy farq qilmaydi ("k", " K " — hammasi keldi).
 * Tanish bo'lmagan matn `null` qaytaradi va bunday katakcha butunlay
 * e'tiborsiz qoldiriladi: xato qaytarish o'rniga jimgina tashlab yuborish
 * bu yerda to'g'ri, chunki forma to'g'ri ishlaganda bunday qiymat kelmaydi.
 */
export function statusFromAbbreviation(
  value: unknown
): AttendanceStatusValue | null {
  if (typeof value !== "string") return null;

  switch (value.trim().toUpperCase()) {
    case "K":
      return "PRESENT";
    case "SZ":
      return "ABSENT";
    case "SL":
      return "EXCUSED";
    case "KCH":
      return "LATE";
    default:
      return null;
  }
}

// ------------------------------------------------------------------
// Forma maydonlari
// ------------------------------------------------------------------

/** Baho katakchasi: "jg:<studentId>:<lessonId>". */
export const GRADE_FIELD_PREFIX = "jg:";

/** Davomat katakchasi: "ja:<studentId>". */
export const ATTENDANCE_FIELD_PREFIX = "ja:";

/** Katakcha kaliti — klient va server bir xil kalitdan foydalanadi. */
export function journalCellKey(studentId: string, lessonId: string): string {
  return `${studentId}|${lessonId}`;
}

// ------------------------------------------------------------------
// Ustun nomlari
// ------------------------------------------------------------------

export type LessonColumnInput = {
  id: string;
  subjectId: string;
  subjectName: string;
};

export type LessonColumn = LessonColumnInput & {
  /** Ustun sarlavhasi: "Matematika", "Matematika 2", "Matematika 3" ... */
  label: string;
  /** Shu fan kun ichida nechanchi marta uchradi. */
  occurrence: number;
};

/**
 * Dars ro'yxatini ustunlarga aylantiradi va takrorlangan fan nomini
 * raqamlab chiqadi.
 *
 * Darslar VAQT bo'yicha tartiblangan holda kelishi kerak — shunda "Matematika"
 * ertalabki dars, "Matematika 2" keyingi dars bo'ladi. Aks holda raqamlar
 * jadvaldagi tartibga mos kelmaydi.
 */
export function buildLessonColumns(
  lessons: LessonColumnInput[]
): LessonColumn[] {
  const seen = new Map<string, number>();

  return lessons.map((lesson) => {
    const occurrence = (seen.get(lesson.subjectId) ?? 0) + 1;
    seen.set(lesson.subjectId, occurrence);

    return {
      ...lesson,
      occurrence,
      label:
        occurrence === 1
          ? lesson.subjectName
          : `${lesson.subjectName} ${occurrence}`,
    };
  });
}

// ------------------------------------------------------------------
// Saqlash sxemasi
// ------------------------------------------------------------------

function toJournalInput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;

  const source = raw as Record<string, unknown>;

  const grades: Array<{
    studentId: string;
    lessonId: string;
    value: unknown;
  }> = [];
  const attendance: Array<{ studentId: string; status: unknown }> = [];

  for (const [key, value] of Object.entries(source)) {
    const first = Array.isArray(value) ? value[0] : value;
    const text = typeof first === "string" ? first.trim() : first;

    if (key.startsWith(GRADE_FIELD_PREFIX)) {
      const parts = key.slice(GRADE_FIELD_PREFIX.length).split(":");
      if (parts.length !== 2) continue;

      const studentId = parts[0].trim();
      const lessonId = parts[1].trim();
      if (studentId === "" || lessonId === "") continue;

      // Bo'sh katakcha = bahoni O'CHIRISH.
      grades.push({
        studentId,
        lessonId,
        value: text === "" || text === undefined ? null : text,
      });
      continue;
    }

    if (key.startsWith(ATTENDANCE_FIELD_PREFIX)) {
      const studentId = key.slice(ATTENDANCE_FIELD_PREFIX.length).trim();
      if (studentId === "") continue;

      const status = statusFromAbbreviation(text);
      // Bo'sh yoki tanish bo'lmagan qisqartma — davomat o'zgartirilmaydi.
      if (status === null) continue;

      attendance.push({ studentId, status });
    }
  }

  return {
    classId: source.classId,
    date: source.date,
    grades,
    attendance,
  };
}

/**
 * Jurnalni saqlash sxemasi.
 *
 * `max` chegaralari Server Action'ga qo'lda yuborilgan katta so'rovdan
 * himoya qiladi: 30 o'quvchi × ~8 dars ≈ 240 katakcha, shuning uchun 900
 * yetarlicha keng, lekin cheksiz emas.
 */
export const journalSaveSchema = z.preprocess(
  toJournalInput,
  z.object({
    classId: idField,
    date: dateField,
    grades: z
      .array(
        z.object({
          studentId: z.string().min(1),
          lessonId: z.string().min(1),
          value: z.union([
            z.null(),
            z.preprocess(
              toNumber,
              z.number().int().min(GRADE_MIN).max(GRADE_MAX)
            ),
          ]),
        })
      )
      .max(900),
    attendance: z
      .array(
        z.object({
          studentId: z.string().min(1),
          status: z.enum(ATTENDANCE_STATUSES),
        })
      )
      .max(300),
  })
);

export type JournalSaveInput = z.infer<typeof journalSaveSchema>;

// ------------------------------------------------------------------
// Reyting (o'rin)
// ------------------------------------------------------------------

export type RankRow = { id: string; average: number | null };

/**
 * O'rtacha ball bo'yicha o'rin belgilaydi.
 *
 * Qoidalar:
 *   - Baho umuman yo'q o'quvchi o'rinsiz qoladi (0 deb hisoblash yolg'on
 *     bo'lardi — "yomon o'qiydi" emas, "baho qo'yilmagan").
 *   - Teng ballar TENG o'rin oladi (ikki bola 90 ball olsa ikkisi ham
 *     2-o'rin, keyingisi 4-o'rin). Qog'oz reytingda ham shunday.
 *   - `topN` berilsa faqat dastlabki N o'rin belgilanadi. Masalan 7 kiritilsa
 *     eng yuqori 7 o'rin chiqadi, qolganlar bo'sh qoladi. Berilmasa butun
 *     sinf bo'yicha o'rin hisoblanadi.
 */
export function rankByAverage(
  rows: RankRow[],
  topN?: number | null
): Record<string, number> {
  const ranked = rows
    .filter((row): row is { id: string; average: number } => row.average !== null)
    .sort((left, right) => right.average - left.average);

  const result: Record<string, number> = {};

  let place = 0;
  let index = 0;
  let previous: number | null = null;

  for (const row of ranked) {
    index += 1;
    if (previous === null || row.average < previous) {
      place = index;
      previous = row.average;
    }
    if (topN !== null && topN !== undefined && topN > 0 && place > topN) break;
    result[row.id] = place;
  }

  return result;
}

/** "7" → 7, "" yoki axlat → null (searchParams ishonchsiz manba). */
export function parseTopN(value: unknown): number | null {
  const parsed = toNumber(value);
  if (parsed === undefined) return null;
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return Math.min(parsed, 500);
}
