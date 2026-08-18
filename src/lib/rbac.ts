import type { Role } from "@prisma/client";

/**
 * Rolga asoslangan ruxsat (RBAC).
 * TZ 2.1-bo'limdagi ruxsat matritsasining to'liq kod ko'rinishi.
 */

export const ROLES: Role[] = ["ADMIN", "TEACHER", "ACCOUNTANT", "PARENT"];

/** Foydalanuvchi berilgan rollardan biriga egami? */
export function hasRole(role: Role | undefined, allowed: Role[]): boolean {
  return !!role && allowed.includes(role);
}

/** Rolga tegishli boshlang'ich sahifa (login'dan keyin). */
export function homePathForRole(_role: Role): string {
  return "/dashboard";
}

/**
 * Har bir rol uchun ruxsat berilgan URL prefikslari.
 * Middleware shu jadvalga qarab RBAC tekshiradi.
 *
 * Qoida: agar yo'l prefiks bilan boshlanmasa — /dashboard ga qaytariladi.
 */
export const roleAllowedPaths: Record<Role, string[]> = {
  // Admin — hamma sahifaga kirish
  ADMIN: [
    "/dashboard",
    "/students",
    "/teachers",
    "/classes",
    "/schedule",
    "/attendance",
    "/grades",
    "/ranking",
    "/penalties",
    "/payments",
    "/reports",
    "/messages",
    "/tests",
    "/users",
    "/ai-assistant",
  ],

  // O'qituvchi
  TEACHER: [
    "/dashboard",
    "/students",
    "/classes",
    "/schedule",
    "/attendance",
    "/grades",
    "/ranking",
    "/penalties",
    "/tests",
  ],

  // Buxgalter
  ACCOUNTANT: [
    "/dashboard",
    "/students",
    "/payments",
    "/reports",
  ],

  // Ota-ona / O'quvchi
  PARENT: [
    "/dashboard",
    "/grades",
    "/attendance",
    "/ranking",
    "/payments",
  ],
};
