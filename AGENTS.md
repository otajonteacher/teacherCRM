# teacherCRM — AI agent uchun yo'riqnoma

> Bu fayl loyihada ishlaydigan **har qanday AI agent** uchun birinchi o'qiladigan
> hujjat. Kod yozishdan oldin shu faylni va `docs/` papkasidagi hujjatlarni
> o'qing. Loyiha egasi: **Otajon Asatullayev**. Muloqot tili: **o'zbek**.

## 1. Loyiha nima?

Xususiy maktab uchun to'liq CRM tizimi: o'quvchi/o'qituvchi bazasi, sinf va dars
jadvali, davomat, baholar, jarima ball, choraklik reyting, to'lovlar, hisobotlar,
SMS xabarnoma va AI modullari (test generatori, o'quvchi tahlili).

Texnik topshiriq (TZ) Notion'da saqlanadi, lekin **to'liq nusxasi repoda**:
`docs/tz/`. Notion'ga kirish bo'lmasa, shu fayllar yagona haqiqat manbai
sifatida ishlatiladi.

## 2. Hujjatlarni o'qish tartibi

| Fayl | Nima uchun |
| --- | --- |
| `docs/00-tz-qisqacha.md` | TZ qisqartmasi — tez kirish uchun (rollar, RBAC, roadmap) |
| `docs/tz/01-umumiy-va-funksional.md` | **To'liq TZ, 1–3-bo'lim:** maqsad, scope, atamalar, RBAC matritsasi, barcha funksional talablar (auth, o'quvchi, o'qituvchi, jadval, davomat, baho, reyting, jarima, to'lov, dashboard, SMS, i18n, import/eksport) |
| `docs/tz/02-ai-va-texnik.md` | **To'liq TZ, 4–11-bo'lim:** test moduli va format standarti, AI spetsifikatsiyasi, NFR, arxitektura, ERD va entitilar, 15 bosqichli roadmap, DoD, xatarlar, kelajak rejalari |
| `docs/01-loyiha-holati.md` | **Hozirgi holat:** nima bitgan, qaysi PR'lar, baza holati, papka tuzilishi |
| `docs/02-konvensiyalar.md` | Kod yozish qoidalari, naqshlar, oldin yo'l qo'yilgan xatolar |
| `docs/03-keyingi-ishlar.md` | Keyingi bosqich rejasi, ochiq qarorlar, audit ro'yxati |

Tavsiya: `00-tz-qisqacha.md` → `01-loyiha-holati.md` → `02-konvensiyalar.md` →
`03-keyingi-ishlar.md` tartibida o'qing; aniq talab kerak bo'lganda `docs/tz/`
fayllaridan tegishli bo'limni oching.

## 3. Ish jarayoni (MAJBURIY)

1. **Hech qachon `main` ga to'g'ridan-to'g'ri push qilinmaydi.**
2. Ishchi shox: `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098`.
   Barcha yangi shoxlar shundan ochiladi va shunga PR qilinadi.
3. Har bir o'zgarish uchun: **yangi shox → commit → draft PR**.
   PR tanasi o'zbek tilida, ichida **test rejasi** (bosqichma-bosqich) bo'ladi.
4. **Merge'ni faqat loyiha egasi bosadi.** Agent hech qachon o'zi merge qilmaydi.
5. Katta o'zgarish uchun qo'shimcha tushuntiruvchi hujjat yoziladi.
6. Commit xabarlari: `feat(scope): ...`, `fix(scope): ...` — o'zbek tilida izoh.
7. Bosqich tugagach `docs/01-loyiha-holati.md` va `docs/03-keyingi-ishlar.md`
   yangilanadi — shunda bilim chatda emas, repoda saqlanadi.

## 4. Egasi qanday test qiladi

Lokal yo'l: `D:\schoolCRM\teacherCRM` (Windows), baza `teacher_crm` @ `localhost:5432`.

```bash
git fetch origin
git checkout <shox-nomi>
npm install
npm run typecheck      # SHART: PR ochishdan oldin xato qolmasligi kerak
npm run dev
```

Agar `prisma/schema.prisma` o'zgargan bo'lsa, qo'shimcha:

```bash
npx prisma db push     # ogohlantirishlarga "yes" javob berish kerak
npx prisma generate
```

Sxema o'zgarmagan bo'lsa, PR tanasida **"db push kerak emas"** deb aniq yozing —
bu egasining vaqtini tejaydi.

## 5. Eng muhim 6 qoida (oldin yo'l qo'yilgan xatolar asosida)

1. **`messages/*.json` fayllarini to'liq qayta yozmang.** Ular katta; bir marta
   `push_files` payload'i kesilib `ru.json` buzilgan va ilova ishlamay qolgan.
   Yangi tarjima kerak bo'lsa: mavjud kalitlarni qayta ishlating yoki alohida
   fayl qilib `src/i18n/request.ts` da qo'shib yuboring.
2. **Server action `redirectNever()` bilan tugasa, `useFormState` holati
   `undefined` bo'ladi.** Formalarda doim `state?.error` yozing, `state.error` emas.
3. **`as const` tuple'larda `.includes()` ishlamaydi** (`DAYS`, `GRADES`).
   `DAYS.some((d) => d === value)` ishlating.
4. **Har bir yozuv amali doira (scope) tekshiruvidan o'tadi** — `src/lib/scope.ts`.
   Yolg'iz `findUnique({ where: { id } })` — taqiqlangan (IDOR).
5. **Yangi sahifa qo'shsangiz**, `src/lib/rbac.ts` (`roleAllowedPaths`) va
   `src/components/nav-config.ts` ni birga yangilang — aks holda menyudagi
   havola 403 beradi.
6. **Katta faylni push qilgandan keyin qayta o'qib tekshiring** (ayniqsa JSON) —
   payload kesilishi jimgina sodir bo'ladi.

## 6. Texnologiyalar

Next.js 14.2.15 (App Router) + TypeScript · Tailwind + shadcn/ui ·
PostgreSQL + Prisma · Auth.js (JWT) · next-intl (uz/ru/en) ·
Vercel AI SDK (keyinroq) · SMS: Eskiz.uz / Play Mobile (keyinroq).

Eslatma: Next.js 14.2.15 eskirgan — yangilash `docs/03-keyingi-ishlar.md` dagi
navbatda turadi.
