"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { redirectNever } from "@/lib/auth-guard";
import { gradingLessonScope } from "@/lib/scope";
import { toDate, type SaveResult } from "@/lib/academics";
import { dayOfWeekFromText, type AttendanceStatusValue } from "@/lib/attendance";
import { journalSaveSchema } from "@/lib/journal";
import { queueAbsenceNotices } from "@/lib/absence-notice";

/**
 * KUNLIK JURNALNI SAQLASH
 * =======================
 *
 * Xavfsizlik zanjiri:
 *   1. `roles` — faqat ADMIN va TEACHER yozadi (PARENT/ACCOUNTANT umuman yo'q)
 *   2. zod — kirish shakli, 0–100 oralig'i, qisqartmalar tekshiriladi
 *   3. `gradingLessonScope` — O'Z darslari SERVERDA topiladi; klient qaysi
 *      ustun ochiq ekanini AYTMAYDI
 *   4. o'quvchi filtri — faqat SHU sinf o'quvchilari
 *   5. chorak tekshiruvi — `Grade.quarterId` majburiy
 *   6. audit — kim, qachon, qaysi sinf jurnalini to'ldirdi
 *
 * 3-QADAM ENG MUHIMI. Jadvaldagi bloklangan input — bu faqat ko'rinish:
 * brauzer konsolidan `disabled` ni olib tashlab, boshqa fan ustuniga qiymat
 * yuborish mumkin. Shuning uchun server klientdan kelgan ustun ro'yxatiga
 * umuman ishonmaydi — o'zi `gradingLessonScope` bilan qidiradi va begona
 * darsga kelgan katakchani JIMGINA tashlab yuboradi (xato xabari hujumchiga
 * qaysi dars mavjudligini bildirmasligi kerak).
 *
 * AVTOMATIK "KELDI": baho qo'yilgan o'quvchi darsda bo'lgan — shuning uchun
 * davomat belgilanmagan bo'lsa PRESENT qo'yiladi. Bu o'qituvchining ishini
 * qisqartiradi, lekin qo'lda qo'yilgan belgini BOSMAYDI (masalan kechikkan
 * o'quvchi baho olsa, KCH saqlanib qoladi).
 */

export type JournalFormState = { error?: string };

