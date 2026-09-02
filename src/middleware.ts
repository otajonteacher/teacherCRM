import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { locales, defaultLocale } from "./i18n/config";
import { isPathAllowed } from "./lib/rbac";
import { consume, ipFromHeaders } from "./lib/rate-limit-core";

/**
 * MUHIM: bu yerda `@/auth` EMAS, `./auth.config` ishlatiladi.
 *
 * Middleware Edge runtime'da ishlaydi — u yerda Prisma ishlamaydi.
 * Ilgari middleware to'liq `@/auth` ni import qilgani uchun, undagi
 * `jwt` callback bazaga murojaat qilib xatoga uchrardi va sessiya
 * yaroqsiz deb hisoblanardi. Natijada foydalanuvchi hech qanday sababsiz
 * login sahifasiga otib yuborilardi.
 *
 * Endi middleware faqat cookie'dagi tokenni o'qiydi (bazasiz), hisobning
 * faol-nofaolligi esa sahifalar/action'lar tomonida (Node runtime)
 * tekshiriladi — `src/auth.ts`.
 */
const { auth } = NextAuth(authConfig);

const handleI18n = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

/**
 * SO'ROV CHEKLOVI (DDoS / scraping himoyasi)
 *
 * Ilgari cheklov faqat login'da edi — qolgan hamma sahifa cheksiz so'rov
 * qabul qilardi. Skript bilan butun ro'yxatni sekin-asta ko'chirib olish
 * yoki serverni so'rovga ko'mib tashlash mumkin edi.
 *
 * Sahifa chegarasi kengroq: bitta sahifa ochilganda RSC prefetch bir necha
 * o'nlab so'rov yuboradi, oddiy foydalanuvchini bloklab qo'ymaslik kerak.
 */
const PAGE_RULE = { limit: 300, windowMs: 60_000 };
const API_RULE = { limit: 60, windowMs: 60_000 };

/**
 * SERVER ACTION CHEGARASI — IKKINCHI QAVAT.
 *
 * `safe-action.ts` ichida ham cheklov bor, lekin u faqat `createAction`
 * orqali yozilgan action'larga tegishli. Amalda hamma action shunday
 * yozilmagan: Excel import'ning "preview" qadamlari `requireAdmin()` ni
 * to'g'ridan-to'g'ri chaqiradi va cheklovni chetlab o'tardi. Ya'ni 5 MB lik
 * faylni tsiklda yuborib serverni band qilish yo'li ochiq qolgan edi.
 *
 * Middleware esa BARCHA action so'rovini ko'radi — qanday yozilganidan
 * qat'i nazar. Server Action chaqiruvi = `Next-Action` sarlavhasi bilan
 * kelgan POST.
 *
 * Kalit: foydalanuvchi + IP. Sessiyasiz kelgan so'rov uchun faqat IP
 * (bunday so'rov pastda login'ga yo'naltiriladi, lekin hisoblansin —
 * yo'naltirishning o'zi ham resurs).
 *
 * Chegara `safe-action.ts` dagi bilan bir xil (40/daqiqa) — ikki qatlam
 * bir-biriga qarama-qarshi kelmasin.
 */
const ACTION_RULE = { limit: 40, windowMs: 60_000 };

function tooManyRequests(): NextResponse {
  return new NextResponse(
    "So'rovlar juda ko'p. Bir daqiqadan keyin urinib ko'ring.",
    {
      status: 429,
      headers: { "Retry-After": "60", "Cache-Control": "no-store" },
    }
  );
}

function splitLocale(pathname: string): {
  locale: string;
  pathWithoutLocale: string;
} {
  const match = locales.find(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );
  if (!match) {
    return { locale: defaultLocale, pathWithoutLocale: pathname || "/" };
  }
  const rest = pathname.slice(match.length + 1);
  return { locale: match, pathWithoutLocale: rest === "" ? "/" : rest };
}

/**
 * Asosiy middleware (BIRINCHI qatlam himoya):
 * 0. IP bo'yicha so'rov cheklovi (DDoS)
 * 0b. Server Action bo'lsa — qo'shimcha, torroq cheklov
 * 1. Sessiya yo'q bo'lsa → /login
 * 2. mustChangePassword → /change-password
 * 3. Rolga ruxsat yo'q bo'lsa → /forbidden (403)
 * 4. next-intl til prefiksini qo'shadi
 *
 * `/api/*` uchun: bu yerda faqat so'rov cheklovi qo'llanadi (til prefiksi
 * ham, yo'naltirish ham API uchun mos emas). Ruxsat tekshiruvi route'ning
 * o'zida — `src/lib/route-guard.ts` majburiy wrapper orqali.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const ip = ipFromHeaders(req.headers);
  const isApi = pathname.startsWith("/api");

  if (!consume(`${isApi ? "api" : "page"}:${ip}`, isApi ? API_RULE : PAGE_RULE)) {
    return tooManyRequests();
  }

  if (isApi) {
    return NextResponse.next();
  }

  // Server Action chaqiruvi: sahifa chegarasi (300/min) bunday YOZISH
  // so'rovlari uchun juda keng — alohida, torroq chegara qo'llanadi.
  const isServerAction =
    req.method === "POST" && req.headers.has("next-action");
  if (isServerAction) {
    const actorKey = `action:${req.auth?.user?.id ?? "anon"}:${ip}`;
    if (!consume(actorKey, ACTION_RULE)) {
      return tooManyRequests();
    }
  }

  const { locale, pathWithoutLocale } = splitLocale(pathname);

  const isLogin = pathWithoutLocale.startsWith("/login");
  const isForbidden = pathWithoutLocale.startsWith("/forbidden");
  const isChangePassword = pathWithoutLocale.startsWith("/change-password");
  const isPublic = isLogin || isForbidden || pathWithoutLocale === "/";

  if (isChangePassword) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
    return handleI18n(req);
  }

  if (!isPublic) {
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }

    if (req.auth.user.mustChangePassword) {
      return NextResponse.redirect(
        new URL(`/${locale}/change-password`, req.url)
      );
    }

    if (!isPathAllowed(req.auth.user.role, pathWithoutLocale)) {
      return NextResponse.redirect(new URL(`/${locale}/forbidden`, req.url));
    }
  }

  return handleI18n(req);
});

/**
 * `/api/auth/*` ATAYLAB chetda: Auth.js o'z ichki yo'llarini o'zi boshqaradi,
 * ularga aralashsak login buzilishi mumkin. Brute force himoyasi u yerda
 * boshqacha — `authorize()` ichidagi login rate limit.
 */
export const config = {
  matcher: ["/((?!api/auth|_next|_vercel|.*\\..*).*)"],
};
