import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { classScope } from "@/lib/scope";
import { GRADES } from "@/lib/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: { q?: string; grade?: string; academicYearId?: string };
}) {
  const user = await requireRole("ADMIN", "TEACHER");
  const t = await getTranslations("classes");
  const canWrite = user.role === "ADMIN";

  const q = searchParams.q?.trim() ?? "";
  const gradeRaw = Number(searchParams.grade);
  const grade = GRADES.includes(gradeRaw as (typeof GRADES)[number])
    ? gradeRaw
    : undefined;
  const academicYearId = searchParams.academicYearId?.trim() || undefined;

  const academicYears = await db.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true },
  });

  const classes = await db.class.findMany({
    where: {
      AND: [
        classScope(user),
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        grade ? { grade } : {},
        academicYearId ? { academicYearId } : {},
      ],
    },
    include: {
      academicYear: { select: { name: true } },
      homeroomTeacher: { select: { user: { select: { fullName: true } } } },
      _count: { select: { students: true, lessons: true } },
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link href="/classes/new">{t("add")}</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("filters")}</CardTitle>
          <CardDescription>{t("filtersHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-4" method="get">
            <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} />
            <select
              name="grade"
              defaultValue={grade ? String(grade) : ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("gradeAll")}</option>
              {GRADES.map((item) => (
                <option key={item} value={item}>
                  {t("gradeValue", { grade: item })}
                </option>
              ))}
            </select>
            <select
              name="academicYearId"
              defaultValue={academicYearId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("academicYearAll")}</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="flex-1">
                {t("search")}
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/classes">{t("clearFilters")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {classes.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("name")}</th>
                    <th className="px-4 py-3 font-medium">{t("grade")}</th>
                    <th className="px-4 py-3 font-medium">{t("academicYear")}</th>
                    <th className="px-4 py-3 font-medium">{t("homeroomTeacher")}</th>
                    <th className="px-4 py-3 font-medium">{t("studentsCount")}</th>
                    <th className="px-4 py-3 font-medium">{t("lessonsCount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((klass) => (
                    <tr key={klass.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/classes/${klass.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {klass.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t("gradeValue", { grade: klass.grade })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {klass.academicYear?.name ?? t("academicYearNone")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {klass.homeroomTeacher?.user.fullName ?? t("homeroomNone")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {klass._count.students}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {klass._count.lessons}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
