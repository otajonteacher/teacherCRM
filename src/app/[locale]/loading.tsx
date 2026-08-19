import { getTranslations } from "next-intl/server";

export default async function LoadingPage() {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      {t("loading")}
    </div>
  );
}
