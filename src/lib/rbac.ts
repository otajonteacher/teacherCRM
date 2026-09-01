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
 * MUHIM: bu ro'yxat `src/components/nav-config.ts` dagi `navByRole` bilan
 * mos bo'lishi SHART. Menyuda havola ko'rinib, bu ro'yxatda yo'q bo'lsa,
 * foydalanuvchi o'z menyusidagi havolani bosib 403 oladi.
 *
 * Eslatma: bu faqat SAHIFA darajasidagi ruxsat. "Qaysi qatorlarni ko'rish
 * mumkin" degan savol — alohida masala (IDOR himoyasi, src/lib/scope.ts).
 */
export const roleAllowedPaths: Record<Role, string[]> = {
  ADMIN: [
    "/dashboard",
    "/students",
    "/teachers",
    "/classes",
    "/schedule",
    "/attendance",
    "/journal",
    "/grades",
    "/ranking",
    "/penalties",
    "/penalty-criteria",
    "/rewards",
    "/reward-criteria",
    "/payments",
    "/reports",
    "/messages",
    "/tests",
    "/users",
    "/ai-assistant",
    "/subjects",
    "/academic-years",
    "/lesson-periods",
  ],

  TEACHER: [
    "/dashboard",
    "/students",
    "/classes",
    "/schedule",
    "/attendance",
    "/journal",
    "/grades",
    "/ranking",
    "/penalties",
    "/rewards",
    "/tests",
    "/ai-assistant",
  ],

  ACCOUNTANT: [
    "/dashboard",
    "/students",
    "/payments",
    "/reports",
    "/messages",
  ],

  // Jurnal ATAYLAB yo'q: u baho va davomat KIRITISH joyi, ota-ona esa faqat
  // natijani ko'radi.
  PARENT: [
    "/dashboard",
    "/grades",
    "/attendance",
    "/ranking",
    "/penalties",
    "/rewards",
    "/payments",
  ],
};

/**
 * Berilgan rol ushbu yo'lga (locale prefiksisiz) kira oladimi?
 *
 * Middleware va server qorovullari SHU funksiyadan foydalanadi — tekshiruv
 * mantig'i bir joyda turadi, ikki nusxada emas.
 *
 * @param role - foydalanuvchi roli
 * @param path - locale prefiksisiz yo'l, masalan "/students/42"
 */
export function isPathAllowed(role: Role | undefined, path: string): boolean {
  if (!role) return false;

  if (role === "ADMIN") return true;

  const allowed = roleAllowedPaths[role] ?? [];
  return allowed.some((p) => path === p || path.startsWith(p + "/"));
}
