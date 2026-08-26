/**
 * YUKLANISH SKELETI — "DARHOL JAVOB" TAJRIBASI
 * ============================================
 *
 * MUAMMO. Bu ilovadagi sahifalar server komponentlari: tugma bosilgach
 * brauzer serverdan to'liq HTML kutadi. Baza so'rovi 300 ms bo'lsa ham
 * foydalanuvchi ekranda HECH QANDAY o'zgarish ko'rmaydi — na kursor, na
 * indikator. Natijada "tizim qotib qoldi" degan taassurot paydo bo'ladi,
 * odam tugmani ikkinchi, uchinchi marta bosadi (va bu, o'z navbatida,
 * saqlash sahifalarida dublikat yozuvga olib kelishi mumkin).
 *
 * YECHIM. `loading.tsx` — Next.js App Router'ning Suspense chegarasi.
 * U mavjud bo'lsa navigatsiya BOSHLANGAN ZAHOTI shu skelet ko'rsatiladi:
 * yon menyu va sarlavha joyida qoladi, faqat kontent qismi "jimirlaydi".
 * Ya'ni javob tezligi o'zgarmasa ham, seziladigan tezlik keskin oshadi.
 *
 * Fayl `(app)` guruhining ILDIZIDA turadi — shuning uchun guruhdagi
 * BARCHA sahifalar (o'quvchilar, jurnal, baholar, reyting, davomat...)
 * avtomatik ravishda shu skeletni oladi. Har bir sahifa uchun alohida
 * fayl yozish kerak emas.
 *
 * Skeletda MATN yo'q — ataylab. Tarjima yuklash uchun ham server so'rovi
 * kerak bo'lardi, ya'ni "yuklanmoqda" yozuvining o'zi yuklanishni
 * kutardi. Shakl esa darhol chiziladi.
 *
 * `aria-busy` va `role="status"`: ekran o'qiyotgan foydalanuvchi ham
 * "hozir yuklanmoqda" degan xabarni oladi.
 */
export default function AppLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      {/* Sarlavha va tavsif joyi */}
      <div className="space-y-2">
        <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted/70" />
      </div>

      {/* Filtr paneli joyi — deyarli har bir sahifada mavjud */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 h-5 w-40 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-md bg-muted/70"
            />
          ))}
        </div>
      </div>

      {/* Jadval joyi */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 h-5 w-52 animate-pulse rounded-md bg-muted" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <div
              key={index}
              className="h-9 animate-pulse rounded-md bg-muted/60"
              /*
               * Har bir qator ozgina kechikish bilan jimirlaydi — statik
               * blokdan ko'ra "ish ketmoqda" degan taassurot beradi.
               */
              style={{ animationDelay: `${index * 60}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
