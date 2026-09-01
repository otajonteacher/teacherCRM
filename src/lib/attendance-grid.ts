import { z } from "zod";
import { dateField, idField } from "./academics";
import { ATTENDANCE_STATUSES } from "./attendance";
import { statusFromAbbreviation } from "./journal";

/**
 * DAVOMAT JADVALI — SINF BO'YICHA BIR KUNLIK
 * ==========================================
 *
 * Avval davomat SHUNDAY ishlagan edi: sana → dars tanlanadi → shu bitta
 * dars uchun butun sinf belgilanadi. Ya'ni 6 darsli kunda 6 marta dars
 * tanlab, 6 marta saqlash kerak edi.
 *
 * Egasining talabi bo'yicha endi jurnal bilan bir xil ko'rinish:
 *
 *   | O'quvchi | Matematika | Ona tili | Ingliz tili | ... | Keldi % |
 *
 * Ya'ni SINF tanlanadi va shu kunning BARCHA darslari ustun bo'lib chiqadi.
 * Har bir katakchaga qisqartma yoziladi (K / SZ / SL / KCH) va hammasi
 * BITTA saqlash bilan yoziladi.
 *
 * Farqi jurnaldan: jurnalda davomat bitta ustun (kun bo'yicha), bu yerda esa
 * har DARS uchun alohida. Sabab — bazada `Attendance` darsga bog'langan
 * (`studentId_lessonId_date`), demak "3-darsdan qochdi" degan ma'lumot
 * shu yerda aniq yoziladi. Jurnal esa o'qituvchining o'z darslari uchun
 * tezkor yo'l.
 *
 * XAVFSIZLIK: kim qaysi ustunga yozishi mumkinligini SERVER hal qiladi
 * (`lessonScope`). Bu yerda faqat ma'lumot shakli tekshiriladi.
 */

/** Katakcha maydoni: "ag:<studentId>:<lessonId>". */
export const ATTENDANCE_GRID_FIELD_PREFIX = "ag:";

/** Katakcha kaliti — klient va server bir xil kalitdan foydalanadi. */
export function attendanceCellKey(
  studentId: string,
  lessonId: string
): string {
  return `${studentId}|${lessonId}`;
}

function toGridInput(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;

  const source = raw as Record<string, unknown>;
  const entries: Array<{
    studentId: string;
    lessonId: string;
    status: unknown;
  }> = [];

  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith(ATTENDANCE_GRID_FIELD_PREFIX)) continue;

    const parts = key.slice(ATTENDANCE_GRID_FIELD_PREFIX.length).split(":");
    if (parts.length !== 2) continue;

    const studentId = parts[0].trim();
    const lessonId = parts[1].trim();
    if (studentId === "" || lessonId === "") continue;

    const first = Array.isArray(value) ? value[0] : value;
    const status = statusFromAbbreviation(first);

    // Bo'sh yoki tanish bo'lmagan qisqartma — katakcha e'tiborsiz qoldiriladi.
    // Bu ATAYLAB xato emas: o'qituvchi faqat bir qism katakni to'ldirib
    // saqlashi mumkin, qolgani avvalgi holatida qoladi.
    if (status === null) continue;

    entries.push({ studentId, lessonId, status });
  }

  return {
    classId: source.classId,
    date: source.date,
    entries,
  };
}

/**
 * `max(900)` — qo'lda yasalgan katta so'rovdan himoya.
 * 30 o'quvchi × 8 dars = 240 katakcha, shuning uchun 900 keng, lekin cheksiz emas.
 */
export const attendanceGridSaveSchema = z.preprocess(
  toGridInput,
  z.object({
    classId: idField,
    date: dateField,
    entries: z
      .array(
        z.object({
          studentId: z.string().min(1),
          lessonId: z.string().min(1),
          status: z.enum(ATTENDANCE_STATUSES),
        })
      )
      .max(900),
  })
);

export type AttendanceGridSaveInput = z.infer<typeof attendanceGridSaveSchema>;
