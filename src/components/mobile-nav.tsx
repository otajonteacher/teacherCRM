"use client";

import { useState } from "react";
import { Menu, GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("common");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-4">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 px-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">{t("appName")}</span>
          </SheetTitle>
        </SheetHeader>
        <Sidebar role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
