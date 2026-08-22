import { z } from "zod";
import { idField, optionalNameField, toNumber } from "./academics";

/**
 * DARS JADVALI — KIRISH VALIDATSIYASI (4-bosqich)
 * ==============================================
 *
 * Har bir dars — "sinf + fan + o'qituvchi + hafta kuni + qo'ng'iroq uyasi".
 * Dars vaqti (startTime/endTime) FORMADAN OLINMAYDI — u tanlangan qo'ng'iroq
 * uyasidan ko'chiriladi. Shunda jadval bir xil vaqt panjarasida turadi va
 * ziddiyatni tekshirish soddalashadi.
 */

/** Dushanba–shanba. Yakshanba dars kuni emas. */
export const DAYS = [1, 2, 3, 4, 5, 6] as const;

const lessonBase = z.object({
  classId: idField,
  subjectId: idField,
  teacherId: idField,
  periodId: idField,
  dayOfWeek: z.preprocess(toNumber, z.number().int().min(1).max(6)),
  room: optionalNameField,
});

export const lessonWriteSchema = lessonBase;
export const lessonUpdateSchema = lessonBase.extend({ id: idField });
export const lessonDeleteSchema = z.object({ id: idField });

export type LessonWriteInput = z.infer<typeof lessonWriteSchema>;
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;
