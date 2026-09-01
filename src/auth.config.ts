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

/**
 * HOST ISHONCHI (`trustHost`)
 * ===========================
 *
 * Auth.js v5 `Host` sarlavhasiga sukut bo'yicha ISHONMAYDI. Sababi:
 * hujumkor `Host: yovuz.example` yuborsa, kutib turilgan qaytish (callback)
 * havolasi o'sha saytga qarab ketishi mumkin.
 *
 * Vercel'da bu avtomatik hal bo'ladi. Biz o'z serverimizda ishlaganimizda
 * (`npm start`, IIS/Nginx orqasida) esa Auth.js `UntrustedHost` xatosini
 * beradi va login butunlay ishlamaydi:
 *
 *   [auth][error] UntrustedHost: Host must be trusted.
 *
 * Yechim ikki qatlamli:
 *   1. `AUTH_URL` berilgan bo'lsa — Auth.js aynan o'sha manzilni ishlatadi.
 *      Ishlab chiqarishda SHU usul tavsiya etiladi, chunki host qiymati
 *      so'rovdan emas, sozlamadan olinadi.
 *   2. `AUTH_URL` berilmagan bo'lsa (lokal `npm start`, dev) — so'rovdagi
 *      host'ga ishonamiz, aks holda ilova umuman ishga tushmaydi.
 *
 * Ya'ni ishlab chiqarishda `AUTH_URL` ni qo'yish — bu shunchaki qulaylik
 * emas, xavfsizlik chorasi. `.env.example` da izohlab qo'yilgan.
 */
const trustHost = true;

export const authConfig = {
  trustHost,
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
