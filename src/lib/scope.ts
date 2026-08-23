import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { redirectNever, type SessionUser } from "./auth-guard";

/**
 * MA'LUMOT DARAJASIDAGI DOIRA — IDOR himoyasi (Punkt 2)
 * ====================================================
 *
 * Rol tekshiruvi YETARLI EMAS. `requireRole("TEACHER")` faqat "bu odam
 * o'qituvchimi?" degan savolga javob beradi. Lekin o'qituvchi BOSHQA sinf
 * o'quvchisini ko'rmasligi, ota-ona BOSHQA oila farzandini ko'rmasligi kerak.
 *
 * Hujum ko'rinishi (IDOR — Insecure Direct Object Reference):
 *   /uz/students/abc123  →  ID ni boshqasiga o'zgartirib ko'rish
 * Rol to'g'ri bo'lgani uchun qorovul o'tkazib yuboradi va begona bolaning
 * ma'lumoti ochiladi. Shuning uchun har bir so'rov DOIRA bilan cheklanadi.
 *
 * OLTIN QOIDA
 * -----------
 * Hech qachon yolg'iz `findUnique({ where: { id } })` ishlatilmaydi.
 * Doim ikkisidan biri:
 *   1) Ro'yxat uchun — `where: { AND: [filtr, studentScope(user)] }`
 *   2) Bitta yozuv uchun — `await assertCanAccessStudent(user, id)`
 *
 * FAIL-CLOSED tamoyili
 * --------------------
 * Rol notanish yoki ID yo'q bo'lsa — doira HECH NARSANI qaytarmaydi
 * (`{ id: { in: [] } }`). Ya'ni xato holatda ruxsat kengaymaydi, torayadi.
 *
 * Bu fayl "qaysi QATORLAR" savoliga javob beradi.
 * "Qaysi ROL" savoli — src/lib/auth-guard.ts. Ikkisi birga ishlatiladi.
 */

/** Hech bir qatorga mos kelmaydigan filtr (fail-closed uchun). */
const MATCH_NOTHING = { id: { in: [] as string[] } };

/**
 * Sessiyadan foydalanuvchi ID sini xavfsiz oladi.
 * ID bo'lmasligi — kutilmagan holat, shuning uchun jim o'tkazib yubormaymiz.
 */
function requireUserId(user: SessionUser): string {
  if (!user.id) {
    throw new Error("Sessiyada foydalanuvchi ID si yo'q — doira hisoblanmaydi");
  }
  return user.id;
}

// ------------------------------------------------------------------
// Doira funksiyalari — Prisma `where` qaytaradi
// ------------------------------------------------------------------

/**
 * O'quvchilar doirasi.
 *
 * - ADMIN — hammasi
 * - ACCOUNTANT — hammasi, lekin FAQAT O'QISH (TZ 2.1 bo'yicha 👁).
 *   Yozish huquqi bu yerda emas, `requireRole` bilan cheklanadi — buxgalter
 *   chaqiradigan action'larda ACCOUNTANT ro'yxatga kiritilmaydi.
 * - TEACHER — o'zi sinf rahbari bo'lgan, yoki o'zi dars beradigan sinflar
 * - PARENT — faqat o'z farzandlari (Guardian orqali)
 */
export function studentScope(user: SessionUser): Prisma.StudentWhereInput {
  switch (user.role) {
    case "ADMIN":
    case "ACCOUNTANT":
      return {};

    case "TEACHER": {
      const userId = requireUserId(user);
      return {
        class: {
          OR: [
            { homeroomTeacher: { userId } },
            { lessons: { some: { teacher: { userId } } } },
          ],
        },
      };
    }

    case "PARENT":
      return { guardian: { userId: requireUserId(user) } };

    default:
      return MATCH_NOTHING;
  }
}

/** Sinflar doirasi. */
export function classScope(user: SessionUser): Prisma.ClassWhereInput {
  switch (user.role) {
    case "ADMIN":
    case "ACCOUNTANT":
      return {};

    case "TEACHER": {
      const userId = requireUserId(user);
      return {
        OR: [
          { homeroomTeacher: { userId } },
          { lessons: { some: { teacher: { userId } } } },
        ],
      };
    }

    case "PARENT":
      return {
        students: { some: { guardian: { userId: requireUserId(user) } } },
      };

    default:
      return MATCH_NOTHING;
  }
}

/**
 * Darslar doirasi.
 * O'qituvchi faqat O'Z darsiga davomat qo'yishi kerak — shu doira buni ta'minlaydi.
 * Ota-ona darsni to'g'ridan-to'g'ri emas, farzandi orqali ko'radi.
 *
 * 5-bosqich tuzatishi: sinf rahbari ham o'z sinfining BARCHA darslariga
 * yetishi kerak. Amalda davomatni ko'pincha sinf rahbari yuritadi, lekin u
 * har bir fanni o'zi o'qitmaydi. Ilgari faqat `teacher: { userId }` shart
 * bor edi va sinf rahbari o'z sinfidagi boshqa fanning darsiga davomat
 * qo'ya olmasdi. `classScope`/`studentScope` allaqachon shu mantiqda
 * ishlaydi, endi `lessonScope` ham ularga mos keladi.
 */
export function lessonScope(user: SessionUser): Prisma.LessonWhereInput {
  switch (user.role) {
    case "ADMIN":
      return {};

    case "TEACHER": {
      const userId = requireUserId(user);
      return {
        OR: [
          { teacher: { userId } },
          { class: { homeroomTeacher: { userId } } },
        ],
      };
    }

    case "PARENT":
      return {
        class: {
          students: { some: { guardian: { userId: requireUserId(user) } } },
        },
      };

    default:
      return MATCH_NOTHING;
  }
}

