import { describe, expect, it } from "vitest";
import type { Role } from "@prisma/client";

import { homePathForUser } from "@/lib/home-redirect";

const ROLES: Role[] = ["ADMIN", "TEACHER", "ACCOUNTANT", "PARENT"];

describe("homePathForUser", () => {
  it("har bir rolni ruxsat berilgan dashboard sahifasiga yuboradi", () => {
    for (const role of ROLES) {
      expect(homePathForUser({ role, mustChangePassword: false })).toBe(
        "/dashboard"
      );
    }
  });

  it("parol almashtirish talabini dashboarddan ustun qo'yadi", () => {
    for (const role of ROLES) {
      expect(homePathForUser({ role, mustChangePassword: true })).toBe(
        "/change-password"
      );
    }
  });
});
