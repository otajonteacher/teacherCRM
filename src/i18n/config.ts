/** Qo'llab-quvvatlanadigan tillar. */
export const locales = ["uz", "ru", "en"] as const;
export type AppLocale = (typeof locales)[number];

/** Standart til. */
export const defaultLocale: AppLocale = "uz";

/** Til nomlari (til almashtirgich uchun). */
export const localeNames: Record<AppLocale, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};
