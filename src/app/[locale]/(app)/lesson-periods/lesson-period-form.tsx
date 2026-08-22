"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createLessonPeriod,
  updateLessonPeriod,
  type LessonPeriodFormState,
} from "./actions";

type LessonPeriodFormProps = {
  mode: "create" | "edit";
  nextIndex: number;
  period?: {
    id: string;
    index: number;
    label: string | null;
    startTime: string;
    endTime: string;
  };
};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("lessonPeriods");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : mode === "create" ? t("create") : t("save")}
    </Button>
  );
}

export function LessonPeriodForm({
  mode,
  nextIndex,
  period,
}: LessonPeriodFormProps) {
  const t = useTranslations("lessonPeriods");
  const action = mode === "create" ? createLessonPeriod : updateLessonPeriod;
  const [state, formAction] = useFormState<LessonPeriodFormState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && period ? (
        <input type="hidden" name="id" value={period.id} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="index">{t("index")}</Label>
          <Input
            id="index"
            name="index"
            type="number"
            min={1}
            max={20}
            required
            defaultValue={period?.index ?? nextIndex}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">{t("startTime")}</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue={period?.startTime ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">{t("endTime")}</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            required
            defaultValue={period?.endTime ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">{t("label")}</Label>
          <Input id="label" name="label" defaultValue={period?.label ?? ""} />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton mode={mode} />
        {mode === "edit" ? (
          <Button asChild variant="outline">
            <Link href="/lesson-periods">{t("cancel")}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
