import { z } from "zod";
import { Locale } from "@prisma/client";
import { passwordSchema } from "./password";

/**
 * O'QITUVCHILAR — KIRISH VALIDATSIYASI (3-bosqich)
 * ===============================================
 *
 * O'qituvchi ikkita yozuvdan iborat:
 *   User (fullName, email/phone, role=TEACHER, parol)  +  Teacher (fanlar)
 *
 * Shuning uchun forma bitta, lekin action ikkita jadvalga yozadi.
 * Sxema shu yerda — server action ham, forma ham bir xil qoidaga tayanadi.
 */

function emptyToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** FormData'da bir nechta checkbox bir xil nom bilan keladi — doim massivga aylantiramiz. */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  }
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  return [];
}

/** Checkbox: belgilanmasa FormData'ga umuman tushmaydi. */
function toBoolean(value: unknown): boolean {
  return value === "on" || value === "true" || value === true || value === "1";
}

const teacherBaseSchema = z.object({
  fullName: z.preprocess(emptyToUndefined, z.string().min(1).max(120)),
  email: z.preprocess(
    emptyToUndefined,
    z.string().email("Email formati noto'g'ri.").max(190).optional()
  ),
  phone: z.preprocess(
    emptyToUndefined,
    z.string().min(7).max(30).optional()
  ),
  locale: z.preprocess(
    (value) => emptyToUndefined(value) ?? Locale.uz,
    z.nativeEnum(Locale)
  ),
  isActive: z.preprocess(toBoolean, z.boolean()),
  subjectIds: z.preprocess(toStringArray, z.array(z.string().min(1)).max(30)),
});

/**
 * Login uchun email yoki telefon KAMIDA bittasi bo'lishi shart —
 * aks holda yaratilgan hisob tizimga kira olmaydi.
 */
const requireLoginIdentifier = {
  check: (data: { email?: string; phone?: string }) =>
    Boolean(data.email || data.phone),
  message: "Email yoki telefon — kamida bittasi kiritilishi kerak.",
};

export const teacherWriteSchema = teacherBaseSchema
  .extend({
    /** Yangi hisob uchun boshlang'ich parol. Birinchi kirishda almashtiriladi. */
    password: passwordSchema,
  })
  .refine(requireLoginIdentifier.check, {
    message: requireLoginIdentifier.message,
    path: ["email"],
  });

export const teacherUpdateSchema = teacherBaseSchema
  .extend({
    id: z.preprocess(emptyToUndefined, z.string().min(1)),
  })
  .refine(requireLoginIdentifier.check, {
    message: requireLoginIdentifier.message,
    path: ["email"],
  });

export type TeacherWriteInput = z.infer<typeof teacherWriteSchema>;
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;
