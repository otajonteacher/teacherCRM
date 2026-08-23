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
  gradeLevelKey,
  type GradeTypeValue,
} from "@/lib/grades";
import { saveGrades, type GradeFormState } from "./actions";

/**
 * BAHO KIRITISH FORMASI (100 BALLIK)
 * ==================================
 *
 * Davomatdan farqi: davomatda to'rtta tugma bosiladi, bahoda esa raqam
 * kiritiladi. Shuning uchun tugma emas, `input[type=number]` ishlatiladi va
 * klaviaturadan tez kiritish uchun `inputMode="numeric"` qo'yiladi.
 *
 * Maydonni BO'SH qoldirish = baho qo'yilmagan. Agar avval baho bo'lgan va
 * maydon tozalansa — baho o'chiriladi (xato kiritilgan bahoni tuzatish yo'li).
 * Shuning uchun forma barcha o'quvchilarni yuboradi, bo'sh qiymat ham
 * ma'noga ega.
 */

type StudentRow = { id: string; fullName: string };

type GradesFormProps = {
  lessonId: string;
  date: string;
  type: GradeTypeValue;
  students: StudentRow[];
  /** Allaqachon saqlangan baholar — forma ular bilan ochiladi. */
  initial: Record<string, number>;
  cancelHref: string;
};

const levelStyle: Record<string, string> = {
  excellent: "text-emerald-700",
  good: "text-sky-700",
  average: "text-amber-600",
  weak: "text-destructive",
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
  lessonId,
  date,
  type,
  students,
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
      const existing = initial[student.id];
      start[student.id] = existing === undefined ? "" : String(existing);
    }
    return start;
  });

  // Redirectdan keyin state undefined bo'lishi mumkin.
  const errorMessage = state?.error;

  const numericValues = students
    .map((student) => Number(values[student.id]))
    .filter((value) => Number.isFinite(value) && values !== undefined);

  const entered = students.filter(
    (student) => (values[student.id] ?? "").trim() !== ""
  );
  const average = averageOf(
    entered.map((student) => Number(values[student.id]))
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="type" value={type} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("valueHint")}</p>
        <p className="text-sm text-muted-foreground">
          {t("markedCount", {
            marked: entered.length,
            total: students.length,
          })}
          {average === null ? "" : ` · ${t("average", { value: average })}`}
        </p>
      </div>

      <div className="divide-y rounded-md border">
        {students.map((student, index) => {
          const raw = (values[student.id] ?? "").trim();
          const parsed = raw === "" ? null : Number(raw);
          const valid =
            parsed !== null &&
            Number.isInteger(parsed) &&
            parsed >= GRADE_MIN &&
            parsed <= GRADE_MAX;

          return (
            <div
              key={student.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium">
                {index + 1}. {student.fullName}
              </p>

              <div className="flex items-center gap-3">
                {valid ? (
                  <span
                    className={`text-xs font-medium ${
                      levelStyle[gradeLevelKey(parsed)] ?? ""
                    }`}
                  >
                    {t(`level.${gradeLevelKey(parsed)}`)}
                  </span>
                ) : null}

                <input
                  type="number"
                  inputMode="numeric"
                  min={GRADE_MIN}
                  max={GRADE_MAX}
                  step={1}
                  name={`${ENTRY_PREFIX}${student.id}`}
                  value={values[student.id] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [student.id]: event.target.value,
                    }))
                  }
                  placeholder={t("placeholder")}
                  className="h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          );
        })}
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
