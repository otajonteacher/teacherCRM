import { Prisma, type Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRole, type SessionUser } from "./auth-guard";
import { logAudit, type AuditAction } from "./audit";

/**
 * SERVER ACTION QATLAMI (Punkt 3)
 * ===============================
 *
 * Server Action — ochiq HTTP endpoint. Brauzer konsolidan yoki `curl` bilan
 * unga istalgan ma'lumot yuborilishi mumkin. Formadagi `<select>` da 3 ta
 * variant borligi hech narsani kafolatlamaydi.
 *
 * Har bir action to'rtta qatlamdan o'tishi SHART:
 *   1. Rol tekshiruvi     — requireAuth / requireRole
 *   2. Kirish validatsiyasi — zod (istisno yo'q)
 *   3. Xato xavfsizligi   — texnik detal foydalanuvchiga chiqmaydi
 *   4. Audit jurnali      — CREATE / UPDATE / DELETE avtomatik
 *
 * Auth tekshiruvi validatsiyadan OLDIN: kirmagan odamga sxema tafsiloti sizib chiqmasin.
 */

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T = void> = ActionOk<T> | ActionErr;

/**
 * Next.js `redirect()` / `notFound()` ichida tashlanadigan boshqaruv xatosi.
 * Buni yutib yuborish mumkin emas — aks holda yo'naltirish ishlamaydi.
 */
function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = "digest" in error ? error.digest : undefined;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))
  );
}

/**
 * Prisma xato kodini foydalanuvchiga ko'rsatiladigan xabarga aylantiradi.
 * Kodning o'zi (P2002 va h.k.) hech qachon chiqmaydi.
 */
export function prismaErrorMessage(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "Bu qiymat allaqachon mavjud.";
      case "P2025":
        return "Yozuv topilmadi.";
      case "P2003":
        return "Bog'liq yozuv topilmadi.";
      default:
        return "Ma'lumotlar bazasi xatosi.";
    }
  }
  return null;
}

/** FormData ni oddiy obyektga aylantiradi. Fayllar tashlab ketiladi. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;

    if (key in obj) {
      const existing = obj[key];
      obj[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value];
    } else {
      obj[key] = value;
    }
  }

  return obj;
}

type AuditConfig<TInput, TResult> = {
  action: AuditAction;
  entity: string;
  entityId?: (
    input: TInput,
    result: TResult,
    user: SessionUser
  ) => string | null | undefined;
  meta?: (
    input: TInput,
    result: TResult,
    user: SessionUser
  ) => Record<string, unknown> | null;
};

type SafeActionOptions<TSchema extends z.ZodTypeAny, TResult> = {
  /** Bo'sh bo'lsa faqat requireAuth. Berilsa requireRole. */
  roles?: Role[];
  schema: TSchema;
  audit?: AuditConfig<z.infer<TSchema>, TResult>;
  handler: (input: z.infer<TSchema>, user: SessionUser) => Promise<TResult>;
};

/**
 * Server Action yaratadi: rol → zod → handler → audit.
 *
 * @example
 * export const createStudent = createAction({
 *   roles: ["ADMIN"],
 *   schema: studentSchema,
 *   audit: { action: "CREATE", entity: "Student", entityId: (_i, r) => r.id },
 *   handler: async (input) => db.student.create({ data: input }),
 * });
 */
export function createAction<TSchema extends z.ZodTypeAny, TResult>(
  options: SafeActionOptions<TSchema, TResult>
) {
  return async (raw: unknown): Promise<ActionResult<TResult>> => {
    let user: SessionUser;
    try {
      user = options.roles?.length
        ? await requireRole(...options.roles)
        : await requireAuth();
    } catch (error) {
      if (isNextControlFlowError(error)) throw error;
      return { ok: false, error: "Kirish talab qilinadi." };
    }

    const parsed = options.schema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Ma'lumotlar noto'g'ri. Qayta tekshiring." };
    }

    try {
      const data = await options.handler(parsed.data, user);

      if (options.audit) {
        await logAudit({
          userId: user.id,
          action: options.audit.action,
          entity: options.audit.entity,
          entityId:
            options.audit.entityId?.(parsed.data, data, user) ?? null,
          meta: options.audit.meta?.(parsed.data, data, user) ?? null,
        });
      }

      return { ok: true, data };
    } catch (error) {
      if (isNextControlFlowError(error)) throw error;
      const mapped = prismaErrorMessage(error);
      return {
        ok: false,
        error: mapped ?? "Amal bajarilmadi. Qayta urinib ko'ring.",
      };
    }
  };
}

/**
 * `<form action={...}>` uchun: FormData ni obyektga aylantirib createAction ga beradi.
 */
export function createFormAction<TSchema extends z.ZodTypeAny, TResult>(
  options: SafeActionOptions<TSchema, TResult>
) {
  const run = createAction(options);
  return async (formData: FormData): Promise<ActionResult<TResult>> => {
    return run(formDataToObject(formData));
  };
}
