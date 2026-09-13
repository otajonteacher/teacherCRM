"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { studentUpdateSchema, studentWriteSchema } from "@/lib/students";
import { loadValidClassIds } from "@/lib/import-commit-guards";
import { redirectNever } from "@/lib/auth-guard";
import { assertCanAccessStudent, studentScope } from "@/lib/scope";

export type StudentFormState = { error?: string };

function toDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * `classId` brauzerdan keladi va sxema faqat "bo'sh bo'lmagan matn" deb
 * tekshiradi. Formada `<select>` bo'lsa ham, Server Action ochiq endpoint —
 * unga istalgan id yuborilishi mumkin.
 *
 * Bazadagi tashqi kalit (foreign key) noto'g'ri id ni baribir rad etadi, ya'ni
 * bu "yozuvni buzish" teshigi emas. Lekin tekshiruvni ataylab bazaga
 * tashlab qo'ymaymiz: FK xatosi umumiy "Bog'liq yozuv topilmadi" xabariga
 * aylanadi va sabab noaniq qoladi, bundan tashqari xato Prisma darajasida
 * ko'tarilib audit yozuvini ham chalkashtiradi. Shu sababli yozishdan OLDIN
 * o'zimiz tekshiramiz — fail-closed.
 */
async function assertClassExists(classId?: string | null) {
  if (!classId) return;
  const valid = await loadValidClassIds([classId]);
  if (!valid.has(classId)) {
    throw new Error("Tanlangan sinf topilmadi.");
  }
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
    await assertClassExists(input.classId);

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
  handler: async (input, user): Promise<{ id: string }> => {
    /**
     * DOIRA BILAN O'QISH (H4g).
     *
     * NIMA EDI: `db.student.findUnique({ where: { id: input.id } })` —
     * ya'ni `scope.ts` da yozilgan OLTIN QOIDA ("hech qachon yolg'iz
     * findUnique") shu yerda amalda buzilgan edi.
     *
     * NEGA XAVFLI: hozir amal faqat ADMIN uchun ochiq va ADMIN doirasi
     * bo'sh (`{}`), demak bu HOZIR sizib chiqadigan teshik EMAS — buni
     * bo'rttirib ko'rsatmayman. Lekin xavf kelajakda: `roles` ro'yxatiga
     * bir kun TEACHER qo'shilsa (masalan o'qituvchi o'z sinfidagi
     * o'quvchining telefonini to'g'rilashi kerak bo'lsa), himoya
     * JIMGINA yo'qolardi — kodda hech narsa o'zgarmagani uchun hech kim
     * sezmasdi. Xavfsizlik qoidasi "hozir ishlayapti" ga emas,
     * tuzilishga tayanishi kerak.
     *
     * ENDI: doira shartda turadi. ADMIN uchun natija bir xil, boshqa rol
     * qo'shilsa ruxsat avtomatik toraydi (fail-closed).
     */
    const existing = await db.student.findFirst({
      where: { AND: [{ id: input.id }, studentScope(user)] },
      select: { id: true, guardianId: true },
    });

    if (!existing) {
      /**
       * Yozuv yo'q YOKI doiradan tashqarida — ikkisi bir xil javob beradi
       * (enumeration himoyasi). Lekin urinish iz qoldirishi kerak:
       * `assertCanAccessStudent` `PERMISSION_DENIED` (`reason: "scope"`)
       * yozib, keyin `/forbidden` ga yo'naltiradi.
       *
       * Ikkinchi so'rov faqat SHU yo'lda bajariladi — normal ishlashda
       * qo'shimcha yuklama yo'q.
       */
      await assertCanAccessStudent(user, input.id);
      redirectNever("/forbidden");
    }

    await assertClassExists(input.classId);

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
