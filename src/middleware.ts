import { auth } from "@/auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { locales, defaultLocale } from "./i18n/config";
import { isPathAllowed } from "./lib/rbac";

const handleI18n = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

/**
 * Asosiy middleware (BIRINCHI qatlam himoya):
 * 1. Sessiya yo'q bo'lsa → /login
 * 2. mustChangePassword → /change-password
 * 3. Rolga ruxsat yo'q bo'lsa → /forbidden (403)
 * 4. next-intl til prefiksini qo'shadi
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const localeMatch = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  const locale = localeMatch?.[1] ?? defaultLocale;
  const pathWithoutLocale = localeMatch?.[2] ?? "/";

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

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
