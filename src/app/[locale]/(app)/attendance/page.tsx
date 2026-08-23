import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { redirectNever, requireRole } from "@/lib/auth-guard";
import { classScope, lessonScope, studentScope } from "@/lib/scope";
import { toDate } from "@/lib/academics";
import {
  DATE_TEXT_PATTERN,
  dayOfWeekFromText,
  todayText,
  type AttendanceStatusValue,
} from "@/lib/attendance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AttendanceForm } from "./attendance-form";

/**
 * DAVOMAT — TEZKOR KIRITISH SAHIFASI (5-bosqich)
 * ==============================================
 *
 * Ish tartibi: sana + sinf tanlanadi → o'sha kunning darslari chiqadi →
 * dars tanlanadi → butun sinf bitta ekranda belgilanadi va bir marta
 * saqlanadi.
 *
 * Ota-ona bu sahifada yozmaydi — u jurnalning faqat o'qish uchun
 * ko'rinishiga yo'naltiriladi.
 */

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: {
    classId?: string;
    date?: string;
    lessonId?: string;
    saved?: string;
  };
}) {
  const user = await requireRole("ADMIN", "TEACHER", "PARENT");
  if (user.role === "PARENT") {
    redirectNever("/attendance/journal");
  }

  const t = await getTranslations("attendance");

  const dateParam = searchParams.date?.trim();
  const date =
    dateParam && DATE_TEXT_PATTERN.test(dateParam) ? dateParam : todayText();
  const dayOfWeek = dayOfWeekFromText(date);
  const isSunday = dayOfWeek === 7;

  const classId = searchParams.classId?.trim() || undefined;

  const classes = await db.class.findMany({
    where: classScope(user),
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  // O'qituvchi faqat o'ziga tegishli darslarni ko'radi — lessonScope hal qiladi.
  const lessons = isSunday
    ? []
    : await db.lesson.findMany({
        where: {
          AND: [
            lessonScope(user),
            { dayOfWeek },
            classId ? { classId } : {},
          ],
        },
        orderBy: [{ period: { index: "asc" } }, { startTime: "asc" }],
        select: {
          id: true,
          classId: true,
          room: true,
          class: { select: { name: true } },
          subject: { select: { nameUz: true } },
          period: { select: { index: true, startTime: true, endTime: true } },
        },
      });

  const lessonId = searchParams.lessonId?.trim() || undefined;
  const lesson = lessonId
    ? lessons.find((item) => item.id === lessonId)
    : undefined;

  const students = lesson
    ? await db.student.findMany({
        where: {
          AND: [studentScope(user), { classId: lesson.classId, status: "ACTIVE" }],
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  const existing = lesson
    ? await db.attendance.findMany({
        where: { lessonId: lesson.id, date: toDate(date) },
        select: { studentId: true, status: true },
      })
    : [];

  const initial: Record<string, AttendanceStatusValue> = {};
  for (const row of existing) initial[row.studentId] = row.status;

  // Qaysi darslarda davomat allaqachon kiritilgani ro'yxatda ko'rinadi.
  const savedLessonIds = new Set(
    (
      await db.attendance.findMany({
        where: {
          date: toDate(date),
          lessonId: { in: lessons.map((item) => item.id) },
        },
        select: { lessonId: true },
        distinct: ["lessonId"],
      })
    ).map((row) => row.lessonId)
  );

  const hrefWith = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ date });
    if (classId) params.set("classId", classId);
    Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    return `/attendance?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/attendance/journal">{t("openJournal")}</Link>
        </Button>
      </div>

      {searchParams.saved ? (
        <p className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-700">
          {t("saved")}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("chooseTitle")}</CardTitle>
          <CardDescription>{t("chooseHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-3" method="get">
            <input
              type="date"
              name="date"
              defaultValue={date}
              className={selectClassName}
            />
            <select
              name="classId"
              defaultValue={classId ?? ""}
              className={selectClassName}
            >
              <option value="">{t("allClasses")}</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              {t("apply")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("lessonsTitle")}</CardTitle>
          <CardDescription>{t("lessonsHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isSunday ? (
            <p className="text-sm text-muted-foreground">{t("sunday")}</p>
          ) : lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {lessons.map((item) => {
                const active = item.id === lesson?.id;
                return (
                  <Link
                    key={item.id}
                    href={`${hrefWith({ lessonId: item.id })}#attendance-form`}
                    className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    <span className="font-medium">
                      {item.period ? `${item.period.index}. ` : ""}
                      {item.subject.nameUz}
                    </span>
                    <span
                      className={`ml-2 text-xs ${
                        active ? "opacity-80" : "text-muted-foreground"
                      }`}
                    >
                      {item.class.name}
                      {item.period
                        ? ` · ${item.period.startTime}–${item.period.endTime}`
                        : ""}
                      {savedLessonIds.has(item.id) ? ` · ${t("done")}` : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {lesson ? (
        <Card id="attendance-form" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {lesson.class.name} · {lesson.subject.nameUz}
            </CardTitle>
            <CardDescription>
              {date}
              {lesson.period
                ? ` · ${lesson.period.startTime}–${lesson.period.endTime}`
                : ""}
              {lesson.room ? ` · ${lesson.room}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noStudents")}</p>
            ) : (
              <AttendanceForm
                key={`${lesson.id}-${date}`}
                lessonId={lesson.id}
                date={date}
                students={students.map((student) => ({
                  id: student.id,
                  fullName: `${student.lastName} ${student.firstName}`,
                }))}
                initial={initial}
                cancelHref={hrefWith()}
              />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
