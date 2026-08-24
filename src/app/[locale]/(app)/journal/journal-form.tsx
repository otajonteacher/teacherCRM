"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { VerticalHeader } from "@/components/vertical-header";
import { GRADE_MAX, GRADE_MIN, averageOf, gradeLevelKey } from "@/lib/grades";
import {
  ATTENDANCE_ABBREVIATIONS,
  ATTENDANCE_LEGEND_ORDER,
  ATTENDANCE_FIELD_PREFIX,
  GRADE_FIELD_PREFIX,
  journalCellKey,
  parseTopN,
  rankByAverage,
  type LessonColumn,
} from "@/lib/journal";
import { saveJournal, type JournalFormState } from "./actions";

/**
 * KUNLIK JURNAL JADVALI
 * =====================
 *
 * | # | O'quvchi | Davomat | Matematika | Matematika 2 | ... | O'rtacha | O'rin |
 *
 * Sarlavhalar VERTIKAL (pastdan yuqoriga) — shunda 8–10 ta dars ustuni ham
 * ekranga sig'adi. Katakchalardagi input butun katakni egallaydi: sichqoncha
 * katakning istalgan joyiga tegsa ham kursor inputga tushadi, ya'ni tez
 * yozish uchun mo'ljal olish kerak emas.
 *
 * Faqat foydalanuvchining O'Z dars ustunlari ochiq. Boshqa ustun inputi
 * bloklangan va ustiga kursor kelsa tooltip chiqadi — alohida modal oyna
 * ochilmaydi (egasining talabi: kichik xabarcha yetarli).
 *
 * O'rtacha va o'rin TIRIK hisoblanadi — raqam kiritilishi bilan yangilanadi,
 * saqlashni kutib turmaydi.
 *
 * Bu yerdagi barcha tekshiruvlar faqat QULAYLIK uchun. Haqiqiy himoya
 * serverda: zod 0–100, `gradingLessonScope` bilan o'z darslarini serverning
 * o'zi topishi, o'quvchi va dars filtri. Klientdagi `disabled` ni brauzer
 * konsolidan olib tashlash mumkin — shuning uchun unga hech qachon
 * ishonilmaydi.
 */

export type JournalColumn = LessonColumn & { editable: boolean };

type StudentRow = { id: string; fullName: string };

type JournalFormProps = {
  classId: string;
  date: string;
  students: StudentRow[];
  columns: JournalColumn[];
  /** Saqlangan baholar: journalCellKey(studentId, lessonId) → qiymat. */
  initialGrades: Record<string, number>;
  /** Saqlangan davomat: studentId → qisqartma ("K", "SZ", "SL", "KCH"). */
  initialAttendance: Record<string, string>;
  /** Foydalanuvchining shu kunda shu sinfda darsi bormi? */
  canEdit: boolean;
  cancelHref: string;
};

const levelCellStyle: Record<string, string> = {
  excellent: "bg-emerald-50 text-emerald-800",
  good: "bg-sky-50 text-sky-800",
  average: "bg-amber-50 text-amber-800",
  weak: "bg-red-50 text-red-700",
};

const attendanceCellStyle: Record<string, string> = {
  K: "bg-emerald-50 text-emerald-800",
  SZ: "bg-red-50 text-red-700",
  SL: "bg-sky-50 text-sky-800",
  KCH: "bg-amber-50 text-amber-800",
};

/**
 * Input butun katakni egallashi uchun ishlatiladigan sinflar.
 * `h-full w-full` + katakda `p-0` — shunda chegara ichida bo'sh joy qolmaydi.
 */
const cellInputClassName =
  "h-11 w-full border border-transparent px-1 text-center font-medium outline-none focus:border-primary focus:bg-background disabled:cursor-not-allowed disabled:opacity-70";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("journal");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : t("save")}
    </Button>
  );
}

