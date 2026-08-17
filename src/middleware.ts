import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";

// next-intl middleware: URL'ga til prefiksini qo'shadi (/uz, /ru, /en).
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export const config = {
  // API, statik fayllar va Next ichki yo'llarini chetlab o'tamiz.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
