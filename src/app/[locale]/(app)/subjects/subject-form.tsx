"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSubject, updateSubject, type SubjectFormState } from "./actions";

type SubjectFormProps = {
  mode: "create" | "edit";
  subject?: {
    id: string;
    nameUz: string;
    nameRu: string | null;
    nameEn: string | null;
  };
};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("subjects");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : mode === "create" ? t("create") : t("save")}
    </Button>
  );
}

export function SubjectForm({ mode, subject }: SubjectFormProps) {
  const t = useTranslations("subjects");
  const action = mode === "create" ? createSubject : updateSubject;
  const [state, formAction] = useFormState<SubjectFormState, FormData>(action, {});

  // Redirectdan keyin state undefined bo'lishi mumkin.
  const errorMessage = state?.error;

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && subject ? (
        <input type="hidden" name="id" value={subject.id} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="nameUz">{t("nameUz")}</Label>
          <Input id="nameUz" name="nameUz" required defaultValue={subject?.nameUz ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nameRu">{t("nameRu")}</Label>
          <Input id="nameRu" name="nameRu" defaultValue={subject?.nameRu ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nameEn">{t("nameEn")}</Label>
          <Input id="nameEn" name="nameEn" defaultValue={subject?.nameEn ?? ""} />
        </div>
      </div>

      {errorMessage ? (
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton mode={mode} />
        {mode === "edit" ? (
          <Button asChild variant="outline">
            <Link href="/subjects">{t("cancel")}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
