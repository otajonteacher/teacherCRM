"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/safe-action";
import { createStudent, updateStudent } from "../actions";
import type { StudentStatus } from "@prisma/client";

type ClassOption = { id: string; name: string };

type StudentFormProps = {
  mode: "create" | "edit";
  classes: ClassOption[];
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    classId: string | null;
    status: StudentStatus;
    guardianName: string;
    guardianPhone: string;
    guardianRelation: string;
  };
};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("students");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("saving") : mode === "create" ? t("create") : t("save")}
    </Button>
  );
}

export function StudentForm({ mode, classes, student }: StudentFormProps) {
  const t = useTranslations("students");
  const action = mode === "create" ? createStudent : updateStudent;
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && student ? (
        <input type="hidden" name="id" value={student.id} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t("firstName")}</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            defaultValue={student?.firstName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t("lastName")}</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            defaultValue={student?.lastName}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">{t("dateOfBirth")}</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={student?.dateOfBirth ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">{t("gender")}</Label>
          <select
            id="gender"
            name="gender"
            defaultValue={student?.gender ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("genderNone")}</option>
            <option value="male">{t("genderMale")}</option>
            <option value="female">{t("genderFemale")}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t("address")}</Label>
        <Input id="address" name="address" defaultValue={student?.address ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="classId">{t("class")}</Label>
          <select
            id="classId"
            name="classId"
            defaultValue={student?.classId ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("classNone")}</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">{t("status")}</Label>
          <select
            id="status"
            name="status"
            defaultValue={student?.status ?? "ACTIVE"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="ACTIVE">{t("statusActive")}</option>
            <option value="GRADUATED">{t("statusGraduated")}</option>
            <option value="LEFT">{t("statusLeft")}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="guardianName">{t("guardianName")}</Label>
          <Input
            id="guardianName"
            name="guardianName"
            defaultValue={student?.guardianName ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardianPhone">{t("guardianPhone")}</Label>
          <Input
            id="guardianPhone"
            name="guardianPhone"
            defaultValue={student?.guardianPhone ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardianRelation">{t("guardianRelation")}</Label>
          <Input
            id="guardianRelation"
            name="guardianRelation"
            defaultValue={student?.guardianRelation ?? ""}
          />
        </div>
      </div>

      {state && !state.ok ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <SubmitButton mode={mode} />
    </form>
  );
}
