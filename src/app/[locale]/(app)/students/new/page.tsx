import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { classScope } from "@/lib/scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm } from "../student-form";

export default async function NewStudentPage() {
  const user = await requireAdmin();
  const t = await getTranslations("students");

  const classes = await db.class.findMany({
    where: classScope(user),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("add")}</h1>
        <Button asChild variant="outline">
          <Link href="/students">{t("back")}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("formTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentForm mode="create" classes={classes} />
        </CardContent>
      </Card>
    </div>
  );
}
