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
    // Ilova qobig'i ekran balandligida qulflanadi — sahifaning o'zi scroll qilmaydi.
    // Scroll faqat ikki joyda: yon menyu ro'yxati va asosiy kontent.
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Yon menyu — faqat md+ ekranlarda */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        {/* Logo qismi qotib turadi (scroll qilmaydi) */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <GraduationCap className="h-6 w-6 shrink-0 text-primary" />
          <span className="text-lg font-semibold">{t("appName")}</span>
        </div>
        {/* Menyu ro'yxati — o'z scroll'i, scrollbar ko'rinmaydi, scroll chetga o'tmaydi */}
        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain p-4">
          <Sidebar role={role} />
        </div>
      </aside>

      {/* Asosiy qism */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
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
        {/* Kontent o'z scroll konteyneri */}
        <main className="flex-1 overflow-y-auto overscroll-contain bg-muted/20 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
