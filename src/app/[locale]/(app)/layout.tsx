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

/**
 * ILOVA QOBIG'I — SKROL QOIDASI
 * =============================
 *
 * YAGONA ko'rinadigan skrol — sahifaning o'zi (brauzerning o'ng chetidagi
 * asosiy skroli). Kontent maydoni ichida ALOHIDA skrol konteyneri
 * YARATILMAYDI: jadvallar va ro'yxatlar tabiiy ravishda uzun bo'ladi va
 * sahifa bilan birga skrol bo'lishi kerak.
 *
 * Yon menyu va header ko'z oldida qolishi `overflow` bilan emas,
 * `position: sticky` bilan hal qilinadi — sticky yangi skrol konteyneri
 * YARATMAYDI, ya'ni qo'shimcha skrolbar chiqmaydi.
 *
 * Yon menyuning o'zi uzun bo'lishi mumkin (bandlar ko'p), shuning uchun
 * unda ichki skrol bor — lekin skrolbari `no-scrollbar` bilan yashirilgan.
 *
 * BALANDLIK TAQSIMOTI (pastdagi bo'sh maydon muammosi)
 * ----------------------------------------------------
 * `min-h-screen` ataylab TASHQI konteynerda emas, O'NG USTUNDA turadi.
 *
 * Nima uchun: yon menyu `h-screen` (aynan bir ekran) va `self-start`.
 * Agar `min-h-screen` tashqi flex konteynerga berilsa, konteyner
 * balandligi eng baland bolaga qarab o'sadi, yon menyu esa `h-screen`
 * bo'lib qolgani uchun uning ostida bo'sh joy paydo bo'ladi — va o'ng
 * ustundagi `main` foni ham konteynerning to'liq balandligini qoplamay,
 * sahifa oxirida oq bo'shliq ko'rinadi.
 *
 * `min-h-screen` o'ng ustunda bo'lsa: ustun kamida bir ekran, kontent
 * katta bo'lsa erkin o'sadi va `main` (flex-1) doim to'liq to'ladi.
 * Bo'sh maydon qolmaydi.
 */
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
    // `overflow-hidden`, qat'iy balandlik va `min-h-screen` YO'Q —
    // balandlikni o'ng ustun belgilaydi (yuqoridagi izohga qarang).
    <div className="flex">
      {/*
        Yon menyu — faqat md+ ekranlarda.
        `sticky top-0 h-screen` — skrol paytida joyida qotib turadi.
        `self-start` — flex ichida element sukut bo'yicha konteyner
        balandligiga cho'ziladi, bu esa sticky ni ishlamay qo'yadi.
      */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start border-r bg-card md:flex">
        {/* Logo qismi qotib turadi */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <GraduationCap className="h-6 w-6 shrink-0 text-primary" />
          <span className="text-lg font-semibold">{t("appName")}</span>
        </div>
        {/*
          Menyu ro'yxati — bandlar ekranga sig'masa ichida skrol bo'ladi,
          lekin skrolbar chizig'i KO'RINMAYDI. `min-h-0` bo'lmasa flex
          element qisqarmaydi va skrol umuman ishlamaydi.
        */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <Sidebar role={role} />
        </div>
      </aside>

      {/* Asosiy qism — balandlikni aynan shu ustun belgilaydi */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Header sticky — skrol qilganda tepada qotib turadi */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
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
        {/* Kontent — ICHKI SKROL YO'Q, sahifa bilan birga skrol bo'ladi */}
        <main className="flex-1 bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
