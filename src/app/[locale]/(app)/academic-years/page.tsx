import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { formatDateInput } from "@/lib/academics";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcademicYearForm } from "./academic-year-form";
import { deleteAcademicYear } from "./actions";

export default async function AcademicYearsPage({
  searchParams,
}: {
  searchParams: { edit?: string; error?: string };
}) {
  await requireAdmin();
  const t = await getTranslations("academicYears");

  const years = await db.academicYear.findMany({
    orderBy: { startDate: "desc" },
    include: {
      quarters: { orderBy: { name: "asc" } },
      _count: { select: { classes: true } },
    },
  });

  const editId = searchParams.edit?.trim() || undefined;
  const editingRow = editId ? years.find((year) => year.id === editId) : undefined;
  const editing = editingRow
    ? {
        id: editingRow.id,
        name: editingRow.name,
        startDate: formatDateInput(editingRow.startDate),
        endDate: formatDateInput(editingRow.endDate),
        isCurrent: editingRow.isCurrent,
        quarters: editingRow.quarters.map((quarter) => ({
          name: quarter.name,
          startDate: formatDateInput(quarter.startDate),
          endDate: formatDateInput(quarter.endDate),
        })),
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {searchParams.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t("deleteBlocked")}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {editing ? t("editing") : t("formTitle")}
          </CardTitle>
          <CardDescription>{t("formHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicYearForm
            key={editing?.id ?? "create"}
            mode={editing ? "edit" : "create"}
            year={editing}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {years.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("name")}</th>
                    <th className="px-4 py-3 font-medium">{t("period")}</th>
                    <th className="px-4 py-3 font-medium">{t("quarters")}</th>
                    <th className="px-4 py-3 font-medium">{t("classesCount")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((year) => (
                    <tr key={year.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {year.name}
                        {year.isCurrent ? (
                          <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                            {t("current")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateInput(year.startDate)} — {formatDateInput(year.endDate)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {year.quarters.length === 0
                          ? "—"
                          : year.quarters
                              .map((quarter) => `${quarter.name}`)
                              .join(", ")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {year._count.classes}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline">
                            <Link href={`/academic-years?edit=${year.id}`}>{t("edit")}</Link>
                          </Button>
                          {year._count.classes === 0 ? (
                            <form action={deleteAcademicYear}>
                              <input type="hidden" name="id" value={year.id} />
                              <Button type="submit" variant="outline">
                                {t("delete")}
                              </Button>
                            </form>
                          ) : null}
                        </div>
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
