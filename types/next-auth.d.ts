import type { Role, Locale } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Auth.js tiplarini rol va til bilan kengaytiramiz.
declare module "next-auth" {
  interface User {
    role: Role;
    locale: Locale;
    mustChangePassword: boolean;
    /** Parol oxirgi marta almashtirilgan vaqt (ms). Hech qachon bo'lmasa 0. */
    pwdAt?: number;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      locale: Locale;
      mustChangePassword: boolean;
      /**
       * Shu sessiya QAYSI parol uchun berilgan.
       *
       * `requireAuth` uni bazadagi `User.passwordChangedAt` bilan
       * solishtiradi: parol keyinroq almashtirilgan bo'lsa, sessiya
       * bekor qilinadi. Shu tufayli parolni almashtirish barcha
       * qurilmalardagi kirishni bir zumda uzadi.
       */
      pwdAt: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    locale: Locale;
    mustChangePassword: boolean;
    /** Oxirgi marta DB dan isActive/role tekshirilgan vaqt (ms). */
    checkedAt?: number;
    /**
     * Parol vaqti. ATAYLAB hech qachon yangilanmaydi — token qaysi parol
     * bilan berilgan bo'lsa, o'shanda qoladi. Yangilansa, o'g'irlangan
     * token o'zini "yangi parol bilan berilgan" qilib ko'rsatardi.
     */
    pwdAt?: number;
  }
}
