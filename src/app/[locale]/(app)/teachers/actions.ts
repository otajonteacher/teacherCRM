"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { teacherUpdateSchema, teacherWriteSchema } from "@/lib/teachers";
import { loadValidSubjectIds } from "@/lib/import-commit-guards";
import { redirectNever } from "@/lib/auth-guard";

/**
 * O'QITUVCHILAR — SERVER ACTION'LAR
 * =================================
 *
 * Faqat ADMIN. O'qituvchi yaratish = User (role=TEACHER) + Teacher yozuvi.
 * Ikkisi bitta Prisma nested create ichida — yarim yozuv qolmaydi.
 *
 * Parol: faqat YARATISHDA beriladi va darhol bcrypt bilan xeshlanadi.
 * `mustChangePassword: true` — o'qituvchi birinchi kirishda o'zi almashtiradi,
 * ya'ni admin uning doimiy parolini bilmaydi.
 * Tahrirlashda parol maydoni yo'q — mavjud parol tasodifan almashmasligi uchun.
 */

export type TeacherFormState = { error?: string };

const BCRYPT_ROUNDS = 10;

/**
 * `subjectIds` brauzerdan keladi; sxema faqat "30 tadan ko'p bo'lmagan matn
 * ro'yxati" deb tekshiradi. Mavjud bo'lmagan id ni Prisma baribir rad etadi,
 * lekin `students/actions.ts` dagi bilan bir xil sababga ko'ra tekshiruvni
 * bazaga tashlab qo'ymaymiz: yozishdan OLDIN aniqlaymiz.
 *
 * Alohida e'tibor: tahrirlashda `subjects: { set: [...] }` ishlatiladi. Agar
 * ro'yxatning bir qismi yaroqsiz bo'lsa, amal yarim bajarilib o'qituvchining
 * mavjud fanlari uzilib qolishi mumkin edi — shuning uchun BARCHA id lar
 * birga tekshiriladi va bittasi yaroqsiz bo'lsa hech narsa yozilmaydi.
 */
async function assertSubjectsExist(subjectIds: string[]) {
  if (subjectIds.length === 0) return;
  const valid = await loadValidSubjectIds(subjectIds);
  if (subjectIds.some((id) => !valid.has(id))) {
    throw new Error("Tanlangan fanlardan biri topilmadi.");
  }
}

const createTeacherAction = createAction({
  roles: ["ADMIN"],
  schema: teacherWriteSchema,
  handler: async (input): Promise<{ id: string }> => {
    await assertSubjectsExist(input.subjectIds);

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const teacher = await db.teacher.create({
      data: {
        user: {
          create: {
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            role: "TEACHER",
            locale: input.locale,
            isActive: input.isActive,
            passwordHash,
            mustChangePassword: true,
          },
        },
        subjects: input.subjectIds.length
          ? { connect: input.subjectIds.map((id) => ({ id })) }
          : undefined,
      },
      select: { id: true },
    });

    revalidatePath("/teachers");
    return { id: teacher.id };
  },
  audit: {
    action: "CREATE",
    entity: "Teacher",
    entityId: (_input, result) => result.id,
    // Parol meta'ga tushmaydi (audit.ts uni redaksiya qiladi, lekin baribir yozmaymiz).
    meta: (input) => ({ subjects: input.subjectIds.length }),
  },
});

const updateTeacherAction = createAction({
  roles: ["ADMIN"],
  schema: teacherUpdateSchema,
  handler: async (input): Promise<{ id: string }> => {
    const existing = await db.teacher.findUnique({
      where: { id: input.id },
      select: { id: true, userId: true },
    });
    if (!existing) {
      redirectNever("/forbidden");
    }

    await assertSubjectsExist(input.subjectIds);

    // Ikkita jadval birga o'zgaradi — tranzaksiya: biri yozilib, ikkinchisi
    // xato bersa hech narsa saqlanmaydi.
    await db.$transaction([
      db.user.update({
        where: { id: existing.userId },
        data: {
          fullName: input.fullName,
          email: input.email ?? null,
          phone: input.phone ?? null,
          locale: input.locale,
          isActive: input.isActive,
        },
      }),
      db.teacher.update({
        where: { id: existing.id },
        data: {
          subjects: { set: input.subjectIds.map((id) => ({ id })) },
        },
      }),
    ]);

    revalidatePath("/teachers");
    revalidatePath(`/teachers/${existing.id}`);
    return { id: existing.id };
  },
  audit: {
    action: "UPDATE",
    entity: "Teacher",
    entityId: (input) => input.id,
  },
});

export async function createTeacher(
  _prev: TeacherFormState,
  formData: FormData
): Promise<TeacherFormState> {
  const result = await createTeacherAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  redirectNever(`/teachers/${result.data.id}`);
}

export async function updateTeacher(
  _prev: TeacherFormState,
  formData: FormData
): Promise<TeacherFormState> {
  const result = await updateTeacherAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  redirectNever(`/teachers/${result.data.id}`);
}
