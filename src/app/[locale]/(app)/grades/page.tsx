import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
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
import { VerticalHeader } from "@/components/vertical-header";
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
 * mavjud bo'lmagan endpoint'ga hujum qilinmaydi.
 *
 * ADMIN hamma narsani o'zgartira oladi (bu ham egasining qoidasi), lekin
 * o'zgartirish JOYI bitta: jurnal. Admin uchun bu sahifada jurnalga o'tish
 * havolasi chiqadi — huquq cheklanmaydi, faqat yo'l bittaga keltiriladi.
 *
 * OTA-ONA (TZ 2.1)
 * ----------------
 * Ota-ona bu sahifani KO'RADI. Ilgari sahifa uni /dashboard ga qaytarib
 * yuborardi — TZ 2.1 ga qarshi edi, chunki `rbac.ts` va menyuda /grades
 * ota-onaga ochiq deb yozilgan. Qo'shimcha filtr YOZILMADI va kerak emas:
 *   - `classScope(user)`   — ota-onaga faqat farzandi o'qiydigan sinf;
 *   - `studentScope(user)` — faqat o'z farzandi.
 * Ya'ni doira allaqachon bitta o'quvchi bilan chegaralangan.
 *
 * "O'rin" ustuni ota-onaga KO'RSATILMAYDI: reyting shu sahifada ko'rinadigan
 * o'quvchilar ro'yxati ustida hisoblanadi, ota-onada esa ro'yxat bitta
 * o'quvchidan iborat — natija har doim "1" bo'lib chalg'itadi. Sinf ichidagi
 * haqiqiy o'rin "Reyting" sahifasida chiqadi.
 *
 * IKKI KO'RINISH
 * --------------
 * Bir kunlik:
 *   | O'quvchi | Matematika | Matematika 2 | Ona tili | O'rtacha | O'rin |
 *
 * Bir haftalik — har fan ostida HAFTANING KUNLARI alohida ustun:
 *   |          |        Matematika        |        Ona tili        |
 *   | O'quvchi | 17.08 18.08 ... 22.08 O'rt | 17.08 ... 22.08 O'rt |
 *
 * Avval haftalik ko'rinishda bir fanning butun haftasi BITTA katakchaga
 * jamlanardi. Egasi buni rad etdi: o'zlashtirish ko'rsatkichini ko'rish
 * uchun "qaysi KUNI qanday ball olgan" aniq ko'rinishi kerak. Shuning uchun
 * jadval ikki qatorli sarlavhaga o'tdi (guruh + kunlar).
 *
 * Ustun soni ko'payadi (masalan 5 fan × 7 ustun = 35), shuning uchun
 * sarlavhalar VERTIKAL va jadval gorizontal siljiydi. Vertikal ichki scroll
 * ataylab yo'q — sahifada bitta asosiy scroll bo'ladi (layout qoidasi).
 */

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const levelTextStyle: Record<string, string> = {
  excellent: "text-emerald-700",
  good: "text-sky-700",
  average: "text-amber-700",
  weak: "text-red-700",
};

/**
 * Ism-familiya ustuni.
 *
 * `whitespace-nowrap` — egasining talabi: eng uzun ism qancha joy olsa,
 * ustun shuncha keng bo'ladi. `min-w` YO'Q va `max-w` ham yo'q: agar
 * belgilangan kenglik qo'yilsa uzun familiya ikki qatorga tushib siqilib
 * qoladi. Bu qoida barcha jadvallar uchun bir xil (jurnal, davomat, baholar).
 */
const nameCellClassName =
  "sticky left-0 z-10 whitespace-nowrap bg-background px-3 py-2";
