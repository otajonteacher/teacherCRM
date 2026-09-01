import { z } from "zod";
import {
  idField,
  nameField,
  optionalIdField,
  toNumber,
  toStringArray,
} from "./academics";

/**
 * SINFLAR — KIRISH VALIDATSIYASI (4-bosqich)
 * =========================================
 *
 * Sinf — tizimning markaziy tugunlaridan biri: o'quvchi, dars jadvali,
 * davomat va baho hammasi sinf orqali bog'lanadi. Shuning uchun nomi va
 * darajasi qat'iy tekshiriladi.
 *
 * MUHIM: bu yerda faqat "ma'lumot shakli" tekshiriladi. "Bu odam shu sinfni
 * ko'rishi/o'zgartirishi mumkinmi?" savoli — auth-guard.ts va scope.ts da.
 */

/** 1-sinfdan 11-sinfgacha. */
export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

const classBase = z.object({
  // "9-A", "5-B" ko'rinishidagi qisqa nom.
  name: nameField,
  grade: z.preprocess(toNumber, z.number().int().min(1).max(11)),
  academicYearId: optionalIdField,
  homeroomTeacherId: optionalIdField,
});

export const classWriteSchema = classBase;
export const classUpdateSchema = classBase.extend({ id: idField });

/** O'quvchilarni ommaviy biriktirish. */
export const classStudentsSchema = z.object({
  classId: idField,
  studentIds: z.preprocess(
    toStringArray,
    z.array(z.string().min(1)).min(1).max(300)
  ),
});

/** Bitta o'quvchini sinfdan chiqarish. */
export const classStudentSchema = z.object({
  classId: idField,
  studentId: idField,
});

export type ClassWriteInput = z.infer<typeof classWriteSchema>;
export type ClassUpdateInput = z.infer<typeof classUpdateSchema>;
