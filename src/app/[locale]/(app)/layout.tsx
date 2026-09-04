import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth-guard";
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
  // Autentifikatsiya qorovuli (RBAC poydevori).
  //
  // NIMA UCHUN `auth()` EMAS, `requireAuth()`:
  // `auth()` faqat token borligini ko'radi. Token esa serverda saqlanmaydi —
  // parol almashtirilgan yoki hisob bloklangan bo'lsa ham u 8 soat
  // amal qilaveradi. `requireAuth()` bazadan tekshiradi (isActive,
  // passwordChangedAt) va o'lik sessiyani darhol /login ga uzatadi.
  //
  // Ilgari layout `auth()` ishlatgani uchun bekor qilingan sessiya bilan ham
  // qobiq bir marta chizilib, foydalanuvchining ismi va roli ko'rinib
  // qolardi. Endi bunday emas.
  const user = await requireAuth();

  const t = await getTranslations("common");
  const tr = await getTranslations("roles");
  const { role, name } = user;

  return (
    // Ilova qobig'i aynan ekran balandligida qulflanadi — sahifaning o'zi
    // skrol qilmaydi. Skrol faqat ikki joyda: yon menyu va asosiy kontent.
    //
    // `h-[100dvh]` emas, `h-full`: `html`/`body` da `height: 100%` turgani
    // uchun bu aniq viewport balandligini beradi. Ilgari `body` da `100vh`,
    // bu yerda `100dvh` bo'lgani sabab ikkisi bir necha piksel farq qilib,
    // hujjat darajasida keraksiz ikkinchi skrolbar chiqib qolardi.
    <div className="flex h-full overflow-hidden">
      {/* Yon menyu — faqat md+ ekranlarda */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        {/* Logo qismi qotib turadi (scroll qilmaydi) */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <GraduationCap className="h-6 w-6 shrink-0 text-primary" />
          <span className="text-lg font-semibold">{t("appName")}</span>
        </div>
        {/* Menyu ro'yxati — o'z skroli, ingichka skrolbar, skrol chetga o'tmaydi */}
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
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
        {/* Kontent o'z skrol konteyneri (`min-h-0` bo'lmasa flex element qisqarmaydi) */}
        <main className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
