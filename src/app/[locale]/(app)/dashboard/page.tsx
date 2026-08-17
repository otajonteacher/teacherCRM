import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const t = await getTranslations("dashboard");
  const tr = await getTranslations("roles");
  const { name, role } = session.user;

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