export function JournalForm({
  classId,
  date,
  students,
  columns,
  initialGrades,
  initialAttendance,
  canEdit,
  cancelHref,
}: JournalFormProps) {
  const t = useTranslations("journal");
  const [state, formAction] = useFormState<JournalFormState, FormData>(
    saveJournal,
    {}
  );

  const [grades, setGrades] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const student of students) {
      for (const column of columns) {
        const key = journalCellKey(student.id, column.id);
        const existing = initialGrades[key];
        start[key] = existing === undefined ? "" : String(existing);
      }
    }
    return start;
  });

  const [attendance, setAttendance] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const student of students) {
      start[student.id] = initialAttendance[student.id] ?? "";
    }
    return start;
  });

  const [topNText, setTopNText] = useState("");
  const topN = parseTopN(topNText);

  // Redirectdan keyin state undefined bo'lishi mumkin.
  const errorMessage = state?.error;

  const numbersOf = (studentId: string): number[] =>
    columns
      .map((column) => (grades[journalCellKey(studentId, column.id)] ?? "").trim())
      .filter((text) => text !== "")
      .map((text) => Number(text))
      .filter((value) => Number.isFinite(value));

  const averages = students.map((student) => ({
    id: student.id,
    average: averageOf(numbersOf(student.id)),
  }));

  const averageById = new Map(
    averages.map((row) => [row.id, row.average] as const)
  );
  const ranks = rankByAverage(averages, topN);

  /**
   * Baho kiritilganda davomat bo'sh bo'lsa avtomatik "K" qo'yiladi.
   * Server ham xuddi shunday qiladi — bu yerda faqat o'qituvchi o'zgarishni
   * DARHOL ko'rishi uchun takrorlanadi.
   */
  const handleGradeChange = (
    studentId: string,
    lessonId: string,
    value: string
  ) => {
    setGrades((prev) => ({
      ...prev,
      [journalCellKey(studentId, lessonId)]: value,
    }));

    if (value.trim() !== "" && (attendance[studentId] ?? "") === "") {
      setAttendance((prev) => ({ ...prev, [studentId]: "K" }));
    }
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="date" value={date} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("gridHint")}</p>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("topN")}</span>
          <input
            type="number"
            min={1}
            step={1}
            value={topNText}
            onChange={(event) => setTopNText(event.target.value)}
            placeholder="7"
            className="h-9 w-20 rounded-md border border-input bg-background px-2 text-center text-sm"
          />
        </label>
      </div>

      {/*
        Gorizontal siljish — dars ko'p bo'lgan kunda jadval kengayadi.
        Vertikal ichki scroll ATAYLAB yo'q: sahifada bitta asosiy scroll
        bo'lishi kerak (AGENTS.md, layout qoidasi).
      */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-10 min-w-[200px] bg-muted/50 px-3 py-2 align-bottom text-left font-medium">
                {t("student")}
              </th>
              <th className="w-16 border-l px-1 py-2 align-bottom font-medium">
                <VerticalHeader>{t("attendance")}</VerticalHeader>
              </th>
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
                <VerticalHeader>{t("averageColumn")}</VerticalHeader>
              </th>
              <th className="w-16 border-l bg-amber-100/70 px-1 py-2 align-bottom font-semibold">
                <VerticalHeader>{t("rankColumn")}</VerticalHeader>
              </th>
            </tr>
          </thead>

          <tbody>
            {students.map((student, index) => {
              const average = averageById.get(student.id) ?? null;
              const rank = ranks[student.id];
              const mark = (attendance[student.id] ?? "").toUpperCase();

              return (
                <tr key={student.id} className="border-b last:border-b-0">
                  <td className="sticky left-0 z-10 bg-background px-3 py-1.5">
                    <span className="text-muted-foreground">{index + 1}.</span>{" "}
                    <span className="font-medium">{student.fullName}</span>
                  </td>

                  {/* p-0 — input katakni to'liq egallashi uchun. */}
                  <td className="border-l p-0">
                    <input
                      type="text"
                      name={
                        canEdit
                          ? `${ATTENDANCE_FIELD_PREFIX}${student.id}`
                          : undefined
                      }
                      value={attendance[student.id] ?? ""}
                      onChange={(event) =>
                        setAttendance((prev) => ({
                          ...prev,
                          [student.id]: event.target.value.toUpperCase(),
                        }))
                      }
                      disabled={!canEdit}
                      maxLength={3}
                      list="attendance-marks"
                      aria-label={`${student.fullName} — ${t("attendance")}`}
                      title={canEdit ? t("gridHint") : t("readOnly")}
                      className={`${cellInputClassName} font-semibold uppercase ${
                        attendanceCellStyle[mark] ?? "bg-background"
                      }`}
                    />
                  </td>

                  {columns.map((column) => {
                    const key = journalCellKey(student.id, column.id);
                    const raw = (grades[key] ?? "").trim();
                    const parsed = raw === "" ? null : Number(raw);
                    const valid =
                      parsed !== null &&
                      Number.isInteger(parsed) &&
                      parsed >= GRADE_MIN &&
                      parsed <= GRADE_MAX;

                    return (
                      <td key={column.id} className="border-l p-0">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={GRADE_MIN}
                          max={GRADE_MAX}
                          step={1}
                          /*
                            Bloklangan ustunga `name` berilmaydi — shunda u
                            umuman yuborilmaydi. Bu himoyaning birinchi
                            qatlami emas, shunchaki keraksiz ma'lumot
                            yubormaslik uchun.
                          */
                          name={
                            column.editable
                              ? `${GRADE_FIELD_PREFIX}${student.id}:${column.id}`
                              : undefined
                          }
                          value={grades[key] ?? ""}
                          onChange={(event) =>
                            handleGradeChange(
                              student.id,
                              column.id,
                              event.target.value
                            )
                          }
                          disabled={!column.editable}
                          aria-label={`${student.fullName} — ${column.label}`}
                          title={
                            column.editable ? undefined : t("lockedTooltip")
                          }
                          className={`${cellInputClassName} ${
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
                  <td className="border-l bg-amber-100/70 px-2 py-1.5 text-center font-semibold">
                    {rank === undefined ? "—" : rank}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Qisqartmalarni tez tanlash uchun — klaviaturadan yozish ham ishlaydi. */}
      <datalist id="attendance-marks">
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
                  attendanceCellStyle[ATTENDANCE_ABBREVIATIONS[status]] ?? ""
                }`}
              >
                {ATTENDANCE_ABBREVIATIONS[status]}
              </span>
              <span className="text-muted-foreground">
                {t(`legend.${status}`)}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("autoPresentHint")}
        </p>
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
