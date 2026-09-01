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
 *
 * Bu fayl hech narsani mock qilmaydi: `rbac.ts` da runtime import yo'q
 * (`Role` faqat tip sifatida import qilinadi va kompilyatsiyada yo'qoladi).
 * Ya'ni testlar bazaga ham, muhit o'zgaruvchilariga ham bog'liq emas.
 */

describe("ROLES", () => {
  it("TZ 2.1 dagi to'rt rolni o'z ichiga oladi", () => {
    expect(ROLES).toEqual(["ADMIN", "TEACHER", "ACCOUNTANT", "PARENT"]);
  });

  it("har bir rol uchun ruxsat jadvali mavjud", () => {
    // Agar yangi rol qo'shilib, jadval to'ldirilmasa — shu test yiqiladi.
    // Aks holda `roleAllowedPaths[role] ?? []` jimgina bo'sh ro'yxat
    // qaytarardi va yangi rol hech qayerga kira olmasdi (sababi noma'lum).
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
    // Bo'sh ro'yxat "hammaga ruxsat" degani EMAS.
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
    // Muhim invariant: login'dan keyin yo'naltirilgan sahifa o'sha rol
    // uchun yopiq bo'lsa, foydalanuvchi darhol 403 ga tushib qolardi.
    for (const role of ROLES) {
      expect(isPathAllowed(role, homePathForRole(role))).toBe(true);
    }
  });
});

describe("isPathAllowed — ADMIN", () => {
  it("har qanday yo'lga kiradi (eganing qat'iy talabi)", () => {
    expect(isPathAllowed("ADMIN", "/students")).toBe(true);
    expect(isPathAllowed("ADMIN", "/payments")).toBe(true);
    expect(isPathAllowed("ADMIN", "/journal")).toBe(true);
  });

  it("jadvalda umuman yo'q yo'lga ham kiradi", () => {
    // ADMIN uchun funksiya jadvalni tekshirmasdan true qaytaradi.
    // Bu ataylab: kelajakda yangi sahifa qo'shilganda ADMIN darhol
    // kirishi kerak, jadvalni yangilash esdan chiqsa ham.
    expect(isPathAllowed("ADMIN", "/hali-yaratilmagan-sahifa")).toBe(true);
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
    // O'qituvchi jarima QO'YADI (/penalties), lekin mezonlarni
    // O'ZGARTIRA olmaydi (/penalty-criteria).
    expect(isPathAllowed("TEACHER", "/penalties")).toBe(true);
    expect(isPathAllowed("TEACHER", "/penalty-criteria")).toBe(false);
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
   * Jurnal — baho va davomat KIRITISH joyi. Ota-ona faqat natijani
   * ko'radi, kiritmaydi. Bu `rbac.ts` izohida ataylab yozilgan qoida.
   *
   * Agar kelajakda kimdir "ota-ona ham ko'rsin" degan iltimos bilan
   * /journal ni PARENT ro'yxatiga qo'shsa — shu test yiqiladi va o'zgarish
   * sababini tushuntirishga to'g'ri keladi.
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
    // "/rewards" va "/reward-criteria" nomi o'xshash, lekin ikkinchisi
    // sozlash sahifasi — faqat ADMIN uchun.
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
    // Sessiya buzilgan yoki rol o'qilmagan holatda ruxsat KENGAYMAYDI.
    expect(isPathAllowed(undefined, "/dashboard")).toBe(false);
    expect(isPathAllowed(undefined, "/students")).toBe(false);
  });

  it("noma'lum rol uchun false", () => {
    const notARole = "SUPERUSER" as unknown as Role;
    expect(isPathAllowed(notARole, "/dashboard")).toBe(false);
  });

  /**
   * PREFIKS CHEGARASI — ikkinchi eng muhim test.
   *
   * Funksiya ichida: `path === p || path.startsWith(p + "/")`.
   * Qo'shilgan "/" juda muhim. Agar kimdir uni olib tashlab
   * `path.startsWith(p)` qilsa, quyidagi yo'llar ochilib qolardi:
   *   /studentsX-maxfiy
   *   /paymentsAdmin
   * Ya'ni bitta belgi o'chirilishi ruxsat teshigiga aylanadi.
   */
  it("o'xshash boshlanishli yo'l ruxsat olmaydi", () => {
    expect(isPathAllowed("ACCOUNTANT", "/studentsX")).toBe(false);
    expect(isPathAllowed("ACCOUNTANT", "/students-maxfiy")).toBe(false);
    expect(isPathAllowed("TEACHER", "/journalX")).toBe(false);
  });

  it("oxirida slash bo'lsa ruxsat saqlanadi", () => {
    expect(isPathAllowed("PARENT", "/grades/")).toBe(true);
  });

  /**
   * LOCALE PREFIKSI.
   *
   * Funksiya locale'siz yo'l kutadi ("/journal", "/uz/journal" emas).
   * Bu test xatoni emas, SHARTNOMANI hujjatlashtiradi: chaqiruvchi tomon
   * (middleware) prefiksni olib tashlashi SHART. Agar kimdir bu funksiyaga
   * to'g'ridan-to'g'ri locale bilan yo'l bersa, hamma narsa 403 bo'ladi —
   * va sabab shu yerda yozilgan.
   */
  it("locale prefiksi bilan yo'l ruxsat olmaydi", () => {
    expect(isPathAllowed("TEACHER", "/uz/journal")).toBe(false);
    expect(isPathAllowed("PARENT", "/ru/grades")).toBe(false);
  });

  it("bo'sh yo'l ruxsat olmaydi", () => {
    expect(isPathAllowed("TEACHER", "")).toBe(false);
  });
});
