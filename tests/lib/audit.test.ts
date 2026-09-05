import { describe, expect, it, vi } from "vitest";

/**
 * `audit.ts` → `db.ts` → `env.ts` zanjiri bor. Test muhitida haqiqiy
 * `DATABASE_URL` yo'q va Prisma mijozini ko'tarishning hojati ham yo'q —
 * bu yerda faqat sof funksiyalar tekshiriladi. Shuning uchun `db` mock.
 */
vi.mock("@/lib/db", () => ({
  db: { auditLog: { create: async () => undefined } },
}));

import {
  changedFields,
  isSecretKey,
  maskIdentifier,
  redactMeta,
  sanitizeErrorMessage,
} from "@/lib/audit";

describe("isSecretKey", () => {
  it("parol/token kalitlarini ushlaydi", () => {
    expect(isSecretKey("password")).toBe(true);
    expect(isSecretKey("parol")).toBe(true);
    expect(isSecretKey("accessToken")).toBe(true);
    expect(isSecretKey("passwordHash")).toBe(true);
  });

  /**
   * REGRESSIYA: import ustasi boshlang'ich parollarni `outcome.credentials`
   * ichida olib yuradi. Eski shablonda `credential` yo'q edi — ya'ni bu
   * kalit tozalanmay o'tib ketardi.
   */
  it("credentials kalitini ushlaydi (import oqimi)", () => {
    expect(isSecretKey("credentials")).toBe(true);
    expect(isSecretKey("credential")).toBe(true);
  });

  it("qisqa tokenlarni faqat to'liq so'z sifatida ushlaydi", () => {
    expect(isSecretKey("otp")).toBe(true);
    expect(isSecretKey("userPin")).toBe(true);
    expect(isSecretKey("jwt_payload")).toBe(true);
  });

  /**
   * Ortiqcha yashirish ham xato: jurnal foydasiz bo'lib qoladi.
   * `mapping` ichida "pin" bor, lekin u maxfiy emas.
   */
  it("zararsiz kalitlarni yashirmaydi", () => {
    expect(isSecretKey("mapping")).toBe(false);
    expect(isSecretKey("shipping")).toBe(false);
    expect(isSecretKey("studentId")).toBe(false);
    expect(isSecretKey("fields")).toBe(false);
  });
});

describe("redactMeta", () => {
  it("bo'sh qiymat uchun null qaytaradi", () => {
    expect(redactMeta(null)).toBeNull();
    expect(redactMeta(undefined)).toBeNull();
  });

  it("yuqori darajadagi maxfiy maydonni yashiradi", () => {
    expect(redactMeta({ email: "a@b.uz", password: "12345" })).toEqual({
      email: "a@b.uz",
      password: "[redacted]",
    });
  });

  it("ichma-ich obyektga kiradi", () => {
    expect(redactMeta({ user: { id: "1", token: "abc" } })).toEqual({
      user: { id: "1", token: "[redacted]" },
    });
  });

  /**
   * ASOSIY REGRESSIYA TESTI.
   *
   * Ilgari `redactMeta` da `!Array.isArray(value)` sharti bor edi — massiv
   * rekursiyaga tushmay, o'zgarishsiz nusxalanardi. Import oqimi aynan shu
   * shaklda ma'lumot uzatadi, ya'ni o'qituvchi parollari `AuditLog` ga
   * ochiq matnda yozilardi.
   */
  it("massiv ichidagi obyektlarni ham tozalaydi", () => {
    const result = redactMeta({
      rows: [
        { email: "ali@maktab.uz", password: "Qwerty12345!" },
        { email: "vali@maktab.uz", password: "Asdfgh67890!" },
      ],
    });

    expect(result).toEqual({
      rows: [
        { email: "ali@maktab.uz", password: "[redacted]" },
        { email: "vali@maktab.uz", password: "[redacted]" },
      ],
    });

    expect(JSON.stringify(result)).not.toContain("Qwerty12345!");
  });

  it("massiv ichidagi massivni ham tozalaydi", () => {
    expect(redactMeta({ groups: [[{ secret: "s" }]] })).toEqual({
      groups: [[{ secret: "[redacted]" }]],
    });
  });

  it("oddiy qiymatlar massivini o'zgartirmaydi", () => {
    expect(redactMeta({ fields: ["phone", "address"] })).toEqual({
      fields: ["phone", "address"],
    });
  });

  it("uzun massivni kesadi va nechta qolganini yozadi", () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({ i }));
    const result = redactMeta({ rows }) as { rows: unknown[] };

    expect(result.rows).toHaveLength(51);
    expect(result.rows[50]).toEqual({ truncated: 10 });
  });

  it("juda chuqur obyektni kesadi", () => {
    const deep = { a: { b: { c: { d: { e: { f: "juda-chuqur" } } } } } };
    expect(JSON.stringify(redactMeta(deep))).toContain("truncated");
  });
});

describe("sanitizeErrorMessage", () => {
  it("ulanish satrini olib tashlaydi", () => {
    const msg = "connect failed: postgresql://postgres:parol@db.host:5432/crm";
    const out = sanitizeErrorMessage(msg);

    expect(out).not.toContain("parol");
    expect(out).toContain("[url]");
  });

  it("email va bcrypt hash'ni yashiradi", () => {
    const hash = "$2b$10$" + "a".repeat(53);
    const out = sanitizeErrorMessage(`user ali@maktab.uz hash ${hash}`);

    expect(out).toContain("[email]");
    expect(out).toContain("[hash]");
    expect(out).not.toContain("ali@maktab.uz");
  });

  it("telefon raqamini yashiradi", () => {
    expect(sanitizeErrorMessage("tel +998901234567 band")).toContain("[raqam]");
  });

  it("juda uzun matnni 500 belgigacha qisqartiradi", () => {
    expect(sanitizeErrorMessage("x".repeat(900))).toHaveLength(500);
  });
});

describe("maskIdentifier", () => {
  it("email", () => {
    expect(maskIdentifier("admin@school.uz")).toBe("ad***@school.uz");
  });

  it("telefon — oxirgi 4 raqam qoladi", () => {
    expect(maskIdentifier("+998901234567")).toBe("***4567");
  });

  it("juda qisqa qiymat butunlay yashiriladi", () => {
    expect(maskIdentifier("ab")).toBe("***");
  });
});

describe("changedFields", () => {
  it("faqat o'zgargan maydon NOMLARINI qaytaradi", () => {
    const changed = changedFields(
      { name: "Ali", phone: "+998901111111" },
      { name: "Ali", phone: "+998902222222" }
    );

    expect(changed).toEqual(["phone"]);
    expect(changed.join()).not.toContain("998");
  });

  it("yangi qo'shilgan maydonni ham ko'radi", () => {
    expect(changedFields({ a: 1 }, { a: 1, b: 2 })).toEqual(["b"]);
  });
});
