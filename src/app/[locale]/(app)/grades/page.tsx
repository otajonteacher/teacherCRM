import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { redirectNever, requireRole } from "@/lib/auth-guard";
import { classScope, gradingLessonScope, studentScope } from "@/lib/scope";
import { toDate } from "@/lib/academics";
import {
  GRADE_TYPES,
  MONTH_TEXT_PATTERN,
  cellKey,
  dateToText,
  isGradeType,
  monthDatesForWeekdays,
  todayMonth,
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
 * BAHOLAR — OYLIK JURNAL (6-bosqich)
 * ==================================
 *
 * Ish tartibi: sinf + fan + oy tanlanadi → qog'oz jurnalga o'xshash jadval
 * ochiladi (ustunlar — sanalar) → baholar kiritilib bir marta saqlanadi.
 *
 * HAR FAN O'QITUVCHISIGA ALOHIDA JURNAL: fan ro'yxati `gradingLessonScope`
 * bilan olinadi, ya'ni ingliz tili o'qituvchisi faqat ingliz tilini ko'radi,
 * rus tili o'qituvchisi faqat rus tilini. Sinf rahbari bo'lish bu ro'yxatni
 * kengaytirmaydi — baho qoidasi davomatdan farq qiladi.
 *
 * Ustunlar dars jadvalidan yasaladi: faqat shu fan darsi bo'ladigan kunlar.
 * Shuning uchun jadval keraksiz kengaymaydi va yakshanba o'z-o'zidan
 * tushib qoladi.
 */

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default async function GradesPage({
  searchParams,
}: {
  searchParams: {
    classId?: string;
    subjectId?: string;
    month?: string;
    type?: string;
    saved?: string;
  };
}) {
  const user = await requireRole("ADMIN", "TEACHER", "PARENT");
  if (user.role === "PARENT") {
    redirectNever("/dashboard");
  }

  const t = await getTranslations("grades");

  // searchParams ishonchsiz manba — hammasi tekshiriladi.
  const monthParam = searchParams.month?.trim();
  const month =
    monthParam && MONTH_TEXT_PATTERN.test(monthParam)
      ? monthParam
      : todayMonth();

  const typeParam = searchParams.type?.trim();
  const type: GradeTypeValue = isGradeType(typeParam) ? typeParam : "DAILY";

  const classId = searchParams.classId?.trim() || undefined;
  const subjectId = searchParams.subjectId?.trim() || undefined;

  /**
   * Sinf ro'yxati: faqat foydalanuvchi DARS BERADIGAN sinflar. `classScope`
   * o'zi yetarli emas, chunki u sinf rahbarligini ham qo'shadi — baho
   * qo'yish uchun esa bu asos bo'lmaydi.
   */
  const classes = await db.class.findMany({
    where: {
      AND: [classScope(user), { lessons: { some: gradingLessonScope(user) } }],
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const selectedClass = classId
    ? classes.find((klass) => klass.id === classId)
    : undefined;

  // Tanlangan sinfda foydalanuvchi o'qitadigan fanlar.
  const subjectLessons = selectedClass
    ? await db.lesson.findMany({
        where: {
          AND: [{ classId: selectedClass.id }, gradingLessonScope(user)],
        },
        orderBy: { subject: { nameUz: "asc" } },
        select: {
          subjectId: true,
          dayOfWeek: true,
          subject: { select: { nameUz: true } },
        },
      })
    : [];

  const subjects = Array.from(
    new Map(
      subjectLessons.map((lesson) => [
        lesson.subjectId,
        { id: lesson.subjectId, name: lesson.subject.nameUz },
      ])
    ).values()
  );

  const selectedSubject = subjectId
    ? subjects.find((subject) => subject.id === subjectId)
    : undefined;

  // Ustunlar: shu fan darsi bo'ladigan hafta kunlari → oy ichidagi sanalar.
  const weekdays = selectedSubject
    ? subjectLessons
        .filter((lesson) => lesson.subjectId === selectedSubject.id)
        .map((lesson) => lesson.dayOfWeek)
    : [];
  const dates = selectedSubject
    ? monthDatesForWeekdays(month, weekdays)
    : [];

  const students =
    selectedClass && selectedSubject
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

  // Saqlangan baholar — bitta so'rov bilan (N+1 yo'q).
  const existing =
    selectedSubject && dates.length > 0
      ? await db.grade.findMany({
          where: {
            subjectId: selectedSubject.id,
            type,
            date: { in: dates.map((date) => toDate(date)) },
            student: { classId: selectedClass?.id },
          },
          select: { studentId: true, date: true, value: true },
        })
      : [];

  const initial: Record<string, number> = {};
  for (const row of existing) {
    initial[cellKey(row.studentId, dateToText(row.date))] = row.value;
  }

  const cancelHref = `/grades?${new URLSearchParams({
    month,
    type,
    ...(classId ? { classId } : {}),
  }).toString()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
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
          {/*
            Fan ro'yxati sinfga bog'liq, shuning uchun oddiy GET forma:
            sinf tanlanib "Ko'rsatish" bosilgach fanlar yangilanadi.
          */}
          <form className="grid gap-3 sm:grid-cols-4" method="get">
            <select
              name="classId"
              defaultValue={classId ?? ""}
              className={selectClassName}
            >
              <option value="">{t("chooseClass")}</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>

            <select
              name="subjectId"
              defaultValue={subjectId ?? ""}
              className={selectClassName}
              disabled={subjects.length === 0}
            >
              <option value="">{t("chooseSubject")}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <input
              type="month"
              name="month"
              defaultValue={month}
              className={selectClassName}
            />

            <select name="type" defaultValue={type} className={selectClassName}>
              {GRADE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`type.${value}`)}
                </option>
              ))}
            </select>

            <Button type="submit" variant="secondary" className="sm:col-span-1">
              {t("apply")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("noClasses")}</p>
          </CardContent>
        </Card>
      ) : null}

      {selectedClass && selectedSubject ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedClass.name} · {selectedSubject.name}
            </CardTitle>
            <CardDescription>
              {month} · {t(`type.${type}`)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noDates")}</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noStudents")}</p>
            ) : (
              <GradesForm
                key={`${selectedClass.id}-${selectedSubject.id}-${month}-${type}`}
                classId={selectedClass.id}
                subjectId={selectedSubject.id}
                month={month}
                type={type}
                students={students.map((student) => ({
                  id: student.id,
                  fullName: `${student.lastName} ${student.firstName}`,
                }))}
                dates={dates}
                initial={initial}
                cancelHref={cancelHref}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {selectedClass ? t("needSubject") : t("needClass")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
