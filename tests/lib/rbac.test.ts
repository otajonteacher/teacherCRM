import { describe, expect, it } from "vitest";
import type { Role } from "@prisma/client";

import {
  ROLES,
  hasRole,
  homePathForRole,
  isPathAllowed,
  roleAllowedPaths,
} from "@/lib/rbac";

/**
 * SAHIFA DARAJASIDAGI RUXSAT TESTLARI
 * ===================================
 *
 * `rbac.ts` — "kim qaysi SAHIFAGA kiradi" savoliga javob beradi.
 * "Kim qaysi QATORLARNI ko'radi" savoli alohida fayl (`scope.ts`) va
 * alohida test faylida.
 */

/**
 * `src/app/[locale]/(app)` da HAQIQATDA mavjud bo'lgan sahifalar.
 *
 * Bu ro'yxat ADMIN ruxsati fail-closed bo'lgandan keyin kerak bo'ldi:
 * jadvalga yozilmagan sahifa endi hech kim uchun ochilmaydi, shuning uchun
 * "mavjud sahifa jadvaldan tushib qolgan" holatini test qo'riqlaydi.
 * Yangi sahifa yaratganda uni SHU ro'yxatga ham, `roleAllowedPaths` ga ham
 * qo'shish kerak — aks holda test yiqiladi va esdan chiqmaydi.
 */
const EXISTING_APP_PAGES = [
  "/academic-years",
  "/attendance",
  "/classes",
  "/dashboard",
  "/grades",
  "/journal",
  "/lesson-periods",
  "/ranking",
  "/schedule",
  "/students",
  "/subjects",
  "/teachers",
] as const;

describe("ROLES", () => {
  it("TZ 2.1 dagi to'rt rolni o'z ichiga oladi", () => {
    expect(ROLES).toEqual(["ADMIN", "TEACHER", "ACCOUNTANT", "PARENT"]);
  });

  it("har bir rol uchun ruxsat jadvali mavjud", () => {
    for (const role of ROLES) {
      expect(Array.isArray(roleAllowedPaths[role])).toBe(true);
      expect(roleAllowedPaths[role].length).toBeGreaterThan(0);
    }
  });

  it("ruxsat ro'yxatlarida takroriy yo'l yo'q", () => {
    for (const role of ROLES) {
      const paths = roleAllowedPaths[role];
      expect(new Set(paths).size).toBe(paths.length);
    }
  });
});

describe("hasRole", () => {
  it("rol ro'yxatda bo'lsa true", () => {
    expect(hasRole("TEACHER", ["TEACHER", "ADMIN"])).toBe(true);
  });

  it("rol ro'yxatda bo'lmasa false", () => {
    expect(hasRole("PARENT", ["TEACHER", "ADMIN"])).toBe(false);
  });

  it("rol undefined bo'lsa false (fail-closed)", () => {
    expect(hasRole(undefined, ["TEACHER", "ADMIN"])).toBe(false);
  });

  it("ruxsat ro'yxati bo'sh bo'lsa hech kim o'tmaydi", () => {
    expect(hasRole("ADMIN", [])).toBe(false);
  });
});

describe("homePathForRole", () => {
  it("barcha rollar uchun /dashboard qaytaradi", () => {
    for (const role of ROLES) {
      expect(homePathForRole(role)).toBe("/dashboard");
    }
  });

  it("har bir rolning ruxsat ro'yxatida boshlang'ich sahifa bor", () => {
    for (const role of ROLES) {
      expect(isPathAllowed(role, homePathForRole(role))).toBe(true);
    }
  });
});

