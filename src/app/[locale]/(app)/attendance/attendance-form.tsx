"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  ATTENDANCE_STATUSES,
  ENTRY_PREFIX,
  type AttendanceStatusValue,
} from "@/lib/attendance";
import { saveAttendance, type AttendanceFormState } from "./actions";

/**
 * TEZKOR KIRITISH FORMASI
 * =======================
 *
 * Butun sinf bitta ekranda, har bir o'quvchida to'rtta tugma. Odatda darsda
 * hamma keladi, shuning uchun tepada "Hammasini keldi deb belgilash" bor:
 * bir bosishda hamma PRESENT bo'ladi, o'qituvchi esa faqat istisnolarni
 * o'zgartiradi.
 *
 * Radio maydon nomi har bir o'quvchi uchun alohida ("entry:<id>") — aks holda
 * butun sinf bitta radio guruhga aylanib qolardi.
 */

type StudentRow = { id: string; fullName: string };

type AttendanceFormProps = {
  lessonId: string;
  date: string;
  students: StudentRow[];
  /** Allaqachon saqlangan holatlar — forma ular bilan ochiladi. */
  initial: Record<string, AttendanceStatusValue>;
  cancelHref: string;
};

const statusStyle: Record<AttendanceStatusValue, string> = {
  PRESENT: "border-emerald-600 bg-emerald-600 text-white",
  ABSENT: "border-destructive bg-destructive text-destructive-foreground",
  LATE: "border-amber-500 bg-amber-500 text-white",
  EXCUSED: "border-sky-600 bg-sky-600 text-white",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("attendance");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : t("save")}
    </Button>
  );
}

export function AttendanceForm({
  lessonId,
  date,
  students,
  initial,
  cancelHref,
}: AttendanceFormProps) {
  const t = useTranslations("attendance");
  const [state, formAction] = useFormState<AttendanceFormState, FormData>(
    saveAttendance,
    {}
  );

  const [marks, setMarks] = useState<
    Record<string, AttendanceStatusValue | undefined>
  >(initial);

  // Redirectdan keyin state undefined bo'lishi mumkin.
  const errorMessage = state?.error;
  const markedCount = students.filter((student) => marks[student.id]).length;

  const markAllPresent = () => {
    const next: Record<string, AttendanceStatusValue> = {};
    for (const student of students) next[student.id] = "PRESENT";
    setMarks(next);
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="date" value={date} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={markAllPresent}>
          {t("markAllPresent")}
        </Button>
        <p className="text-sm text-muted-foreground">
          {t("markedCount", { marked: markedCount, total: students.length })}
        </p>
      </div>

      <div className="divide-y rounded-md border">
        {students.map((student, index) => (
          <div
            key={student.id}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm font-medium">
              {index + 1}. {student.fullName}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ATTENDANCE_STATUSES.map((status) => {
                const active = marks[student.id] === status;
                return (
                  <label
                    key={status}
                    className={`cursor-pointer rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? statusStyle[status]
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${ENTRY_PREFIX}${student.id}`}
                      value={status}
                      checked={active}
                      onChange={() =>
                        setMarks((prev) => ({ ...prev, [student.id]: status }))
                      }
                      className="sr-only"
                    />
                    {t(`status.${status}`)}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

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
