"use client";

import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { PanelLeftClose, PanelLeftOpen, GraduationCap } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

type AppShellProps = {
  role: Role;
  appName: string;
  userName: string;
  roleLabel: string;
  mobileNav: ReactNode;
  languageSwitcher: ReactNode;
  logoutButton: ReactNode;
  children: ReactNode;
};

export function AppShell({
  role,
  appName,
  userName,
  roleLabel,
  mobileNav,
  languageSwitcher,
  logoutButton,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="flex h-full overflow-hidden bg-slate-50/70">
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white/95 shadow-[4px_0_24px_rgba(15,23,42,0.04)] backdrop-blur transition-[width,opacity] duration-300 ease-out",
          sidebarOpen ? "w-72 opacity-100" : "w-0 border-r-0 opacity-0"
        )}
        aria-hidden={!sidebarOpen}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="truncate text-lg font-bold tracking-tight text-slate-900">
            {appName}
          </span>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <Sidebar role={role} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 md:inline-flex"
              aria-label="Toggle navigation"
              title="Toggle navigation"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
            {mobileNav}
            <div>
              <p className="text-sm font-semibold text-slate-900">{userName}</p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {languageSwitcher}
            {logoutButton}
          </div>
        </header>
        <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

import * as React from "react";
