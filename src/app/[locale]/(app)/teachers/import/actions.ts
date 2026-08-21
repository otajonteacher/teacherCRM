"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { createAction } from "@/lib/safe-action";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  isAllowedExcelFile,
  normalizeKey,
  parseExcel,
} from "@/lib/excel";
import {
  TEACHER_COLUMNS,
  findUnknownColumns,
  generateInitialPassword,
  mapTeacherRow,
  teacherImportPayloadSchema,
  type ImportOutcome,
  type PreviewResult,
  type PreviewRow,
  type TeacherCommitRow,
} from "@/lib/imports";

/**
 * O'QITUVCHILARNI EXCEL'DAN IMPORT (faqat ADMIN)
 * ==============================================
 * O'quvchilar importi bilan bir xil oqim, lekin bu yerda HISOB ham
 * yaratiladi (User + Teacher). Shu sababli qo'shimcha qoidalar:
 *   - Email/telefon login bo'ladi — kamida bittasi shart va unikal.
 *   - Parol Excel'da bo'lmasa tizim xavfsiz parol yasaydi.
 *   - Barcha yangi hisoblar `mustChangePassword: true` bilan yaratiladi.
 *   - Parollar audit jurnaliga TUSHMAYDI, faqat bir marta admin ekranida
 *     ko'rinadi (CSV bo'lib yuklab olinadi).
 */

const BCRYPT_ROUNDS = 10;

export type TeacherPreviewState =
  | { ok: true; data: PreviewResult<TeacherCommitRow> }
  | { ok: false; error: string };

export type TeacherCommitState =
  | { ok: true; data: ImportOutcome }
  | { ok: false; error: string };

/** Fan nomi (uz/ru/en) -> id. */
async function loadSubjectMap(): Promise<Map<string, string>> {
  const subjects = await db.subject.findMany({
    select: { id: true, nameUz: true, nameRu: true, nameEn: true },
  });
  const map = new Map<string, string>();
  subjects.forEach((subject) => {
    [subject.nameUz, subject.nameRu, subject.nameEn].forEach((name) => {
      if (name) map.set(normalizeKey(name), subject.id);
    });
  });
  return map;
}

type ExistingTeacher = { teacherId: string; userId: string };

/** Email va telefon bo'yicha mavjud o'qituvchilar. */
async function loadTeacherIdentities(): Promise<Map<string, ExistingTeacher>> {
  const teachers = await db.teacher.findMany({
    select: { id: true, user: { select: { id: true, email: true, phone: true } } },
  });
  const map = new Map<string, ExistingTeacher>();
  teachers.forEach((teacher) => {
    const entry = { teacherId: teacher.id, userId: teacher.user.id };
    if (teacher.user.email) map.set(`email:${teacher.user.email.toLowerCase()}`, entry);
    if (teacher.user.phone) map.set(`phone:${teacher.user.phone}`, entry);
  });
  return map;
}

