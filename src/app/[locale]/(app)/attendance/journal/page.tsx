import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { attendanceScope, classScope, studentScope } from "@/lib/scope";
import { toDate } from "@/lib/academics";
import {
  DATE_TEXT_PATTERN,
  addDaysText,
  attendancePercent,
  countStatuses,
  dateToText,
  emptyCounts,
  missedLessons,
  todayText,
  totalMarks,
  weekDaysText,
  weekStartText,
  worstStatus,
  type AttendanceStatusValue,
  type StatusCounts,
} from "@/lib/attendance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * DAVOMAT JURNALI (5-bosqich)
 * ===========================
 *
 * Haftalik matritsa: qatorlar — o'quvchilar, ustunlar — dushanbadan
 * shanbagacha kunlar. Katakda o'sha kunning eng "og'ir" holati ko'rinadi,
 * o'ngda esa o'quvchining haftalik foizi va o'tkazib yuborgan darslari.
 *
 * Bu sahifa FAQAT O'QISH uchun. Ota-ona ham shu yerga kiradi, lekin
 * `attendanceScope`/`studentScope` tufayli faqat o'z farzandini ko'radi.
 */

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const statusStyle: Record<AttendanceStatusValue, string> = {
  PRESENT: "bg-emerald-600/10 text-emerald-700",
  ABSENT: "bg-destructive/10 text-destructive",
  LATE: "bg-amber-500/10 text-amber-700",
  EXCUSED: "bg-sky-600/10 text-sky-700",
};

export default async function AttendanceJournalPage({
  searchParams,
}: {
  searchParams: { classId?: string; from?: string };
}) {
  const user = await requireRole("ADMIN", "TEACHER", "PARENT");
  const t = await getTranslations("attendance");
  const canEnter = user.role === "ADMIN" || user.role === "TEACHER";

  const classes = await db.class.findMany({
    where: classScope(user),
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const requestedClassId = searchParams.classId?.trim();
  const classId =
    classes.find((klass) => klass.id === requestedClassId)?.id ??
    classes[0]?.id;

  const fromParam = searchParams.from?.trim();
  const weekStart = weekStartText(
    fromParam && DATE_TEXT_PATTERN.test(fromParam) ? fromParam : todayText()
  );
  const days = weekDaysText(weekStart);
  const weekEnd = days[days.length - 1];

  const students = classId
    ? await db.student.findMany({
        where: { AND: [studentScope(user), { classId }] },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  const records = classId
    ? await db.attendance.findMany({
        where: {
          AND: [
            attendanceScope(user),
            { student: { classId } },
            { date: { gte: toDate(weekStart), lte: toDate(weekEnd) } },
          ],
        },
        select: { studentId: true, date: true, status: true },
      })
    : [];

  // Kun bo'yicha va o'quvchi bo'yicha guruhlash.
  const byStudentDay = new Map<string, AttendanceStatusValue[]>();
  const byStudent = new Map<string, AttendanceStatusValue[]>();

  for (const row of records) {
    const dayKey = `${row.studentId}|${dateToText(row.date)}`;
    byStudentDay.set(dayKey, [...(byStudentDay.get(dayKey) ?? []), row.status]);
    byStudent.set(row.studentId, [
      ...(byStudent.get(row.studentId) ?? []),
      row.status,
    ]);
  }

  const studentRows = students.map((student) => {
    const counts = countStatuses(byStudent.get(student.id) ?? []);
    return {
      id: student.id,
      fullName: `${student.lastName} ${student.firstName}`,
      counts,
      percent: attendancePercent(counts),
      missed: missedLessons(counts),
    };
  });

  // Sinf bo'yicha umumiy ko'rsatkich.
  const classCounts: StatusCounts = emptyCounts();
  for (const row of studentRows) {
    classCounts.PRESENT += row.counts.PRESENT;
    classCounts.ABSENT += row.counts.ABSENT;
    classCounts.LATE += row.counts.LATE;
    classCounts.EXCUSED += row.counts.EXCUSED;
  }
  const classPercent = attendancePercent(classCounts);

  const topAbsentees = studentRows
    .filter((row) => row.missed > 0)
    .sort((a, b) => b.missed - a.missed)
    .slice(0, 5);

  const hrefWith = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ from: weekStart });
    if (classId) params.set("classId", classId);
    Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    return `/attendance/journal?${params.toString()}`;
  };

  const percentText = (value: number | null) =>
    value === null ? "—" : `${value}%`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("journalTitle")}
          </h1>
          <p className="text-muted-foreground">{t("journalSubtitle")}</p>
        </div>
        {canEnter ? (
          <Button asChild variant="outline">
            <Link href="/attendance">{t("backToEntry")}</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("week")}</CardTitle>
          <CardDescription>
            {weekStart} — {weekEnd}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="grid gap-3 sm:grid-cols-3" method="get">
            <input type="hidden" name="from" value={weekStart} />
            <select
              name="classId"
              defaultValue={classId ?? ""}
              className={selectClassName}
            >
              {classes.length === 0 ? (
                <option value="">{t("noClasses")}</option>
              ) : null}
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

          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={hrefWith({ from: addDaysText(weekStart, -7) })}>
                {t("prevWeek")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={hrefWith({ from: addDaysText(weekStart, 7) })}>
                {t("nextWeek")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {classId === undefined ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{t("noClasses")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("classPercent")}</CardDescription>
                <CardTitle className="text-2xl">
                  {percentText(classPercent)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("totalMarks")}</CardDescription>
                <CardTitle className="text-2xl">
                  {totalMarks(classCounts)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t("missed")}</CardDescription>
                <CardTitle className="text-2xl">
                  {missedLessons(classCounts)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-3 font-medium">{t("student")}</th>
                      {days.map((day, index) => (
                        <th
                          key={day}
                          className="px-2 py-3 text-center font-medium"
                        >
                          <span className="block">{t(`days.${index + 1}`)}</span>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {day.slice(5)}
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center font-medium">
                        {t("percent")}
                      </th>
                      <th className="px-3 py-3 text-center font-medium">
                        {t("missed")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={days.length + 3}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          {t("noStudents")}
                        </td>
                      </tr>
                    ) : (
                      studentRows.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">
                            {row.fullName}
                          </td>
                          {days.map((day) => {
                            const status = worstStatus(
                              byStudentDay.get(`${row.id}|${day}`) ?? []
                            );
                            return (
                              <td key={day} className="px-2 py-2 text-center">
                                {status === null ? (
                                  <span className="text-muted-foreground">·</span>
                                ) : (
                                  <span
                                    title={t(`status.${status}`)}
                                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs font-medium ${statusStyle[status]}`}
                                  >
                                    {t(`statusShort.${status}`)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center">
                            {percentText(row.percent)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {row.missed}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("topAbsentees")}</CardTitle>
              <CardDescription>{t("topAbsenteesHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {topAbsentees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noAbsentees")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {topAbsentees.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{row.fullName}</span>
                      <span className="text-muted-foreground">
                        {t("missedValue", { count: row.missed })} ·{" "}
                        {percentText(row.percent)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
