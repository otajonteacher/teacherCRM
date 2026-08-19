import { auth } from "@/auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { locales, defaultLocale } from "./i18n/config";
import { isPathAllowed } from "./lib/rbac";

// next-intl middleware — til prefiksini boshqaradi
const handleI18n = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

/**
 * Asosiy middleware (BIRINCHI qatlam himoya):
 * 1. Sessiya yo'q bo'lsa → /login
 * 2. Rolga ruxsat yo'q bo'lsa → /forbidden (403)
 * 3. next-intl til prefiksini qo'shadi
 *
 * MUHIM: bu faqat sahifa navigatsiyasini ushlaydi. Server Action va page.tsx
 * uchun IKKINCHI qatlam — src/lib/auth-guard.ts (requireAuth / requireRole).
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Locale prefiksini ajratamiz: /uz/dashboard → locale="uz", path="/dashboard"
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  const locale = localeMatch?.[1] ?? defaultLocale;
  const pathWithoutLocale = localeMatch?.[2] ?? "/";

  // Ochiq (himoyasiz) yo'llar
  const isPublic =
    pathWithoutLocale.startsWith("/login") ||
    pathWithoutLocale.startsWith("/forbidden") ||
    pathWithoutLocale === "/";

  if (!isPublic) {
    // 1. Autentifikatsiya tekshiruvi
    if (!req.auth?.user) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }

    // 2. RBAC tekshiruvi — mantiq rbac.ts dagi isPathAllowed'da, bir joyda.
    //    ADMIN bu funksiya ichida barcha yo'llardan o'tadi.
    if (!isPathAllowed(req.auth.user.role, pathWithoutLocale)) {
      return NextResponse.redirect(new URL(`/${locale}/forbidden`, req.url));
    }
  }

  // 3. next-intl ishlaydi (til prefiksi, headers)
  return handleI18n(req);
});

export const config = {
  // API, statik fayllar va Next ichki yo'llarini chetlab o'tamiz
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
