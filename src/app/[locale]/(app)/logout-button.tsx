"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { logout } from "./actions";

export function LogoutButton() {
  const t = useTranslations("common");
  return (
    <form action={logout}>
      <Button variant="ghost" size="sm" type="submit">
        <LogOut className="h-4 w-4" />
        {t("logout")}
      </Button>
    </form>
  );
}
