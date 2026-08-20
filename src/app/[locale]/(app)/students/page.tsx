import { StudentStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { classScope, studentScope } from "@/lib/scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUSES: StudentStatus[] = ["ACTIVE", "GRADUATED", "LEFT"];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; classId?: string };
}) {
  const user = await requireRole("ADMIN", "TEACHER", "ACCOUNTANT", "PARENT");
  const t = await getTranslations("students");
  const canWrite = user.role === "ADMIN";

  const q = searchParams.q?.trim() ?? "";
  const status =
    searchParams.status && STATUSES.includes(searchParams.status as StudentStatus)
      ? (searchParams.status as StudentStatus)
      : undefined;
  const classId = searchParams.classId?.trim() || undefined;

  const classes = await db.class.findMany({
    where: classScope(user),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const students = await db.student.findMany({
    where: {
      AND: [
        studentScope(user),
        q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status } : {},
        classId ? { classId } : {},
      ],
    },
    include: { class: true, guardian: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 100,
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
            <Link href="/students/new">{t("add")}</Link>
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
              name="status"
              defaultValue={status ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("statusAll")}</option>
              <option value="ACTIVE">{t("statusActive")}</option>
              <option value="GRADUATED">{t("statusGraduated")}</option>
              <option value="LEFT">{t("statusLeft")}</option>
            </select>
            <select
              name="classId"
              defaultValue={classId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("classAll")}</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              {t("search")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("name")}</th>
                    <th className="px-4 py-3 font-medium">{t("class")}</th>
                    <th className="px-4 py-3 font-medium">{t("status")}</th>
                    <th className="px-4 py-3 font-medium">{t("guardianName")}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {student.lastName} {student.firstName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.class?.name ?? t("classNone")}
                      </td>
                      <td className="px-4 py-3">
                        {t(`status${capitalize(student.status)}`)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.guardian?.fullName ?? "—"}
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

function capitalize(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
