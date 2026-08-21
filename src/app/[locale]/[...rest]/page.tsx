import { notFound } from "next/navigation";

/**
 * Mavjud bo'lmagan yo'llar (`/uz/classes`) (app) tashqarisida notFound()
 * chaqiradi — [locale]/not-found.tsx to'liq sahifani egallaydi (sidebar yo'q).
 */
export default function CatchAllPage() {
  notFound();
}
