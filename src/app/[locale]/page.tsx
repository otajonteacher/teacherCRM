import { redirect } from "@/i18n/navigation";

// next-intl server komponentlari dinamik render talab qiladi
export const dynamic = "force-dynamic";

// Ildiz sahifa — foydalanuvchini boshqaruv paneliga yo'naltiradi.
// (Autentifikatsiya (app) guruhidagi layout'da tekshiriladi.)
export default function LocaleIndexPage() {
  redirect("/dashboard");
}
