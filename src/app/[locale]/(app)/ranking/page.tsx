import { getTranslations } from "next-intl/server";
import { Award, Medal, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { classScope, studentScope } from "@/lib/scope";
import { attendancePercent } from "@/lib/attendance";
import {
  CHART_LIMIT_DEFAULT,
  DEFAULT_RANKING_SETTINGS,
  RANKING_SETTING_ID,
  averageOf,
  colorAt,
  finalScore,
  isRankingScope,
  parseTopN,
  quarterColor,
  rankByScore,
  type RankingSettings,
} from "@/lib/ranking";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerticalHeader } from "@/components/vertical-header";
import { BarChart, ChartLegend, GroupedBarChart } from "./ranking-charts";
import { RankingSettingsForm } from "./settings-form";

/**
 * REYTING — CHORAK BO'YICHA YIG'MA KO'RSATKICH
 * ===========================================
 *
 * Modullarning taqsimoti:
 *   Jurnal  — kunlik KIRITISH joyi
 *   Baholar — kunlik/haftalik o'zlashtirish hisoboti
 *   Reyting — CHORAK bo'yicha yakuniy o'rin va o'sish dinamikasi
 *
 * Bu sahifa hech narsa YOZMAYDI (yagona istisno — administratorning formula
 * sozlamalari). Baho jurnalda qo'yiladi, jarima o'z bo'limida, test o'z
 * modulida. Reyting faqat hisoblaydi.
 *
 * JADVAL USTUNLARI TARTIBI:
 *   O'quvchi | Sinf | <har bir fan o'rtachasi> | Umumiy o'rtacha |
 *   Baho soni | Davomat % | Jarima ball | Test o'rtachasi |
 *   Yakuniy ball | O'rin
 *
 * "Har bir fan o'rtachasi" ustunlari ATAYLAB dinamik: faqat shu chorakda
 * baho qo'yilgan fanlar chiqadi. Sabab — bo'sh ustun jadvalni kengaytiradi,
 * lekin hech qanday ma'lumot bermaydi. Shuning uchun "Matematika o'rtacha"
 * ustuni faqat matematikadan baho bo'lsa paydo bo'ladi.
 *
 * O'rin ustuni ENG OXIRIDA turadi — o'qish tartibi "kim, nima, natijada
 * nechanchi" bo'lishi kerak. 1-2-3 o'rinlar uch xil belgi bilan ajratiladi.
 *
 * XAVFSIZLIK — ATAYLAB QILINGAN ASIMMETRIYA:
 * Sinflar `classScope` bilan cheklanadi. Lekin sinf ichidagi o'quvchilar
 * `studentScope` bilan TORAYTIRILMAYDI — chunki o'rinni hisoblash uchun
 * butun sinf kerak: yarim sinf bo'yicha "3-o'rin" degan raqam yolg'on
 * bo'lardi.
 *
 * Buning o'rniga OTA-ONA uchun faqat o'z farzandining QATORI chiziladi:
 * o'rin butun sinf bo'yicha hisoblanadi, lekin boshqa bolalarning ismi,
 * bahosi va davomati klientga umuman yuborilmaydi. Diagrammalarda ham
 * ota-onaga ismlar ko'rsatilmaydi — unga faqat sinf o'rtachalari ko'rinadi.
 */

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/**
 * Dastlabki uch o'rin belgisi. Uchta AR MAXSUS belgi ishlatilgan:
 * kubok (1), medal (2), nishon (3) — faqat rang bilan farqlash yetarli
 * emas, rangni ajratmaydigan foydalanuvchilar ham shaklidan tushunadi.
 *
 * NIMA UCHUN `span` ichida:
 * Ikonka komponentiga (`Trophy` va h.k.) to'g'ridan-to'g'ri `title` berish
 * MUMKIN EMAS — lucide-react tipi `title` ni qabul qilmaydi va `tsc` TS2322
 * xatosi beradi. Shuning uchun:
 *   - tooltip matni      → `span` ning `title` atributida;
 *   - ekran o'quvchisi   → `span` ga `role="img"` + `aria-label`;
 *   - ikonkaning o'zi    → `aria-hidden`, ya'ni ikki marta o'qilmaydi.
 */
