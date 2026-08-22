"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { createAction } from "@/lib/safe-action";
import { checkImportHeaders } from "@/lib/import-guards";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  isAllowedExcelFile,
  normalizeKey,
  parseExcel,
} from "@/lib/excel";
import {
  STUDENT_TEMPLATE_HEADERS,
  findUnknownColumns,
  type ImportOutcome,
  type PreviewResult,
  type PreviewRow,
} from "@/lib/imports";
import {
  CLASS_COLUMNS,
  classImportPayloadSchema,
  mapClassRow,
  type ClassCommitRow,
} from "@/lib/class-imports";

/**
 * SINFLARNI EXCEL'DAN IMPORT (faqat ADMIN)
 * ========================================
 * Ikki qadam:
 *   1. previewClassImport — faylni o'qiydi va tekshiradi, HECH NARSA yozmaydi.
 *   2. commitClassImport  — admin tasdiqlagan qatorlarni bazaga yozadi.
 *
 * Dublikat mezoni: bir o'quv yilida bir xil nomdagi sinf (schema'dagi
 * @@unique([name, academicYearId]) bilan bir xil qoida).
 */

export type ClassPreviewState =
  | { ok: true; data: PreviewResult<ClassCommitRow> }
  | { ok: false; error: string };

export type ClassCommitState =
  | { ok: true; data: ImportOutcome }
  | { ok: false; error: string };

/** Sinf kaliti: nom + o'quv yili. */
function classKey(name: string, academicYearId?: string | null) {
  return `${normalizeKey(name)}|${academicYearId ?? ""}`;
}

/* ------------------------------------------------------------------ */
/* 1-qadam: ko'rib chiqish                                             */
/* ------------------------------------------------------------------ */

