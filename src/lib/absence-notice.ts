import { db } from "./db";

/**
 * SABABSIZ KELMAGAN O'QUVCHI — OTA-ONAGA XABAR NAVBATI
 * ===================================================
 *
 * Hozircha faqat `Message` jadvaliga QUEUED holatida yoziladi — haqiqiy
 * yuborish (Eskiz.uz / Play Mobile) 10-bosqichda ulanadi. Shu tufayli davomat
 * bugun ishlaydi, SMS moduli tayyor bo'lganda navbatdagi xabarlar o'z-o'zidan
 * jo'natiladi.
 *
 * NIMA UCHUN ALOHIDA FAYL: bu mantiq ikki joydan chaqiriladi — davomat
 * sahifasi va kunlik jurnal. Uni `"use server"` faylidan `export` qilish
 * XAVFSIZ EMAS: `"use server"` faylidagi har bir eksport ochiq HTTP
 * endpoint'ga aylanadi, ya'ni tashqaridan chaqirib istalgan o'quvchi nomiga
 * xabar navbatga qo'yish mumkin bo'lardi. Shuning uchun umumiy mantiq oddiy
 * kutubxona fayliga chiqarildi — u faqat server kodidan import qilinadi.
 *
 * Takroriy xabar yuborilmasligi uchun bir xil matnli yozuv borligi
 * tekshiriladi — forma qayta saqlansa, ota-ona ikkinchi SMS olmaydi.
 */
export async function queueAbsenceNotices(
  absentStudentIds: string[],
  dateText: string
): Promise<void> {
  if (absentStudentIds.length === 0) return;

  const students = await db.student.findMany({
    where: { id: { in: absentStudentIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      guardian: { select: { phone: true } },
    },
  });

  for (const student of students) {
    const phone = student.guardian?.phone?.trim();
    if (!phone) continue;

    const body = `Hurmatli ota-ona! Farzandingiz ${student.lastName} ${student.firstName} ${dateText} kuni darsda qatnashmadi.`;

    const existing = await db.message.findFirst({
      where: { studentId: student.id, body },
      select: { id: true },
    });
    if (existing) continue;

    await db.message.create({
      data: { studentId: student.id, toPhone: phone, body, status: "QUEUED" },
    });
  }
}
