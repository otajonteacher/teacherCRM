"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { studentUpdateSchema, studentWriteSchema } from "@/lib/students";
import { redirectNever } from "@/lib/auth-guard";

export type StudentFormState = { error?: string };

function toDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function upsertGuardian(input: {
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  existingId?: string | null;
}) {
  if (!input.guardianName || !input.guardianPhone) {
    return input.existingId ?? undefined;
  }

  if (input.existingId) {
    await db.guardian.update({
      where: { id: input.existingId },
      data: {
        fullName: input.guardianName,
        phone: input.guardianPhone,
        relation: input.guardianRelation,
      },
    });
    return input.existingId;
  }

  const guardian = await db.guardian.create({
    data: {
      fullName: input.guardianName,
      phone: input.guardianPhone,
      relation: input.guardianRelation,
    },
  });
  return guardian.id;
}

const createStudentAction = createAction({
  roles: ["ADMIN"],
  schema: studentWriteSchema,
  handler: async (input): Promise<{ id: string }> => {
    const guardianId = await upsertGuardian(input);
    const student = await db.student.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: toDate(input.dateOfBirth),
        gender: input.gender,
        address: input.address,
        classId: input.classId,
        status: input.status,
        guardianId,
      },
      select: { id: true },
    });
    revalidatePath("/students");
    return { id: student.id };
  },
  audit: {
    action: "CREATE",
    entity: "Student",
    entityId: (_input, result) => result.id,
  },
});

const updateStudentAction = createAction({
  roles: ["ADMIN"],
  schema: studentUpdateSchema,
  handler: async (input): Promise<{ id: string }> => {
    const existing = await db.student.findUnique({
      where: { id: input.id },
      select: { id: true, guardianId: true },
    });
    if (!existing) {
      redirectNever("/forbidden");
    }

    const guardianId = await upsertGuardian({
      ...input,
      existingId: existing.guardianId,
    });

    await db.student.update({
      where: { id: existing.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: toDate(input.dateOfBirth) ?? null,
        gender: input.gender ?? null,
        address: input.address ?? null,
        classId: input.classId ?? null,
        status: input.status,
        guardianId: guardianId ?? null,
      },
    });
    revalidatePath("/students");
    revalidatePath(`/students/${existing.id}`);
    return { id: existing.id };
  },
  audit: {
    action: "UPDATE",
    entity: "Student",
    entityId: (input) => input.id,
  },
});

export async function createStudent(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const result = await createStudentAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  redirectNever(`/students/${result.data.id}`);
}

export async function updateStudent(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const result = await updateStudentAction(formDataToObject(formData));
  if (!result.ok) return { error: result.error };
  redirectNever(`/students/${result.data.id}`);
}
