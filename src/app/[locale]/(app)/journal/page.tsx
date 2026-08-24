import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { classScope, gradingLessonScope, studentScope } from "@/lib/scope";
import { toDate } from "@/lib/academics";
import {
  DATE_TEXT_PATTERN,
  dayOfWeekFromText,
  todayText,
  worstStatus,
  type AttendanceStatusValue,
} from "@/lib/attendance";
import {
  abbreviationOf,
  buildLessonColumns,
  journalCellKey,
} from "@/lib/journal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JournalForm, type JournalColumn } from "./journal-form";

/**
 * JURNAL — KUNLIK ISH JOYI
 * ========================
 *
 * Bu sahifa o'qituvchining har kuni ochadigan asosiy oynasi: sinf tanlanadi,
 * kun tanlanadi — va qog'oz jurnaldagidek jadval chiqadi. Davomat va baho
 * BIR JOYDA, bitta "Saqlash" bilan.
 *
 * "Baholar" sahifasidan farqi:
 *   Jurnal  — KIRITISH joyi: bir kun, barcha fanlar, faqat o'z fani ochiq
 *   Baholar — KO'RISH joyi: kunlik/haftalik o'zlashtirish va reyting hisoboti
 *
 * Baho yozishning YAGONA yo'li — shu sahifa. "Baholar" sahifasida baho
 * qo'yish imkoni umuman yo'q (egasining talabi).
 *
 * XAVFSIZLIK: bu yerdagi so'rovlar `classScope` va `gradingLessonScope` bilan
 * cheklangan. Ustun "ochiq"mi yoki "bloklangan"mi qarori ham SERVERDA
 * chiqariladi — klient bunga ta'sir qila olmaydi. Saqlash paytida server
 * yana bir marta o'z darslarini o'zi topib tekshiradi.
 */

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: { classId?: string; date?: string; saved?: string };
}) {
  // Jurnal — faqat o'qituvchi va admin uchun. Ota-ona va buxgalter kirmaydi.
  const user = await requireRole("ADMIN", "TEACHER");
  const t = await getTranslations("journal");

  // searchParams ishonchsiz manba — hammasi tekshiriladi.
  const dateParam = searchParams.date?.trim();
  const date =
    dateParam && DATE_TEXT_PATTERN.test(dateParam) ? dateParam : todayText();
  const dayOfWeek = dayOfWeekFromText(date);
  const classId = searchParams.classId?.trim() || undefined;

  /**
   * Sinf ro'yxati: faqat foydalanuvchi DARS BERADIGAN sinflar.
   * `classScope` o'zi yetarli emas — u sinf rahbarligini ham qo'shadi, baho
   * qo'yish uchun esa bu asos bo'lmaydi.
   */
  const classes = await db.class.findMany({
    where: {
      AND: [classScope(user), { lessons: { some: gradingLessonScope(user) } }],
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  // Bitta sinf bo'lsa o'zi tanlanadi — keraksiz bosish kamayadi.
  const selectedClass =
    (classId ? classes.find((klass) => klass.id === classId) : undefined) ??
    (classes.length === 1 ? classes[0] : undefined);

  // Ustunlar: shu kunning BARCHA darslari (boshqa o'qituvchilarning ham —
  // ular bloklangan holda ko'rinadi, chunki jurnal to'liq bo'lishi kerak).
  const dayLessons = selectedClass
    ? await db.lesson.findMany({
        where: { classId: selectedClass.id, dayOfWeek },
        orderBy: [{ startTime: "asc" }],
        select: {
          id: true,
          subjectId: true,
          subject: { select: { nameUz: true } },
        },
      })
    : [];

  // Qaysi darslar MENING darsim — qarorni server chiqaradi.
  const myLessons = selectedClass
    ? await db.lesson.findMany({
        where: {
          AND: [
            { classId: selectedClass.id, dayOfWeek },
            gradingLessonScope(user),
          ],
        },
        select: { id: true },
      })
    : [];
  const myLessonIds = new Set(myLessons.map((lesson) => lesson.id));

  const columns: JournalColumn[] = buildLessonColumns(
    dayLessons.map((lesson) => ({
      id: lesson.id,
      subjectId: lesson.subjectId,
      subjectName: lesson.subject.nameUz,
    }))
  ).map((column) => ({ ...column, editable: myLessonIds.has(column.id) }));

  const students =
    selectedClass && columns.length > 0
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
            date: toDate(date),
            type: "DAILY",
          },
          select: {
            studentId: true,
            subjectId: true,
            lessonId: true,
            value: true,
          },
        })
      : [];

  /**
   * Baholarni ustunlarga taqsimlash.
   *
   * `lessonId` bor bo'lsa — to'g'ridan-to'g'ri o'z ustuniga tushadi.
   * Eski baholarda bu maydon bo'sh (u keyin qo'shilgan), shuning uchun
   * ular fan bo'yicha eng chapdagi BO'SH ustunga joylanadi — shunda eski
   * ma'lumot ko'rinmay qolmaydi. Saqlash paytida server bunday yozuvni
   * o'sha ustunga "asrab oladi".
   */
  const initialGrades: Record<string, number> = {};
  const columnsBySubject = new Map<string, JournalColumn[]>();
  for (const column of columns) {
    const list = columnsBySubject.get(column.subjectId) ?? [];
    list.push(column);
    columnsBySubject.set(column.subjectId, list);
  }

  for (const grade of grades) {
    if (grade.lessonId && myLessonIds.has(grade.lessonId)) {
      initialGrades[journalCellKey(grade.studentId, grade.lessonId)] =
        grade.value;
      continue;
    }
    if (grade.lessonId) {
      const known = columns.some((column) => column.id === grade.lessonId);
      if (known) {
        initialGrades[journalCellKey(grade.studentId, grade.lessonId)] =
          grade.value;
        continue;
      }
    }

    const candidates = columnsBySubject.get(grade.subjectId) ?? [];
    const free = candidates.find(
      (column) =>
        initialGrades[journalCellKey(grade.studentId, column.id)] === undefined
    );
    if (free) {
      initialGrades[journalCellKey(grade.studentId, free.id)] = grade.value;
    }
  }

  // Davomat: o'z darsimdagi belgi ustun, bo'lmasa kun bo'yicha eng "og'ir"
  // holat ko'rsatiladi (boshqa o'qituvchi qo'ygan belgi ham ko'rinsin).
  const attendanceRows =
    studentIds.length > 0
      ? await db.attendance.findMany({
          where: {
            studentId: { in: studentIds },
            date: toDate(date),
            lessonId: { in: dayLessons.map((lesson) => lesson.id) },
          },
          select: { studentId: true, lessonId: true, status: true },
        })
      : [];

  const initialAttendance: Record<string, string> = {};
  const dayStatuses = new Map<string, AttendanceStatusValue[]>();

  for (const row of attendanceRows) {
    if (myLessonIds.has(row.lessonId)) {
      initialAttendance[row.studentId] = abbreviationOf(row.status);
    }
    const list = dayStatuses.get(row.studentId) ?? [];
    list.push(row.status);
    dayStatuses.set(row.studentId, list);
  }

  for (const [studentId, statuses] of dayStatuses) {
    if (initialAttendance[studentId] !== undefined) continue;
    const worst = worstStatus(statuses);
    if (worst) initialAttendance[studentId] = abbreviationOf(worst);
  }

  const cancelHref = `/journal?${new URLSearchParams({
    date,
    ...(selectedClass ? { classId: selectedClass.id } : {}),
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
          <form className="grid gap-3 sm:grid-cols-3" method="get">
            <select
              name="classId"
              defaultValue={selectedClass?.id ?? ""}
              className={selectClassName}
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
              name="date"
              defaultValue={date}
              className={selectClassName}
            />

            <Button type="submit" variant="secondary">
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
      ) : !selectedClass ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("needClass")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedClass.name} · {date}
            </CardTitle>
            <CardDescription>
              {t("lessonCount", { count: columns.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {columns.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
            ) : students.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noStudents")}</p>
            ) : (
              <JournalForm
                key={`${selectedClass.id}-${date}`}
                classId={selectedClass.id}
                date={date}
                students={students.map((student) => ({
                  id: student.id,
                  fullName: `${student.lastName} ${student.firstName}`,
                }))}
                columns={columns}
                initialGrades={initialGrades}
                initialAttendance={initialAttendance}
                canEdit={myLessonIds.size > 0}
                cancelHref={cancelHref}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
