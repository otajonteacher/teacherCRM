import { ShieldX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

// 403 — ruxsat yo'q sahifasi (requireRole shu yerga yo'naltiradi)
export default async function ForbiddenPage() {
  const t = await getTranslations("forbidden");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/20 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">403</p>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <Button asChild>
        <Link href="/dashboard">{t("backToDashboard")}</Link>
      </Button>
    </div>
  );
}
