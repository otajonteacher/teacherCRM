"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveRankingSettings,
  type RankingSettingsFormState,
} from "./actions";

/**
 * FORMULA SOZLAMALARI — FAQAT ADMINISTRATOR UCHUN
 * ===============================================
 *
 * Bu forma sahifada faqat administratorga ko'rsatiladi. Lekin ko'rsatmaslik
 * — himoya emas: forma HTML dan yashirilsa ham so'rovni qo'lda yuborish
 * mumkin. Haqiqiy qalqon Server Action ichidagi `roles: ["ADMIN"]`.
 * Bu komponent shunchaki qulaylik.
 */
function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function RankingSettingsForm({
  gradeWeight,
  testWeight,
  penaltyFactor,
}: {
  gradeWeight: number;
  testWeight: number;
  penaltyFactor: number;
}) {
  const t = useTranslations("ranking");
  const [state, formAction] = useFormState<RankingSettingsFormState, FormData>(
    saveRankingSettings,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="gradeWeight">{t("gradeWeight")}</Label>
          <Input
            id="gradeWeight"
            name="gradeWeight"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={gradeWeight}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="testWeight">{t("testWeight")}</Label>
          <Input
            id="testWeight"
            name="testWeight"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={testWeight}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="penaltyFactor">{t("penaltyFactor")}</Label>
          <Input
            id="penaltyFactor"
            name="penaltyFactor"
            type="number"
            min={0}
            max={1000}
            step={1}
            defaultValue={penaltyFactor}
            required
          />
          <p className="text-xs text-muted-foreground">
            {t("penaltyFactorHint")}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("formulaHint")}</p>

      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state?.saved ? (
        <p className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700">
          {t("saved")}
        </p>
      ) : null}

      <SubmitButton label={t("save")} pendingLabel={t("saving")} />
    </form>
  );
}
