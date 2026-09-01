import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TeacherProfilePage({
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
          mustChangePassword: true,
        },
      },
      subjects: { select: { id: true, nameUz: true } },
      homeroomClasses: { select: { id: true, name: true } },
      _count: { select: { lessons: true } },
    },
  });
  if (!teacher) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {teacher.user.fullName}
          </h1>
          <p className="text-muted-foreground">{t("profile")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/teachers">{t("back")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/teachers/${teacher.id}/edit`}>{t("edit")}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("formTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">{t("email")}: </span>
            {teacher.user.email ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">{t("phone")}: </span>
            {teacher.user.phone ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">{t("locale")}: </span>
            {teacher.user.locale === "ru"
              ? t("localeRu")
              : teacher.user.locale === "en"
                ? t("localeEn")
                : t("localeUz")}
          </p>
          <p>
            <span className="text-muted-foreground">{t("status")}: </span>
            {teacher.user.isActive ? t("statusActive") : t("statusInactive")}
          </p>
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">{t("subjects")}: </span>
            {teacher.subjects.length === 0
              ? "—"
              : teacher.subjects.map((subject) => subject.nameUz).join(", ")}
          </p>
          <p>
            <span className="text-muted-foreground">{t("homeroom")}: </span>
            {teacher.homeroomClasses.length === 0
              ? "—"
              : teacher.homeroomClasses.map((klass) => klass.name).join(", ")}
          </p>
          <p>
            <span className="text-muted-foreground">{t("lessonCount")}: </span>
            {teacher._count.lessons}
          </p>
          {teacher.user.mustChangePassword ? (
            <p className="sm:col-span-2 text-muted-foreground">
              {t("mustChangePassword")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
