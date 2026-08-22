import { z } from "zod";

/**
 * O'QUV YILI, FANLAR VA QO'NG'IROQ JADVALI — VALIDATSIYA (4-bosqich)
 * ==================================================================
 *
 * Bu fayl 4-bosqichning "poydevor" qismidagi barcha kirish sxemalarini va
 * umumiy yordamchilarni saqlaydi. Sinflar (`classes.ts`) va dars jadvali
 * (`lessons.ts`) shu yordamchilarga tayanadi — qoida bir joyda turadi.
 *
 * Eslatma: sxema — himoyaning bir qatlami. Rol tekshiruvi `auth-guard.ts`,
 * qatorlar doirasi `scope.ts` da. Uchtasi birga ishlaydi.
 */

/** Bo'sh matnni `undefined` ga aylantiradi (FormData doim string yuboradi). */
export function emptyToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Checkbox: belgilanmasa FormData'ga umuman tushmaydi. */
export function toBoolean(value: unknown): boolean {
  return value === "on" || value === "true" || value === true || value === "1";
}

/** Matnni songa aylantiradi; bo'lmasa `undefined` (zod xato beradi). */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/** Bir nechta bir xil nomli maydon (checkbox / multi-select) — doim massiv. */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== ""
    );
  }
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  return [];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const idField = z.preprocess(emptyToUndefined, z.string().min(1));
export const optionalIdField = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional()
);
export const nameField = z.preprocess(
  emptyToUndefined,
  z.string().min(1).max(120)
);
export const optionalNameField = z.preprocess(
  emptyToUndefined,
  z.string().min(1).max(120).optional()
);
export const dateField = z.preprocess(
  emptyToUndefined,
  z.string().regex(DATE_PATTERN, "Sana YYYY-MM-DD ko'rinishida bo'lishi kerak.")
);
export const optionalDateField = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(DATE_PATTERN, "Sana YYYY-MM-DD ko'rinishida bo'lishi kerak.")
    .optional()
);
export const timeField = z.preprocess(
  emptyToUndefined,
  z.string().regex(TIME_PATTERN, "Vaqt HH:mm ko'rinishida bo'lishi kerak.")
);

/**
 * Saqlash natijasi.
 *
 * Ziddiyat / dublikat — bu "tizim xatosi" emas, balki foydalanuvchiga
 * tushunarli xabar. Shuning uchun `throw` qilmaymiz: aks holda `safe-action`
 * uni umumiy "Amal bajarilmadi" xabariga aylantirib, sababni yo'qotadi.
 */
export type SaveResult = { ok: true; id: string } | { ok: false; message: string };

/** "YYYY-MM-DD" → Date (UTC yarim tunda, vaqt mintaqasi surilishisiz). */
export function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toOptionalDate(value?: string): Date | undefined {
  return value ? toDate(value) : undefined;
}

/** Date → "YYYY-MM-DD" (forma `input[type=date]` uchun). */
export function formatDateInput(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/** "08:30" → 510. Vaqtlarni solishtirish uchun. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** Ikki vaqt oralig'i kesishadimi? (chegaralar tegishi kesishish emas) */
export function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return (
    timeToMinutes(aStart) < timeToMinutes(bEnd) &&
    timeToMinutes(bStart) < timeToMinutes(aEnd)
  );
}

// ------------------------------------------------------------------
// Fanlar
// ------------------------------------------------------------------

const subjectBase = z.object({
  nameUz: nameField,
  nameRu: optionalNameField,
  nameEn: optionalNameField,
});

export const subjectWriteSchema = subjectBase;
export const subjectUpdateSchema = subjectBase.extend({ id: idField });

/** Faqat ID kerak bo'lgan amallar (o'chirish va h.k.). */
export const idOnlySchema = z.object({ id: idField });

export type SubjectWriteInput = z.infer<typeof subjectWriteSchema>;
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>;

// ------------------------------------------------------------------
// O'quv yili va choraklar
// ------------------------------------------------------------------

const academicYearBase = z.object({
  name: z.preprocess(emptyToUndefined, z.string().min(4).max(20)),
  startDate: dateField,
  endDate: dateField,
  isCurrent: z.preprocess(toBoolean, z.boolean()),
  q1Start: optionalDateField,
  q1End: optionalDateField,
  q2Start: optionalDateField,
  q2End: optionalDateField,
  q3Start: optionalDateField,
  q3End: optionalDateField,
  q4Start: optionalDateField,
  q4End: optionalDateField,
});

const yearRangeCheck = (data: { startDate: string; endDate: string }) =>
  toDate(data.startDate) < toDate(data.endDate);

const yearRangeMessage = {
  message: "Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak.",
  path: ["endDate"] as const,
};

export const academicYearWriteSchema = academicYearBase.refine(
  yearRangeCheck,
  yearRangeMessage
);
export const academicYearUpdateSchema = academicYearBase
  .extend({ id: idField })
  .refine(yearRangeCheck, yearRangeMessage);

export type QuarterFields = {
  q1Start?: string;
  q1End?: string;
  q2Start?: string;
  q2End?: string;
  q3Start?: string;
  q3End?: string;
  q4Start?: string;
  q4End?: string;
};

/**
 * Formadagi 4 juft sanadan chorak yozuvlarini yasaydi.
 * Ikki sana ham to'ldirilgan va to'g'ri tartibda bo'lgan choraklar olinadi.
 */
export function quarterInputs(
  input: QuarterFields
): Array<{ name: number; startDate: Date; endDate: Date }> {
  const pairs: Array<[number, string | undefined, string | undefined]> = [
    [1, input.q1Start, input.q1End],
    [2, input.q2Start, input.q2End],
    [3, input.q3Start, input.q3End],
    [4, input.q4Start, input.q4End],
  ];

  const result: Array<{ name: number; startDate: Date; endDate: Date }> = [];
  for (const [name, start, end] of pairs) {
    if (!start || !end) continue;
    const startDate = toDate(start);
    const endDate = toDate(end);
    if (startDate >= endDate) continue;
    result.push({ name, startDate, endDate });
  }
  return result;
}

// ------------------------------------------------------------------
// Qo'ng'iroq jadvali (dars vaqtlari)
// ------------------------------------------------------------------

const lessonPeriodBase = z.object({
  index: z.preprocess(toNumber, z.number().int().min(1).max(20)),
  label: optionalNameField,
  startTime: timeField,
  endTime: timeField,
});

const periodRangeCheck = (data: { startTime: string; endTime: string }) =>
  timeToMinutes(data.startTime) < timeToMinutes(data.endTime);

const periodRangeMessage = {
  message: "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak.",
  path: ["endTime"] as const,
};

export const lessonPeriodWriteSchema = lessonPeriodBase.refine(
  periodRangeCheck,
  periodRangeMessage
);
export const lessonPeriodUpdateSchema = lessonPeriodBase
  .extend({ id: idField })
  .refine(periodRangeCheck, periodRangeMessage);
