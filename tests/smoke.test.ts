import { describe, expect, it } from "vitest";

/**
 * QUVURNI TEKSHIRUVCHI TESTLAR
 *
 * Bu fayl biznes mantiqni test qilmaydi. Uning vazifasi — test
 * infratuzilmasining O'ZI ishlashini tasdiqlash.
 */
describe("test infratuzilmasi", () => {
  it("vitest ishga tushadi va tasdiqlash ishlaydi", () => {
    expect(1 + 1).toBe(2);
  });

  /**
   * Eng ko'p uchraydigan sozlash xatosi: @/ taxallusi test muhitida
   * yechilmasligi. Xato xabari chalg'ituvchi bo'ladi ("Cannot find
   * module") va odam kodda xato izlay boshlaydi, aslida muammo
   * vitest.config.ts da.
   *
   * attendance.ts ataylab tanlandi: u sof modul — bazaga, muhit
   * o'zgaruvchilariga yoki React'ga bog'liq emas. Ya'ni bu test faqat
   * taxallus yechilishini tekshiradi.
   */
  it("@/ taxallusi yechiladi (tsconfig paths)", async () => {
    const attendance = await import("@/lib/attendance");

    expect(Array.isArray(attendance.ATTENDANCE_STATUSES)).toBe(true);
    expect(attendance.ATTENDANCE_STATUSES).toContain("PRESENT");
  });
});
