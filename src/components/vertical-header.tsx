/**
 * VERTIKAL JADVAL SARLAVHASI
 * ==========================
 *
 * Matnni pastdan yuqoriga o'giradi (egasining talabi). Jurnal jadvalida
 * 8–10 ta fan ustuni bo'lishi mumkin — gorizontal sarlavha bilan jadval
 * ekranga sig'maydi va gorizontal scroll paydo bo'ladi. Vertikal sarlavha
 * ustunni ~3 barobar toraytiradi.
 *
 * `writing-mode: vertical-rl` matnni yuqoridan pastga yozadi, `rotate-180`
 * esa uni teskari aylantirib PASTDAN YUQORIGA holatga keltiradi — qog'oz
 * jurnaldagi kabi.
 *
 * Balandlik qat'iy belgilanadi (`h-32`), aks holda uzun fan nomi qatorni
 * cho'zib yuboradi va ustunlar bir tekis bo'lmaydi.
 */
export function VerticalHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`mx-auto flex h-32 items-start justify-center whitespace-nowrap rotate-180 [writing-mode:vertical-rl] ${className}`}
    >
      {children}
    </span>
  );
}