function findExisting(
  identities: Map<string, ExistingTeacher>,
  email?: string,
  phone?: string
): ExistingTeacher | null {
  if (email) {
    const byEmail = identities.get(`email:${email.toLowerCase()}`);
    if (byEmail) return byEmail;
  }
  if (phone) {
    const byPhone = identities.get(`phone:${phone}`);
    if (byPhone) return byPhone;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 1-qadam: ko'rib chiqish                                             */
/* ------------------------------------------------------------------ */

export async function previewTeacherImport(
  _prev: TeacherPreviewState | null,
  formData: FormData
): Promise<TeacherPreviewState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Fayl tanlanmadi." };
  }
  if (!isAllowedExcelFile(file.name)) {
    return { ok: false, error: "Faqat Excel fayl qabul qilinadi (.xlsx yoki .xls)." };
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { ok: false, error: "Fayl hajmi 5 MB dan oshmasligi kerak." };
  }

  let parsed;
  try {
    parsed = parseExcel(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "Faylni o'qib bo'lmadi. U Excel fayl ekanini tekshiring." };
  }

  if (parsed.rows.length === 0) {
    return {
      ok: false,
      error: "Faylda ma'lumot topilmadi. Birinchi qator ustun sarlavhalari bo'lishi kerak.",
    };
  }
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `Bir faylda ${MAX_IMPORT_ROWS} qatorgacha bo'lishi mumkin. Faylni bo'laklab yuklang.`,
    };
  }

  const [subjectMap, identities] = await Promise.all([
    loadSubjectMap(),
    loadTeacherIdentities(),
  ]);
  const seenInFile = new Map<string, number>();

  const rows: PreviewRow<TeacherCommitRow>[] = parsed.rows.map((sheetRow) => {
    const mapped = mapTeacherRow(sheetRow.values);
    const messages = [...mapped.errors, ...mapped.warnings];

    if (!mapped.row) {
      return {
        rowNumber: sheetRow.rowNumber,
        status: "error" as const,
        label: "—",
        detail: "",
        messages,
        row: null,
        existingId: null,
      };
    }

    const data = mapped.row;
    const detail = [data.email ?? "", data.phone ?? ""].filter((part) => part !== "").join(" · ");

    // Fanlar bazada bor-yo'qligini tekshiramiz — topilmagani xato.
    const missingSubjects = data.subjectNames.filter(
      (name) => !subjectMap.has(normalizeKey(name))
    );
    if (missingSubjects.length > 0) {
      return {
        rowNumber: sheetRow.rowNumber,
        status: "error" as const,
        label: data.fullName,
        detail,
        messages: [
          ...messages,
          `Fan topilmadi: ${missingSubjects.join(", ")}. Avval fanni yarating yoki ustunni bo'sh qoldiring.`,
        ],
        row: null,
        existingId: null,
      };
    }

    // Fayl ichidagi takror login
    const identityKey = data.email ? `email:${data.email}` : `phone:${data.phone ?? ""}`;
    const duplicateOfRow = seenInFile.get(identityKey);
    if (duplicateOfRow) {
      return {
        rowNumber: sheetRow.rowNumber,
        status: "error" as const,
        label: data.fullName,
        detail,
        messages: [
          ...messages,
          `Fayl ichida takrorlangan login (${duplicateOfRow}-qator bilan bir xil).`,
        ],
        row: null,
        existingId: null,
      };
    }
    seenInFile.set(identityKey, sheetRow.rowNumber);

    const existing = findExisting(identities, data.email, data.phone);

    const commitRow: TeacherCommitRow = {
      rowNumber: sheetRow.rowNumber,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      subjectNames: data.subjectNames,
      locale: data.locale,
      isActive: data.isActive,
      password: data.password,
      existingId: existing ? existing.teacherId : null,
    };

    if (existing) {
      return {
        rowNumber: sheetRow.rowNumber,
        status: "duplicate" as const,
        label: data.fullName,
        detail,
        messages: [...messages, "Bu login bilan o'qituvchi bazada allaqachon bor."],
        row: commitRow,
        existingId: existing.teacherId,
      };
    }

    return {
      rowNumber: sheetRow.rowNumber,
      status: "ready" as const,
      label: data.fullName,
      detail,
      messages: data.password
        ? messages
        : [...messages, "Parol bo'sh — tizim yasaydi va ro'yxatga chiqaradi."],
      row: commitRow,
      existingId: null,
    };
  });

  return {
    ok: true,
    data: {
      fileName: file.name,
      total: rows.length,
      ready: rows.filter((row) => row.status === "ready").length,
      duplicates: rows.filter((row) => row.status === "duplicate").length,
      errors: rows.filter((row) => row.status === "error").length,
      unknownColumns: findUnknownColumns(parsed.headers, TEACHER_COLUMNS),
      rows,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 2-qadam: yozish                                                     */
/* ------------------------------------------------------------------ */

const commitAction = createAction({
  roles: ["ADMIN"],
  schema: teacherImportPayloadSchema,
  handler: async (input): Promise<ImportOutcome> => {
    const subjectMap = await loadSubjectMap();
    const outcome: ImportOutcome = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      messages: [],
      credentials: [],
    };

    for (const row of input.rows) {
      if (row.existingId && input.mode === "skip") {
        outcome.skipped += 1;
        continue;
      }

      const subjectIds: string[] = [];
      let missingSubject: string | null = null;
      for (const name of row.subjectNames) {
        const id = subjectMap.get(normalizeKey(name));
        if (!id) {
          missingSubject = name;
          break;
        }
        subjectIds.push(id);
      }
      if (missingSubject) {
        outcome.failed += 1;
        if (outcome.messages.length < 20) {
          outcome.messages.push(`${row.rowNumber}-qator: fan topilmadi ("${missingSubject}").`);
        }
        continue;
      }

      if (!row.email && !row.phone) {
        outcome.failed += 1;
        if (outcome.messages.length < 20) {
          outcome.messages.push(`${row.rowNumber}-qator: email yoki telefon yo'q.`);
        }
        continue;
      }

      try {
        if (row.existingId) {
          const existing = await db.teacher.findUnique({
            where: { id: row.existingId },
            select: { id: true, userId: true },
          });
          if (!existing) {
            outcome.failed += 1;
            continue;
          }

          // Parol bu yerda o'zgarmaydi — mavjud hisob paroli tegilmaydi.
          await db.$transaction([
            db.user.update({
              where: { id: existing.userId },
              data: {
                fullName: row.fullName,
                email: row.email ?? null,
                phone: row.phone ?? null,
                locale: row.locale,
                isActive: row.isActive,
              },
            }),
            db.teacher.update({
              where: { id: existing.id },
              data: { subjects: { set: subjectIds.map((id) => ({ id })) } },
            }),
          ]);
          outcome.updated += 1;
        } else {
          const password = row.password ?? generateInitialPassword();
          const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

          await db.teacher.create({
            data: {
              user: {
                create: {
                  fullName: row.fullName,
                  email: row.email ?? null,
                  phone: row.phone ?? null,
                  locale: row.locale,
                  isActive: row.isActive,
                  role: "TEACHER",
                  passwordHash,
                  mustChangePassword: true,
                },
              },
              subjects: { connect: subjectIds.map((id) => ({ id })) },
            },
            select: { id: true },
          });

          // Parol faqat shu javobda qaytadi — bazada xesh, auditda yo'q.
          outcome.credentials.push({
            name: row.fullName,
            login: row.email ?? row.phone ?? "",
            password,
          });
          outcome.created += 1;
        }
      } catch {
        outcome.failed += 1;
        if (outcome.messages.length < 20) {
          outcome.messages.push(
            `${row.rowNumber}-qator: yozib bo'lmadi (login band bo'lishi mumkin).`
          );
        }
      }
    }

    revalidatePath("/teachers");
    return outcome;
  },
  audit: {
    action: "CREATE",
    entity: "TeacherImport",
    meta: (input, result) => ({
      fileName: input.fileName ?? null,
      mode: input.mode,
      rows: input.rows.length,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
    }),
  },
});

export async function commitTeacherImport(payload: unknown): Promise<TeacherCommitState> {
  const result = await commitAction(payload);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
