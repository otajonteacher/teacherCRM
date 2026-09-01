import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth-guard";
import { ImportWizard } from "@/components/import-wizard";
import { CLASS_TEMPLATE_HEADERS } from "@/lib/class-imports";
import { commitClassImport, previewClassImport } from "./actions";

/** Sinflarni Excel'dan import qilish — faqat ADMIN. */
export default async function ClassImportPage() {
  await requireAdmin();
  const t = await getTranslations("import");
  const tClasses = await getTranslations("classes");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {tClasses("title")} — {t("action")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("uploadHint")}</p>
      </div>

      <ImportWizard
        templateHref="/api/import-template/classes"
        listHref="/classes"
        templateColumns={CLASS_TEMPLATE_HEADERS}
        preview={previewClassImport}
        commit={commitClassImport}
      />
    </div>
  );
}
