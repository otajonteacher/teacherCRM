import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role, Locale } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit, maskIdentifier } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  clearLoginFailures,
  getRequestIp,
  isLoginRateLimited,
  recordLoginFailure,
} from "@/lib/rate-limit";

// Login formasi validatsiyasi
const credentialsSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

/** Sessiya umri: 8 soat. Standart 30 kun emas — ishdan bo'shatilgan o'qituvchi uzoq qolmasin. */
const SESSION_MAX_AGE_SEC = 8 * 60 * 60;
/** Token yangilanish oralig'i: 1 soat. */
const SESSION_UPDATE_AGE_SEC = 60 * 60;
/** DB dan isActive/role qayta o'qish oralig'i: 5 daqiqa. */
const JWT_RECHECK_MS = 5 * 60 * 1000;
/** Baza uzluksiz javob bermasa, sessiyani shu muddatdan keyin bekor qilamiz. */
const RECHECK_GRACE_MS = 30 * 60 * 1000;

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: SESSION_UPDATE_AGE_SEC,
  },
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
        const ip = await getRequestIp();
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

        if (isLoginRateLimited(login, ip)) {
          await logAudit({
            action: "LOGIN_FAILED",
            entity: "User",
            meta: {
              reason: "rate_limited",
              login: maskIdentifier(login),
            },
          });
          return null;
        }

        const user = await db.user.findFirst({
          where: {
            isActive: true,
            OR: [{ email: login }, { phone: login }],
          },
        });
        if (!user) {
          recordLoginFailure(login, ip);
          await logAudit({
            action: "LOGIN_FAILED",
            entity: "User",
            meta: { login: maskIdentifier(login) },
          });
          return null;
        }

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) {
          recordLoginFailure(login, ip);
          await logAudit({
            userId: user.id,
            action: "LOGIN_FAILED",
            entity: "User",
            entityId: user.id,
            meta: { login: maskIdentifier(login) },
          });
          return null;
        }

        clearLoginFailures(login);

        return {
          id: user.id,
          name: user.fullName,
          email: user.email ?? undefined,
          role: user.role,
          locale: user.locale,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.locale = user.locale;
        token.mustChangePassword = user.mustChangePassword;
        token.checkedAt = Date.now();
        return token;
      }

      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (Date.now() - checkedAt < JWT_RECHECK_MS) {
        return token;
      }

      const userId = typeof token.sub === "string" ? token.sub : null;
      if (!userId) return null;

      /*
       * MUHIM: bu yerda `null` qaytarish = foydalanuvchini tizimdan chiqarish.
       * Shu sababli faqat ANIQ sabab bo'lganda (hisob yo'q yoki o'chirilgan)
       * null qaytaramiz. Baza vaqtincha javob bermasa (dev serverda sovuq
       * start, ulanish uzilishi) sessiyani buzmaymiz — aks holda ishlayotgan
       * admin kutilmaganda login sahifasiga uchib ketadi.
       */
      let dbUser: {
        isActive: boolean;
        role: Role;
        locale: Locale;
        mustChangePassword: boolean;
      } | null = null;

      try {
        dbUser = await db.user.findUnique({
          where: { id: userId },
          select: {
            isActive: true,
            role: true,
            locale: true,
            mustChangePassword: true,
          },
        });
      } catch (error) {
        logger.error("jwt.recheck_failed", error);

        // Grace davri ichida eski token bilan davom etamiz.
        if (Date.now() - checkedAt < RECHECK_GRACE_MS) {
          return token;
        }
        return null;
      }

      if (!dbUser || !dbUser.isActive) {
        return null;
      }

      token.role = dbUser.role;
      token.locale = dbUser.locale;
      token.mustChangePassword = dbUser.mustChangePassword;
      token.checkedAt = Date.now();
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.locale = token.locale as Locale;
        session.user.mustChangePassword = token.mustChangePassword === true;
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
