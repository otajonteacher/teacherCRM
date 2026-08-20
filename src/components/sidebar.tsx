"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { Link, usePathname } from "@/i18n/navigation";
import { navGroupsByRole, type NavItem } from "./nav-config";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: Role;
  onNavigate?: () => void;
}

function NavGroup({
  groupKey,
  items,
  pathname,
  onNavigate,
}: {
  groupKey: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-primary hover:bg-accent"
        aria-expanded={open}
      >
        <span>{t(`groups.${groupKey}`)}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            !open && "-rotate-90"
          )}
        />
      </button>
      {open &&
        items.map(({ key, href, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
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
    </div>
  );
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const groups = navGroupsByRole[role];

  return (
    <nav className="flex flex-col gap-3">
      {groups.map(({ groupKey, items }) => (
        <NavGroup
          key={groupKey}
          groupKey={groupKey}
          items={items}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
