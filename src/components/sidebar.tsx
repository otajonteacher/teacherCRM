"use client";

import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { Link, usePathname } from "@/i18n/navigation";
import { navByRole } from "./nav-config";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: Role;
  onNavigate?: () => void;
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = navByRole[role];

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ key, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
