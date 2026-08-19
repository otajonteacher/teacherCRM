import { z } from "zod";

/**
 * PAROL SIYOSATI (Punkt 7)
 * ========================
 *
 * Login formasi (`z.string().min(1)`) o'zgarmaydi — mavjud hisoblar
 * (shu jumladan demo) kiraversin. Bu sxema FAQAT yangi parol yaratish
 * va o'zgartirish uchun: foydalanuvchi qo'shish, parolni almashtirish.
 *
 * `mustChangePassword` maydoni va parolni tiklash (SMS) — alohida PR.
 * Sababi: sxema o'zgarishlari 12/13/15 bilan bitta migratsiyada ketadi.
 */

export const MIN_PASSWORD_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, "Parol kamida 8 belgi bo'lishi kerak.")
  .max(128, "Parol juda uzun.")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "Parolda kamida bitta harf va bitta raqam bo'lishi kerak.",
  });

export type PasswordInput = z.infer<typeof passwordSchema>;

/** Yangi parolni tekshiradi. Xato bo'lsa xabar, to'g'ri bo'lsa null. */
export function passwordError(value: string): string | null {
  const parsed = passwordSchema.safeParse(value);
  if (parsed.success) return null;
  return parsed.error.issues[0]?.message ?? "Parol talabga mos emas.";
}