const nameHeaderClassName =
  "sticky left-0 z-10 whitespace-nowrap bg-muted/50 px-3 py-2 text-left align-bottom font-medium";

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
  const isParent = user.role === "PARENT";
  // Ota-onada ro'yxat bitta o'quvchidan iborat — o'rin ma'nosini yo'qotadi.
  const showRank = !isParent;

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
   * hisobotini ko'radi, ota-ona esa faqat farzandi sinfini. Bu xavfsiz,
   * chunki sahifa faqat o'qish uchun. Yozish doirasi (`gradingLessonScope`)
   * ancha tor — ikkisi ataylab bir xil emas.
   */
  const classes = await db.class.findMany({
    where: classScope(user),
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  /**
   * SINF TANLASH MAJBURIY (egasining talabi).
   *
   * Faqat bitta sinfga ruxsati bor foydalanuvchi uchun avtomatik tanlanadi —
   * bu "majburiy" qoidasiga qarshi emas: tanlov baribir bitta, lekin
   * foydalanuvchi ikki marta tugma bosmaydi (avvalgi shikoyat). Bitta
   * farzandi bor ota-ona uchun ham shu yo'l ishlaydi.
   * Boshqa hollarda sinf tanlanmaguncha jadval umuman chizilmaydi.
   */
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
          orderBy: [{ period: { index: "asc" } }, { startTime: "asc" }],
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

  /** Bir kunlik: studentId|lessonId → ball. */
  const dayValues = new Map<string, number>();
  /** Haftalik: studentId|subjectId|sana → ballar (kunda 2 dars bo'lishi mumkin). */
  const weekValues = new Map<string, number[]>();
  /** Umumiy o'rtacha uchun barcha ballar. */
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

    const key = `${grade.studentId}|${grade.subjectId}|${dateToText(grade.date)}`;
    const cell = weekValues.get(key) ?? [];
    cell.push(grade.value);
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

  /** Fan bo'yicha haftalik o'rtacha — o'zlashtirish ko'rsatkichi. */
  const subjectAverage = (
    studentId: string,
    subjectId: string
  ): number | null => {
    const values: number[] = [];
    for (const date of dates) {
      const cell = weekValues.get(`${studentId}|${subjectId}|${date}`) ?? [];
      values.push(...cell);
    }
    return averageOf(values);
  };

  const journalHref = `/journal?${new URLSearchParams({
    date: from,
    type,
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
        {isParent ? t("parentNotice") : t("readOnlyNotice")}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("chooseTitle")}</CardTitle>
          <CardDescription>{t("chooseHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" method="get">
            {/*
              `required` — bo'sh variant bilan forma yuborilmaydi, brauzer
              o'zi "sinfni tanlang" deb ogohlantiradi. Server tomonda ham
              tekshiriladi: sinf tanlanmasa jadval chizilmaydi.
            */}
            <select
              name="classId"
              required
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

            {/* O'rin ustuni ota-onada yo'q — "dastlabki o'rinlar" ham keraksiz. */}
            {showRank ? (
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
            ) : null}

            <Button type="submit" variant="secondary">
              {t("apply")}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("classRequired")} {showRank ? t("topNHint") : null}
          </p>
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
                {selectedClass.name} · {periodLabel} · {t(`type.${type}`)}
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
                  {mode === "day" ? (
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className={nameHeaderClassName}>{t("student")}</th>
                        {dayColumns.map((column) => (
                          <th
                            key={column.id}
                            className="w-16 border-l px-1 py-2 align-bottom font-medium"
                          >
                            <VerticalHeader>{column.label}</VerticalHeader>
                          </th>
                        ))}
                        <th className="w-16 border-l bg-amber-100/70 px-1 py-2 align-bottom font-semibold">
                          <VerticalHeader>{t("averageColumn")}</VerticalHeader>
                        </th>
                        {showRank ? (
                          <th className="w-16 border-l bg-amber-100/70 px-1 py-2 align-bottom font-semibold">
                            <VerticalHeader>{t("rankColumn")}</VerticalHeader>
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                  ) : (
                    /*
                      IKKI QATORLI SARLAVHA:
                        1-qator — fan nomi (kunlar + o'rtacha ustunlari ustida)
                        2-qator — haftaning kunlari va fan o'rtachasi
                      Fan nomi bir necha ustun ustida turgani uchun vertikal
                      emas: joyi keng, gorizontal o'qish osonroq. Tor
                      ustunlar (kunlar, o'rtacha, o'rin) esa vertikal.
                    */
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th rowSpan={2} className={nameHeaderClassName}>
                          {t("student")}
                        </th>
                        {subjectColumns.map((column) => (
                          <th
                            key={column.id}
                            colSpan={dates.length + 1}
                            className="whitespace-nowrap border-l border-b px-2 py-1.5 text-center font-semibold"
                          >
                            {column.name}
                          </th>
                        ))}
                        <th
                          rowSpan={2}
                          className="w-16 border-l bg-amber-100/70 px-1 py-2 align-bottom font-semibold"
                        >
                          <VerticalHeader>{t("averageColumn")}</VerticalHeader>
                        </th>
                        {showRank ? (
                          <th
                            rowSpan={2}
                            className="w-16 border-l bg-amber-100/70 px-1 py-2 align-bottom font-semibold"
                          >
                            <VerticalHeader>{t("rankColumn")}</VerticalHeader>
                          </th>
                        ) : null}
                      </tr>
                      <tr className="border-b bg-muted/50">
                        {subjectColumns.flatMap((column) => [
                          ...dates.map((date) => (
                            <th
                              key={`${column.id}-${date}`}
                              className="w-12 border-l px-1 py-2 align-bottom text-xs font-medium"
                            >
                              <VerticalHeader className="h-16">
                                {shortDateLabel(date)}
                              </VerticalHeader>
                            </th>
                          )),
                          <th
                            key={`${column.id}-avg`}
                            className="w-12 border-l bg-amber-50 px-1 py-2 align-bottom text-xs font-semibold"
                          >
                            <VerticalHeader className="h-16">
                              {t("subjectAverage")}
                            </VerticalHeader>
                          </th>,
                        ])}
                      </tr>
                    </thead>
                  )}

                  <tbody>
                    {students.map((student, index) => {
                      const average = averageById.get(student.id) ?? null;
                      const rank = ranks[student.id];

                      return (
                        <tr key={student.id} className="border-b last:border-b-0">
                          <td className={nameCellClassName}>
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
                            : subjectColumns.flatMap((column) => {
                                const cells = dates.map((date) => {
                                  const values =
                                    weekValues.get(
                                      `${student.id}|${column.id}|${date}`
                                    ) ?? [];

                                  return (
                                    <td
                                      key={`${column.id}-${date}`}
                                      className="border-l px-1 py-2 text-center"
                                    >
                                      {values.length === 0 ? (
                                        <span className="text-muted-foreground">
                                          —
                                        </span>
                                      ) : (
                                        /*
                                          Bir kunda bir fandan ikki dars
                                          bo'lsa ikki ball chiqadi — ikkisi
                                          ham ko'rsatiladi, yashirilmaydi.
                                        */
                                        <span className="flex flex-wrap justify-center gap-1">
                                          {values.map((value, position) => (
                                            <span
                                              key={`${date}-${position}`}
                                              className={`font-medium ${
                                                levelTextStyle[
                                                  gradeLevelKey(value)
                                                ] ?? ""
                                              }`}
                                            >
                                              {value}
                                            </span>
                                          ))}
                                        </span>
                                      )}
                                    </td>
                                  );
                                });

                                const subjectMean = subjectAverage(
                                  student.id,
                                  column.id
                                );

                                return [
                                  ...cells,
                                  <td
                                    key={`${column.id}-avg`}
                                    className="border-l bg-amber-50 px-1 py-2 text-center text-xs font-semibold"
                                  >
                                    {subjectMean === null
                                      ? "—"
                                      : subjectMean.toFixed(1)}
                                  </td>,
                                ];
                              })}

                          <td className="border-l bg-amber-100/70 px-2 py-2 text-center font-semibold">
                            {average === null ? "—" : average.toFixed(1)}
                          </td>
                          {showRank ? (
                            <td className="border-l bg-amber-100/70 px-2 py-2 text-center font-semibold">
                              {rank === undefined ? "—" : rank}
                            </td>
                          ) : null}
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
