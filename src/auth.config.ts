import type { NextAuthConfig } from "next-auth";
import type { Role, Locale } from "@prisma/client";

/**
 * EDGE UCHUN XAVFSIZ AUTH SOZLAMASI
 * =================================
 *
 * NIMA UCHUN ALOHIDA FAYL?
 * `src/middleware.ts` Next.js'da **Edge runtime**da ishlaydi. Edge'da
 * Prisma (`@/lib/db`) va bcrypt ishlamaydi. Ilgari middleware to'liq
 * `src/auth.ts` ni import qilardi — u esa `jwt` callback ichida bazaga
 * murojaat qiladi. Natijada middleware har safar shu chaqiruvda xatoga
 * uchrab, sessiya "buzilgan" deb hisoblanardi va foydalanuvchi login
 * sahifasiga otib yuborilardi.
 *
 * Shu sababli sozlama ikkiga bo'lindi (next-auth v5 uchun tavsiya etilgan
 * usul):
 *   - `auth.config.ts` (shu fayl) — bazaga TEGMAYDI, middleware ishlatadi.
 *     Faqat cookie'dagi tokenni o'qiydi.
 *   - `auth.ts` — to'liq versiya (Credentials provayderi, bcrypt, baza
 *     tekshiruvi). Faqat Node runtime'da: sahifalar va server action'lar.
 *
 * MUHIM: bu yerda faqat TIPLAR import qilinadi (`import type`), ular
 * kompilyatsiyada o'chib ketadi va edge bundle'ga Prisma tushmaydi.
 */

/** Sessiya umri: 8 soat. */
export const SESSION_MAX_AGE_SEC = 8 * 60 * 60;
/** Token yangilanish oralig'i: 1 soat. */
export const SESSION_UPDATE_AGE_SEC = 60 * 60;

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: SESSION_UPDATE_AGE_SEC,
  },
  pages: {
    signIn: "/login",
  },
  // Provayderlar faqat `auth.ts` da (ular bcrypt va bazaga muhtoj).
  providers: [],
  callbacks: {
    /**
     * Tokendagi ma'lumotni sessiyaga ko'chiradi. Bazaga murojaat yo'q —
     * shuning uchun middleware'da ham bemalol ishlaydi.
     */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.locale = token.locale as Locale;
        session.user.mustChangePassword = token.mustChangePassword === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
