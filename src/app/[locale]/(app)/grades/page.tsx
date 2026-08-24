import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { redirectNever, requireRole } from "@/lib/auth-guard";
import { classScope, studentScope } from "@/lib/scope";
import { toDate } from "@/lib/academics";
import {
  DATE_TEXT_PATTERN,
  dateToText,
  dayOfWeekFromText,
  todayText,
  weekDaysText,
  weekStartText,
} from "@/lib/attendance";
import {
  GRADE_TYPES,
  averageOf,
  gradeLevelKey,
  isGradeType,
  shortDateLabel,
  type GradeTypeValue,
} from "@/lib/grades";
import { buildLessonColumns, parseTopN, rankByAverage } from "@/lib/journal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * BAHOLAR — O'ZLASHTIRISH HISOBOTI (FAQAT KO'RISH)
 * ================================================
 *
 * EGASINING QAT'IY TALABI: bu sahifada baho QO'YILMAYDI. Hech kim, hech
 * qanday rol bilan. Baho faqat fan o'qituvchisi tomonidan "Jurnal"
 * sahifasida kiritiladi.
 *
 * Shuning uchun bu fayl ATAYLAB hech qanday forma yoki Server Action
 * ishlatmaydi — sahifada yozish yo'li umuman yo'q. Bu eng ishonchli himoya:
 * mavjud bo'lmagan endpoint'ga hujum qilinmaydi. Avvalgi versiyadagi
 * `actions.ts` va `grades-form.tsx` shuning uchun o'chirildi.
 *
 * ADMIN hamma narsani o'zgartira oladi (bu ham egasining qoidasi), lekin
 * o'zgartirish JOYI bitta: jurnal. Admin uchun bu sahifada jurnalga o'tish
 * havolasi chiqadi — huquq cheklanmaydi, faqat yo'l bittaga keltiriladi.
 * Bir amal ikki joyda bajarilmasa, audit ham ishonchli bo'ladi.
 *
 * IKKI KO'RINISH:
 *   Bir kunlik   — ustunlar: shu kunning darslari (jurnal bilan bir xil nom)
 *   Bir haftalik — ustunlar: fanlar; katakchada kunlik baholar va fan
 *                  bo'yicha o'rtacha. O'zlashtirish ko'rsatkichi uchun aynan
 *                  shu ko'rinish kerak.
 *
 * Oxirgi ikki ustun — o'rtacha ball va O'RIN. O'rin jurnaldagi qoida bilan
 * bir xil hisoblanadi (`rankByAverage`): teng ball — teng o'rin, "dastlabki
 * N o'rin" sozlanadi.
 */

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const levelTextStyle: Record<string, string> = {
  excellent: "text-emerald-700",
  good: "text-sky-700",
  average: "text-amber-700",
  weak: "text-red-700",
};