const saveJournalAction = createAction({
  roles: ["ADMIN", "TEACHER"],
  schema: journalSaveSchema,
  handler: async (input, user): Promise<SaveResult> => {
    const dayOfWeek = dayOfWeekFromText(input.date);

    // 3-qadam: O'Z darslari. ADMIN uchun doira bo'sh — hammasi ochiq.
    const myLessons = await db.lesson.findMany({
      where: {
        AND: [{ classId: input.classId, dayOfWeek }, gradingLessonScope(user)],
      },
      select: {
        id: true,
        subjectId: true,
        teacherId: true,
        class: { select: { academicYearId: true } },
      },
    });

    if (myLessons.length === 0) {
      return { ok: false, message: "Bu kunda bu sinfda darsingiz yo'q." };
    }

    const lessonById = new Map(myLessons.map((lesson) => [lesson.id, lesson]));

    // 4-qadam: faqat shu sinf o'quvchilari.
    const classStudents = await db.student.findMany({
      where: { classId: input.classId },
      select: { id: true },
    });
    const allowedStudents = new Set(
      classStudents.map((student) => student.id)
    );

    const gradeEntries = input.grades.filter(
      (entry) =>
        allowedStudents.has(entry.studentId) && lessonById.has(entry.lessonId)
    );
    const attendanceEntries = input.attendance.filter((entry) =>
      allowedStudents.has(entry.studentId)
    );

    if (gradeEntries.length === 0 && attendanceEntries.length === 0) {
      return { ok: false, message: "Saqlash uchun ma'lumot kiritilmadi." };
    }

    const date = toDate(input.date);
    const academicYearId = myLessons[0].class.academicYearId;

    // 5-qadam: chorak. Baho qo'yilmasa (faqat davomat) chorak kerak emas.
    const needsQuarter = gradeEntries.some((entry) => entry.value !== null);

    const quarters = await db.quarter.findMany({
      where: academicYearId ? { academicYearId } : {},
      select: { id: true, startDate: true, endDate: true },
    });
    const quarter = quarters.find(
      (row) => row.startDate <= date && date <= row.endDate
    );

    if (needsQuarter && !quarter) {
      return {
        ok: false,
        message: `Bu sanaga mos chorak topilmadi: ${input.date}. O'quv yili va chorak sanalarini tekshiring.`,
      };
    }

    /**
     * Mavjud baholarni SERVER o'zi topadi — klientdan baho ID si olinmaydi.
     * Aks holda hujumchi begona ID yuborib boshqa o'quvchining bahosini
     * o'zgartirishi mumkin bo'lardi.
     */
    const existing = await db.grade.findMany({
      where: {
        studentId: { in: gradeEntries.map((entry) => entry.studentId) },
        date,
        type: "DAILY",
      },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        lessonId: true,
        value: true,
      },
    });

    const byLesson = new Map<string, (typeof existing)[number]>();
    /**
     * `Grade.lessonId` maydoni keyin qo'shilgani uchun eski baholarda u bo'sh.
     * Shunday yozuv topilsa, uni yangi ustunga "asrab olamiz" (lessonId
     * to'ldiriladi) — shunda eski baholar jurnalda dublikat bo'lib
     * ko'rinmaydi.
     */
    const legacyBySubject = new Map<string, (typeof existing)[number]>();

    for (const row of existing) {
      if (row.lessonId) {
        byLesson.set(`${row.studentId}|${row.lessonId}`, row);
      } else {
        legacyBySubject.set(`${row.studentId}|${row.subjectId}`, row);
      }
    }

    // Davomat: qo'lda belgilangan holatlar + avtomatik "keldi".
    const statusByStudent = new Map<string, AttendanceStatusValue>();
    for (const entry of attendanceEntries) {
      statusByStudent.set(entry.studentId, entry.status);
    }
    for (const entry of gradeEntries) {
      if (entry.value === null) continue;
      if (!statusByStudent.has(entry.studentId)) {
        statusByStudent.set(entry.studentId, "PRESENT");
      }
    }

    let changed = 0;

    // Bitta tranzaksiya: yoki hammasi saqlanadi, yoki hech narsa.
    await db.$transaction(async (tx) => {
      for (const entry of gradeEntries) {
        const lesson = lessonById.get(entry.lessonId);
        if (!lesson) continue;

        const lessonKey = `${entry.studentId}|${entry.lessonId}`;
        const legacyKey = `${entry.studentId}|${lesson.subjectId}`;

        let current = byLesson.get(lessonKey);
        if (!current) {
          current = legacyBySubject.get(legacyKey);
          // Bir eski yozuv faqat BITTA ustunga asrab olinadi — aks holda bir
          // fandan ikki dars bo'lganda ikkinchi ustun birinchisining ustiga
          // yozib, bahoni yo'q qilib qo'yardi.
          if (current) legacyBySubject.delete(legacyKey);
        }

        // Bo'sh katakcha = bahoni olib tashlash.
        if (entry.value === null) {
          if (current) {
            await tx.grade.delete({ where: { id: current.id } });
            changed += 1;
          }
          continue;
        }

        if (current) {
          // O'zgarmagan katakcha — bazaga tegmaymiz.
          if (
            current.value === entry.value &&
            current.lessonId === entry.lessonId
          ) {
            continue;
          }
          await tx.grade.update({
            where: { id: current.id },
            data: {
              value: entry.value,
              lessonId: entry.lessonId,
              teacherId: lesson.teacherId,
            },
          });
        } else {
          await tx.grade.create({
            data: {
              studentId: entry.studentId,
              subjectId: lesson.subjectId,
              lessonId: entry.lessonId,
              // Yuqorida tekshirildi — bu yerda chorak albatta bor.
              quarterId: quarter?.id as string,
              value: entry.value,
              type: "DAILY",
              date,
              teacherId: lesson.teacherId,
            },
          });
        }
        changed += 1;
      }

      /**
       * Davomat foydalanuvchining SHU KUNDAGI BARCHA darslariga yoziladi.
       * Jurnalda bitta "Davomat" ustuni bor, ya'ni belgi kunga tegishli:
       * "bugun keldi". Agar o'qituvchi shu sinfda kunda ikki dars o'tsa,
       * ikkisiga ham bir xil belgi tushadi.
       */
      for (const [studentId, status] of statusByStudent) {
        for (const lesson of myLessons) {
          await tx.attendance.upsert({
            where: {
              studentId_lessonId_date: {
                studentId,
                lessonId: lesson.id,
                date,
              },
            },
            create: { studentId, lessonId: lesson.id, date, status },
            update: { status },
          });
        }
        changed += 1;
      }
    });

    if (changed === 0) {
      return { ok: false, message: "O'zgarish yo'q." };
    }

    // Tranzaksiyadan TASHQARIDA: SMS navbati asosiy saqlashni ushlab
    // turmasligi kerak.
    await queueAbsenceNotices(
      Array.from(statusByStudent)
        .filter(([, status]) => status === "ABSENT")
        .map(([studentId]) => studentId),
      input.date
    );

    // Locale prefiksisiz — konvensiya bo'yicha.
    revalidatePath("/journal");
    revalidatePath("/grades");
    revalidatePath("/attendance");
    revalidatePath("/attendance/journal");
    revalidatePath("/ranking");

    return { ok: true, id: input.classId };
  },
  audit: {
    action: "UPDATE",
    entity: "Grade",
    entityId: (input) => input.classId,
    meta: (input) => ({
      source: "journal",
      date: input.date,
      grades: input.grades.length,
      attendance: input.attendance.length,
    }),
  },
});

function journalUrl(
  raw: Record<string, unknown>,
  saved?: boolean
): string {
  const params = new URLSearchParams({
    classId: String(raw.classId ?? ""),
    date: String(raw.date ?? ""),
  });
  if (saved) params.set("saved", "1");
  return `/journal?${params.toString()}`;
}

export async function saveJournal(
  _prev: JournalFormState,
  formData: FormData
): Promise<JournalFormState> {
  const raw = formDataToObject(formData);
  const result = await saveJournalAction(raw);

  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };

  redirectNever(journalUrl(raw, true));
}
