# Kod konvensiyalari va naqshlar

## 1. Server action naqshi

Barcha yozuv amallari `src/lib/safe-action.ts` orqali o'tadi:

```ts
const action = createAction({
  roles: ["ADMIN"],            // rol tekshiruvi
  schema: someZodSchema,        // zod validatsiyasi
  handler: async (input) => { /* biznes-logika */ },
  audit: { action: "CREATE", entity: "Class", meta: (input, result) => ({ ... }) },
});
```

- `formDataToObject` — FormData'ni obyektga aylantiradi.
- `prismaErrorMessage` — P2002 → `"Bu qiymat allaqachon mavjud."`
- Umumiy xatolar: `"Amal bajarilmadi. Qayta urinib ko'ring."`,
  `"Ma'lumotlar noto'g'ri. Qayta tekshiring."`, `"Kirish talab qilinadi."`
- Biznes qoidasi buzilsa `throw` emas, `SaveResult { ok: false, message }` qaytariladi.

## 2. Qorovullar (`src/lib/auth-guard.ts`)

`requireAuth`, `requireRole(...roles)`, `requireAdmin`, `requireFinance`,
`requireTeaching`. Ruxsat yo'q bo'lsa `/forbidden` ga yo'naltiradi.
`redirectNever(path): never` — muvaffaqiyatli amaldan keyin yo'naltirish.

## 3. Doira (`src/lib/scope.ts`) — IDOR himoyasi

Oltin qoida: **hech qachon yolg'iz `findUnique({ where: { id } })`**.

- Ro'yxat uchun: `where: { AND: [filtr, studentScope(user)] }`
- Bitta yozuv uchun: `await assertCanAccessStudent(user, id)`

Mavjud doiralar: `studentScope`, `classScope`, `lessonScope`, `attendanceScope`,
`gradeScope`, `penaltyScope`, `testResultScope`, `contractScope`,
`invoiceScope`, `paymentScope` + mos `assertCanAccess*` funksiyalari.
Notanish rol → `MATCH_NOTHING` (fail-closed).

## 4. Forma naqshi (client komponent)

```tsx
"use client";
const [state, formAction] = useFormState<XFormState, FormData>(action, {});
const errorMessage = state?.error;   // MUHIM: state.error EMAS
...
{errorMessage ? (
  <p className="text-sm font-medium text-destructive">{errorMessage}</p>
) : null}
```

**Sababi:** action `redirectNever()` bilan tugaydi → hech narsa qaytarmaydi →
`useFormState` holatini `undefined` qiladi → `state.error` crash beradi.
Bu xato bir marta ishlab chiqarishda chiqqan (PR #35 tuzatgan).

Yuborish tugmasi: `useFormStatus()` bilan alohida `SubmitButton` komponenti
(`t("saving")` / `t("create")` / `t("save")`).

## 5. UI

- `src/components/ui/` da faqat: `button`, `card`, `input`, `label`, `sheet`.
  Boshqa element kerak bo'lsa — yoki qo'shiladi, yoki native element ishlatiladi.
- Native `<select>` uchun umumiy klass:
  `"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"`
- `Button` variantlari: `default`, `outline`, `secondary`, `ghost`;
  aniq props ro'yxatini `src/components/ui/button.tsx` dan tekshirib oling.
- Sahifa sarlavhasi naqshi: `h1` + `text-muted-foreground` tavsif, o'ng tomonda
  amal tugmalari (`flex flex-wrap items-center justify-between gap-3`).

## 6. Tarjimalar (ENG NOZIK JOY)

`messages/uz.json`, `ru.json`, `en.json` — katta fayllar. Bir marta ularni
to'liq qayta yozishga urinilganda `push_files` payload'i kesilgan va
`Module parse failed: Unterminated string in JSON` xatosi bilan ilova ishlamay
qolgan.

Qoidalar:

1. Iloji bo'lsa **mavjud kalitlarni qayta ishlating** (masalan sarlavhani
   `classes.title` + `import.action` dan yasash).
2. Ko'p yangi kalit kerak bo'lsa — **alohida fayl** qilib `src/i18n/request.ts` da
   qo'shib yuboring, katta fayllarga tegmang.
3. Katta JSON'ni push qilgandan keyin **albatta qayta o'qib**, oxiri butunligini
   va JSON haqiqiyligini tekshiring.
4. Uchta til **bir xil kalit tuzilishiga** ega bo'lishi shart.

## 7. TypeScript tuzoqlari

- `as const` tuple'da `.includes()` ishlamaydi:
  `DAYS.some((d) => d === value)` ishlating (`DAYS = [1,2,3,4,5,6] as const`).
  Xuddi shu `GRADES` (1..11) uchun ham.
- Zod `superRefine` da `path` **mutable** massiv bo'lishi kerak:
  `path: ["endDate"]`, `as const` qo'ymang.
- Tranzaksiya klienti tipi: `Prisma.TransactionClient` (qo'lda tip yozmang).
- Prisma `@db.Date` maydonlari (`Attendance.date`) — vaqt qismisiz sana.

## 8. Yangi sahifa qo'shish tartibi

1. `src/app/[locale]/(app)/<yo'l>/page.tsx` (+ `actions.ts`, forma komponenti).
2. `src/lib/rbac.ts` → `roleAllowedPaths` ga yo'lni qo'shish.
3. `src/components/nav-config.ts` → menyuga qo'shish (kerakli rollar bilan).
4. Tarjima kalitlari (6-bo'lim qoidalariga rioya qilib).
5. `revalidatePath("/<yo'l>")` — **locale prefiksisiz**.

## 9. Import moduli qanday qurilgan (namuna sifatida)

Yangi "biror narsani Excel'dan import qilish" vazifasi kelsa, mavjud naqshni
nusxa oling:

- `src/lib/excel.ts` — `parseExcel`, `buildExcel`, `normalizeKey`,
  `MAX_IMPORT_ROWS = 1000`, `MAX_IMPORT_FILE_BYTES = 5MB`.
- `src/lib/imports.ts` — `ColumnDef`, `MappedRow`, `PreviewRow`, `PreviewResult`,
  `ImportOutcome`, o'quvchi/o'qituvchi ustunlari va shablonlari.
- `src/lib/import-guards.ts` — `checkImportHeaders` (noto'g'ri shablon
  yuklanganda tushunarli xabar beradi).
- `src/lib/class-imports.ts` — **eng yangi va eng toza namuna** (sinflar uchun).
- `src/components/import-wizard.tsx` — generic UI, `preview`/`commit` action'lar
  prop sifatida beriladi.
- Shablon: `src/app/api/import-template/[entity]/route.ts` (`requireAdmin` SHU
  YERDA tekshiriladi, chunki middleware `/api/*` ni tekshirmaydi).

Qoidalar: 1-qadam bazaga **hech narsa yozmaydi**; 2-qadam brauzerdan kelgan
ma'lumotni zod bilan **qaytadan** tekshiradi; natija audit jurnaliga tushadi.
