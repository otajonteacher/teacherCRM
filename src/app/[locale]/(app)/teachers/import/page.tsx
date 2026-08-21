import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth-guard";
import { ImportWizard } from "@/components/import-wizard";
import { TEACHER_TEMPLATE_HEADERS } from "@/lib/imports";
import { commitTeacherImport, previewTeacherImport } from "./actions";

/** O'qituvchilarni Excel'dan import qilish — faqat ADMIN. */
export default async function TeacherImportPage() {
  await requireAdmin();
  const t = await getTranslations("import");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("teachersTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("teachersSubtitle")}</p>
      </div>

      <ImportWizard
        templateHref="/api/import-template/teachers"
        listHref="/teachers"
        templateColumns={TEACHER_TEMPLATE_HEADERS}
        preview={previewTeacherImport}
        commit={commitTeacherImport}
      />
    </div>
  );
}
