import { PrismaClient } from "@prisma/client";

// Prisma klientni global singleton sifatida saqlaymiz.
// Dev rejimida hot-reload paytida ko'p ulanish yaratilishining oldini oladi.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
