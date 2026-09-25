import type { Role } from "@prisma/client";
import { homePathForRole, isPathAllowed } from "./rbac";

export type HomeRedirectUser = {
  role: Role;
  mustChangePassword: boolean;
};

/**
 * Locale root'dan keyingi xavfsiz manzilni tanlaydi.
 *
 * Tartib ataylab auth middleware bilan bir xil:
 * parol almashtirish talab qilinsa — avval shu sahifa, aks holda rolning
 * boshlang'ich sahifasi faqat RBAC jadvalida ruxsat berilgan bo'lsa ochiladi.
 */
export function homePathForUser(user: HomeRedirectUser): string {
  if (user.mustChangePassword) return "/change-password";

  const homePath = homePathForRole(user.role);
  return isPathAllowed(user.role, homePath) ? homePath : "/forbidden";
}
