"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { redirectNever } from "@/lib/auth-guard";
import {
  idOnlySchema,
  lessonPeriodUpdateSchema,
  lessonPeriodWriteSchema,
  timeRangesOverlap,
  type SaveResult,
} from "@/lib/academics";

export type LessonPeriodFormState = { error?: string };

function revalidatePeriods() {
  revalidatePath("/lesson-periods");
  revalidatePath("/schedule");
}

type PeriodInput = {
  id?: string;
  index: number;
  startTime: string;
  endTime: string;
};

/**
 * Qo'ng'iroq jadvalida bir dars boshqasining ustiga chiqmasligi kerak,
 * tartib raqami ham takrorlanmasligi kerak. Tekshiruv transaction ichida —
 * ikki admin bir vaqtda saqlasa ham holat buzilmaydi.
 */
async function periodConflict(
  tx: {
    lessonPeriod: {
      findMany: (args: unknown) => Promise<
        Array<{ id: string; index: number; startTime: string; endTime: string }>
      >;
    };
  },
  input: PeriodInput
): Promise<string | null> {
  const others = await tx.lessonPeriod.findMany({
    where: input.id ? { id: { not: input.id } } : {},
    select: { id: true, index: true, startTime: true, endTime: true },
  });

  if (others.some((period) => period.index === input.index)) {
    return "Bu tartib raqami allaqachon band.";
  }

  const overlapping = others.find((period) =>
    timeRangesOverlap(input.startTime, input.endTime, period.startTime, period.endTime)
  );
  if (overlapping) {
    return `Vaqt ${overlapping.index}-dars (${overlapping.startTime}–${overlapping.endTime}) bilan kesishadi.`;
  }

  return null;
}

const createPeriodAction = createAction({
  roles: ["ADMIN"],
  schema: lessonPeriodWriteSchema,
  handler: async (input): Promise<SaveResult> => {
    const result = await db.$transaction(async (tx) => {
      const conflict = await periodConflict(tx, input);
      if (conflict) return { ok: false as const, message: conflict };

      const period = await tx.lessonPeriod.create({
        data: {
          index: input.index,
          label: input.label ?? null,
          startTime: input.startTime,
          endTime: input.endTime,
        },
        select: { id: true },
      });
      return { ok: true as const, id: period.id };
    });

    if (result.ok) revalidatePeriods();
    return result;
  },
  audit: {
    action: "CREATE",
    entity: "LessonPeriod",
    entityId: (_input, result) => (result.ok ? result.id : null),
    meta: (input) => ({ index: input.index }),
  },
});

const updatePeriodAction = createAction({
  roles: ["ADMIN"],
  schema: lessonPeriodUpdateSchema,
  handler: async (input): Promise<SaveResult> => {
    const result = await db.$transaction(async (tx) => {
      const conflict = await periodConflict(tx, input);
      if (conflict) return { ok: false as const, message: conflict };

      await tx.lessonPeriod.update({
        where: { id: input.id },
        data: {
          index: input.index,
          label: input.label ?? null,
          startTime: input.startTime,
          endTime: input.endTime,
        },
      });

      // Darslar vaqti qo'ng'iroq jadvalidan olinadi — uyani o'zgartirsak,
      // shu uyadagi darslarning vaqti ham yangilanishi kerak.
      await tx.lesson.updateMany({
        where: { periodId: input.id },
        data: { startTime: input.startTime, endTime: input.endTime },
      });

      return { ok: true as const, id: input.id };
    });

    if (result.ok) revalidatePeriods();
    return result;
  },
  audit: {
    action: "UPDATE",
    entity: "LessonPeriod",
    entityId: (input) => input.id,
  },
});

const deletePeriodAction = createAction({
  roles: ["ADMIN"],
  schema: idOnlySchema,
  handler: async (input): Promise<{ deleted: boolean }> => {
    const lessonCount = await db.lesson.count({ where: { periodId: input.id } });
    if (lessonCount > 0) return { deleted: false };

    await db.lessonPeriod.delete({ where: { id: input.id } });
    revalidatePeriods();
    return { deleted: true };
  },
  audit: {
    action: "DELETE",
    entity: "LessonPeriod",
    entityId: (input) => input.id,
    meta: (_input, result) => ({ deleted: result.deleted }),
  },
});

export async function createLessonPeriod(
  _prev: LessonPeriodFormState,
  formData: FormData
): Promise<LessonPeriodFormState> {
  const result = await createPeriodAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };
  redirectNever("/lesson-periods");
}

export async function updateLessonPeriod(
  _prev: LessonPeriodFormState,
  formData: FormData
): Promise<LessonPeriodFormState> {
  const result = await updatePeriodAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };
  redirectNever("/lesson-periods");
}

export async function deleteLessonPeriod(formData: FormData): Promise<void> {
  const result = await deletePeriodAction(formDataToObject(formData));
  if (!result.ok || !result.data.deleted) {
    redirectNever("/lesson-periods?error=inUse");
  }
  redirectNever("/lesson-periods");
}
