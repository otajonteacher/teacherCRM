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
      {/* Sarlavha qotib turadi, ro'yxat o'z ichida scroll bo'ladi */}
      <SheetContent side="left" className="flex w-64 flex-col p-0">
        <SheetHeader className="h-16 shrink-0 justify-center border-b px-4">
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 shrink-0 text-primary" />
            <span className="text-lg font-semibold">{t("appName")}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain p-4">
          <Sidebar role={role} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
