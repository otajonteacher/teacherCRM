import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireRole, redirectNever } from "@/lib/auth-guard";
import { classScope, lessonScope } from "@/lib/scope";
import { toDate } from "@/lib/academics";
import {
  DATE_TEXT_PATTERN,
  dayOfWeekFromText,
  todayText,
} from "@/lib/attendance";
import { abbreviationOf, buildLessonColumns } from "@/lib/journal";
import { attendanceCellKey } from "@/lib/attendance-grid";
import { AttendanceGrid, type AttendanceColumn } from "./attendance-grid";

/**
 * DAVOMAT SAHIFASI — SINF × KUNNING DARSLARI
 * ==========================================
 *
 * Avval bu sahifa dars tanlashni talab qilardi: sana → dars chipi → shu
 * bitta dars uchun tugmalar. Egasining talabi bo'yicha endi jurnal bilan
 * bir xil: SINF tanlanadi va shu kunning BARCHA darslari ustun bo'lib
 * chiqadi, har bir fan bo'yicha davomat ko'rinadi.
 *
 * Ustunlar SHU SINFNING butun kunlik jadvali — faqat foydalanuvchining
 * darslari emas. Sabab: sinf rahbari yoki fan o'qituvchisi bolaning butun
 * kunini ko'rishi kerak ("3-darsdan keyin ketib qolgan"). Lekin YOZISH
 * faqat o'z ustunida mumkin — boshqasi bloklangan.
 *
 * XAVFSIZLIK:
 *   - sinflar `classScope` bilan cheklanadi (begona sinf ID kiritilsa
 *     ro'yxatda topilmaydi va sahifa bo'sh qoladi)
 *   - `lessonScope` — qaysi ustun tahrirlanadi
 *   - PARENT hech narsa yozmaydi: hisobot ko'rinishiga yuboriladi
 *   - haqiqiy himoya baribir Server Action ichida qayta tekshiriladi
 */

type PageProps = {
  searchParams: {
    classId?: string;
    date?: string;
    saved?: string;
  };
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default async function AttendancePage({ searchParams }: PageProps) {
  const user = await requireRole("ADMIN", "TEACHER", "PARENT");

  // Ota-ona davomat YOZMAYDI — faqat hisobotni ko'radi.
  if (user.role === "PARENT") redirectNever("/attendance/journal");

  const t = await getTranslations("attendance");

  const dateText =
    searchParams.date && DATE_TEXT_PATTERN.test(searchParams.date)
      ? searchParams.date
      : todayText();

  const dayOfWeek = dayOfWeekFromText(dateText);
  const isSunday = dayOfWeek === 7;
  const saved = searchParams.saved === "1";

  const classes = await db.class.findMany({
    where: classScope(user),
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  /**
   * Sinf tanlanmagan bo'lsa va faqat bitta sinf bo'lsa — o'zi tanlanadi.
   * Foydalanuvchi ikki marta tugma bosmasligi uchun (avvalgi shikoyat).
   */
  const requestedClassId = searchParams.classId ?? "";
  const classId = classes.some((item) => item.id === requestedClassId)
    ? requestedClassId
    : classes.length === 1
      ? classes[0].id
      : "";

  const hrefWith = (extra: Record<string, string>): string => {
    const params = new URLSearchParams({ date: dateText });
    if (classId) params.set("classId", classId);
    for (const [key, value] of Object.entries(extra)) {
      if (value === "") params.delete(key);
      else params.set(key, value);
    }
    return `/attendance?${params.toString()}`;
  };

  // Sinfning shu kundagi BARCHA darslari — vaqt bo'yicha tartibda.
  // Tartib muhim: "Matematika 2" nomi shu tartibdan kelib chiqadi.
  const dayLessons =
    classId === "" || isSunday
      ? []
      : await db.lesson.findMany({
          where: { classId, dayOfWeek },
          orderBy: [{ period: { index: "asc" } }, { startTime: "asc" }],
          select: {
            id: true,
            subjectId: true,
            subject: { select: { nameUz: true } },
          },
        });

  // Shu darslarning qaysilari menga tegishli — serverning o'zi aniqlaydi.
  const myLessons =
    dayLessons.length === 0
      ? []
      : await db.lesson.findMany({
          where: {
            AND: [
              lessonScope(user),
              { id: { in: dayLessons.map((lesson) => lesson.id) } },
            ],
          },
          select: { id: true },
        });
  const editableIds = new Set(myLessons.map((lesson) => lesson.id));

  const columns: AttendanceColumn[] = buildLessonColumns(
    dayLessons.map((lesson) => ({
      id: lesson.id,
      subjectId: lesson.subjectId,
      subjectName: lesson.subject.nameUz,
    }))
  ).map((column) => ({
    ...column,
    editable: editableIds.has(column.id),
  }));

  const students =
    classId === ""
      ? []
      : await db.student.findMany({
          where: { classId, status: "ACTIVE" },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: { id: true, firstName: true, lastName: true },
        });

  const existing =
    dayLessons.length === 0 || students.length === 0
      ? []
      : await db.attendance.findMany({
          where: {
            lessonId: { in: dayLessons.map((lesson) => lesson.id) },
            date: toDate(dateText),
          },
          select: { studentId: true, lessonId: true, status: true },
        });

  const initial: Record<string, string> = {};
  for (const row of existing) {
    initial[attendanceCellKey(row.studentId, row.lessonId)] = abbreviationOf(
      row.status
    );
  }

  const canEdit = editableIds.size > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/attendance/journal">{t("openJournal")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("chooseTitle")}</CardTitle>
          <CardDescription>{t("chooseHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/*
            Oddiy GET forma — tanlov URL da qoladi, sahifani ulashish va
            yangilash ishlaydi.
          */}
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">{t("chooseClass")}</span>
              <select
                name="classId"
                defaultValue={classId}
                className={selectClassName}
              >
                <option value="">{t("chooseClass")}</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">{t("dateLabel")}</span>
              <input
                type="date"
                name="date"
                defaultValue={dateText}
                className={selectClassName}
              />
            </label>

            <Button type="submit">{t("apply")}</Button>
          </form>
        </CardContent>
      </Card>

      {saved ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("saved")}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("gridTitle")}</CardTitle>
          <CardDescription>
            {t("lessonCount", { count: columns.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noClasses")}</p>
          ) : classId === "" ? (
            <p className="text-sm text-muted-foreground">{t("needClass")}</p>
          ) : isSunday ? (
            <p className="text-sm text-muted-foreground">{t("sunday")}</p>
          ) : columns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noStudents")}</p>
          ) : (
            <AttendanceGrid
              /*
                key — sinf yoki sana o'zgarganda useState qayta boshlanadi,
                aks holda oldingi kunning katakchalari ko'rinib qoladi.
              */
              key={`${classId}-${dateText}`}
              classId={classId}
              date={dateText}
              students={students.map((student) => ({
                id: student.id,
                fullName: `${student.lastName} ${student.firstName}`,
              }))}
              columns={columns}
              initial={initial}
              canEdit={canEdit}
              cancelHref={hrefWith({ saved: "" })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
