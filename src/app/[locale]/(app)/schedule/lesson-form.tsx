"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAYS } from "@/lib/lessons";
import { createLesson, updateLesson, type LessonFormState } from "./actions";

type Option = { id: string; label: string };

type LessonFormProps = {
  mode: "create" | "edit";
  classes: Option[];
  subjects: Option[];
  teachers: Option[];
  periods: Option[];
  defaults?: { classId?: string; dayOfWeek?: number; periodId?: string };
  lesson?: {
    id: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    periodId: string | null;
    dayOfWeek: number;
    room: string | null;
  };
  cancelHref: string;
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("schedule");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : mode === "create" ? t("create") : t("save")}
    </Button>
  );
}

export function LessonForm({
  mode,
  classes,
  subjects,
  teachers,
  periods,
  defaults,
  lesson,
  cancelHref,
}: LessonFormProps) {
  const t = useTranslations("schedule");
  const action = mode === "create" ? createLesson : updateLesson;
  const [state, formAction] = useFormState<LessonFormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && lesson ? (
        <input type="hidden" name="id" value={lesson.id} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="classId">{t("class")}</Label>
          <select
            id="classId"
            name="classId"
            required
            defaultValue={lesson?.classId ?? defaults?.classId ?? ""}
            className={selectClass}
          >
            <option value="">{t("selectClass")}</option>
            {classes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subjectId">{t("subject")}</Label>
          <select
            id="subjectId"
            name="subjectId"
            required
            defaultValue={lesson?.subjectId ?? ""}
            className={selectClass}
          >
            <option value="">—</option>
            {subjects.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teacherId">{t("teacher")}</Label>
          <select
            id="teacherId"
            name="teacherId"
            required
            defaultValue={lesson?.teacherId ?? ""}
            className={selectClass}
          >
            <option value="">{t("selectTeacher")}</option>
            {teachers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="dayOfWeek">{t("day")}</Label>
          <select
            id="dayOfWeek"
            name="dayOfWeek"
            defaultValue={lesson?.dayOfWeek ?? defaults?.dayOfWeek ?? 1}
            className={selectClass}
          >
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {t(`days.${day}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="periodId">{t("period")}</Label>
          <select
            id="periodId"
            name="periodId"
            required
            defaultValue={lesson?.periodId ?? defaults?.periodId ?? ""}
            className={selectClass}
          >
            <option value="">—</option>
            {periods.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="room">{t("room")}</Label>
          <Input
            id="room"
            name="room"
            placeholder={t("roomPlaceholder")}
            defaultValue={lesson?.room ?? ""}
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton mode={mode} />
        <Button asChild variant="outline">
          <Link href={cancelHref}>{t("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
