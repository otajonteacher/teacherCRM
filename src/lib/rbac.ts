import type { Role } from "@prisma/client";

/**
 * Rolga asoslangan ruxsat (RBAC) yordamchilari.
 * TZ 2.1-bo'limidagi ruxsat matritsasining kod ko'rinishi asosi.
 */

export const ROLES: Role[] = ["ADMIN", "TEACHER", "ACCOUNTANT", "PARENT"];

/** Foydalanuvchi berilgan rollardan biriga egami? */
export function hasRole(role: Role | undefined, allowed: Role[]): boolean {
  return !!role && allowed.includes(role);
}

/** Rolga tegishli boshlang'ich sahifa (login'dan keyin). */
export function homePathForRole(_role: Role): string {
  // Hozircha barcha rollar umumiy dashboard'ga tushadi; keyin ajratiladi.
  return "/dashboard";
}
