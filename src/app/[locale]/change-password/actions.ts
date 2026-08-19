"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/password";
import { requireAuth } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/safe-action";

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

export async function changePassword(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri.",
    };
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser) {
    return { ok: false, error: "Amal bajarilmadi. Qayta urinib ko'ring." };
  }

  const currentOk = await bcrypt.compare(
    parsed.data.currentPassword,
    dbUser.passwordHash
  );
  if (!currentOk) {
    return { ok: false, error: "Joriy parol noto'g'ri." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  await logAudit({
    userId: user.id,
    action: "PASSWORD_CHANGED",
    entity: "User",
    entityId: user.id,
  });

  await signOut({ redirectTo: "/login" });
  return { ok: true, data: undefined };
}
