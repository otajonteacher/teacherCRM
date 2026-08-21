import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Mavjud bo'lmagan menyu (`/teachers`, `/classes`, ...) (app) layout ichida
 * qoladi — sidebar saqlanadi, login ga tashlanmaydi.
 */
export default async function UnbuiltPage() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">{t("home")}</Link>
      </Button>
    </div>
  );
}
