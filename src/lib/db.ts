import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import { attachQueryLog } from "./query-log";

// Prisma klientni global singleton sifatida saqlaymiz.
// Dev rejimida hot-reload paytida ko'p ulanish yaratilishining oldini oladi.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// So'rov logi — vaqtinchalik o'lchov vositasi (0-to'lqin 0.2).
// Ishlab chiqarishda hech qachon yoqilmaydi, tafsiloti `query-log.ts` da.
const queryLogEnabled =
  env.QUERY_LOG === "1" && env.NODE_ENV !== "production";

function createPrismaClient(): PrismaClient {
  if (!queryLogEnabled) {
    return new PrismaClient({
      log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  // `query` darajasi hodisa sifatida chiqarilishi kerak — shundagina
  // har so'rovning davomiyligini o'lchash mumkin.
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "warn" },
    ],
  }) as unknown as PrismaClient;

  attachQueryLog(client, {
    slowMs: env.QUERY_LOG_MS ?? 100,
    withParams: env.QUERY_LOG_PARAMS === "1",
  });

  return client;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
