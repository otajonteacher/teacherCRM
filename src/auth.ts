import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role, Locale } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit, maskIdentifier } from "@/lib/audit";

// Login formasi validatsiyasi
const credentialsSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        login: { label: "Email yoki telefon", type: "text" },
        password: { label: "Parol", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          await logAudit({
            action: "LOGIN_FAILED",
            entity: "User",
            meta: { reason: "invalid_input" },
          });
          return null;
        }

        const { login, password } = parsed.data;

        // Email yoki telefon bo'yicha faol foydalanuvchini topamiz
        const user = await db.user.findFirst({
          where: {
            isActive: true,
            OR: [{ email: login }, { phone: login }],
          },
        });
        if (!user) {
          await logAudit({
            action: "LOGIN_FAILED",
            entity: "User",
            meta: { login: maskIdentifier(login) },
          });
          return null;
        }

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) {
          await logAudit({
            userId: user.id,
            action: "LOGIN_FAILED",
            entity: "User",
            entityId: user.id,
            meta: { login: maskIdentifier(login) },
          });
          return null;
        }

        return {
          id: user.id,
          name: user.fullName,
          email: user.email ?? undefined,
          role: user.role,
          locale: user.locale,
        };
      },
    }),
  ],
  callbacks: {
    // Rol va tilni JWT tokenga yozamiz
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.locale = user.locale;
      }
      return token;
    },
    // Tokendan sessiyaga o'tkazamiz (klient tomon ko'radi)
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.locale = token.locale as Locale;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      await logAudit({
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
      });
    },
    async signOut(message) {
      const userId =
        "token" in message && typeof message.token?.sub === "string"
          ? message.token.sub
          : "session" in message
            ? message.session?.user?.id ?? null
            : null;

      await logAudit({
        userId,
        action: "LOGOUT",
        entity: "User",
        entityId: userId,
      });
    },
  },
});
