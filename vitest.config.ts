import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * VITEST SOZLAMASI
 *
 * environment: "node" — hozir test qilinadigan narsa src/lib dagi sof
 * funksiyalar (scope, rbac, ranking, attendance, journal). Ular DOM'ga
 * muhtoj emas, shuning uchun jsdom qo'shilmadi.
 *
 * globals: false — describe/it/expect har faylda ochiq import qilinadi.
 *
 * TAXALLUS (@/) NIMA UCHUN QO'LDA BELGILANGAN
 * ============================================
 * Avval `vite-tsconfig-paths` plugini ishlatilgan edi — u taxallusni
 * to'g'ridan-to'g'ri tsconfig.json dan o'qiydi. Lekin u faqat ESM
 * ko'rinishida tarqatiladi, bu fayl esa CommonJS sifatida yuklanadi
 * (package.json da "type": "module" yo'q). Natijada quyidagi xato:
 *
 *   "vite-tsconfig-paths" resolved to an ESM file.
 *   ESM file cannot be loaded by `require`.
 *
 * package.json ga "type": "module" qo'shish buni hal qilardi, lekin
 * o'sha payt next.config.js, postcss.config.js, tailwind.config.ts va
 * prisma/seed.ts buziladi. Bitta test sozlamasi uchun to'rt ishlaydigan
 * faylni buzish noto'g'ri. Shuning uchun plugin olib tashlandi.
 *
 * DIQQAT: agar tsconfig.json ga yangi taxallus qo'shilsa (masalan
 * "~/*"), uni SHU YERGA HAM qo'shish kerak — aks holda test muhitida
 * "Cannot find module" xatosi chiqadi.
 */
export default defineConfig({
  resolve: {
    alias: {
      // tsconfig.json dagi "@/*": ["./src/*"] ning aynan nusxasi
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    // Sof funksiyalar tez ishlaydi. Bitta test 5 sekunddan oshsa,
    // demak u tashqi resursga ulanmoqchi — bu xato hisoblanadi.
    testTimeout: 5_000,
  },
});
