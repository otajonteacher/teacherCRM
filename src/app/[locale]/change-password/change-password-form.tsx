"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { changePassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/safe-action";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("changePassword");
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t("saving") : t("submit")}
    </Button>
  );
}

export function ChangePasswordForm() {
  const t = useTranslations("changePassword");
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    changePassword,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t("currentLabel")}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("newLabel")}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("confirmLabel")}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>

      {state && !state.ok && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}

      <p className="text-xs text-muted-foreground">{t("hint")}</p>

      <SubmitButton />
    </form>
  );
}
