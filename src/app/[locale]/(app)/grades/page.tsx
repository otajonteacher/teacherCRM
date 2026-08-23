import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { redirectNever, requireRole } from "@/lib/auth-guard";
import { classScope, gradingLessonScope, studentScope } from "@/lib/scope";
import { toDate } from "@/lib/academics";
import {
  DATE_TEXT_PATTERN,
  GRADE_TYPES,
  dayOfWeekFromText,
  isGradeType,
  todayText,
  type GradeTypeValue,
} from "@/lib/grades";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GradesForm } from "./grades-form";

/**
 * BAHOLAR — TEZKOR KIRITISH SAHIFASI (6-bosqich)
 * ==============================================
 *
 * Ish tartibi: sana + baho turi + sinf tanlanadi → o'sha kunning darslari
 * chiqadi → dars tanlanadi → butun sinf bitta ekranda baholanadi va bir
 * marta saqlanadi.
 *
 * MUHIM FARQ: dars ro'yxati `gradingLessonScope` bilan olinadi, ya'ni
 * o'qituvchi FAQAT O'ZI DARS BERADIGAN darslarni ko'radi. Sinf rahbari
 * bo'lgani uchun boshqa fan bu ro'yxatga tushmaydi (davomatdan farqli).
 *
 * Ota-ona bu sahifada yozmaydi — u boshqarish paneliga yo'naltiriladi.
 * (Ota-ona uchun baholarni ko'rish ko'rinishi keyingi ishda qo'shiladi.)
 */

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default async function GradesPage({
  searchParams,
}: {
  searchParams: {
    classId?: string;
    date?: string;
    lessonId?: string;
    type?: string;
    saved?: string;
  };
}) {
  const user = await requireRole("ADMIN", "TEACHER", "PARENT");
  if (user.role === "PARENT") {
    redirectNever("/dashboard");
  }

  const t = await getTranslations("grades");

  const dateParam = searchParams.date?.trim();
  const date =
    dateParam && DATE_TEXT_PATTERN.test(dateParam) ? dateParam : todayText();
  const dayOfWeek = dayOfWeekFromText(date);
  const isSunday = dayOfWeek === 7;

  // searchParams ishonchsiz manba — enum bo'yicha tekshiriladi.
  const typeParam = searchParams.type?.trim();
  const type: GradeTypeValue = isGradeType(typeParam) ? typeParam : "DAILY";

  const classId = searchParams.classId?.trim() || undefined;

  const classes = await db.class.findMany({
    where: classScope(user),
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  // Faqat o'qituvchining O'Z darslari — gradingLessonScope hal qiladi.
  const lessons = isSunday
    ? []
    : await db.lesson.findMany({
        where: {
          AND: [
            gradingLessonScope(user),
            { dayOfWeek },
            classId ? { classId } : {},
          ],
        },
        orderBy: [{ period: { index: "asc" } }, { startTime: "asc" }],
        select: {
          id: true,
          classId: true,
          subjectId: true,
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
          AND: [
            studentScope(user),
            { classId: lesson.classId, status: "ACTIVE" },
          ],
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  const existing = lesson
    ? await db.grade.findMany({
        where: {
          subjectId: lesson.subjectId,
          type,
          date: toDate(date),
          student: { classId: lesson.classId },
        },
        select: { studentId: true, value: true },
      })
    : [];

  const initial: Record<string, number> = {};
  for (const row of existing) initial[row.studentId] = row.value;

  // Qaysi darslarga baho allaqachon kiritilgani ro'yxatda ko'rinadi.
  const gradedSubjectIds = new Set(
    lessons.length === 0
      ? []
      : (
          await db.grade.findMany({
            where: {
              type,
              date: toDate(date),
              subjectId: { in: lessons.map((item) => item.subjectId) },
            },
            select: { subjectId: true },
            distinct: ["subjectId"],
          })
        ).map((row) => row.subjectId)
  );

  const hrefWith = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ date, type });
    if (classId) params.set("classId", classId);
    Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    return `/grades?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
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
          <form className="grid gap-3 sm:grid-cols-4" method="get">
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
            <select
              name="type"
              defaultValue={type}
              className={selectClassName}
            >
              {GRADE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`type.${value}`)}
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
                    href={`${hrefWith({ lessonId: item.id })}#grades-form`}
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
                      {gradedSubjectIds.has(item.subjectId)
                        ? ` · ${t("done")}`
                        : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {lesson ? (
        <Card id="grades-form" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {lesson.class.name} · {lesson.subject.nameUz}
            </CardTitle>
            <CardDescription>
              {date} · {t(`type.${type}`)}
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
              <GradesForm
                key={`${lesson.id}-${date}-${type}`}
                lessonId={lesson.id}
                date={date}
                type={type}
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
