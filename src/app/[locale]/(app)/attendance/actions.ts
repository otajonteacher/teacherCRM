"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createAction, formDataToObject } from "@/lib/safe-action";
import { redirectNever } from "@/lib/auth-guard";
import { assertCanAccessLesson } from "@/lib/scope";
import { toDate, type SaveResult } from "@/lib/academics";
import { attendanceSaveSchema } from "@/lib/attendance";
import { queueAbsenceNotices } from "@/lib/absence-notice";

/**
 * DAVOMATNI SAQLASH (5-bosqich)
 * =============================
 *
 * Xavfsizlik zanjiri:
 *   1. `roles` — faqat ADMIN va TEACHER yozadi (PARENT ko'radi, ACCOUNTANT umuman kirmaydi)
 *   2. zod — kirish shakli tekshiriladi
 *   3. `assertCanAccessLesson` — bu odam SHU darsga tegishlimi (IDOR himoyasi)
 *   4. o'quvchi filtri — faqat SHU dars sinfidagi o'quvchilar yozuvi saqlanadi
 *   5. audit — kim, qachon, qaysi darsga davomat qo'ydi
 *
 * 4-qadam alohida ahamiyatga ega: forma maydon nomlari "entry:<studentId>"
 * ko'rinishida bo'lgani uchun, so'rovni qo'lda yasagan odam begona o'quvchi
 * ID sini qo'shib yuborishi mumkin. Shuning uchun serverda sinf tarkibi
 * bilan solishtiriladi.
 *
 * ESLATMA: ota-onaga xabar navbatga qo'yish mantig'i `src/lib/absence-notice.ts`
 * ga chiqarildi — uni kunlik jurnal ham chaqiradi. Bu fayl `"use server"`
 * bo'lgani uchun undan yordamchi funksiyani EXPORT qilish mumkin emas:
 * bunday eksport ochiq HTTP endpoint'ga aylanadi.
 */

export type AttendanceFormState = { error?: string };

const saveAttendanceAction = createAction({
  roles: ["ADMIN", "TEACHER"],
  schema: attendanceSaveSchema,
  handler: async (input, user): Promise<SaveResult> => {
    // Doiradan tashqarida bo'lsa bu yerda /forbidden ga yo'naltiradi.
    await assertCanAccessLesson(user, input.lessonId);

    const lesson = await db.lesson.findUnique({
      where: { id: input.lessonId },
      select: { id: true, classId: true },
    });
    if (!lesson) {
      return { ok: false, message: "Dars topilmadi." };
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
        message: "Kamida bitta o'quvchi uchun holat belgilang.",
      };
    }

    const date = toDate(input.date);

    // Bitta tranzaksiya: yoki hammasi saqlanadi, yoki hech narsa.
    await db.$transaction(
      entries.map((entry) =>
        db.attendance.upsert({
          where: {
            studentId_lessonId_date: {
              studentId: entry.studentId,
              lessonId: lesson.id,
              date,
            },
          },
          create: {
            studentId: entry.studentId,
            lessonId: lesson.id,
            date,
            status: entry.status,
          },
          update: { status: entry.status },
        })
      )
    );

    await queueAbsenceNotices(
      entries
        .filter((entry) => entry.status === "ABSENT")
        .map((entry) => entry.studentId),
      input.date
    );

    // Locale prefiksisiz — konvensiya bo'yicha.
    revalidatePath("/attendance");
    revalidatePath("/attendance/journal");
    revalidatePath("/journal");

    return { ok: true, id: lesson.id };
  },
  audit: {
    action: "UPDATE",
    entity: "Attendance",
    entityId: (input) => input.lessonId,
    meta: (input) => ({
      date: input.date,
      marked: input.entries.length,
    }),
  },
});

function attendanceUrl(
  lessonId: string,
  date: string,
  saved?: boolean
): string {
  const params = new URLSearchParams({ date, lessonId });
  if (saved) params.set("saved", "1");
  return `/attendance?${params.toString()}`;
}

export async function saveAttendance(
  _prev: AttendanceFormState,
  formData: FormData
): Promise<AttendanceFormState> {
  const raw = formDataToObject(formData);
  const result = await saveAttendanceAction(raw);

  if (!result.ok) return { error: result.error };
  if (!result.data.ok) return { error: result.data.message };

  redirectNever(
    attendanceUrl(String(raw.lessonId ?? ""), String(raw.date ?? ""), true)
  );
}
