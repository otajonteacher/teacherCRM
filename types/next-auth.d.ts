import type { Role, Locale } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Auth.js tiplarini rol va til bilan kengaytiramiz.
declare module "next-auth" {
  interface User {
    role: Role;
    locale: Locale;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      locale: Locale;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    locale: Locale;
  }
}
