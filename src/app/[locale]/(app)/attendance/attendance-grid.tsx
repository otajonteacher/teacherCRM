"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { VerticalHeader } from "@/components/vertical-header";
import {
  ATTENDANCE_ABBREVIATIONS,
  ATTENDANCE_LEGEND_ORDER,
  type LessonColumn,
} from "@/lib/journal";
import {
  ATTENDANCE_GRID_FIELD_PREFIX,
  attendanceCellKey,
} from "@/lib/attendance-grid";
import { saveAttendanceGrid, type AttendanceFormState } from "./actions";

/**
 * DAVOMAT JADVALI (sinf × kunning darslari)
 * =========================================
 *
 * | # | O'quvchi | Matematika | Matematika 2 | Ona tili | ... | Keldi |
 *
 * Jurnal jadvali bilan bir xil ko'rinish: sarlavhalar vertikal (pastdan
 * yuqoriga), input butun katakni egallaydi, tagida legenda turadi.
 *
 * Faqat foydalanuvchiga tegishli dars ustunlari ochiq. Boshqasi bloklangan
 * va tooltip chiqadi. Bu shunchaki qulaylik — haqiqiy himoya serverda
 * (`lessonScope`).
 *
 * Oxirgi ustun — shu o'quvchining kun bo'yicha "keldi" nisbati. Tirik
 * hisoblanadi, saqlashni kutmaydi: o'qituvchi to'ldirayotib kimning
 * qancha dars qoldirganini darhol ko'radi.
 */

export type AttendanceColumn = LessonColumn & { editable: boolean };

type StudentRow = { id: string; fullName: string };

type AttendanceGridProps = {
  classId: string;
  date: string;
  students: StudentRow[];
  columns: AttendanceColumn[];
  /** Saqlangan holatlar: attendanceCellKey(studentId, lessonId) → qisqartma. */
  initial: Record<string, string>;
  /** Foydalanuvchining shu kunda shu sinfda darsi bormi? */
  canEdit: boolean;
  cancelHref: string;
};

const cellStyle: Record<string, string> = {
  K: "bg-emerald-50 text-emerald-800",
  SZ: "bg-red-50 text-red-700",
  SL: "bg-sky-50 text-sky-800",
  KCH: "bg-amber-50 text-amber-800",
};

const cellInputClassName =
  "h-11 w-full border border-transparent px-1 text-center font-semibold uppercase outline-none focus:border-primary focus:bg-background disabled:cursor-not-allowed disabled:opacity-70";

/**
 * Ism-familiya ustuni.
 *
 * `whitespace-nowrap` — egasining talabi: eng uzun ism qancha joy olsa,
 * ustun shuncha keng bo'ladi. Qat'iy kenglik ataylab qo'yilmaydi, aks holda
 * uzun familiya ikki qatorga tushib siqilib qoladi. Bu qoida barcha
 * jadvallarda bir xil (jurnal, davomat, baholar).
 */
const nameHeaderClassName =
  "sticky left-0 z-10 whitespace-nowrap bg-muted/50 px-3 py-2 align-bottom text-left font-medium";
const nameCellClassName =
  "sticky left-0 z-10 whitespace-nowrap bg-background px-3 py-1.5";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("attendance");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : t("save")}
    </Button>
  );
}

