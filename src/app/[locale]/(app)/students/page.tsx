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
import {
  clampPage,
  pageCount,
  parsePageSize,
  parsePositivePage,
  STUDENT_PAGE_SIZES,
} from "@/lib/pagination";

const STATUSES: StudentStatus[] = ["ACTIVE", "GRADUATED", "LEFT"];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: string;
    classId?: string;
    page?: string;
    pageSize?: string;
  };
}) {
  const user = await requireRole("ADMIN", "TEACHER", "ACCOUNTANT", "PARENT");
  const [t, tImport, tp] = await Promise.all([
    getTranslations("students"),
    getTranslations("import"),
    getTranslations("pagination"),
  ]);
  const canWrite = user.role === "ADMIN";

  const q = searchParams.q?.trim() ?? "";
  const status =
    searchParams.status && STATUSES.includes(searchParams.status as StudentStatus)
      ? (searchParams.status as StudentStatus)
      : undefined;
  const classId = searchParams.classId?.trim() || undefined;
  const pageSize = parsePageSize(searchParams.pageSize);

  const studentWhere = {
    AND: [
      studentScope(user),
      q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
      status ? { status } : {},
      classId ? { classId } : {},
    ],
  };

  const [classes, totalStudents] = await Promise.all([
    db.class.findMany({
      where: classScope(user),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.student.count({ where: studentWhere }),
  ]);

  const totalPages = pageCount(totalStudents, pageSize);
  const page = clampPage(parsePositivePage(searchParams.page), totalPages);

  const students = await db.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      class: { select: { name: true } },
      guardian: { select: { fullName: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (classId) params.set("classId", classId);
    params.set("page", String(targetPage));
    params.set("pageSize", String(pageSize));
    return `/students?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/students/import">{tImport("action")}</Link>
            </Button>
            <Button asChild>
              <Link href="/students/new">{t("add")}</Link>
            </Button>
          </div>
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
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="flex-1">
                {t("search")}
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/students">{t("clearFilters")}</Link>
              </Button>
            </div>
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

      {totalStudents > 0 ? (
        <nav
          aria-label={tp("navigation")}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={pageHref(page - 1)}>{tp("previous")}</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              {tp("previous")}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {tp("page", { current: page, total: totalPages })}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline">
              <Link href={pageHref(page + 1)}>{tp("next")}</Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              {tp("next")}
            </Button>
          )}
          <form method="get" className="flex items-center gap-2">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {classId ? <input type="hidden" name="classId" value={classId} /> : null}
            <label htmlFor="students-page-size" className="sr-only">
              {tp("pageSize")}
            </label>
            <select
              id="students-page-size"
              name="pageSize"
              defaultValue={String(pageSize)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {STUDENT_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {tp("items", { count: size })}
                </option>
              ))}
            </select>
          </form>
        </nav>
      ) : null}
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