function RankMedal({ rank, label }: { rank: number; label: string }) {
  const medals = {
    1: { Icon: Trophy, color: "text-amber-500" },
    2: { Icon: Medal, color: "text-slate-400" },
    3: { Icon: Award, color: "text-amber-700" },
  } as const;

  // 1-2-3 dan boshqa qiymat kelib qolsa nishon ko'rinishida chiziladi:
  // sahifa hech qachon oq ekranga aylanmasligi kerak.
  const { Icon, color } = medals[rank as 1 | 2 | 3] ?? medals[3];

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex shrink-0"
    >
      <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${color}`} />
    </span>
  );
}

type RankingRow = {
  id: string;
  fullName: string;
  className: string;
  // Fan bo'yicha o'rtacha: kalit — fan id si, qiymat — o'rtacha yoki null.
  subjectAverages: Map<string, number | null>;
  gradeAverage: number | null;
  gradeCount: number;
  attendance: number | null;
  penaltyPoints: number;
  testAverage: number | null;
  score: number | null;
  rank: number | null;
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: {
    year?: string;
    quarter?: string;
    scope?: string;
    classId?: string;
    grade?: string;
    topN?: string;
  };
}) {
  // Buxgalter reytingga kirmaydi — unga o'quvchining bahosi kerak emas.
  const user = await requireRole("ADMIN", "TEACHER", "PARENT");
  const t = await getTranslations("ranking");

  const isAdmin = user.role === "ADMIN";
  const isParent = user.role === "PARENT";

  // Koeffitsientlar bazadan. Qator hali yaratilmagan bo'lsa — standart
  // qiymatlar bilan ishlaymiz, sahifa xato bermasligi kerak.
  const stored = await db.rankingSetting.findUnique({
    where: { id: RANKING_SETTING_ID },
    select: { gradeWeight: true, testWeight: true, penaltyFactor: true },
  });
  const settings: RankingSettings = stored ?? DEFAULT_RANKING_SETTINGS;

  const years = await db.academicYear.findMany({
    orderBy: { name: "desc" },
    select: {
      id: true,
      name: true,
      isCurrent: true,
      quarters: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, startDate: true, endDate: true },
      },
    },
  });

  const selectedYear =
    years.find((year) => year.id === searchParams.year?.trim()) ??
    years.find((year) => year.isCurrent) ??
    years[0];

  const quarters = selectedYear?.quarters ?? [];
  const now = new Date();
  const selectedQuarter =
    quarters.find((quarter) => quarter.id === searchParams.quarter?.trim()) ??
    quarters.find(
      (quarter) => quarter.startDate <= now && now <= quarter.endDate
    ) ??
    quarters[quarters.length - 1];

  // Qamrov: searchParams ishonchsiz, shuning uchun tekshiriladi.
  const scope = isRankingScope(searchParams.scope)
    ? searchParams.scope
    : "class";

  const classes = selectedYear
    ? await db.class.findMany({
        where: {
          AND: [classScope(user), { academicYearId: selectedYear.id }],
        },
        orderBy: [{ grade: "asc" }, { name: "asc" }],
        select: { id: true, name: true, grade: true },
      })
    : [];

  const gradeLevels = Array.from(
    new Set(classes.map((klass) => klass.grade))
  ).sort((left, right) => left - right);

  const gradeParam = searchParams.grade?.trim();
  const selectedGrade =
    gradeParam && /^\d+$/.test(gradeParam) ? Number(gradeParam) : undefined;

  const selectedClass = classes.find(
    (klass) => klass.id === searchParams.classId?.trim()
  );

  /**
   * Qamrovga kiruvchi sinflar. "Sinf ichida" holatida sinf tanlanmaguncha
   * hech narsa hisoblanmaydi — hisobot sahifalarida bu majburiy qoida
   * (yulduzcha + brauzer ogohlantirishi).
   */
  const cohortClasses =
    scope === "class"
      ? selectedClass
        ? [selectedClass]
        : []
      : scope === "parallel"
        ? selectedGrade === undefined
          ? []
          : classes.filter((klass) => klass.grade === selectedGrade)
        : classes;

  const cohortIds = cohortClasses.map((klass) => klass.id);
  const ready = Boolean(selectedQuarter) && cohortIds.length > 0;

  const students = ready
    ? await db.student.findMany({
        where: { classId: { in: cohortIds }, status: "ACTIVE" },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          class: { select: { name: true } },
        },
      })
    : [];

  const studentIds = students.map((student) => student.id);

  // Ota-ona uchun: qaysi qator ko'rsatiladi. Boshqa qatorlar hisobga olinadi,
  // lekin ekranga chiqmaydi.
  const visibleIds =
    isParent && studentIds.length > 0
      ? new Set(
          (
            await db.student.findMany({
              where: { AND: [studentScope(user), { id: { in: studentIds } }] },
              select: { id: true },
            })
          ).map((student) => student.id)
        )
      : null;

  const quarterGrades =
    ready && studentIds.length > 0 && selectedQuarter
      ? await db.grade.findMany({
          where: {
            studentId: { in: studentIds },
            quarterId: selectedQuarter.id,
          },
          select: { studentId: true, subjectId: true, value: true },
        })
      : [];

  const attendanceRows =
    ready && studentIds.length > 0 && selectedQuarter
      ? await db.attendance.findMany({
          where: {
            studentId: { in: studentIds },
            date: {
              gte: selectedQuarter.startDate,
              lte: selectedQuarter.endDate,
            },
          },
          select: { studentId: true, status: true },
        })
      : [];

  const penaltyRows =
    ready && studentIds.length > 0 && selectedQuarter
      ? await db.penalty.findMany({
          where: {
            studentId: { in: studentIds },
            date: {
              gte: selectedQuarter.startDate,
              lte: selectedQuarter.endDate,
            },
          },
          select: { studentId: true, points: true },
        })
      : [];

  // Testlar moduli hali yo'q — jadval bo'sh bo'lishi normal holat.
  const testRows =
    ready && studentIds.length > 0 && selectedQuarter
      ? await db.testResult.findMany({
          where: {
            studentId: { in: studentIds },
            takenAt: {
              gte: selectedQuarter.startDate,
              lte: selectedQuarter.endDate,
            },
          },
          select: { studentId: true, percent: true },
        })
      : [];

  // Yil bo'yicha diagramma uchun butun yilning baholari.
  const yearGrades =
    ready && studentIds.length > 0 && quarters.length > 0
      ? await db.grade.findMany({
          where: {
            studentId: { in: studentIds },
            quarterId: { in: quarters.map((quarter) => quarter.id) },
          },
          select: { subjectId: true, quarterId: true, value: true },
        })
      : [];

  const subjectIds = Array.from(
    new Set([
      ...quarterGrades.map((grade) => grade.subjectId),
      ...yearGrades.map((grade) => grade.subjectId),
    ])
  );

  const subjects =
    subjectIds.length > 0
      ? await db.subject.findMany({
          where: { id: { in: subjectIds } },
          orderBy: { nameUz: "asc" },
          select: { id: true, nameUz: true },
        })
      : [];

  // ----------------------------------------------------------------
  // Hisob-kitob (bitta o'tishda — N+1 so'rov yo'q)
  // ----------------------------------------------------------------

  const gradesByStudent = new Map<string, number[]>();
  const gradesByStudentSubject = new Map<string, number[]>();
  const gradesBySubject = new Map<string, number[]>();

  for (const grade of quarterGrades) {
    const all = gradesByStudent.get(grade.studentId) ?? [];
    all.push(grade.value);
    gradesByStudent.set(grade.studentId, all);

    const key = `${grade.studentId}|${grade.subjectId}`;
    const perSubject = gradesByStudentSubject.get(key) ?? [];
    perSubject.push(grade.value);
    gradesByStudentSubject.set(key, perSubject);

    const subjectAll = gradesBySubject.get(grade.subjectId) ?? [];
    subjectAll.push(grade.value);
    gradesBySubject.set(grade.subjectId, subjectAll);
  }

  /**
   * Jadvalda ustun oladigan fanlar: faqat SHU CHORAKDA bahosi bor fanlar.
   * `subjects` ro'yxati yil bo'yicha diagramma uchun ham ishlatiladi,
   * shuning uchun u kengroq bo'lishi mumkin — jadvalga esa bo'sh ustun
   * kerak emas.
   */
  const tableSubjects = subjects.filter((subject) =>
    gradesBySubject.has(subject.id)
  );

  const attendanceCounts = new Map<
    string,
    { PRESENT: number; ABSENT: number; LATE: number; EXCUSED: number }
  >();
  for (const row of attendanceRows) {
    const counts =
      attendanceCounts.get(row.studentId) ??
      { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    counts[row.status] += 1;
    attendanceCounts.set(row.studentId, counts);
  }

  const penaltyByStudent = new Map<string, number>();
  for (const row of penaltyRows) {
    penaltyByStudent.set(
      row.studentId,
      (penaltyByStudent.get(row.studentId) ?? 0) + row.points
    );
  }

  const testsByStudent = new Map<string, number[]>();
  for (const row of testRows) {
    const all = testsByStudent.get(row.studentId) ?? [];
    all.push(row.percent);
    testsByStudent.set(row.studentId, all);
  }

  const rows: RankingRow[] = students.map((student) => {
    const values = gradesByStudent.get(student.id) ?? [];
    const gradeAverage = averageOf(values);
    const counts = attendanceCounts.get(student.id);
    const penaltyPoints = penaltyByStudent.get(student.id) ?? 0;
    const testAverage = averageOf(testsByStudent.get(student.id) ?? []);

    // Har bir fan uchun alohida o'rtacha. Baho bo'lmasa — null, ya'ni
    // jadvalda chiziqcha. Nolga aylantirilmaydi: baho qo'yilmagani va
    // nol olgani mutlaqo boshqa narsa.
    const subjectAverages = new Map<string, number | null>();
    for (const subject of tableSubjects) {
      subjectAverages.set(
        subject.id,
        averageOf(gradesByStudentSubject.get(`${student.id}|${subject.id}`) ?? [])
      );
    }

    return {
      id: student.id,
      fullName: `${student.lastName} ${student.firstName}`,
      className: student.class?.name ?? "—",
      subjectAverages,
      gradeAverage,
      // Umumiy baholar soni — fanlar kesimida emas, hammasi birgalikda.
      gradeCount: values.length,
      // Davomat foizi mavjud hisobot bilan bir xil formuladan olinadi.
      attendance: counts ? attendancePercent(counts) : null,
      penaltyPoints,
      testAverage,
      score: finalScore(
        { gradeAverage, testAverage, penaltyPoints },
        settings
      ),
      rank: null,
    };
  });

  // O'rin BUTUN qamrov bo'yicha hisoblanadi (ota-ona ko'rmaydigan qatorlar
  // ham hisobda — aks holda o'rin yolg'on bo'lardi).
  const rankMap = rankByScore(
    rows.map((row) => ({ id: row.id, score: row.score }))
  );
  for (const row of rows) {
    row.rank = rankMap.get(row.id) ?? null;
  }

  const topN = parseTopN(searchParams.topN);
  const chartLimit = topN ?? CHART_LIMIT_DEFAULT;

  const sortedRows = [...rows].sort((left, right) => {
    if (left.score === null && right.score === null) return 0;
    if (left.score === null) return 1;
    if (right.score === null) return -1;
    return right.score - left.score;
  });

  const rankedRows =
    topN === null
      ? sortedRows
      : sortedRows.filter((row) => row.rank !== null && row.rank <= topN);

  const tableRows = visibleIds
    ? rankedRows.filter((row) => visibleIds.has(row.id))
    : rankedRows;

  // ----------------------------------------------------------------
  // Diagrammalar uchun ma'lumot
  // ----------------------------------------------------------------

  // 1) Har bir fan bo'yicha alohida diagramma.
  const subjectCharts = subjects
    .map((subject, index) => {
      const bars = rows
        .map((row) => ({
          label: row.fullName,
          value:
            averageOf(
              gradesByStudentSubject.get(`${row.id}|${subject.id}`) ?? []
            ) ?? -1,
          color: colorAt(index),
        }))
        .filter((bar) => bar.value >= 0)
        .sort((left, right) => right.value - left.value)
        .slice(0, chartLimit);

      return { id: subject.id, name: subject.nameUz, bars };
    })
    .filter((chart) => chart.bars.length > 0);

  // 2) Umumiy reyting — dastlabki uchtasi to'qroq rangda.
  const overallBars = sortedRows
    .filter((row) => row.score !== null)
    .slice(0, chartLimit)
    .map((row, index) => ({
      label: row.fullName,
      value: row.score as number,
      color: index < 3 ? "#1d4ed8" : "#93c5fd",
    }));

  // 3) Tanlangan chorak: fanlar kesimida qamrov o'rtachasi.
  const quarterBars = subjects
    .map((subject, index) => ({
      label: subject.nameUz,
      value: averageOf(gradesBySubject.get(subject.id) ?? []) ?? -1,
      color: colorAt(index),
    }))
    .filter((bar) => bar.value >= 0);

  // 4) Yil bo'yicha, choraklar kesimida.
  const yearBuckets = new Map<string, number[]>();
  for (const grade of yearGrades) {
    const key = `${grade.subjectId}|${grade.quarterId}`;
    const all = yearBuckets.get(key) ?? [];
    all.push(grade.value);
    yearBuckets.set(key, all);
  }

  const yearGroups = subjects
    .map((subject) => ({
      label: subject.nameUz,
      bars: quarters
        .map((quarter) => ({
          label: t("quarterName", { name: quarter.name }),
          value:
            averageOf(yearBuckets.get(`${subject.id}|${quarter.id}`) ?? []) ??
            -1,
          color: quarterColor(quarter.name),
        }))
        .filter((bar) => bar.value >= 0),
    }))
    .filter((group) => group.bars.length > 0);

  const yearLegend = quarters.map((quarter) => ({
    label: t("quarterName", { name: quarter.name }),
    color: quarterColor(quarter.name),
  }));

  const hasGrades = quarterGrades.length > 0;

  const medalLabels = [t("medalGold"), t("medalSilver"), t("medalBronze")];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <p className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {t("readOnly")}
      </p>

      {isParent ? (
        <p className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {t("parentNotice")}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("filterTitle")}</CardTitle>
          <CardDescription>{t("filterHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {years.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noYears")}</p>
          ) : (
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("yearLabel")}
                </label>
                <select
                  name="year"
                  defaultValue={selectedYear?.id ?? ""}
                  className={selectClassName}
                >
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("quarterLabel")}
                </label>
                <select
                  name="quarter"
                  defaultValue={selectedQuarter?.id ?? ""}
                  className={selectClassName}
                >
                  {quarters.map((quarter) => (
                    <option key={quarter.id} value={quarter.id}>
                      {t("quarterName", { name: quarter.name })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("scopeLabel")}
                </label>
                <select
                  name="scope"
                  defaultValue={scope}
                  className={selectClassName}
                >
                  <option value="class">{t("scopeClass")}</option>
                  <option value="parallel">{t("scopeParallel")}</option>
                  <option value="school">{t("scopeSchool")}</option>
                </select>
              </div>

              {scope === "parallel" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    <span>{t("parallelLabel")}</span>{" "}
                    <span
                      aria-hidden="true"
                      className="font-semibold text-destructive"
                    >
                      *
                    </span>
                  </label>
                  <select
                    name="grade"
                    defaultValue={
                      selectedGrade === undefined ? "" : String(selectedGrade)
                    }
                    className={selectClassName}
                    required
                    aria-required="true"
                  >
                    <option value="">{t("chooseParallel")}</option>
                    {gradeLevels.map((level) => (
                      <option key={level} value={level}>
                        {t("parallelName", { grade: level })}
                      </option>
                    ))}
                  </select>
                </div>
              ) : scope === "class" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    <span>{t("classLabel")}</span>{" "}
                    <span
                      aria-hidden="true"
                      className="font-semibold text-destructive"
                    >
                      *
                    </span>
                  </label>
                  <select
                    name="classId"
                    defaultValue={selectedClass?.id ?? ""}
                    className={selectClassName}
                    required
                    aria-required="true"
                  >
                    <option value="">{t("chooseClass")}</option>
                    {classes.map((klass) => (
                      <option key={klass.id} value={klass.id}>
                        {klass.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("topN")}
                </label>
                <input
                  type="number"
                  name="topN"
                  min={1}
                  max={500}
                  defaultValue={topN ?? ""}
                  className={selectClassName}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("topNHint")}
                </p>
              </div>

              <div className="flex items-end">
                <Button type="submit" variant="secondary" className="w-full">
                  {t("apply")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {years.length === 0 ? null : quarters.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("needQuarter")}</p>
          </CardContent>
        </Card>
      ) : !ready ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {scope === "parallel" ? t("needParallel") : t("needClass")}
            </p>
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("noStudents")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("tableTitle")}</CardTitle>
              <CardDescription>
                {t("tableHint")} · {t("medalHint")} ·{" "}
                {t("studentCount", { count: rows.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasGrades ? (
                <p className="text-sm text-muted-foreground">{t("noData")}</p>
              ) : (
                <>
                  {/* Faqat gorizontal aylantirish: ichki vertikal skroll
                      ataylab yo'q — jadval to'liq ko'rinishi kerak. */}
                  <div className="overflow-x-auto">
                    {/* `min-w-full`: jadval o'z mazmuniga qarab kengayadi,
                        shuning uchun ism-familya ustuni eng uzun ismga
                        qarab o'lchanadi va siqilib qolmaydi. */}
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {/* `w-px` + `whitespace-nowrap`: ustun aynan eng
                              uzun ism kengligini oladi, ortiqcha bo'sh joy
                              qoldirmaydi. */}
                          <th className="sticky left-0 z-10 w-px whitespace-nowrap bg-muted/50 px-3 py-2 align-bottom text-left font-medium">
                            {t("student")}
                          </th>
                          <th className="w-14 border-l px-1 py-2 align-bottom font-medium">
                            <VerticalHeader className="h-16">
                              {t("className")}
                            </VerticalHeader>
                          </th>
                          {tableSubjects.map((subject) => (
                            <th
                              key={subject.id}
                              className="w-16 border-l px-1 py-2 align-bottom font-medium"
                            >
                              <VerticalHeader>
                                {t("subjectAverageHeader", {
                                  subject: subject.nameUz,
                                })}
                              </VerticalHeader>
                            </th>
                          ))}
                          <th className="w-16 border-l bg-amber-50 px-1 py-2 align-bottom font-medium">
                            <VerticalHeader>{t("gradeAverage")}</VerticalHeader>
                          </th>
                          <th className="w-16 border-l px-1 py-2 align-bottom font-medium">
                            <VerticalHeader>{t("gradeCount")}</VerticalHeader>
                          </th>
                          <th className="w-16 border-l px-1 py-2 align-bottom font-medium">
                            <VerticalHeader>
                              {t("attendancePercent")}
                            </VerticalHeader>
                          </th>
                          <th className="w-16 border-l px-1 py-2 align-bottom font-medium">
                            <VerticalHeader>
                              {t("penaltyPoints")}
                            </VerticalHeader>
                          </th>
                          <th className="w-16 border-l px-1 py-2 align-bottom font-medium">
                            <VerticalHeader>{t("testAverage")}</VerticalHeader>
                          </th>
                          <th className="w-16 border-l bg-amber-50 px-1 py-2 align-bottom font-medium">
                            <VerticalHeader>{t("finalScore")}</VerticalHeader>
                          </th>
                          {/* O'rin ustuni eng oxirida. */}
                          <th className="w-16 border-l bg-amber-50 px-1 py-2 align-bottom font-medium">
                            <VerticalHeader className="h-16">
                              {t("rankColumn")}
                            </VerticalHeader>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row) => (
                          <tr key={row.id} className="border-b">
                            <td className="sticky left-0 z-10 w-px whitespace-nowrap bg-background px-3 py-1.5">
                              {row.fullName}
                            </td>
                            <td className="border-l px-2 py-1.5 text-center text-muted-foreground">
                              {row.className}
                            </td>
                            {tableSubjects.map((subject) => (
                              <td
                                key={subject.id}
                                className="border-l px-2 py-1.5 text-center"
                              >
                                {row.subjectAverages.get(subject.id) ?? "—"}
                              </td>
                            ))}
                            <td className="border-l bg-amber-50 px-2 py-1.5 text-center font-medium">
                              {row.gradeAverage ?? "—"}
                            </td>
                            <td className="border-l px-2 py-1.5 text-center text-muted-foreground">
                              {row.gradeCount}
                            </td>
                            <td className="border-l px-2 py-1.5 text-center">
                              {row.attendance ?? "—"}
                            </td>
                            <td className="border-l px-2 py-1.5 text-center">
                              {row.penaltyPoints > 0
                                ? row.penaltyPoints
                                : "—"}
                            </td>
                            <td className="border-l px-2 py-1.5 text-center">
                              {row.testAverage ?? "—"}
                            </td>
                            <td className="border-l bg-amber-100/70 px-2 py-1.5 text-center font-semibold">
                              {row.score ?? "—"}
                            </td>
                            <td className="border-l bg-amber-100/70 px-2 py-1.5">
                              <div className="flex items-center justify-center gap-1 font-semibold">
                                {row.rank !== null && row.rank <= 3 ? (
                                  <RankMedal
                                    rank={row.rank}
                                    label={medalLabels[row.rank - 1]}
                                  />
                                ) : null}
                                <span>{row.rank ?? "—"}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t("testMissingHint")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Diagrammalar. Ota-onaga o'quvchi ismli diagrammalar
              ko'rsatilmaydi — unga faqat o'rtacha ko'rsatkichlar. */}
          {!isParent ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("chartOverall")}</CardTitle>
                <CardDescription>
                  {t("chartOverallHint")} ·{" "}
                  {t("chartLimitHint", { count: chartLimit })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overallBars.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("noChartData")}
                  </p>
                ) : (
                  <BarChart bars={overallBars} />
                )}
              </CardContent>
            </Card>
          ) : null}

          {!isParent ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("chartSubjects")}</CardTitle>
                <CardDescription>{t("chartSubjectsHint")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {subjectCharts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("noChartData")}
                  </p>
                ) : (
                  subjectCharts.map((chart) => (
                    <div key={chart.id} className="space-y-2">
                      <h3 className="text-sm font-semibold">{chart.name}</h3>
                      <BarChart bars={chart.bars} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("chartQuarter")}</CardTitle>
              <CardDescription>{t("chartQuarterHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {quarterBars.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noChartData")}
                </p>
              ) : (
                <BarChart bars={quarterBars} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("chartYear")}</CardTitle>
              <CardDescription>{t("chartYearHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {yearGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noChartData")}
                </p>
              ) : (
                <>
                  <ChartLegend items={yearLegend} />
                  <GroupedBarChart groups={yearGroups} />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("settingsTitle")}</CardTitle>
            <CardDescription>{t("settingsHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RankingSettingsForm
              gradeWeight={settings.gradeWeight}
              testWeight={settings.testWeight}
              penaltyFactor={settings.penaltyFactor}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">{t("adminOnly")}</p>
      )}
    </div>
  );
}
