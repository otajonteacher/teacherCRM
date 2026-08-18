import { auth } from "@/auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { locales, defaultLocale } from "./i18n/config";
import { roleAllowedPaths } from "./lib/rbac";

// next-intl middleware — til prefiksini boshqaradi
const handleI18n = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

/**
 * Asosiy middleware:
 * 1. Agar sessiya yo'q bo'lsa → /login ga yo'naltiradi
 * 2. Agar rolga ruxsat yo'q bo'lsa → /dashboard ga qaytaradi
 * 3. next-intl til prefiksini qo'shadi
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Locale prefiksini ajratib olamiz: /uz/dashboard → locale="uz", path="/dashboard"
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  const locale = localeMatch?.[1] ?? defaultLocale;
  const pathWithoutLocale = localeMatch?.[2] ?? "/";

  // Ochiq (himoyasiz) yo'llar
  const isPublic =
    pathWithoutLocale.startsWith("/login") ||
    pathWithoutLocale === "/" ||
    pathWithoutLocale === "";

  if (!isPublic) {
    // 1. Autentifikatsiya tekshiruvi
    if (!req.auth?.user) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }

    // 2. RBAC tekshiruvi — rolga mos yo'lmi?
    const role = req.auth.user.role;
    const allowed = roleAllowedPaths[role] ?? [];
    const canAccess = allowed.some(
      (p) =>
        pathWithoutLocale === p ||
        pathWithoutLocale.startsWith(p + "/")
    );

    if (!canAccess) {
      // Ruxsat yo'q — dashboard ga qaytaramiz
      const dashUrl = new URL(`/${locale}/dashboard`, req.url);
      return NextResponse.redirect(dashUrl);
    }
  }

  // 3. next-intl ishlaydi (til prefiksi, headers)
  return handleI18n(req);
});

export const config = {
  // API, statik fayllar va Next ichki yo'llarini chetlab o'tamiz
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
