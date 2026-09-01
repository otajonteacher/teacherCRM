"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { redirectNever } from "@/lib/auth-guard";
import {
  academicYearUpdateSchema,
  academicYearWriteSchema,
  idOnlySchema,
  quarterInputs,
  toDate,
  type SaveResult,
} from "@/lib/academics";

export type AcademicYearFormState = { error?: string };

const DUPLICATE_MESSAGE = "Bu nomdagi o'quv yili allaqachon mavjud.";

function revalidateYears() {
  revalidatePath("/academic-years");
  revalidatePath("/classes");
}

const createYearAction = createAction({
  roles: ["ADMIN"],
  schema: academicYearWriteSchema,
  handler: async (input): Promise<SaveResult> => {
    const duplicate = await db.academicYear.findUnique({
      where: { name: input.name },
      select: { id: true },
    });
    if (duplicate) return { ok: false, message: DUPLICATE_MESSAGE };

    // Yil, choraklar va "joriy yil" belgisi — bittagina transaction ichida.
    // Aks holda yarim yozilgan holat (yil bor, choraklar yo'q) qolishi mumkin.
    const id = await db.$transaction(async (tx) => {
      const year = await tx.academicYear.create({
        data: {
          name: input.name,
          startDate: toDate(input.startDate),
          endDate: toDate(input.endDate),
          isCurrent: input.isCurrent,
        },
        select: { id: true },
      });

      const quarters = quarterInputs(input);
      if (quarters.length > 0) {
        await tx.quarter.createMany({
          data: quarters.map((quarter) => ({
            ...quarter,
            academicYearId: year.id,
          })),
        });
      }

      if (input.isCurrent) {
        await tx.academicYear.updateMany({
          where: { id: { not: year.id } },
          data: { isCurrent: false },
        });
      }

      return year.id;
    });

    revalidateYears();
    return { ok: true, id };
  },
  audit: {
    action: "CREATE",
    entity: "AcademicYear",
    entityId: (_input, result) => (result.ok ? result.id : null),
    meta: (input) => ({ name: input.name, isCurrent: input.isCurrent }),
  },
});

const updateYearAction = createAction({
  roles: ["ADMIN"],
  schema: academicYearUpdateSchema,
  handler: async (input): Promise<SaveResult> => {
    const duplicate = await db.academicYear.findFirst({
      where: { name: input.name, id: { not: input.id } },
      select: { id: true },
    });
    if (duplicate) return { ok: false, message: DUPLICATE_MESSAGE };

    await db.$transaction(async (tx) => {
      await tx.academicYear.update({
        where: { id: input.id },
        data: {
          name: input.name,
          startDate: toDate(input.startDate),
          endDate: toDate(input.endDate),
          isCurrent: input.isCurrent,
        },
      });

      // Choraklar O'CHIRILMAYDI — ularga baholar bog'langan (onDelete: Cascade).
      // Faqat mavjudi yangilanadi, yo'g'i qo'shiladi.
      for (const quarter of quarterInputs(input)) {
        await tx.quarter.upsert({
          where: {
            academicYearId_name: {
              academicYearId: input.id,
              name: quarter.name,
            },
          },
          update: { startDate: quarter.startDate, endDate: quarter.endDate },
          create: {
            academicYearId: input.id,
            name: quarter.name,
            startDate: quarter.startDate,
            endDate: quarter.endDate,
          },
        });
      }

      if (input.isCurrent) {
        await tx.academicYear.updateMany({
          where: { id: { not: input.id } },
          data: { isCurrent: false },
        });
      }
    });

    revalidateYears();
    return { ok: true, id: input.id };
  },
  audit: {
    action: "UPDATE",
    entity: "AcademicYear",
    entityId: (input) => input.id,
  },
});

const deleteYearAction = createAction({
  roles: ["ADMIN"],
  schema: idOnlySchema,
  handler: async (input): Promise<{ deleted: boolean }> => {
    const year = await db.academicYear.findUnique({
      where: { id: input.id },
      select: { _count: { select: { classes: true, quarters: true } } },
    });
    if (!year) return { deleted: false };

    // Sinf bog'langan yil o'chirilmaydi; choraklar bo'lsa baholar yo'qolishi mumkin.
    if (year._count.classes > 0) return { deleted: false };

    const gradeCount = await db.grade.count({
      where: { quarter: { academicYearId: input.id } },
    });
    if (gradeCount > 0) return { deleted: false };

    await db.academicYear.delete({ where: { id: input.id } });
    revalidateYears();
    return { deleted: true };
  },
  audit: {
    action: "DELETE",
    entity: "AcademicYear",
    entityId: (input) => input.id,
    meta: (_input, result) => ({ deleted: result.deleted }),
  },
});

export async function createAcademicYear(
  _prev: AcademicYearFormState,
  formData: FormData
): Promise<AcademicYearFormState> {
  const result = await createYearAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };
  redirectNever("/academic-years");
}

export async function updateAcademicYear(
  _prev: AcademicYearFormState,
  formData: FormData
): Promise<AcademicYearFormState> {
  const result = await updateYearAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };
  redirectNever("/academic-years");
}

export async function deleteAcademicYear(formData: FormData): Promise<void> {
  const result = await deleteYearAction(formDataToObject(formData));
  if (!result.ok || !result.data.deleted) {
    redirectNever("/academic-years?error=inUse");
  }
  redirectNever("/academic-years");
}
