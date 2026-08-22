"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAcademicYear,
  updateAcademicYear,
  type AcademicYearFormState,
} from "./actions";

export type AcademicYearFormValues = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  quarters: Array<{ name: number; startDate: string; endDate: string }>;
};

type AcademicYearFormProps = {
  mode: "create" | "edit";
  year?: AcademicYearFormValues;
};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("academicYears");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : mode === "create" ? t("create") : t("save")}
    </Button>
  );
}

const QUARTERS = [1, 2, 3, 4];

export function AcademicYearForm({ mode, year }: AcademicYearFormProps) {
  const t = useTranslations("academicYears");
  const action = mode === "create" ? createAcademicYear : updateAcademicYear;
  const [state, formAction] = useFormState<AcademicYearFormState, FormData>(
    action,
    {}
  );

  const quarterValue = (index: number, field: "startDate" | "endDate") =>
    year?.quarters.find((quarter) => quarter.name === index)?.[field] ?? "";

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && year ? (
        <input type="hidden" name="id" value={year.id} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="2025-2026"
            defaultValue={year?.name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">{t("startDate")}</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={year?.startDate ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">{t("endDate")}</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={year?.endDate ?? ""}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{t("quarters")}</p>
          <p className="text-sm text-muted-foreground">{t("quartersHint")}</p>
        </div>
        {QUARTERS.map((index) => (
          <div key={index} className="grid gap-4 sm:grid-cols-3">
            <p className="self-center text-sm text-muted-foreground">
              {t("quarter", { index })}
            </p>
            <Input
              name={`q${index}Start`}
              type="date"
              aria-label={t("startDate")}
              defaultValue={quarterValue(index, "startDate")}
            />
            <Input
              name={`q${index}End`}
              type="date"
              aria-label={t("endDate")}
              defaultValue={quarterValue(index, "endDate")}
            />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isCurrent"
          defaultChecked={year?.isCurrent ?? mode === "create"}
          className="h-4 w-4 rounded border-input"
        />
        {t("isCurrentHint")}
      </label>

      {state.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton mode={mode} />
        {mode === "edit" ? (
          <Button asChild variant="outline">
            <Link href="/academic-years">{t("cancel")}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
