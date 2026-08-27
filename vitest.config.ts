import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * VITEST SOZLAMASI
 *
 * environment: "node" — hozir test qilinadigan narsa src/lib dagi sof
 * funksiyalar (scope, rbac, ranking, attendance, journal). Ular DOM'ga
 * muhtoj emas, shuning uchun jsdom qo'shilmadi.
 *
 * tsconfigPaths() — @/lib/... taxallusini aynan tsconfig.json dan o'qiydi,
 * ya'ni taxalluslar ikki joyda takrorlanmaydi.
 *
 * globals: false — describe/it/expect har faylda ochiq import qilinadi.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    testTimeout: 5_000,
  },
});
