import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LessonPeriodForm } from "./lesson-period-form";
import { deleteLessonPeriod } from "./actions";

export default async function LessonPeriodsPage({
  searchParams,
}: {
  searchParams: { edit?: string; error?: string };
}) {
  await requireAdmin();
  const t = await getTranslations("lessonPeriods");

  const periods = await db.lessonPeriod.findMany({
    orderBy: { index: "asc" },
    include: { _count: { select: { lessons: true } } },
  });

  const editId = searchParams.edit?.trim() || undefined;
  const editing = editId ? periods.find((item) => item.id === editId) : undefined;
  const nextIndex =
    periods.reduce((max, period) => Math.max(max, period.index), 0) + 1;

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
          <LessonPeriodForm
            key={editing?.id ?? "create"}
            mode={editing ? "edit" : "create"}
            nextIndex={nextIndex}
            period={
              editing
                ? {
                    id: editing.id,
                    index: editing.index,
                    label: editing.label,
                    startTime: editing.startTime,
                    endTime: editing.endTime,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {periods.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("index")}</th>
                    <th className="px-4 py-3 font-medium">{t("time")}</th>
                    <th className="px-4 py-3 font-medium">{t("label")}</th>
                    <th className="px-4 py-3 font-medium">{t("lessonsCount")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{period.index}</td>
                      <td className="px-4 py-3">
                        {period.startTime}–{period.endTime}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {period.label ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {period._count.lessons}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline">
                            <Link href={`/lesson-periods?edit=${period.id}`}>
                              {t("edit")}
                            </Link>
                          </Button>
                          {period._count.lessons === 0 ? (
                            <form action={deleteLessonPeriod}>
                              <input type="hidden" name="id" value={period.id} />
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
