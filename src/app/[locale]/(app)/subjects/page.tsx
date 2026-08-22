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
import { SubjectForm } from "./subject-form";
import { deleteSubject } from "./actions";

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: { edit?: string; error?: string };
}) {
  await requireAdmin();
  const t = await getTranslations("subjects");

  const subjects = await db.subject.findMany({
    orderBy: { nameUz: "asc" },
    include: {
      _count: { select: { lessons: true, teachers: true, grades: true, tests: true } },
    },
  });

  const editId = searchParams.edit?.trim() || undefined;
  const editing = editId ? subjects.find((item) => item.id === editId) : undefined;

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
          <SubjectForm
            key={editing?.id ?? "create"}
            mode={editing ? "edit" : "create"}
            subject={
              editing
                ? {
                    id: editing.id,
                    nameUz: editing.nameUz,
                    nameRu: editing.nameRu,
                    nameEn: editing.nameEn,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {subjects.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("nameUz")}</th>
                    <th className="px-4 py-3 font-medium">{t("nameRu")}</th>
                    <th className="px-4 py-3 font-medium">{t("nameEn")}</th>
                    <th className="px-4 py-3 font-medium">{t("usage")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => {
                    const inUse =
                      subject._count.lessons +
                        subject._count.teachers +
                        subject._count.grades +
                        subject._count.tests >
                      0;
                    return (
                      <tr key={subject.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{subject.nameUz}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {subject.nameRu ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {subject.nameEn ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t("usageValue", {
                            lessons: subject._count.lessons,
                            teachers: subject._count.teachers,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline">
                              <Link href={`/subjects?edit=${subject.id}`}>{t("edit")}</Link>
                            </Button>
                            {inUse ? null : (
                              <form action={deleteSubject}>
                                <input type="hidden" name="id" value={subject.id} />
                                <Button type="submit" variant="outline">
                                  {t("delete")}
                                </Button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
