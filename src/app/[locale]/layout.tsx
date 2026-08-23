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
        `min-h-screen` — sahifa kamida ekran balandligida, lekin kontent
        katta bo'lsa erkin o'sadi va ODDIY sahifa skroli ishlaydi.
        `html`/`body` ga balandlik qulfi yoki `overflow: hidden` QO'YILMAYDI:
        yagona skrol — sahifaning o'zi.
      */}
      <body className="min-h-screen bg-background antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
