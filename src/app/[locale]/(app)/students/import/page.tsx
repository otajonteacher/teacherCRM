import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth-guard";
import { ImportWizard } from "@/components/import-wizard";
import { STUDENT_TEMPLATE_HEADERS } from "@/lib/imports";
import { commitStudentImport, previewStudentImport } from "./actions";

/** O'quvchilarni Excel'dan import qilish — faqat ADMIN. */
export default async function StudentImportPage() {
  await requireAdmin();
  const t = await getTranslations("import");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("studentsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("studentsSubtitle")}</p>
      </div>

      <ImportWizard
        templateHref="/api/import-template/students"
        listHref="/students"
        templateColumns={STUDENT_TEMPLATE_HEADERS}
        preview={previewStudentImport}
        commit={commitStudentImport}
      />
    </div>
  );
}