describe("isPathAllowed — ADMIN", () => {
  it("boshqaruv sahifalariga kiradi", () => {
    expect(isPathAllowed("ADMIN", "/students")).toBe(true);
    expect(isPathAllowed("ADMIN", "/payments")).toBe(true);
    expect(isPathAllowed("ADMIN", "/journal")).toBe(true);
    expect(isPathAllowed("ADMIN", "/users")).toBe(true);
  });

  it("ichki sahifalarga ham kiradi (prefiks bo'yicha)", () => {
    expect(isPathAllowed("ADMIN", "/students/abc123")).toBe(true);
    expect(isPathAllowed("ADMIN", "/teachers/import")).toBe(true);
    expect(isPathAllowed("ADMIN", "/classes/5-A/edit")).toBe(true);
  });

  /**
   * FAIL-CLOSED — O'ZGARTIRILGAN QOIDA.
   *
   * Ilgari bu test teskari edi: ADMIN jadvalda umuman yo'q yo'lga ham
   * kirardi ("kelajakda yangi sahifa qo'shilsa darhol ishlasin").
   * Amalda bu himoyaning ochiq qolishi edi: yarim tayyor, qorovulsiz yoki
   * ichki/test sahifa ham ADMIN uchun avtomatik ochilardi.
   *
   * Endi ruxsat faqat ATAYLAB beriladi.
   */
  it("jadvalda yo'q yo'lga KIRMAYDI (fail-closed)", () => {
    expect(isPathAllowed("ADMIN", "/hali-yaratilmagan-sahifa")).toBe(false);
    expect(isPathAllowed("ADMIN", "/debug")).toBe(false);
    expect(isPathAllowed("ADMIN", "/internal/backup")).toBe(false);
  });

  /**
   * QAMROV TESTI.
   *
   * Fail-closed qoidasining teskari xavfi: mavjud sahifa jadvaldan tushib
   * qolsa, ADMIN o'z ishini bajara olmaydi. Shuni qo'riqlaydi.
   */
  it("mavjud barcha sahifalar ADMIN uchun ochiq", () => {
    for (const path of EXISTING_APP_PAGES) {
      expect(isPathAllowed("ADMIN", path), path).toBe(true);
    }
  });
});

describe("isPathAllowed — TEACHER", () => {
  it("o'z ish sahifalariga kiradi", () => {
    expect(isPathAllowed("TEACHER", "/journal")).toBe(true);
    expect(isPathAllowed("TEACHER", "/attendance")).toBe(true);
    expect(isPathAllowed("TEACHER", "/grades")).toBe(true);
    expect(isPathAllowed("TEACHER", "/ranking")).toBe(true);
  });

  it("ichki sahifalarga ham kiradi (prefiks bo'yicha)", () => {
    expect(isPathAllowed("TEACHER", "/students/abc123")).toBe(true);
    expect(isPathAllowed("TEACHER", "/classes/5-A/tahrirlash")).toBe(true);
  });

  it("boshqaruv va moliya sahifalariga kirmaydi", () => {
    expect(isPathAllowed("TEACHER", "/users")).toBe(false);
    expect(isPathAllowed("TEACHER", "/payments")).toBe(false);
    expect(isPathAllowed("TEACHER", "/reports")).toBe(false);
    expect(isPathAllowed("TEACHER", "/academic-years")).toBe(false);
    expect(isPathAllowed("TEACHER", "/subjects")).toBe(false);
  });

  it("jarima MEZONLARI — faqat ADMIN uchun", () => {
    expect(isPathAllowed("TEACHER", "/penalties")).toBe(true);
    expect(isPathAllowed("TEACHER", "/penalty-criteria")).toBe(false);
  });

  it("jadvalda yo'q yo'lga kirmaydi", () => {
    expect(isPathAllowed("TEACHER", "/hali-yaratilmagan-sahifa")).toBe(false);
  });
});

