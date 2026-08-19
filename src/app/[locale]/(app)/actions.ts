"use server";

import { z } from "zod";
import { signOut } from "@/auth";
import { createFormAction } from "@/lib/safe-action";

/**
 * Namuna Server Action (Punkt 3).
 *
 * Logout o'zi validatsiya talab qilmaydi, lekin wrapper orqali o'tishi shart:
 * sessiya tekshiriladi, xato yutilmaydi, `redirect()` (NEXT_REDIRECT) yuqoriga
 * uzatiladi. LOGOUT yozuvi `auth.ts` events.signOut ichida — shu yerda takrorlanmaydi.
 */
export const logout = createFormAction({
  schema: z.object({}),
  handler: async () => {
    await signOut({ redirectTo: "/login" });
  },
});
