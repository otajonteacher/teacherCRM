"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/password";
import {
  createAction,
  formDataToObject,
  type ActionResult,
} from "@/lib/safe-action";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Yangi parol tasdiqi mos kelmadi.",
    path: ["confirmPassword"],
  });

const changePasswordAction = createAction({
  schema: changePasswordSchema,
  audit: {
    action: "PASSWORD_CHANGED",
    entity: "User",
    entityId: (_input, _result, user) => user.id,
  },
  handler: async (input, user) => {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!dbUser) {
      throw new Error("NOT_FOUND");
    }

    const currentOk = await bcrypt.compare(
      input.currentPassword,
      dbUser.passwordHash
    );
    if (!currentOk) {
      return { ok: false as const, error: "Joriy parol noto'g'ri." };
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    await signOut({ redirectTo: "/login" });
  },
});

export async function changePassword(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const result = await changePasswordAction(formDataToObject(formData));
  if (result.ok && result.data && typeof result.data === "object" && "ok" in result.data) {
    return result.data as ActionResult;
  }
  return result;
}