export default async function GradesPage({
  searchParams,
}: {
  searchParams: {
    classId?: string;
    from?: string;
    mode?: string;
    type?: string;
    topN?: string;
  };
}) {
  const user = await requireRole("ADMIN", "TEACHER", "PARENT");
  if (user.role === "PARENT") {
    // Ota-ona uchun alohida ko'rinish keyin tayyorlanadi.
    redirectNever("/dashboard");
  }

  const t = await getTranslations("grades");

  // searchParams ishonchsiz manba — hammasi tekshiriladi.
  const fromParam = searchParams.from?.trim();
  const from =
    fromParam && DATE_TEXT_PATTERN.test(fromParam) ? fromParam : todayText();
  const mode = searchParams.mode === "week" ? "week" : "day";
  const typeParam = searchParams.type?.trim();
  const type: GradeTypeValue = isGradeType(typeParam)
    ? (typeParam as GradeTypeValue)
    : "DAILY";
  const topN = parseTopN(searchParams.topN);
  const classId = searchParams.classId?.trim() || undefined;

  /**
   * Hisobot doirasi — `classScope`, ya'ni sinf rahbari o'z sinfining to'liq
   * hisobotini ko'radi. Bu xavfsiz, chunki sahifa faqat o'qish uchun. Yozish
   * doirasi (`gradingLessonScope`) ancha tor — ikkisi ataylab bir xil emas.
   */
  const classes = await db.class.findMany({
    where: classScope(user),
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const selectedClass =
    (classId ? classes.find((klass) => klass.id === classId) : undefined) ??
    (classes.length === 1 ? classes[0] : undefined);

  // Haftalik ko'rinish: dushanbadan shanbagacha (yakshanba dars kuni emas).
  const dates = mode === "week" ? weekDaysText(weekStartText(from)) : [from];

  // Bir kunlik ustunlar jurnal bilan BIR XIL nomlanadi ("Matematika 2").
  const dayLessons =
    selectedClass && mode === "day"
      ? await db.lesson.findMany({
          where: {
            classId: selectedClass.id,
            dayOfWeek: dayOfWeekFromText(from),
          },
          orderBy: [{ startTime: "asc" }],
          select: {
            id: true,
            subjectId: true,
            subject: { select: { nameUz: true } },
          },
        })
      : [];

  const dayColumns = buildLessonColumns(
    dayLessons.map((lesson) => ({
      id: lesson.id,
      subjectId: lesson.subjectId,
      subjectName: lesson.subject.nameUz,
    }))
  );

  // Haftalik ustunlar — sinfda o'tiladigan barcha fanlar.
  const weekLessons =
    selectedClass && mode === "week"
      ? await db.lesson.findMany({
          where: { classId: selectedClass.id },
          orderBy: { subject: { nameUz: "asc" } },
          select: { subjectId: true, subject: { select: { nameUz: true } } },
        })
      : [];

  const subjectColumns = Array.from(
    new Map(
      weekLessons.map((lesson) => [
        lesson.subjectId,
        { id: lesson.subjectId, name: lesson.subject.nameUz },
      ])
    ).values()
  );

  const columnCount =
    mode === "day" ? dayColumns.length : subjectColumns.length;

  const students =
    selectedClass && columnCount > 0
      ? await db.student.findMany({
          where: {
            AND: [
              studentScope(user),
              { classId: selectedClass.id, status: "ACTIVE" },
            ],
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

  const studentIds = students.map((student) => student.id);

  // Baholar — bitta so'rov (N+1 yo'q).
  const grades =
    studentIds.length > 0
      ? await db.grade.findMany({
          where: {
            studentId: { in: studentIds },
            type,
            date: { in: dates.map((value) => toDate(value)) },
          },
          select: {
            studentId: true,
            subjectId: true,
            lessonId: true,
            date: true,
            value: true,
          },
        })
      : [];

  const dayValues = new Map<string, number>();
  const weekValues = new Map<string, Array<{ date: string; value: number }>>();
  const allValues = new Map<string, number[]>();

  for (const grade of grades) {
    const list = allValues.get(grade.studentId) ?? [];
    list.push(grade.value);
    allValues.set(grade.studentId, list);

    if (mode === "day") {
      if (grade.lessonId) {
        dayValues.set(`${grade.studentId}|${grade.lessonId}`, grade.value);
        continue;
      }
      // `lessonId` bo'sh (eski yozuv) — fan bo'yicha bo'sh ustunga joylanadi.
      const candidate = dayColumns.find(
        (column) =>
          column.subjectId === grade.subjectId &&
          dayValues.get(`${grade.studentId}|${column.id}`) === undefined
      );
      if (candidate) {
        dayValues.set(`${grade.studentId}|${candidate.id}`, grade.value);
      }
      continue;
    }

    const key = `${grade.studentId}|${grade.subjectId}`;
    const cell = weekValues.get(key) ?? [];
    cell.push({ date: dateToText(grade.date), value: grade.value });
    weekValues.set(key, cell);
  }

  const averages = students.map((student) => ({
    id: student.id,
    average: averageOf(allValues.get(student.id) ?? []),
  }));
  const averageById = new Map(
    averages.map((row) => [row.id, row.average] as const)
  );
  const ranks = rankByAverage(averages, topN);

  const journalHref = `/journal?${new URLSearchParams({
    date: from,
    ...(selectedClass ? { classId: selectedClass.id } : {}),
  }).toString()}`;

  const periodLabel =
    mode === "week"
      ? `${shortDateLabel(dates[0])} — ${shortDateLabel(dates[dates.length - 1])}`
      : shortDateLabel(from);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <p className="rounded-md border border-sky-600/40 bg-sky-600/10 px-4 py-3 text-sm text-sky-800">
        {t("readOnlyNotice")}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("chooseTitle")}</CardTitle>
          <CardDescription>{t("chooseHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" method="get">
            <select
              name="classId"
              defaultValue={selectedClass?.id ?? ""}
              className={selectClassName}
              aria-label={t("chooseClass")}
            >
              <option value="">{t("chooseClass")}</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              name="from"
              defaultValue={from}
              className={selectClassName}
              aria-label={t("dateLabel")}
            />

            <select
              name="mode"
              defaultValue={mode}
              className={selectClassName}
              aria-label={t("modeLabel")}
            >
              <option value="day">{t("modeDay")}</option>
              <option value="week">{t("modeWeek")}</option>
            </select>

            <select
              name="type"
              defaultValue={type}
              className={selectClassName}
              aria-label={t("typeLabel")}
            >
              {GRADE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`type.${value}`)}
                </option>
              ))}
            </select>

            <input
              type="number"
              name="topN"
              min={1}
              step={1}
              defaultValue={topN ?? ""}
              placeholder={t("topN")}
              className={selectClassName}
              aria-label={t("topN")}
            />

            <Button type="submit" variant="secondary">
              {t("apply")}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{t("topNHint")}</p>
        </CardContent>
      </Card>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("noClasses")}</p>
          </CardContent>
        </Card>
      ) : !selectedClass ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("needClass")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {selectedClass.name} · {periodLabel}
              </CardTitle>
              <CardDescription>
                {mode === "week" ? t("weekHint") : t("dayHint")}
              </CardDescription>
            </div>
            {user.role === "ADMIN" ? (
              <Button asChild variant="outline">
                <Link href={journalHref}>{t("editInJournal")}</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {columnCount === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noStudents")}</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="sticky left-0 z-10 min-w-[200px] bg-muted/50 px-3 py-2 text-left font-medium">
                        {t("student")}
                      </th>
                      {mode === "day"
                        ? dayColumns.map((column) => (
                            <th
                              key={column.id}
                              className="border-l px-2 py-2 text-center font-medium"
                            >
                              {column.label}
                            </th>
                          ))
                        : subjectColumns.map((column) => (
                            <th
                              key={column.id}
                              className="border-l px-2 py-2 text-center font-medium"
                            >
                              {column.name}
                            </th>
                          ))}
                      <th className="border-l bg-amber-100/70 px-2 py-2 text-center font-semibold">
                        {t("averageColumn")}
                      </th>
                      <th className="border-l bg-amber-100/70 px-2 py-2 text-center font-semibold">
                        {t("rankColumn")}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map((student, index) => {
                      const average = averageById.get(student.id) ?? null;
                      const rank = ranks[student.id];

                      return (
                        <tr key={student.id} className="border-b last:border-b-0">
                          <td className="sticky left-0 z-10 bg-background px-3 py-2">
                            <span className="text-muted-foreground">
                              {index + 1}.
                            </span>{" "}
                            <span className="font-medium">
                              {student.lastName} {student.firstName}
                            </span>
                          </td>

                          {mode === "day"
                            ? dayColumns.map((column) => {
                                const value = dayValues.get(
                                  `${student.id}|${column.id}`
                                );
                                return (
                                  <td
                                    key={column.id}
                                    className={`border-l px-2 py-2 text-center font-medium ${
                                      value === undefined
                                        ? "text-muted-foreground"
                                        : levelTextStyle[
                                            gradeLevelKey(value)
                                          ] ?? ""
                                    }`}
                                  >
                                    {value ?? "—"}
                                  </td>
                                );
                              })
                            : subjectColumns.map((column) => {
                                const cell =
                                  weekValues.get(`${student.id}|${column.id}`) ??
                                  [];
                                const sorted = [...cell].sort((left, right) =>
                                  left.date.localeCompare(right.date)
                                );
                                const subjectAverage = averageOf(
                                  sorted.map((row) => row.value)
                                );

                                return (
                                  <td
                                    key={column.id}
                                    className="border-l px-2 py-2 text-center"
                                  >
                                    {sorted.length === 0 ? (
                                      <span className="text-muted-foreground">
                                        —
                                      </span>
                                    ) : (
                                      <>
                                        {/*
                                          Haftada bir fandan bir necha baho
                                          bo'ladi. 6 kunni 6 ta ustunga
                                          yoyish jadvalni juda kengaytirib
                                          yuboradi — shuning uchun bir
                                          katakchada ixcham ro'yxat va
                                          ostida fan o'rtachasi ko'rsatiladi.
                                        */}
                                        <div className="flex flex-wrap justify-center gap-1">
                                          {sorted.map((row) => (
                                            <span
                                              key={`${row.date}-${row.value}`}
                                              title={shortDateLabel(row.date)}
                                              className={`rounded px-1 text-xs font-medium ${
                                                levelTextStyle[
                                                  gradeLevelKey(row.value)
                                                ] ?? ""
                                              }`}
                                            >
                                              {row.value}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="mt-0.5 text-xs font-semibold">
                                          {subjectAverage === null
                                            ? "—"
                                            : subjectAverage.toFixed(1)}
                                        </div>
                                      </>
                                    )}
                                  </td>
                                );
                              })}

                          <td className="border-l bg-amber-100/70 px-2 py-2 text-center font-semibold">
                            {average === null ? "—" : average.toFixed(1)}
                          </td>
                          <td className="border-l bg-amber-100/70 px-2 py-2 text-center font-semibold">
                            {rank === undefined ? "—" : rank}
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
      )}
    </div>
  );
}
