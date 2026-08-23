"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  ENTRY_PREFIX,
  GRADE_MAX,
  GRADE_MIN,
  averageOf,
  cellKey,
  gradeLevelKey,
  shortDateLabel,
  type GradeTypeValue,
} from "@/lib/grades";
import { saveGrades, type GradeFormState } from "./actions";

/**
 * OYLIK JURNAL JADVALI (100 BALLIK)
 * =================================
 *
 * Qog'oz jurnalning aynan o'zi: qatorlar — o'quvchilar, ustunlar — sanalar,
 * oxirgi ustun — o'rtacha ball. Pastdagi qatorda esa har bir sana bo'yicha
 * sinf o'rtachasi chiqadi, shunda o'qituvchi "bu darsda sinf qanday
 * o'zlashtirdi" degan savolga darhol javob oladi.
 *
 * O'rtacha ball TIRIK hisoblanadi — raqam kiritilishi bilan yangilanadi,
 * saqlashni kutib turmaydi.
 *
 * Katakcha maydon nomi: "grade:<studentId>:<sana>". Bo'sh katakcha "baho
 * qo'yilmagan" degani; avval baho bo'lgan katakcha tozalansa — baho
 * o'chiriladi.
 *
 * Bu yerdagi tekshiruvlar faqat QULAYLIK uchun — haqiqiy himoya serverda
 * (zod 0–100 + `assertCanGradeClassSubject` + sana/o'quvchi filtri).
 * Klientdagi tekshiruvga hech qachon ishonilmaydi.
 */

type StudentRow = { id: string; fullName: string };

type GradesFormProps = {
  classId: string;
  subjectId: string;
  month: string;
  type: GradeTypeValue;
  students: StudentRow[];
  /** Ustunlar — shu fan darsi bo'ladigan kunlar ("YYYY-MM-DD"). */
  dates: string[];
  /** Saqlangan baholar: cellKey(studentId, date) → qiymat. */
  initial: Record<string, number>;
  cancelHref: string;
};

/** Katakcha foni — qog'oz jurnaldagidek yengil rang bilan ajratiladi. */
const levelCellStyle: Record<string, string> = {
  excellent: "bg-emerald-50 text-emerald-800",
  good: "bg-sky-50 text-sky-800",
  average: "bg-amber-50 text-amber-800",
  weak: "bg-red-50 text-red-700",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("grades");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : t("save")}
    </Button>
  );
}

export function GradesForm({
  classId,
  subjectId,
  month,
  type,
  students,
  dates,
  initial,
  cancelHref,
}: GradesFormProps) {
  const t = useTranslations("grades");
  const [state, formAction] = useFormState<GradeFormState, FormData>(
    saveGrades,
    {}
  );

  const [values, setValues] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const student of students) {
      for (const date of dates) {
        const key = cellKey(student.id, date);
        const existing = initial[key];
        start[key] = existing === undefined ? "" : String(existing);
      }
    }
    return start;
  });

  // Redirectdan keyin state undefined bo'lishi mumkin.
  const errorMessage = state?.error;

  const numbersOf = (keys: string[]): number[] =>
    keys
      .map((key) => (values[key] ?? "").trim())
      .filter((text) => text !== "")
      .map((text) => Number(text))
      .filter((value) => Number.isFinite(value));

  const rowAverage = (studentId: string): number | null =>
    averageOf(numbersOf(dates.map((date) => cellKey(studentId, date))));

  const columnAverage = (date: string): number | null =>
    averageOf(numbersOf(students.map((student) => cellKey(student.id, date))));

  const filledCount = students.reduce(
    (total, student) =>
      total + numbersOf(dates.map((date) => cellKey(student.id, date))).length,
    0
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="type" value={type} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("gridHint")}</p>
        <p className="text-sm text-muted-foreground">
          {t("filledCount", { count: filledCount })}
        </p>
      </div>

      {/*
        Gorizontal siljish — ustunlar ko'p bo'lsa jadval kengayadi. Vertikal
        ichki scroll ATAYLAB yo'q: sahifada bitta asosiy scroll bo'lishi kerak
        (AGENTS.md, layout qoidasi).
      */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-10 min-w-[200px] bg-muted/50 px-3 py-2 text-left font-medium">
                {t("student")}
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className="border-l px-1 py-2 text-center font-medium"
                >
                  {shortDateLabel(date)}
                </th>
              ))}
              <th className="border-l bg-amber-100/70 px-2 py-2 text-center font-semibold">
                {t("averageColumn")}
              </th>
            </tr>
          </thead>

          <tbody>
            {students.map((student, index) => {
              const average = rowAverage(student.id);
              return (
                <tr key={student.id} className="border-b last:border-b-0">
                  <td className="sticky left-0 z-10 bg-background px-3 py-1.5">
                    <span className="text-muted-foreground">{index + 1}.</span>{" "}
                    <span className="font-medium">{student.fullName}</span>
                  </td>

                  {dates.map((date) => {
                    const key = cellKey(student.id, date);
                    const raw = (values[key] ?? "").trim();
                    const parsed = raw === "" ? null : Number(raw);
                    const valid =
                      parsed !== null &&
                      Number.isInteger(parsed) &&
                      parsed >= GRADE_MIN &&
                      parsed <= GRADE_MAX;

                    return (
                      <td key={date} className="border-l p-0.5 text-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={GRADE_MIN}
                          max={GRADE_MAX}
                          step={1}
                          name={`${ENTRY_PREFIX}${student.id}:${date}`}
                          value={values[key] ?? ""}
                          onChange={(event) =>
                            setValues((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                          aria-label={`${student.fullName} — ${shortDateLabel(
                            date
                          )}`}
                          className={`h-9 w-14 rounded border border-transparent px-1 text-center font-medium outline-none focus:border-primary ${
                            valid
                              ? levelCellStyle[gradeLevelKey(parsed)] ?? ""
                              : "bg-background"
                          }`}
                        />
                      </td>
                    );
                  })}

                  <td className="border-l bg-amber-100/70 px-2 py-1.5 text-center font-semibold">
                    {average === null ? "—" : average.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t bg-muted/50">
              <td className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-sm font-medium">
                {t("columnAverage")}
              </td>
              {dates.map((date) => {
                const average = columnAverage(date);
                return (
                  <td
                    key={date}
                    className="border-l px-1 py-2 text-center text-xs font-medium"
                  >
                    {average === null ? "—" : average.toFixed(1)}
                  </td>
                );
              })}
              <td className="border-l bg-amber-100/70" />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">{t("clearHint")}</p>

      {errorMessage ? (
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton />
        <Button asChild variant="outline">
          <Link href={cancelHref}>{t("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
