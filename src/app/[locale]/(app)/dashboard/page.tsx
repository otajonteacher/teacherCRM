import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  // Server tomon qorovuli — sessiya yo'q bo'lsa /login ga yo'naltiradi
  const user = await requireAuth();

  const t = await getTranslations("dashboard");
  const tr = await getTranslations("roles");
  const { name, role } = user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("welcome")}, {name}
        </h1>
        <p className="text-muted-foreground">
          {t("yourRole")}: {tr(role)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("welcome")} 👋</CardTitle>
          <CardDescription>{t("intro")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("moduleComingSoon")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
