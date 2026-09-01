import { buildExcel } from "@/lib/excel";
import { createRouteHandler } from "@/lib/route-guard";
import {
  STUDENT_TEMPLATE_HEADERS,
  STUDENT_TEMPLATE_SAMPLE,
  TEACHER_TEMPLATE_HEADERS,
  TEACHER_TEMPLATE_SAMPLE,
} from "@/lib/imports";
import {
  CLASS_TEMPLATE_HEADERS,
  CLASS_TEMPLATE_SAMPLE,
} from "@/lib/class-imports";

/**
 * IMPORT SHABLONI (.xlsx)
 * =======================
 * GET /api/import-template/students
 * GET /api/import-template/teachers
 * GET /api/import-template/classes
 *
 * Ruxsat `createRouteHandler` orqali majburlanadi: faqat ADMIN.
 * Shablon fayl xotirada yasaladi, diskda saqlanmaydi va keshlanmaydi.
 */
export const dynamic = "force-dynamic";

const TEMPLATES = {
  students: {
    headers: STUDENT_TEMPLATE_HEADERS,
    sample: STUDENT_TEMPLATE_SAMPLE,
    sheetName: "O'quvchilar",
    fileName: "oquvchilar-shablon.xlsx",
  },
  teachers: {
    headers: TEACHER_TEMPLATE_HEADERS,
    sample: TEACHER_TEMPLATE_SAMPLE,
    sheetName: "O'qituvchilar",
    fileName: "oqituvchilar-shablon.xlsx",
  },
  classes: {
    headers: CLASS_TEMPLATE_HEADERS,
    sample: CLASS_TEMPLATE_SAMPLE,
    sheetName: "Sinflar",
    fileName: "sinflar-shablon.xlsx",
  },
} as const;

type TemplateKey = keyof typeof TEMPLATES;

function isTemplateKey(value: string): value is TemplateKey {
  return value === "students" || value === "teachers" || value === "classes";
}

export const GET = createRouteHandler<{ entity: string }>({
  roles: ["ADMIN"],
  handler: async ({ params }) => {
    if (!isTemplateKey(params.entity)) {
      return new Response("Not found", { status: 404 });
    }

    const template = TEMPLATES[params.entity];
    const buffer = buildExcel(
      [[...template.headers], [...template.sample]],
      template.sheetName
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${template.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  },
});
