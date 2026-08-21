import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherForm } from "../teacher-form";

export default async function NewTeacherPage() {
  await requireAdmin();
  const t = await getTranslations("teachers");

  const subjects = await db.subject.findMany({
    select: { id: true, nameUz: true },
    orderBy: { nameUz: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("add")}</h1>
        <Button asChild variant="outline">
          <Link href="/teachers">{t("back")}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("formTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherForm
            mode="create"
            subjects={subjects.map((subject) => ({
              id: subject.id,
              name: subject.nameUz,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
