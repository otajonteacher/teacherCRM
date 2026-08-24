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
 * Shu sababli bu fayl ATAYLAB hech qanday forma yoki Server Action
 * ishlatmaydi — sahifada yozish yo'li umuman yo'q. Bu eng ishonchli himoya:
 * mavjud bo'lmagan endpoint'ga hujum qilinmaydi. Avvalgi versiyadagi
 * `actions.ts` va `grades-form.tsx` fayllari shuning uchun o'chirildi.
 *
 * ADMIN hamma narsani o'zgartira oladi (bu ham egasining qoidasi), lekin
 * o'zgartirish JOYI bitta: jurnal. Admin uchun shu sahifada jurnalga o'tish
 * havolasi chiqadi — huquq cheklanmaydi, faqat yo'l bittaga keltiriladi.
 * Bir amal ikki joyda bajarilmasa, audit ham ishonchli bo'ladi.
 *
 * IKKI KO'RINISH:
 *   Bir kunlik  — ustunlar: shu kunning darslari (jurnal bilan bir xil nom)
 *   Bir haftalik — ustunlar: fanlar; katakchada haftaning kunlik baholari
 *                  va fan bo'yicha o'rtacha. O'zlashtirish ko'rsatkichi
 *                  uchun aynan shu ko'rinish kerak.
 *
 * Oxirgi ikki ustun — o'rtacha ball va O'RIN (reyting). O'rin jurnaldagi
 * qoida bilan bir xil hisoblanadi (`rankByAverage`): teng ball — teng o'rin,
 * "dastlabki N o'rin" sozlanadi.
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
  const type: GradeTypeValue = isGradeType(searchParams.type?.trim())
    ? (searchParams.type?.trim() as GradeTypeValue)
    : "DAILY";
  const topN = parseTopN(searchParams.topN);
  const classId = searchParams.classId?.trim() || undefined;

  /**
   * Hisobot doirasi `classScope` — ya'ni sinf rahbari o'z sinfining TO'LIQ
   * hisobotini ko'radi. Bu xavfsiz, chunki sahifa faqat o'qish uchun. Yozish
   * doirasi (`gradingLessonScope`) esa ancha tor — ikkisi ataylab bir xil
   * emas.
   */
  const classes = await db.class.findMany({
    where: classScope(user),
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const selectedClass =
    (classId ? classes.find((klass) => klass.id === classId) : undefined) ??
    (classes.length === 1 ? classes[0] : undefined);

  // Haftalik ko'rinishda dushanbadan shanbagacha (yakshanba dars kuni emas).
  const dates = mode === "week" ? weekDaysText(weekStartText(from)) : [from];

  // Bir kunlik ko'rinish ustunlari — jurnal bilan BIR XIL nomlanadi
  // ("Matematika", "Matematika 2"), shunda ikki sahifa bir tilda gapiradi.
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

  // Haftalik ko'rinish ustunlari — sinfda o'tiladigan barcha fanlar.
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

  const columnCount = mode === "day" ? dayColumns.length : subjectColumns.length;

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

  // Bir kunlik: dars ustuni bo'yicha bitta qiymat.
  const dayValues = new Map<string, number>();
  // Haftalik: fan ustuni bo'yicha kunlik qiymatlar ro'yxati.
  const weekValues = new Map<string, Array<{ date: string; value: number }>>();
  const allValues = new Map<string, number[]>();

  for (const grade of grades) {
    const list = allValues.get(grade.studentId) ?? [];
    list.push(grade.value);
    allValues.set(grade.studentId, list);

    if (mode === "day") {
      // `lessonId` bo'sh bo'lsa (eski yozuv) — fan bo'yicha bo'sh ustunga.
      if (grade.lessonId) {
        dayValues.set(`${grade.studentId}|${grade.lessonId}`, grade.value);
        continue;
      }
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
          <CardDescription>{t("chooseHint")}</C