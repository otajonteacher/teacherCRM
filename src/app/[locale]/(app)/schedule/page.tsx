import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { classScope, lessonScope } from "@/lib/scope";
import { DAYS } from "@/lib/lessons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LessonForm } from "./lesson-form";
import { deleteLesson } from "./actions";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: {
    classId?: string;
    teacherId?: string;
    edit?: string;
    error?: string;
  };
}) {
  const user = await requireRole("ADMIN", "TEACHER");
  const t = await getTranslations("schedule");
  const canWrite = user.role === "ADMIN";

  const classId = searchParams.classId?.trim() || undefined;
  const teacherId = searchParams.teacherId?.trim() || undefined;

  const [periods, classes, teachers, subjects] = await Promise.all([
    db.lessonPeriod.findMany({ orderBy: { index: "asc" } }),
    db.class.findMany({
      where: classScope(user),
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.teacher.findMany({
      orderBy: { user: { fullName: "asc" } },
      select: { id: true, user: { select: { fullName: true } } },
    }),
    db.subject.findMany({
      orderBy: { nameUz: "asc" },
      select: { id: true, nameUz: true },
    }),
  ]);

  // O'qituvchi faqat o'z darslarini ko'radi — buni lessonScope hal qiladi.
  const lessons = await db.lesson.findMany({
    where: {
      AND: [
        lessonScope(user),
        classId ? { classId } : {},
        teacherId ? { teacherId } : {},
      ],
    },
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { nameUz: true } },
      teacher: { select: { user: { select: { fullName: true } } } },
      period: { select: { id: true, index: true } },
    },
  });

  const editingId = searchParams.edit?.trim() || undefined;
  const editing = editingId
    ? lessons.find((lesson) => lesson.id === editingId)
    : undefined;

  const classOptions = classes.map((klass) => ({
    id: klass.id,
    label: klass.name,
  }));
  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    label: teacher.user.fullName,
  }));
  const subjectOptions = subjects.map((subject) => ({
    id: subject.id,
    label: subject.nameUz,
  }));
  const periodOptions = periods.map((period) => ({
    id: period.id,
    label: `${period.index}. ${period.startTime}–${period.endTime}`,
  }));

  const cancelHref = classId ? `/schedule?classId=${classId}` : "/schedule";
  const cellLessons = (day: number, periodId: string) =>
    lessons.filter(
      (lesson) => lesson.dayOfWeek === day && lesson.periodId === periodId
    );

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
          <CardTitle className="text-lg">{t("viewBy")}</CardTitle>
          <CardDescription>{t("chooseHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-3" method="get">
            <select
              name="classId"
              defaultValue={classId ?? ""}
              className={selectClassName}
            >
              <option value="">{t("selectClass")}</option>
              {classOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {canWrite ? (
              <select
                name="teacherId"
                defaultValue={teacherId ?? ""}
                className={selectClassName}
              >
                <option value="">{t("selectTeacher")}</option>
                {teacherOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="flex-1">
                {t("apply")}
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/schedule">{t("clearFilters")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {periods.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("noPeriods")}</CardTitle>
            <CardDescription>{t("noPeriodsHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/lesson-periods">{t("noPeriods")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-3 font-medium">{t("timeColumn")}</th>
                    {DAYS.map((day) => (
                      <th key={day} className="px-3 py-3 font-medium">
                        {t(`days.${day}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id} className="border-b align-top last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-medium">{period.index}</p>
                        <p className="text-xs text-muted-foreground">
                          {period.startTime}–{period.endTime}
                        </p>
                      </td>
                      {DAYS.map((day) => {
                        const items = cellLessons(day, period.id);
                        return (
                          <td key={day} className="px-3 py-3">
                            {items.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <div className="space-y-2">
                                {items.map((lesson) => (
                                  <div
                                    key={lesson.id}
                                    className="rounded-md border bg-card px-2 py-1.5"
                                  >
                                    <p className="font-medium">
                                      {lesson.subject.nameUz}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {lesson.class.name} ·{" "}
                                      {lesson.teacher.user.fullName}
                                      {lesson.room ? ` · ${lesson.room}` : ""}
                                    </p>
                                    {canWrite ? (
                                      <div className="mt-1 flex items-center gap-2 text-xs">
                                        <Link
                                          href={`/schedule?${
                                            classId ? `classId=${classId}&` : ""
                                          }edit=${lesson.id}`}
                                          className="text-primary hover:underline"
                                        >
                                          {t("edit")}
                                        </Link>
                                        <form action={deleteLesson}>
                                          <input
                                            type="hidden"
                                            name="id"
                                            value={lesson.id}
                                          />
                                          <button
                                            type="submit"
                                            className="text-destructive hover:underline"
                                          >
                                            {t("delete")}
                                          </button>
                                        </form>
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {canWrite && periods.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editing ? t("editing") : t("formTitle")}
            </CardTitle>
            <CardDescription>{t("formHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noSubjects")}</p>
            ) : (
              <LessonForm
                key={editing?.id ?? "create"}
                mode={editing ? "edit" : "create"}
                classes={classOptions}
                subjects={subjectOptions}
                teachers={teacherOptions}
                periods={periodOptions}
                defaults={{ classId }}
                cancelHref={cancelHref}
                lesson={
                  editing
                    ? {
                        id: editing.id,
                        classId: editing.classId,
                        subjectId: editing.subjectId,
                        teacherId: editing.teacherId,
                        periodId: editing.periodId,
                        dayOfWeek: editing.dayOfWeek,
                        room: editing.room,
                      }
                    : undefined
                }
              />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
