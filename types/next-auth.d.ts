import type { Role, Locale } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Auth.js tiplarini rol va til bilan kengaytiramiz.
declare module "next-auth" {
  interface User {
    role: Role;
    locale: Locale;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      locale: Locale;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    locale: Locale;
    mustChangePassword: boolean;
    /** Oxirgi marta DB dan isActive/role tekshirilgan vaqt (ms). */
    checkedAt?: number;
  }
}
