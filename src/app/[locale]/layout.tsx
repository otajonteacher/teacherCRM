import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";
import "../globals.css";

export const metadata: Metadata = {
  title: "Maktab CRM",
  description: "Xususiy maktab uchun CRM tizimi",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  // So'rovga mos tarjimalarni klient provayderga uzatamiz
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      {/*
        `min-h-screen` (100vh) emas, `h-full` (100%).
        Sababi: ilova qobig'i ham foizga o'tdi va endi `vh`/`dvh` farqi
        tufayli hujjat viewport'dan balandroq bo'lib qolmaydi — ya'ni
        ikkinchi (keraksiz) skrolbar paydo bo'lmaydi.
        Batafsil izoh: src/app/globals.css.
      */}
      <body className="h-full bg-background antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