describe("isPathAllowed — PARENT", () => {
  it("farzand natijalarini ko'radigan sahifalarga kiradi", () => {
    expect(isPathAllowed("PARENT", "/grades")).toBe(true);
    expect(isPathAllowed("PARENT", "/attendance")).toBe(true);
    expect(isPathAllowed("PARENT", "/ranking")).toBe(true);
    expect(isPathAllowed("PARENT", "/payments")).toBe(true);
  });

  /**
   * ENG MUHIM TEST.
   *
   * Jurnal — baho va davomat KIRITISH joyi. Ota-ona faqat natijani ko'radi.
   */
  it("jurnalga kira OLMAYDI (baho kiritish joyi)", () => {
    expect(isPathAllowed("PARENT", "/journal")).toBe(false);
  });

  it("boshqa o'quvchilar ro'yxatiga kira olmaydi", () => {
    expect(isPathAllowed("PARENT", "/students")).toBe(false);
    expect(isPathAllowed("PARENT", "/teachers")).toBe(false);
    expect(isPathAllowed("PARENT", "/classes")).toBe(false);
    expect(isPathAllowed("PARENT", "/users")).toBe(false);
  });

  it("rag'bat MEZONLARI yopiq, rag'batlar ochiq", () => {
    expect(isPathAllowed("PARENT", "/rewards")).toBe(true);
    expect(isPathAllowed("PARENT", "/reward-criteria")).toBe(false);
  });
});

describe("isPathAllowed — ACCOUNTANT", () => {
  it("moliya sahifalariga kiradi", () => {
    expect(isPathAllowed("ACCOUNTANT", "/payments")).toBe(true);
    expect(isPathAllowed("ACCOUNTANT", "/reports")).toBe(true);
    expect(isPathAllowed("ACCOUNTANT", "/messages")).toBe(true);
  });

  it("o'quvchilar ro'yxatini ko'radi (TZ 2.1 bo'yicha ko'zdan kechirish)", () => {
    expect(isPathAllowed("ACCOUNTANT", "/students")).toBe(true);
  });

  it("o'quv jarayoni sahifalariga kirmaydi", () => {
    expect(isPathAllowed("ACCOUNTANT", "/journal")).toBe(false);
    expect(isPathAllowed("ACCOUNTANT", "/grades")).toBe(false);
    expect(isPathAllowed("ACCOUNTANT", "/attendance")).toBe(false);
    expect(isPathAllowed("ACCOUNTANT", "/ranking")).toBe(false);
  });
});

describe("isPathAllowed — chegara holatlari", () => {
  it("rol undefined bo'lsa false (fail-closed)", () => {
    expect(isPathAllowed(undefined, "/dashboard")).toBe(false);
    expect(isPathAllowed(undefined, "/students")).toBe(false);
  });

  it("noma'lum rol uchun false", () => {
    const notARole = "SUPERUSER" as unknown as Role;
    expect(isPathAllowed(notARole, "/dashboard")).toBe(false);
  });

  /**
   * PREFIKS CHEGARASI.
   *
   * Funksiya ichida: `path === p || path.startsWith(p + "/")`.
   * Qo'shilgan "/" juda muhim: `path.startsWith(p)` bo'lsa
   * /studentsX-maxfiy, /paymentsAdmin kabi yo'llar ochilib qolardi.
   */
  it("o'xshash boshlanishli yo'l ruxsat olmaydi", () => {
    expect(isPathAllowed("ACCOUNTANT", "/studentsX")).toBe(false);
    expect(isPathAllowed("ACCOUNTANT", "/students-maxfiy")).toBe(false);
    expect(isPathAllowed("TEACHER", "/journalX")).toBe(false);
    expect(isPathAllowed("ADMIN", "/studentsX")).toBe(false);
  });

  it("oxirida slash bo'lsa ruxsat saqlanadi", () => {
    expect(isPathAllowed("PARENT", "/grades/")).toBe(true);
  });

  /**
   * LOCALE PREFIKSI.
   *
   * Funksiya locale'siz yo'l kutadi ("/journal", "/uz/journal" emas).
   * Chaqiruvchi tomon (middleware) prefiksni olib tashlashi SHART.
   */
  it("locale prefiksi bilan yo'l ruxsat olmaydi", () => {
    expect(isPathAllowed("TEACHER", "/uz/journal")).toBe(false);
    expect(isPathAllowed("PARENT", "/ru/grades")).toBe(false);
    expect(isPathAllowed("ADMIN", "/uz/students")).toBe(false);
  });

  it("bo'sh yo'l ruxsat olmaydi", () => {
    expect(isPathAllowed("TEACHER", "")).toBe(false);
  });
});