// Quyidagilar o'quvchi doirasidan kelib chiqadi — mantiq bitta joyda turadi,
// shuning uchun studentScope o'zgarsa hammasi avtomatik moslashadi.

/** Davomat doirasi. */
export function attendanceScope(
  user: SessionUser
): Prisma.AttendanceWhereInput {
  return { student: studentScope(user) };
}

/** Baholar doirasi. */
export function gradeScope(user: SessionUser): Prisma.GradeWhereInput {
  return { student: studentScope(user) };
}

/** Jarima ballar doirasi. */
export function penaltyScope(user: SessionUser): Prisma.PenaltyWhereInput {
  return { student: studentScope(user) };
}

/** Test natijalari doirasi. */
export function testResultScope(
  user: SessionUser
): Prisma.TestResultWhereInput {
  return { student: studentScope(user) };
}

/** Kontraktlar doirasi. */
export function contractScope(user: SessionUser): Prisma.ContractWhereInput {
  return { student: studentScope(user) };
}

/** Hisob-fakturalar doirasi (Contract orqali o'quvchiga bog'lanadi). */
export function invoiceScope(user: SessionUser): Prisma.InvoiceWhereInput {
  return { contract: { student: studentScope(user) } };
}

/** To'lovlar doirasi (Invoice → Contract → Student). */
export function paymentScope(user: SessionUser): Prisma.PaymentWhereInput {
  return { invoice: { contract: { student: studentScope(user) } } };
}

// ------------------------------------------------------------------
// Bitta yozuvga kirishni tekshirish
// ------------------------------------------------------------------

/**
 * Bu funksiyalar yozuv doira ichidami-yo'qmi tekshiradi.
 * Doiradan tashqarida bo'lsa — /forbidden ga yo'naltiradi va kod to'xtaydi.
 *
 * MUHIM: "topilmadi" va "ruxsat yo'q" bir xil javob beradi. Bu ataylab:
 * aks holda hujumchi javoblarni taqqoslab qaysi ID lar mavjudligini
 * aniqlab olishi mumkin (enumeration).
 *
 * @example
 * const user = await requireTeaching();
 * await assertCanAccessStudent(user, params.id);
 * // shundan keyingina yozuvni to'liq o'qish mumkin
 */

async function assertExists<T>(row: T | null): Promise<T> {
  if (!row) {
    redirectNever("/forbidden");
  }
  return row;
}

/** O'quvchiga kirish huquqini tekshiradi. */
export async function assertCanAccessStudent(
  user: SessionUser,
  studentId: string
): Promise<string> {
  const row = await db.student.findFirst({
    where: { AND: [{ id: studentId }, studentScope(user)] },
    select: { id: true },
  });
  return (await assertExists(row)).id;
}

/** Sinfga kirish huquqini tekshiradi. */
export async function assertCanAccessClass(
  user: SessionUser,
  classId: string
): Promise<string> {
  const row = await db.class.findFirst({
    where: { AND: [{ id: classId }, classScope(user)] },
    select: { id: true },
  });
  return (await assertExists(row)).id;
}

/** Darsga kirish huquqini tekshiradi (davomat uchun muhim). */
export async function assertCanAccessLesson(
  user: SessionUser,
  lessonId: string
): Promise<string> {
  const row = await db.lesson.findFirst({
    where: { AND: [{ id: lessonId }, lessonScope(user)] },
    select: { id: true },
  });
  return (await assertExists(row)).id;
}

/** Bahoga kirish huquqini tekshiradi. */
export async function assertCanAccessGrade(
  user: SessionUser,
  gradeId: string
): Promise<string> {
  const row = await db.grade.findFirst({
    where: { AND: [{ id: gradeId }, gradeScope(user)] },
    select: { id: true },
  });
  return (await assertExists(row)).id;
}

/** Davomat yozuviga kirish huquqini tekshiradi. */
export async function assertCanAccessAttendance(
  user: SessionUser,
  attendanceId: string
): Promise<string> {
  const row = await db.attendance.findFirst({
    where: { AND: [{ id: attendanceId }, attendanceScope(user)] },
    select: { id: true },
  });
  return (await assertExists(row)).id;
}

/** Jarima ballga kirish huquqini tekshiradi. */
export async function assertCanAccessPenalty(
  user: SessionUser,
  penaltyId: string
): Promise<string> {
  const row = await db.penalty.findFirst({
    where: { AND: [{ id: penaltyId }, penaltyScope(user)] },
    select: { id: true },
  });
  return (await assertExists(row)).id;
}

/** Hisob-fakturaga kirish huquqini tekshiradi. */
export async function assertCanAccessInvoice(
  user: SessionUser,
  invoiceId: string
): Promise<string> {
  const row = await db.invoice.findFirst({
    where: { AND: [{ id: invoiceId }, invoiceScope(user)] },
    select: { id: true },
  });
  return (await assertExists(row)).id;
}

/** To'lovga kirish huquqini tekshiradi. */
export async function assertCanAccessPayment(
  user: SessionUser,
  paymentId: string
): Promise<string> {
  const row = await db.payment.findFirst({
    where: { AND: [{ id: paymentId }, paymentScope(user)] },
    select: { id: true },
  });
  return (await assertExists(row)).id;
}
