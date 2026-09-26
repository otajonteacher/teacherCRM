"use client";

import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { Link, usePathname } from "@/i18n/navigation";
import {
  navGroupsByRole,
  isNavItemEnabled,
  type NavItem,
} from "./nav-config";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: Role;
  onNavigate?: () => void;
}

const ROW_CLASS =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium";

function LockedNavRow({ label }: { label: string }) {
  return (
    <span
      aria-disabled="true"
      className={cn(
        ROW_CLASS,
        "cursor-not-allowed select-none text-slate-400"
      )}
    >
      <span className="flex flex-1 items-center gap-3">{label}</span>
      <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
    </span>
  );
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
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-slate-950 to-slate-800 px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm shadow-slate-200 transition-colors hover:from-violet-700 hover:to-indigo-700"
        aria-expanded={open}
      >
        <span>{t(`groups.${groupKey}`)}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 pt-1">
            {items.map((navItem) => {
              const { key, href, icon: Icon } = navItem;

              if (!isNavItemEnabled(navItem)) {
                return <LockedNavRow key={key} label={t(key)} />;
              }

              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={key}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    ROW_CLASS,
                    "transition-all duration-200",
                    active
                      ? "bg-violet-50 text-violet-700 shadow-sm ring-1 ring-inset ring-violet-100"
                      : "text-slate-600 hover:bg-violet-50/80 hover:text-violet-700"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      active ? "text-violet-600" : "text-slate-400"
                    )}
                  />
                  <span className="truncate">{t(key)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const groups = navGroupsByRole[role];

  return (
    <nav className="flex flex-col gap-4">
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
