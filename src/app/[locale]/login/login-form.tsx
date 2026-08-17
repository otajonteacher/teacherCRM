"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("login");
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t("signingIn") : t("submit")}
    </Button>
  );
}

export function LoginForm() {
  const t = useTranslations("login");
  const locale = useLocale();
  const [state, formAction] = useFormState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="space-y-2">
        <Label htmlFor="login">{t("loginLabel")}</Label>
        <Input
          id="login"
          name="login"
          required
          autoComplete="username"
          placeholder="admin@maktab.uz"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-destructive">{t("error")}</p>
      )}

      <SubmitButton />
    </form>
  );
}
