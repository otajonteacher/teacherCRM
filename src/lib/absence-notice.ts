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

/**
 * BITTA O'QUVCHI UCHUN BIR KUNDA NAVBATGA QO'YILADIGAN XABAR CHEGARASI.
 *
 * Nima uchun kerak (kelajakdagi teshikni oldindan yopamiz):
 * matn ichida SANA bor, shuning uchun "bir xil matn" tekshiruvi faqat
 * AYNI SHU sanadagi takrorni to'xtatadi. Sana esa formadan keladi.
 * Ya'ni hisobi o'g'irlangan (yoki niyati buzuq) o'qituvchi turli sanalarni
 * yuborib, bitta ota-onaning telefoniga cheksiz SMS yog'dirishi mumkin edi:
 *   - ota-onani bezovta qilish (harassment)
 *   - maktabning SMS balansini yoqib yuborish (pul yo'qotish)
 *   - operator tomonidan raqamning bloklanishi
 *
 * SMS hali ulanmagan, lekin navbat allaqachon to'ldiriladi — modul
 * ulangan kuni navbatdagi hammasi birdan jo'nab ketardi. Shuning uchun
 * chegara HOZIR qo'yiladi.
 *
 * 5 ta — haqiqiy hayot uchun yetarli zaxira: bir o'quvchiga bir kunda
 * ko'pi bilan bitta "kelmadi" xabari boradi.
 */
const MAX_NOTICES_PER_STUDENT_PER_DAY = 5;

/** Bir chaqiruvda navbatga qo'shiladigan xabarlarning umumiy chegarasi. */
const MAX_NOTICES_PER_CALL = 200;

/** Bugungi kunning boshlanishi (server vaqti bo'yicha). */
function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export async function queueAbsenceNotices(
  absentStudentIds: string[],
  dateText: string
): Promise<void> {
  if (absentStudentIds.length === 0) return;

  // Chaqiruv darajasidagi chegara: qo'lda yasalgan ulkan so'rov butun
  // maktabni navbatga tiqib qo'ymasligi kerak.
  const ids = absentStudentIds.slice(0, MAX_NOTICES_PER_CALL);

  const students = await db.student.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      guardian: { select: { phone: true } },
    },
  });

  const since = startOfToday();

  for (const student of students) {
    const phone = student.guardian?.phone?.trim();
    if (!phone) continue;

    const body = `Hurmatli ota-ona! Farzandingiz ${student.lastName} ${student.firstName} ${dateText} kuni darsda qatnashmadi.`;

    const existing = await db.message.findFirst({
      where: { studentId: student.id, body },
      select: { id: true },
    });
    if (existing) continue;

    // Kunlik chegara: matn har xil bo'lsa ham (boshqa sana yuborilgan
    // bo'lsa ham) bir o'quvchi nomidan bir kunda ko'p xabar chiqmaydi.
    const todayCount = await db.message.count({
      where: { studentId: student.id, createdAt: { gte: since } },
    });
    if (todayCount >= MAX_NOTICES_PER_STUDENT_PER_DAY) continue;

    await db.message.create({
      data: { studentId: student.id, toPhone: phone, body, status: "QUEUED" },
    });
  }
}
