import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth-guard";
import { AppShell } from "@/components/app-shell";
import { MobileNav } from "@/components/mobile-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "./logout-button";

// Himoyalangan qism auth (cookies) ishlatadi — dinamik render
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth tekshiruvi o'zgarmaydi: navbar faqat tekshirilgan foydalanuvchiga chiziladi.
  const user = await requireAuth();

  const t = await getTranslations("common");
  const tr = await getTranslations("roles");
  const { role, name } = user;

  return (
    <AppShell
      role={role}
      appName={t("appName")}
      userName={name ?? ""}
      roleLabel={tr(role)}
      mobileNav={<MobileNav role={role} />}
      languageSwitcher={<LanguageSwitcher />}
      logoutButton={<LogoutButton />}
    >
      {children}
    </AppShell>
  );
}
