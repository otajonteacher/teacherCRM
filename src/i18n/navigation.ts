import { createSharedPathnamesNavigation } from "next-intl/navigation";
import { locales } from "./config";

// Locale'ni avtomatik hisobga oluvchi navigatsiya yordamchilari.
export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({ locales });
