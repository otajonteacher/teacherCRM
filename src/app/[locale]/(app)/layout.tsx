import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { Sidebar } from "@/components/sidebar";
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
  // Autentifikatsiya qorovuli (RBAC poydevori)
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const t = await getTranslations("common");
  const tr = await getTranslations("roles");
  const { role, name } = session!.user;

  return (
    <div className="flex min-h-screen">
      {/* Yon menyu — faqat md+ ekranlarda */}
      <aside className="hidden w-64 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">{t("appName")}</span>
        </div>
        <Sidebar role={role} />
      </aside>

      {/* Asosiy qism */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6">
          {/* Chap: mobil hamburger + foydalanuvchi nomi */}
          <div className="flex items-center gap-3">
            {/* Mobil menyu tugmasi — faqat kichik ekranlarda */}
            <MobileNav role={role} />
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{tr(role)}</p>
            </div>
          </div>
          {/* O'ng: til va chiqish */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
