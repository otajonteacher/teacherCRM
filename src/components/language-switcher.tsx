"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type AppLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(next: AppLocale) {
    startTransition(() => {
      router.replace(pathname, { locale: next, scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Languages className="h-4 w-4" />
      <select
        aria-label="Language"
        value={locale}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value as AppLocale)}
        className={cn(
          "cursor-pointer rounded-md border bg-background px-2 py-1 text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
