"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { redirectNever } from "@/lib/auth-guard";
import { assertCanGradeClassSubject, gradingLessonScope } from "@/lib/scope";
import { toDate, type SaveResult } from "@/lib/academics";
import {
  cellKey,
  dateToText,
  gradeGridSaveSchema,
  monthDatesForWeekdays,
} from "@/lib/grades";

/**
 * OYLIK JURNALNI SAQLASH (6-bosqich)
 * ==================================
 *
 * Xavfsizlik zanjiri:
 *   1. `roles` — faqat ADMIN va TEACHER yozadi
 *   2. zod — kirish shakli va 0–100 oralig'i tekshiriladi
 *   3. `assertCanGradeClassSubject` — FAQAT FAN O'QITUVCHISI (sinf rahbarligi
 *      yetarli emas)
 *   4. o'quvchi filtri — faqat SHU sinf o'quvchilari
 *   5. SANA filtri — faqat shu fan darsi bo'ladigan kunlar
 *   6. mavjud baho ID si SERVERDA topiladi — klientdan olinmaydi
 *   7. audit — kim, qachon, qaysi fanga baho qo'ydi
 *
 * 4 va 5-qadamlar juft ishlaydi. Forma maydonlari
 * "grade:<studentId>:<sana>" ko'rinishida, ya'ni so'rovni qo'lda yasagan odam
 * ikki xil yolg'on yuborishi mumkin: begona o'quvchi ID si yoki dars
 * bo'lmagan sana (masalan yakshanba yoki boshqa oy). Ikkisi ham serverda
 * kesiladi.
 *
 * 6-qadam eng nozik joyi: `Grade` da unique cheklovi yo'q, shuning uchun
 * "yangilashmi yoki yangi yaratishmi" qarorini kimdir qabul qilishi kerak.
 * Agar baho ID si formadan kelsa, hujumchi begona ID ni yuborib boshqa
 * o'quvchining bahosini o'zgartirishi mumkin bo'lardi. Shuning uchun server
 * (fan + chorak + sana + tur + o'quvchi) bo'yicha o'zi qidiradi.
 */

export type GradeFormState = { error?: string };

const saveGradesAction = createAction({
  roles: ["ADMIN", "TEACHER"],
  schema: gradeGridSaveSchema,
  handler: async (input, user): Promise<SaveResult> => {
    // Fan o'qituvchisi emasmi — bu yerda /forbidden ga yo'naltiradi.
    await assertCanGradeClassSubject(user, input.classId, input.subjectId);

    // Shu sinf + fan bo'yicha foydalanuvchining darslari: hafta kunlarini va
    // o'qituvchini shundan olamiz.
    const lessons = await db.lesson.findMany({
      where: {
        AND: [
          { classId: input.classId, subjectId: input.subjectId },
          gradingLessonScope(user),
        ],
      },
      select: {
        dayOfWeek: true,
        teacherId: true,
        class: { select: { academicYearId: true } },
      },
    });
    if (lessons.length === 0) {
      return { ok: false, message: "Dars topilmadi." };
    }

    const teacherId = lessons[0].teacherId;
    const academicYearId = lessons[0].class.academicYearId;

    // 5-qadam: faqat haqiqiy dars kunlari.
    const allowedDates = new Set(
      monthDatesForWeekdays(
        input.month,
        lessons.map((lesson) => lesson.dayOfWeek)
      )
    );

    // 4-qadam: faqat shu sinf o'quvchilari.
    const classStudents = await db.student.findMany({
      where: { classId: input.classId },
      select: { id: true },
    });
    const allowedIds = new Set(classStudents.map((student) => student.id));

    // Begona qiymatlar jimgina tashlanadi — xato xabari hujumchiga qaysi ID
    // mavjudligini bildirmasligi kerak.
    const entries = input.entries.filter(
      (entry) => allowedIds.has(entry.studentId) && allowedDates.has(entry.date)
    );

    if (entries.length === 0) {
      return { ok: false, message: "Saqlash uchun baho kiritilmadi." };
    }

    const dates = Array.from(new Set(entries.map((entry) => entry.date)));

    /**
     * `Grade.quarterId` MAJBURIY, shuning uchun har bir sana uchun chorak
     * topilishi shart. Oy chorak chegarasidan o'tib ketishi mumkin (masalan
     * oktabr oxirida 1-chorak tugab, 2-chorak boshlanadi), shuning uchun
     * chorak har bir sana uchun alohida aniqlanadi.
     */
    const quarters = await db.quarter.findMany({
      where: academicYearId ? { academicYearId } : {},
      select: { id: true, startDate: true, endDate: true },
    });

    const quarterIdFor = (dateText: string): string | undefined => {
      const value = toDate(dateText);
      const found = quarters.find(
        (quarter) => quarter.startDate <= value && value <= quarter.endDate
      );
      return found?.id;
    };

    const missingDates = dates.filter((date) => !quarterIdFor(date));
    if (missingDates.length > 0) {
      return {
        ok: false,
        message: `Bu sanalarga mos chorak topilmadi: ${missingDates
          .slice(0, 3)
          .join(", ")}. O'quv yili va chorak sanalarini tekshiring.`,
      };
    }

    // 6-qadam: mavjud baholarni SERVER o'zi topadi.
    const existing = await db.grade.findMany({
      where: {
        subjectId: input.subjectId,
        type: input.type,
        studentId: { in: entries.map((entry) => entry.studentId) },
        date: { in: dates.map((date) => toDate(date)) },
      },
      select: { id: true, studentId: true, date: true, value: true },
    });

    const existingByCell = new Map(
      existing.map((grade) => [
        cellKey(grade.studentId, dateToText(grade.date)),
        grade,
      ])
    );

    let changed = 0;

    // Bitta tranzaksiya: yoki hammasi saqlanadi, yoki hech narsa.
    await db.$transaction(async (tx) => {
      for (const entry of entries) {
        const current = existingByCell.get(
          cellKey(entry.studentId, entry.date)
        );

        // Bo'sh katakcha = bahoni olib tashlash.
        if (entry.value === null) {
          if (current) {
            await tx.grade.delete({ where: { id: current.id } });
            changed += 1;
          }
          continue;
        }

        // O'zgarmagan katakcha — bazaga tegmaymiz.
        if (current && current.value === entry.value) continue;

        if (current) {
          await tx.grade.update({
            where: { id: current.id },
            data: { value: entry.value, teacherId },
          });
        } else {
          await tx.grade.create({
            data: {
              studentId: entry.studentId,
              subjectId: input.subjectId,
              // Yuqorida tekshirildi — bu yerda chorak albatta bor.
              quarterId: quarterIdFor(entry.date) as string,
              value: entry.value,
              type: input.type,
              date: toDate(entry.date),
              teacherId,
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

    return { ok: true, id: input.subjectId };
  },
  audit: {
    action: "UPDATE",
    entity: "Grade",
    entityId: (input) => input.subjectId,
    meta: (input) => ({
      classId: input.classId,
      month: input.month,
      type: input.type,
      cells: input.entries.length,
    }),
  },
});

function gradesUrl(
  raw: Record<string, unknown>,
  saved?: boolean
): string {
  const params = new URLSearchParams({
    classId: String(raw.classId ?? ""),
    subjectId: String(raw.subjectId ?? ""),
    month: String(raw.month ?? ""),
    type: String(raw.type ?? "DAILY"),
  });
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

  redirectNever(gradesUrl(raw, true));
}
