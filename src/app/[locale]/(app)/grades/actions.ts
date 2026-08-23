"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { redirectNever } from "@/lib/auth-guard";
import { assertCanGradeLesson } from "@/lib/scope";
import { toDate, type SaveResult } from "@/lib/academics";
import { gradeSaveSchema } from "@/lib/grades";

/**
 * BAHOLARNI SAQLASH (6-bosqich)
 * =============================
 *
 * Xavfsizlik zanjiri:
 *   1. `roles` — faqat ADMIN va TEACHER yozadi (PARENT ko'radi, ACCOUNTANT kirmaydi)
 *   2. zod — kirish shakli va 0-100 oralig'i tekshiriladi
 *   3. `assertCanGradeLesson` — FAQAT FAN O'QITUVCHISI (sinf rahbarligi yetarli emas)
 *   4. o'quvchi filtri — faqat SHU dars sinfidagi o'quvchilar yozuvi saqlanadi
 *   5. mavjud baho ID si SERVERDA topiladi — klientdan olinmaydi
 *   6. audit — kim, qachon, qaysi darsga baho qo'ydi
 *
 * 5-qadam alohida ahamiyatga ega. `Grade` da unique cheklovi yo'q, shuning
 * uchun "yangilash yoki yaratish" qarorini kimdir qabul qilishi kerak. Agar
 * baho ID si formadan kelsa, hujumchi begona ID ni yuborib boshqa
 * o'quvchining bahosini o'zgartirishi mumkin bo'lardi. Shuning uchun server
 * (fan + chorak + sana + tur + o'quvchi) bo'yicha o'zi qidiradi.
 */

export type GradeFormState = { error?: string };

const saveGradesAction = createAction({
  roles: ["ADMIN", "TEACHER"],
  schema: gradeSaveSchema,
  handler: async (input, user): Promise<SaveResult> => {
    // Fan o'qituvchisi emasmi — bu yerda /forbidden ga yo'naltiradi.
    await assertCanGradeLesson(user, input.lessonId);

    const lesson = await db.lesson.findUnique({
      where: { id: input.lessonId },
      select: {
        id: true,
        classId: true,
        subjectId: true,
        teacherId: true,
        class: { select: { academicYearId: true } },
      },
    });
    if (!lesson) {
      return { ok: false, message: "Dars topilmadi." };
    }

    const date = toDate(input.date);

    /**
     * `Grade.quarterId` MAJBURIY — shuning uchun sanaga mos chorak topilishi
     * shart. Sinfning o'quv yili ma'lum bo'lsa, shu yil ichidan qidiramiz
     * (turli yillarda sanalar ustma-ust tushib qolishi mumkin).
     *
     * Chorak topilmasa jim o'tib ketmaymiz: o'qituvchi sababini bilishi va
     * adminga aytishi kerak.
     */
    const quarter = await db.quarter.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
        ...(lesson.class.academicYearId
          ? { academicYearId: lesson.class.academicYearId }
          : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    if (!quarter) {
      return {
        ok: false,
        message:
          "Bu sanaga mos chorak topilmadi. O'quv yili va chorak sanalarini tekshiring.",
      };
    }

    const classStudents = await db.student.findMany({
      where: { classId: lesson.classId },
      select: { id: true },
    });
    const allowedIds = new Set(classStudents.map((student) => student.id));

    // Begona ID lar jimgina tashlab ketiladi — xato xabari hujumchiga
    // qaysi ID mavjudligini bildirmasligi kerak.
    const entries = input.entries.filter((entry) =>
      allowedIds.has(entry.studentId)
    );

    if (entries.length === 0) {
      return {
        ok: false,
        message: "Kamida bitta o'quvchiga baho kiriting.",
      };
    }

    // Mavjud baholarni SERVER o'zi topadi (klientdan ID olinmaydi).
    const existing = await db.grade.findMany({
      where: {
        subjectId: lesson.subjectId,
        quarterId: quarter.id,
        type: input.type,
        date,
        studentId: { in: entries.map((entry) => entry.studentId) },
      },
      select: { id: true, studentId: true },
    });
    const existingByStudent = new Map(
      existing.map((grade) => [grade.studentId, grade.id])
    );

    let changed = 0;

    // Bitta tranzaksiya: yoki hammasi saqlanadi, yoki hech narsa.
    await db.$transaction(async (tx) => {
      for (const entry of entries) {
        const currentId = existingByStudent.get(entry.studentId);

        // Bo'sh maydon = bahoni olib tashlash (xato kiritilgan bahoni tuzatish).
        if (entry.value === null) {
          if (currentId) {
            await tx.grade.delete({ where: { id: currentId } });
            changed += 1;
          }
          continue;
        }

        if (currentId) {
          await tx.grade.update({
            where: { id: currentId },
            data: { value: entry.value, teacherId: lesson.teacherId },
          });
        } else {
          await tx.grade.create({
            data: {
              studentId: entry.studentId,
              subjectId: lesson.subjectId,
              quarterId: quarter.id,
              value: entry.value,
              type: input.type,
              date,
              teacherId: lesson.teacherId,
            },
          });
        }
        changed += 1;
      }
    });

    if (changed === 0) {
      return { ok: false, message: "O'zgarish yo'q." };
    }

    // Locale prefiksisiz — konvensiya bo'yicha.
    revalidatePath("/grades");
    revalidatePath("/ranking");

    return { ok: true, id: lesson.id };
  },
  audit: {
    action: "UPDATE",
    entity: "Grade",
    entityId: (input) => input.lessonId,
    meta: (input) => ({
      date: input.date,
      type: input.type,
      marked: input.entries.length,
    }),
  },
});

function gradesUrl(
  lessonId: string,
  date: string,
  type: string,
  saved?: boolean
): string {
  const params = new URLSearchParams({ date, lessonId, type });
  if (saved) params.set("saved", "1");
  return `/grades?${params.toString()}`;
}

export async function saveGrades(
  _prev: GradeFormState,
  formData: FormData
): Promise<GradeFormState> {
  const raw = formDataToObject(formData);
  const result = await saveGradesAction(raw);

  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };

  redirectNever(
    gradesUrl(
      String(raw.lessonId ?? ""),
      String(raw.date ?? ""),
      String(raw.type ?? "DAILY"),
      true
    )
  );
}