export function AttendanceGrid({
  classId,
  date,
  students,
  columns,
  initial,
  canEdit,
  cancelHref,
}: AttendanceGridProps) {
  const t = useTranslations("attendance");
  const [state, formAction] = useFormState<AttendanceFormState, FormData>(
    saveAttendanceGrid,
    {}
  );

  const [marks, setMarks] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const student of students) {
      for (const column of columns) {
        const key = attendanceCellKey(student.id, column.id);
        start[key] = initial[key] ?? "";
      }
    }
    return start;
  });

  const errorMessage = state?.error;

  const editableColumns = columns.filter((column) => column.editable);

  /** "Hammasini keldi deb belgilash" — faqat O'Z ustunlari to'ldiriladi. */
  const markAllPresent = () => {
    setMarks((prev) => {
      const next = { ...prev };
      for (const student of students) {
        for (const column of editableColumns) {
          next[attendanceCellKey(student.id, column.id)] = "K";
        }
      }
      return next;
    });
  };

  const presentRatio = (studentId: string): string => {
    const filled = columns
      .map((column) => marks[attendanceCellKey(studentId, column.id)] ?? "")
      .filter((value) => value.trim() !== "");
    if (filled.length === 0) return "—";

    const present = filled.filter(
      (value) => value.trim().toUpperCase() === "K"
    ).length;
    return `${present}/${filled.length}`;
  };

  const totalCells = students.length * editableColumns.length;
  const filledCells = students.reduce(
    (sum, student) =>
      sum +
      editableColumns.filter(
        (column) =>
          (marks[attendanceCellKey(student.id, column.id)] ?? "").trim() !== ""
      ).length,
    0
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="date" value={date} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {canEdit ? (
          <Button type="button" variant="outline" onClick={markAllPresent}>
            {t("markAllPresent")}
          </Button>
        ) : (
          <span />
        )}
        <span className="text-sm text-muted-foreground">
          {t("markedCount", { marked: filledCells, total: totalCells })}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{t("gridHint")}</p>

      {/*
        Gorizontal siljish — dars ko'p bo'lgan kunda jadval kengayadi.
        Vertikal ichki scroll ATAYLAB yo'q (AGENTS.md, layout qoidasi).
      */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className={nameHeaderClassName}>{t("student")}</th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`w-16 border-l px-1 py-2 align-bottom font-medium ${
                    column.editable ? "" : "text-muted-foreground"
                  }`}
                  title={column.editable ? undefined : t("lockedTooltip")}
                >
                  <VerticalHeader>{column.label}</VerticalHeader>
                </th>
              ))}
              <th className="w-16 border-l bg-amber-100/70 px-1 py-2 align-bottom font-semibold">
                <VerticalHeader>{t("presentColumn")}</VerticalHeader>
              </th>
            </tr>
          </thead>

          <tbody>
            {students.map((student, index) => (
              <tr key={student.id} className="border-b last:border-b-0">
                <td className={nameCellClassName}>
                  <span className="text-muted-foreground">{index + 1}.</span>{" "}
                  <span className="font-medium">{student.fullName}</span>
                </td>

                {columns.map((column) => {
                  const key = attendanceCellKey(student.id, column.id);
                  const mark = (marks[key] ?? "").toUpperCase();

                  return (
                    /* p-0 — input katakni to'liq egallashi uchun. */
                    <td key={column.id} className="border-l p-0">
                      <input
                        type="text"
                        /*
                          Bloklangan ustunga `name` berilmaydi — shunda u
                          umuman yuborilmaydi.
                        */
                        name={
                          column.editable
                            ? `${ATTENDANCE_GRID_FIELD_PREFIX}${student.id}:${column.id}`
                            : undefined
                        }
                        value={marks[key] ?? ""}
                        onChange={(event) =>
                          setMarks((prev) => ({
                            ...prev,
                            [key]: event.target.value.toUpperCase(),
                          }))
                        }
                        disabled={!column.editable}
                        maxLength={3}
                        list="attendance-grid-marks"
                        aria-label={`${student.fullName} — ${column.label}`}
                        title={
                          column.editable ? t("gridHint") : t("lockedTooltip")
                        }
                        className={`${cellInputClassName} ${
                          cellStyle[mark] ?? "bg-background"
                        }`}
                      />
                    </td>
                  );
                })}

                <td className="border-l bg-amber-100/70 px-2 py-1.5 text-center font-semibold">
                  {presentRatio(student.id)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <datalist id="attendance-grid-marks">
        {ATTENDANCE_LEGEND_ORDER.map((status) => (
          <option key={status} value={ATTENDANCE_ABBREVIATIONS[status]} />
        ))}
      </datalist>

      {/* LEGENDA — jadval tagida, qog'oz jurnaldagidek. */}
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          {t("legendTitle")}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {ATTENDANCE_LEGEND_ORDER.map((status) => (
            <span key={status} className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                  cellStyle[ATTENDANCE_ABBREVIATIONS[status]] ?? ""
                }`}
              >
                {ATTENDANCE_ABBREVIATIONS[status]}
              </span>
              <span className="text-muted-foreground">
                {t(`status.${status}`)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {errorMessage ? (
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
      ) : null}

      {canEdit ? (
        <div className="flex gap-2">
          <SubmitButton />
          <Button asChild variant="outline">
            <Link href={cancelHref}>{t("cancel")}</Link>
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
      )}
    </form>
  );
}
