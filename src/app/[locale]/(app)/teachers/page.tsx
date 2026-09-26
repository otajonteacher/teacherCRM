import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
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
  PAGE_SIZES,
  pageCount,
  parsePageSize,
  parsePositivePage,
} from "@/lib/pagination";
import { TeacherPageSizeSelect } from "./page-size-select";

/**
 * O'qituvchilar ro'yxati — faqat ADMIN (rbac.ts: /teachers faqat ADMIN da).
 * Shu sababli doira (scope) kerak emas: admin hammasini ko'radi.
 */
export default async function TeachersPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    subjectId?: string;
    active?: string;
    page?: string;
    pageSize?: string;
  };
}) {
  await requireAdmin();
  const [t, tImport, tp] = await Promise.all([
    getTranslations("teachers"),
    getTranslations("import"),
    getTranslations("pagination"),
  ]);

  const q = searchParams.q?.trim() ?? "";
  const subjectId = searchParams.subjectId?.trim() || undefined;
  const active =
    searchParams.active === "yes"
      ? true
      : searchParams.active === "no"
        ? false
        : undefined;
  const activeParam = active === undefined ? undefined : active ? "yes" : "no";
  const pageSize = parsePageSize(searchParams.pageSize);

  const teacherWhere = {
    AND: [
      q
        ? {
            user: {
              OR: [
                { fullName: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
                { phone: { contains: q, mode: "insensitive" as const } },
              ],
            },
          }
        : {},
      subjectId ? { subjects: { some: { id: subjectId } } } : {},
      active === undefined ? {} : { user: { isActive: active } },
    ],
  };

  const [subjects, totalTeachers] = await Promise.all([
    db.subject.findMany({
      select: { id: true, nameUz: true },
      orderBy: { nameUz: "asc" },
    }),
    db.teacher.count({ where: teacherWhere }),
  ]);

  const totalPages = pageCount(totalTeachers, pageSize);
  const page = clampPage(parsePositivePage(searchParams.page), totalPages);

  const teachers = await db.teacher.findMany({
    where: teacherWhere,
    include: {
      user: {
        select: { fullName: true, email: true, phone: true, isActive: true },
      },
      subjects: { select: { id: true, nameUz: true } },
      homeroomClasses: { select: { id: true, name: true } },
    },
    orderBy: { user: { fullName: "asc" } },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (subjectId) params.set("subjectId", subjectId);
    if (activeParam) params.set("active", activeParam);
    params.set("page", String(targetPage));
    params.set("pageSize", String(pageSize));
    return `/teachers?${params.toString()}`;
  };

  const pageSizeOptions = PAGE_SIZES.map((size) => ({
    value: size,
    label: tp("items", { count: size }),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/teachers/import">{tImport("action")}</Link>
          </Button>
          <Button asChild>
            <Link href="/teachers/new">{t("add")}</Link>
          </Button>
        </div>
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
              name="subjectId"
              defaultValue={subjectId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("subjectsAll")}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.nameUz}
                </option>
              ))}
            </select>
            <select
              name="active"
              defaultValue={activeParam ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("statusAll")}</option>
              <option value="yes">{t("statusActive")}</option>
              <option value="no">{t("statusInactive")}</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="flex-1">
                {t("search")}
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/teachers">{t("clearFilters")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {teachers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("fullName")}</th>
                    <th className="px-4 py-3 font-medium">{t("contact")}</th>
                    <th className="px-4 py-3 font-medium">{t("subjects")}</th>
                    <th className="px-4 py-3 font-medium">{t("homeroom")}</th>
                    <th className="px-4 py-3 font-medium">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/teachers/${teacher.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {teacher.user.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {teacher.user.email ?? teacher.user.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {teacher.subjects.length === 0
                          ? "—"
                          : teacher.subjects
                              .map((subject) => subject.nameUz)
                              .join(", ")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {teacher.homeroomClasses.length === 0
                          ? "—"
                          : teacher.homeroomClasses
                              .map((klass) => klass.name)
                              .join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        {teacher.user.isActive
                          ? t("statusActive")
                          : t("statusInactive")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalTeachers > 0 ? (
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
          <TeacherPageSizeSelect
            value={pageSize}
            label={tp("pageSize")}
            options={pageSizeOptions}
          />
        </nav>
      ) : null}
    </div>
  );
}
