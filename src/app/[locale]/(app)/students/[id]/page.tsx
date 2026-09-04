import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { redirectNever, requireRole } from "@/lib/auth-guard";
import { assertCanAccessStudent, studentScope } from "@/lib/scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("ADMIN", "TEACHER", "ACCOUNTANT", "PARENT");
  await assertCanAccessStudent(user, params.id);
  const t = await getTranslations("students");

  const student = await db.student.findFirst({
    where: { AND: [{ id: params.id }, studentScope(user)] },
    include: { class: true, guardian: true },
  });
  // Ikkinchi qatlam: scope filtri hech narsa qaytarmasa ham bo'sh sahifa
  // emas, 403 chiqadi. Ya'ni "bor/yo'q" farqi tashqariga sezilmaydi.
  if (!student) {
    redirectNever("/forbidden");
  }

  const canWrite = user.role === "ADMIN";
  const dob = student.dateOfBirth
    ? student.dateOfBirth.toISOString().slice(0, 10)
    : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {student.lastName} {student.firstName}
          </h1>
          <p className="text-muted-foreground">{t("profile")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/students">{t("back")}</Link>
          </Button>
          {canWrite ? (
            <Button asChild>
              <Link href={`/students/${student.id}/edit`}>{t("edit")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("formTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <p>
            <span className="text-muted-foreground">{t("class")}: </span>
            {student.class?.name ?? t("classNone")}
          </p>
          <p>
            <span className="text-muted-foreground">{t("status")}: </span>
            {t(`status${student.status.charAt(0) + student.status.slice(1).toLowerCase()}`)}
          </p>
          <p>
            <span className="text-muted-foreground">{t("dateOfBirth")}: </span>
            {dob}
          </p>
          <p>
            <span className="text-muted-foreground">{t("gender")}: </span>
            {student.gender === "male"
              ? t("genderMale")
              : student.gender === "female"
                ? t("genderFemale")
                : t("genderNone")}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">{t("address")}: </span>
            {student.address ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">{t("guardianName")}: </span>
            {student.guardian?.fullName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">{t("guardianPhone")}: </span>
            {student.guardian?.phone ?? "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
