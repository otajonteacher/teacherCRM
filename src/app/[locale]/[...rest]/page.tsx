import { notFound } from "next/navigation";

/**
 * next-intl: mavjud bo'lmagan yo'llar (`/uz/users`) default Next.js 404 ni
 * ko'rsatadi. Shu catch-all `notFound()` chaqiradi — [locale]/not-found.tsx
 * (bosh sahifaga qaytish tugmasi bilan) ochiladi.
 */
export default function CatchAllPage() {
  notFound();
}
