import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeacherForm } from "../../teacher-form";

export default async function EditTeacherPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const t = await getTranslations("teachers");

  const teacher = await db.teacher.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          locale: true,
        },
      },
      subjects: { select: { id: true } },
    },
  });
  if (!teacher) {
    return null;
  }

  const subjects = await db.subject.findMany({
    select: { id: true, nameUz: true },
    orderBy: { nameUz: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("edit")}</h1>
        <Button asChild variant="outline">
          <Link href={`/teachers/${teacher.id}`}>{t("back")}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("formTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherForm
            mode="edit"
            subjects={subjects.map((subject) => ({
              id: subject.id,
              name: subject.nameUz,
            }))}
            teacher={{
              id: teacher.id,
              fullName: teacher.user.fullName,
              email: teacher.user.email ?? "",
              phone: teacher.user.phone ?? "",
              locale: teacher.user.locale,
              isActive: teacher.user.isActive,
              subjectIds: teacher.subjects.map((subject) => subject.id),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
