"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { defaultLocale, locales, type AppLocale } from "@/i18n/config";

export type LoginState = { error?: boolean };

/**
 * Formadan kelgan `locale` ni ISHONCHSIZ deb qaraymiz.
 *
 * TUZATILGAN NUQSON (ochiq yo'naltirish / open redirect):
 * Ilgari `redirectTo` to'g'ridan-to'g'ri `/${formData.get("locale")}/dashboard`
 * bo'lib yasalardi. Yashirin `locale` maydonini qo'lda o'zgartirib
 * (`//evil.com`, `uz/../../boshqa-yo'l` va shunga o'xshash qiymatlar bilan)
 * login'dan keyingi manzilni buzish mumkin edi. Bu fishing uchun qulay
 * nuqta: qurbon haqiqiy login sahifasida parolini kiritadi, keyin
 * begona manzilga tushadi.
 *
 * Endi qiymat faqat oq ro'yxat (`uz` | `ru` | `en`) bilan solishtiriladi,
 * mos kelmasa standart til olinadi. Ya'ni `redirectTo` hech qachon
 * foydalanuvchi matnidan yasalmaydi.
 */
function safeLocale(value: FormDataEntryValue | null): AppLocale {
  if (typeof value !== "string") return defaultLocale;
  return locales.includes(value as AppLocale) ? (value as AppLocale) : defaultLocale;
}

/**
 * Login server action.
 * Muvaffaqiyatli bo'lsa signIn redirect (NEXT_REDIRECT) tashlaydi — uni yuqoriga uzatamiz.
 * Xato bo'lsa AuthError tutiladi va formaga xato holati qaytariladi.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const locale = safeLocale(formData.get("locale"));

  try {
    await signIn("credentials", {
      login: formData.get("login"),
      password: formData.get("password"),
      redirectTo: `/${locale}/dashboard`,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: true };
    }
    // redirect va boshqa maxsus xatolarni Next.js hal qilishi uchun qayta tashlaymiz
    throw error;
  }
}
