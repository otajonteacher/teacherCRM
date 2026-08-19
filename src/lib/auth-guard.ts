import type { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { hasRole } from "./rbac";

/**
 * SERVER TOMON QOROVULLARI (Punkt 1)
 *
 * Middleware faqat sahifa navigatsiyasini ushlaydi. Server Action'lar va
 * page.tsx'lar to'g'ridan-to'g'ri chaqirilishi mumkin — shuning uchun har bir
 * himoyalangan sahifa/action BOSHIDA shu funksiyalardan biri chaqirilishi shart.
 *
 * Namuna:
 *   const user = await requireRole("ADMIN");
 *   const user = await requireAuth();
 */

export type SessionUser = NonNullable<Session["user"]>;

/**
 * Sessiyani talab qiladi.
 * Sessiya yo'q bo'lsa — /login ga yo'naltiradi (bu yerdan keyin kod bajarilmaydi).
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session.user;
}

/**
 * Berilgan rollardan birini talab qiladi.
 * Rol mos kelmasa — /forbidden (403) sahifasiga yo'naltiradi.
 *
 * @example
 * await requireRole("ADMIN");
 * await requireRole("ADMIN", "ACCOUNTANT");
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();

  if (!hasRole(user.role, roles)) {
    redirect("/forbidden");
  }

  return user;
}

/** Qisqartma: faqat ADMIN uchun. */
export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("ADMIN");
}

/** Qisqartma: moliyaviy modullar (ADMIN yoki ACCOUNTANT). */
export async function requireFinance(): Promise<SessionUser> {
  return requireRole("ADMIN", "ACCOUNTANT");
}

/** Qisqartma: o'quv jarayoni (ADMIN yoki TEACHER). */
export async function requireTeaching(): Promise<SessionUser> {
  return requireRole("ADMIN", "TEACHER");
}
