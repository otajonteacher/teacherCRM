import { cache } from "react";
import { auth } from "@/auth";

/**
 * SESSIYANI BIR SO'ROVDA BIR MARTA O'QISH
 * =======================================
 *
 * MUAMMO. Bitta sahifa ochilganda `auth()` kamida ikki marta chaqiriladi:
 * bir marta `(app)/layout.tsx` da, bir marta sahifaning o'zida
 * (`requireRole`). Ba'zi sahifalarda uchinchi marta — Server Action ichida.
 *
 * Har bir chaqiruv arzon emas:
 *   1. cookie o'qiladi va JWT deshifrlanadi (kriptografik amal);
 *   2. `JWT_RECHECK_MS` muddati o'tgan bo'lsa BAZAGA so'rov ketadi
 *      (`db.user.findUnique`) — ya'ni bir sahifa uchun ikki-uch marta
 *      bir xil qatorni o'qiymiz.
 *
 * YECHIM. React'ning `cache()` funksiyasi natijani BITTA SO'ROV doirasida
 * eslab qoladi. Shu tufayli `getSession()` necha marta chaqirilsa ham,
 * server bitta so'rovda faqat bir marta ishlaydi. Keyingi so'rovda kesh
 * bo'sh — ya'ni bloklangan hisob bo'yicha tekshiruv kuchsizlanmaydi.
 *
 * XAVFSIZLIK IZOHI: bu kesh so'rovlar orasida SAQLANMAYDI va
 * foydalanuvchilar orasida umumiy emas. `cache()` har bir server
 * so'rovi uchun alohida idish yaratadi, shuning uchun bir foydalanuvchining
 * sessiyasi boshqasiga o'tib ketishi mumkin emas.
 *
 * QOIDA: sahifalar va action'larda to'g'ridan-to'g'ri `auth()` emas, shu
 * `getSession()` ishlatiladi (yoki `auth-guard.ts` qorovullari orqali).
 */
export const getSession = cache(() => auth());
