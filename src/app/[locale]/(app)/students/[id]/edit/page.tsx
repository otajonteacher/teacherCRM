import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { classScope } from "@/lib/scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm } from "../../student-form";

export default async function EditStudentPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireAdmin();
  const t = await getTranslations("students");

  const student = await db.student.findUnique({
    where: { id: params.id },
    include: { guardian: true },
  });
  if (!student) {
    return null;
  }

  const classes = await db.class.findMany({
    where: classScope(user),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("edit")}</h1>
        <Button asChild variant="outline">
          <Link href={`/students/${student.id}`}>{t("back")}</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("formTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentForm
            mode="edit"
            classes={classes}
            student={{
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              dateOfBirth: student.dateOfBirth
                ? student.dateOfBirth.toISOString().slice(0, 10)
                : null,
              gender: student.gender,
              address: student.address,
              classId: student.classId,
              status: student.status,
              guardianName: student.guardian?.fullName ?? "",
              guardianPhone: student.guardian?.phone ?? "",
              guardianRelation: student.guardian?.relation ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
