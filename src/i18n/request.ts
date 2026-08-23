import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "./config";

/**
 * Har bir so'rov uchun tarjimalarni yuklaydi (next-intl plugin shu faylni ishlatadi).
 *
 * Tarjimalar bir necha fayldan yig'iladi:
 *   1. messages/<locale>.json            — asosiy fayl (eski bo'limlar)
 *   2. messages/attendance/<locale>.json — davomat bo'limi (5-bosqich)
 *
 * Nima uchun alohida fayl: asosiy fayl juda kattalashib ketgan va uni to'liq
 * qayta yozish paytida boshqa bo'lim tarjimalari tasodifan yo'qolib qolishi
 * mumkin. Yangi modul o'z faylini olib keladi, eski fayl esa tegilmaydi.
 * Birlashtirish yuqori darajada (bo'lim nomi bo'yicha) bajariladi.
 */
export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as (typeof locales)[number])) notFound();

  const [base, attendance] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/attendance/${locale}.json`),
  ]);

  return {
    messages: { ...base.default, ...attendance.default },
  };
});