export async function previewClassImport(
  _prev: ClassPreviewState | null,
  formData: FormData
): Promise<ClassPreviewState> {
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

  const headerError = checkImportHeaders({
    headers: parsed.headers,
    columns: CLASS_COLUMNS,
    otherTemplateHeaders: STUDENT_TEMPLATE_HEADERS,
    otherTemplateName: "o'quvchilar",
  });
  if (headerError) {
    return { ok: false, error: headerError };
  }

  const [years, teachers, existingClasses] = await Promise.all([
    db.academicYear.findMany({ select: { id: true, name: true, isCurrent: true } }),
    db.teacher.findMany({
      select: {
        id: true,
        user: { select: { fullName: true, email: true, phone: true } },
      },
    }),
    db.class.findMany({ select: { id: true, name: true, academicYearId: true } }),
  ]);

  const yearMap = new Map<string, string>();
  years.forEach((year) => yearMap.set(normalizeKey(year.name), year.id));
  const currentYearId = years.find((year) => year.isCurrent)?.id ?? null;

  // Rahbarni email, telefon yoki F.I.Sh. bo'yicha topamiz.
  const teacherMap = new Map<string, string>();
  teachers.forEach((teacher) => {
    const keys = [
      teacher.user.email ?? "",
      teacher.user.phone ?? "",
      teacher.user.fullName,
    ];
    keys.forEach((key) => {
      const normalized = normalizeKey(key);
      if (normalized !== "" && !teacherMap.has(normalized)) {
        teacherMap.set(normalized, teacher.id);
      }
    });
  });

  const existingMap = new Map<string, string>();
  existingClasses.forEach((klass) => {
    existingMap.set(classKey(klass.name, klass.academicYearId), klass.id);
  });

  const seenInFile = new Map<string, number>();

  const rows: PreviewRow<ClassCommitRow>[] = parsed.rows.map((sheetRow) => {
    const mapped = mapClassRow(sheetRow.values);
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
    const label = data.name;

    // O'quv yili: yozilgan bo'lsa aniq topilishi shart, aks holda joriy yil.
    let academicYearId: string | null = currentYearId;
    if (data.academicYearName) {
      const found = yearMap.get(normalizeKey(data.academicYearName));
      if (!found) {
        return {
          rowNumber: sheetRow.rowNumber,
          status: "error" as const,
          label,
          detail: data.academicYearName,
          messages: [
            ...messages,
            `O'quv yili topilmadi: "${data.academicYearName}". Avval "O'quv yillari" bo'limida yarating yoki ustunni bo'sh qoldiring.`,
          ],
          row: null,
          existingId: null,
        };
      }
      academicYearId = found;
    } else if (currentYearId === null) {
      messages.push("Joriy o'quv yili belgilanmagan — sinf o'quv yilisiz yaratiladi.");
    } else {
      messages.push("O'quv yili ustuni bo'sh — joriy o'quv yili olinadi.");
    }

    let homeroomTeacherId: string | null = null;
    if (data.homeroomTeacher) {
      const found = teacherMap.get(normalizeKey(data.homeroomTeacher));
      if (!found) {
        return {
          rowNumber: sheetRow.rowNumber,
          status: "error" as const,
          label,
          detail: data.homeroomTeacher,
          messages: [
            ...messages,
            `Sinf rahbari topilmadi: "${data.homeroomTeacher}". Email, telefon yoki F.I.Sh. ni o'qituvchilar ro'yxatidagidek yozing.`,
          ],
          row: null,
          existingId: null,
        };
      }
      homeroomTeacherId = found;
    }

    const key = classKey(data.name, academicYearId);
    const duplicateOfRow = seenInFile.get(key);
    const existingId = existingMap.get(key) ?? null;

    const yearLabel =
      years.find((year) => year.id === academicYearId)?.name ?? "o'quv yilisiz";
    const detail = [`${data.grade}-parallel`, yearLabel, data.homeroomTeacher ?? ""]
      .filter((part) => part !== "")
      .join(" · ");

    const commitRow: ClassCommitRow = {
      rowNumber: sheetRow.rowNumber,
      name: data.name,
      grade: data.grade,
      academicYearId,
      homeroomTeacherId,
      existingId,
    };

    if (duplicateOfRow) {
      return {
        rowNumber: sheetRow.rowNumber,
        status: "error" as const,
        label,
        detail,
        messages: [
          ...messages,
          `Fayl ichida takrorlangan (${duplicateOfRow}-qator bilan bir xil).`,
        ],
        row: null,
        existingId,
      };
    }

    seenInFile.set(key, sheetRow.rowNumber);

    if (existingId) {
      return {
        rowNumber: sheetRow.rowNumber,
        status: "duplicate" as const,
        label,
        detail,
        messages: [...messages, "Bu o'quv yilida shu nomdagi sinf allaqachon bor."],
        row: commitRow,
        existingId,
      };
    }

    return {
      rowNumber: sheetRow.rowNumber,
      status: "ready" as const,
      label,
      detail,
      messages,
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
      unknownColumns: findUnknownColumns(parsed.headers, CLASS_COLUMNS),
      rows,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 2-qadam: yozish                                                     */
/* ------------------------------------------------------------------ */

const commitAction = createAction({
  roles: ["ADMIN"],
  schema: classImportPayloadSchema,
  handler: async (input): Promise<ImportOutcome> => {
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

      try {
        if (row.existingId) {
          await db.class.update({
            where: { id: row.existingId },
            data: {
              name: row.name,
              grade: row.grade,
              academicYearId: row.academicYearId ?? null,
              homeroomTeacherId: row.homeroomTeacherId ?? null,
            },
          });
          outcome.updated += 1;
        } else {
          await db.class.create({
            data: {
              name: row.name,
              grade: row.grade,
              academicYearId: row.academicYearId ?? null,
              homeroomTeacherId: row.homeroomTeacherId ?? null,
            },
            select: { id: true },
          });
          outcome.created += 1;
        }
      } catch {
        outcome.failed += 1;
        if (outcome.messages.length < 20) {
          outcome.messages.push(
            `${row.rowNumber}-qator: yozib bo'lmadi ("${row.name}"). Sinf rahbari boshqa sinfga biriktirilgan bo'lishi mumkin.`
          );
        }
      }
    }

    revalidatePath("/classes");
    revalidatePath("/schedule");
    return outcome;
  },
  audit: {
    action: "CREATE",
    entity: "ClassImport",
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

export async function commitClassImport(payload: unknown): Promise<ClassCommitState> {
  const result = await commitAction(payload);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
