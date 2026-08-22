import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { redirectNever, requireAdmin } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClassForm } from "../../class-form";

export default async function EditClassPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const t = await getTranslations("classes");

  const klass = await db.class.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      grade: true,
      academicYearId: true,
      homeroomTeacherId: true,
    },
  });
  if (!klass) {
    redirectNever("/forbidden");
  }

  const [academicYears, teachers] = await Promise.all([
    db.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
    }),
    db.teacher.findMany({
      orderBy: { user: { fullName: "asc" } },
      select: { id: true, user: { select: { fullName: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("editTitle", { name: klass.name })}
        </h1>
        <Button asChild variant="outline">
          <Link href={`/classes/${klass.id}`}>{t("back")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("formTitle")}</CardTitle>
          <CardDescription>{t("formHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ClassForm
            mode="edit"
            klass={klass}
            academicYears={academicYears.map((year) => ({
              id: year.id,
              label: year.name,
            }))}
            teachers={teachers.map((teacher) => ({
              id: teacher.id,
              label: teacher.user.fullName,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
