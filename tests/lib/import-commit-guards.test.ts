import { describe, expect, it } from "vitest";
import { isStrongInitialPassword } from "@/lib/import-commit-guards";
import { MIN_PASSWORD_LENGTH, passwordSchema } from "@/lib/password";

/**
 * IMPORT PAROL SIYOSATI
 * =====================
 *
 * Bu testlarning maqsadi bitta: import yo'li bilan forma yo'li o'rtasida
 * parol qoidasi HECH QACHON ajralib ketmasin. Ilgari aynan shu ajralish
 * bor edi — formada uzunroq parol talab qilinardi, import esa qisqasini
 * qabul qilardi, ya'ni eng zaif hisoblar ommaviy yo'ldan kirib kelardi.
 *
 * H4e ESLATMASI: chegara 12 dan 8 ga tushirildi (tizim egasining qarori).
 * Shuning uchun bu fayldagi UZUNLIKKA bog'liq kutilmalar yangilandi.
 * Uzunlikdan MUSTAQIL tekshiruvlar (lug'at, harf+raqam, naqsh) o'z
 * kuchida qoldi — chegara pasaygani uchun ular endi muhimroq.
 *
 * Quyida chegara raqami QO'LDA yozilmaydi: hamma joyda
 * `MIN_PASSWORD_LENGTH` dan hisoblanadi. Sababi — aynan qo'lda yozilgan
 * raqam (`MIN_PASSWORD_LENGTH - 10`) bu faylni CI da sindirgan edi.
 */
describe("import parol siyosati formadagi siyosat bilan bir xil", () => {
  const samples = [
    "Abkr7mzq",
    "Maktab12",
    "admin123",
    "Parol12345678",
    "Toshkent7Bahor",
    "gulnoza7navoiy9kitob",
    "Toshkentaaaa7",
    "Toshkent98765x",
    "12345678901234",
    "faqatharflarbor",
    "",
  ];

  it.each(samples)("%j uchun ikki yo'l bir xil qaror qabul qiladi", (value) => {
    expect(isStrongInitialPassword(value)).toBe(
      passwordSchema.safeParse(value).success
    );
  });
});

/**
 * Bu blok eng muhim: import yo'li mustaqil tekshiruvga ega emasligini
 * (ya'ni `passwordSchema` dan chetga chiqmasligini) qiymatlar ustida
 * tasdiqlaydi.
 */
describe("import orqali zaif parol o'tmaydi", () => {
  /**
   * HALOL ESLATMA: chegara 8 ga tushgani uchun "Maktab12" kabi 8 belgili,
   * harf+raqamli parol endi HAM formada, HAM importda QABUL qilinadi.
   * Bu — chegarani pasaytirishning to'g'ridan-to'g'ri narxi, xato emas.
   * Test shu haqiqatni yozib qo'yadi, yashirmaydi.
   */
  it("yangi chegaradagi 8 belgili parol qabul qilinadi (ongli tradeoff)", () => {
    expect(isStrongInitialPassword("Abkr7mzq")).toBe(true);
    expect(isStrongInitialPassword("Maktab12")).toBe(true);
  });

  /**
   * Lug'at qatlami — chegara pasaygandan keyin asosiy to'siq. Admin
   * "oson eslab qolaman" deb qo'yadigan variantlar uzunligi yetsa ham
   * o'tmaydi.
   */
  it("mashhur/oson parollarni rad etadi (uzunligi yetsa ham)", () => {
    expect(isStrongInitialPassword("admin123Maktab")).toBe(false);
    expect(isStrongInitialPassword("Parol12345678")).toBe(false);
    expect(isStrongInitialPassword("Qwerty12")).toBe(false);
    expect(isStrongInitialPassword("abc12345")).toBe(false);
  });

  it("harf yoki raqam yo'q parolni rad etadi", () => {
    expect(isStrongInitialPassword("Toshkent")).toBe(false);
    expect(isStrongInitialPassword("83920475")).toBe(false);
  });

  it("naqsh (takror va ketma-ket qator) tekshiruvi importda ham ishlaydi", () => {
    expect(isStrongInitialPassword("Tosh7aaaa")).toBe(false);
    expect(isStrongInitialPassword("Toshkent98765x")).toBe(false);
  });

  /**
   * Chegaradan bir belgi qisqa parol. Uzunlik `MIN_PASSWORD_LENGTH` dan
   * hisoblanadi, shuning uchun chegara kelajakda o'zgarsa ham bu test
   * o'zi moslashadi va `repeat()` manfiy songa tushmaydi.
   */
  it("chegaradan bir belgi qisqa parolni rad etadi", () => {
    const base = "Abkr7mzqt5xw3ph8kd2vf6ny";
    expect(base.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    const short = base.slice(0, MIN_PASSWORD_LENGTH - 1);
    expect(short).toHaveLength(MIN_PASSWORD_LENGTH - 1);
    expect(isStrongInitialPassword(short)).toBe(false);
  });

  it("bo'sh parolni rad etadi", () => {
    expect(isStrongInitialPassword("")).toBe(false);
  });

  it("kuchli parolni qabul qiladi", () => {
    expect(isStrongInitialPassword("Toshkent7Bahor")).toBe(true);
    expect(isStrongInitialPassword("Xavfsiz-Kalit-2026")).toBe(true);
  });
});
