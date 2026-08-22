"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { redirectNever } from "@/lib/auth-guard";
import {
  idOnlySchema,
  subjectUpdateSchema,
  subjectWriteSchema,
  type SaveResult,
} from "@/lib/academics";

export type SubjectFormState = { error?: string };

const DUPLICATE_MESSAGE = "Bu nomdagi fan allaqachon mavjud.";

function revalidateSubjects() {
  revalidatePath("/subjects");
  revalidatePath("/schedule");
  revalidatePath("/teachers");
}

const createSubjectAction = createAction({
  roles: ["ADMIN"],
  schema: subjectWriteSchema,
  handler: async (input): Promise<SaveResult> => {
    const existing = await db.subject.findUnique({
      where: { nameUz: input.nameUz },
      select: { id: true },
    });
    if (existing) return { ok: false, message: DUPLICATE_MESSAGE };

    const subject = await db.subject.create({
      data: {
        nameUz: input.nameUz,
        nameRu: input.nameRu ?? null,
        nameEn: input.nameEn ?? null,
      },
      select: { id: true },
    });
    revalidateSubjects();
    return { ok: true, id: subject.id };
  },
  audit: {
    action: "CREATE",
    entity: "Subject",
    entityId: (_input, result) => (result.ok ? result.id : null),
    meta: (input) => ({ nameUz: input.nameUz }),
  },
});

const updateSubjectAction = createAction({
  roles: ["ADMIN"],
  schema: subjectUpdateSchema,
  handler: async (input): Promise<SaveResult> => {
    const duplicate = await db.subject.findFirst({
      where: { nameUz: input.nameUz, id: { not: input.id } },
      select: { id: true },
    });
    if (duplicate) return { ok: false, message: DUPLICATE_MESSAGE };

    await db.subject.update({
      where: { id: input.id },
      data: {
        nameUz: input.nameUz,
        nameRu: input.nameRu ?? null,
        nameEn: input.nameEn ?? null,
      },
    });
    revalidateSubjects();
    return { ok: true, id: input.id };
  },
  audit: {
    action: "UPDATE",
    entity: "Subject",
    entityId: (input) => input.id,
  },
});

const deleteSubjectAction = createAction({
  roles: ["ADMIN"],
  schema: idOnlySchema,
  handler: async (input): Promise<{ deleted: boolean }> => {
    // Fan darslarga bog'langan bo'lsa, o'chirish darslarni ham olib ketadi
    // (onDelete: Cascade). Shuning uchun ishlatilayotgan fan o'chirilmaydi.
    const subject = await db.subject.findUnique({
      where: { id: input.id },
      select: {
        _count: { select: { lessons: true, grades: true, tests: true, teachers: true } },
      },
    });
    if (!subject) return { deleted: false };

    const usage =
      subject._count.lessons +
      subject._count.grades +
      subject._count.tests +
      subject._count.teachers;
    if (usage > 0) return { deleted: false };

    await db.subject.delete({ where: { id: input.id } });
    revalidateSubjects();
    return { deleted: true };
  },
  audit: {
    action: "DELETE",
    entity: "Subject",
    entityId: (input) => input.id,
    meta: (_input, result) => ({ deleted: result.deleted }),
  },
});

export async function createSubject(
  _prev: SubjectFormState,
  formData: FormData
): Promise<SubjectFormState> {
  const result = await createSubjectAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };
  redirectNever("/subjects");
}

export async function updateSubject(
  _prev: SubjectFormState,
  formData: FormData
): Promise<SubjectFormState> {
  const result = await updateSubjectAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };
  redirectNever("/subjects");
}

export async function deleteSubject(formData: FormData): Promise<void> {
  const result = await deleteSubjectAction(formDataToObject(formData));
  if (!result.ok || !result.data.deleted) {
    redirectNever("/subjects?error=inUse");
  }
  redirectNever("/subjects");
}
