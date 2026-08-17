"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: boolean };

/**
 * Login server action.
 * Muvaffaqiyatli bo'lsa signIn redirect (NEXT_REDIRECT) tashlaydi — uni yuqoriga uzatamiz.
 * Xato bo'lsa AuthError tutiladi va formaga xato holati qaytariladi.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const locale = String(formData.get("locale") || "uz");

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
