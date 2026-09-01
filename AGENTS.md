# teacherCRM — AI agent uchun yo'riqnoma

> Bu fayl loyihada ishlaydigan **har qanday AI agent** uchun birinchi o'qiladigan
> hujjat. Kod yozishdan oldin shu faylni va `docs/` papkasidagi hujjatlarni
> o'qing. Loyiha egasi: **Otajon Asatullayev**. Muloqot tili: **o'zbek**.

## Shoxlar tuzilishi

| Shox | Vazifasi |
| --- | --- |
| `main` | Ishonchli nuqta. Faqat to'lqin tugagach integratsiya shoxidan merge qilinadi. |
| `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098` | **Integratsiya shoxi** — kundalik ish shu yerda. Yangi shoxlar shundan ochiladi va shunga PR qilinadi. |

## 0. QAT'IY QOIDA: xavfsizlik birinchi o'rinda

> Loyiha egasining aniq talabi: **har safar kod yozilganda xavfsizlik, hujumga
> qarshi himoya va rollar bo'yicha cheklov birinchi o'ringa qo'yiladi.** Bu
> qoida boshqa hamma narsadan (tezlik, chiroylik interfeys, qulaylik) ustun.
> Ikki xil yechim orasida tanlov bo'lsa — xavfsizrog'i tanlanadi.

Bu tizimda **maktab bolalarining shaxsiy ma'lumotlari** (F.I.Sh., tug'ilgan sana,
manzil, ota-ona telefoni), **baho va intizom yozuvlari**, hamda **to'lov
ma'lumotlari** saqlanadi. Bir dona ochiq qolgan tekshiruv butun bazani oshkor
qilishi mumkin.

To'liq xavfsizlik modeli, hujum yuzasi tahlili va himoya choralari:
**`docs/07-xavfsizlik.md`**.

### Har bir yangi sahifa/action uchun MAJBURIY ro'yxat

Yangi kod yozganda quyidagilarning HAMMASI bajarilgan bo'lishi kerak. Bittasi
qolib ketsa — ish tugallanmagan hisoblanadi.

| № | Tekshiruv | Qanday |
| --- | --- | --- |
| 1 | **Autentifikatsiya** | `requireAuth` / `requireRole(...)` — sahifa va action'ning boshida |
| 2 | **Rol cheklovi** | `roleAllowedPaths` (`src/lib/rbac.ts`) + `createAction({ roles })`. Ikki joyda ham! |
| 3 | **Ma'lumot doirasi** | Ro'yxatlarda `AND: [..., xScope(user)]`; bitta yozuvda `assertCanAccessX(user, id)` |
| 4 | **IDOR** | Yolg'iz `findUnique({ where: { id } })` — **TAQIQLANGAN** |
| 5 | **Kirish validatsiyasi** | zod sxema. `searchParams` ham ishonchsiz manba — regex/enum bilan tekshiriladi |
| 6 | **Begona ID** | Forma dinamik maydon nomlari (`entry:<id>` kabi) yuborsa, serverda tegishlilik qayta tekshiriladi |
| 7 | **Yozuv amali** | Faqat kerakli rollar. `ACCOUNTANT` o'quvchini ko'radi, lekin **yozmaydi**; `PARENT` faqat ko'radi |
| 8 | **Audit** | Har bir yozuv/o'zgartirish/o'chirish `logAudit` bilan yoziladi |
| 9 | **Xato xabari** | "Topilmadi" va "ruxsat yo'q" **bir xil** javob beradi — aks holda ID larni sanab chiqish (enumeration) mumkin bo'ladi |
| 10 | **Maxfiy ma'lumot** | Parol, token, telefon log'ga yozilmaydi (`redactMeta`, `maskIdentifier`) |

### Doim yodda tutiladigan hujum ko'rinishlari

- **IDOR** — URL dagi ID ni boshqasiga o'zgartirib begona bolaning ma'lumotini ochish.
- **Server action'ni to'g'ridan-to'g'ri chaqirish** — hujumchi interfeysdan
  foydalanmaydi, so'rovni qo'lda yasaydi. Ya'ni **klient tomondagi tekshiruv
  himoya emas**; hamma tekshiruv serverda takrorlanadi.
- **Rolni oshirish** — o'qituvchi admin sahifasiga kirishga urinishi.
- **Enumeration** — javoblar farqidan qaysi ID/email mavjudligini aniqlash.
- **Ommaviy yuklash** — juda katta massiv yoki fayl yuborish (zod'da `.max(...)` chegarasi).
- **Fail-closed** — rol notanish yoki ID yo'q bo'lsa, ruxsat **kengaymaydi**, torayadi
  (`MATCH_NOTHING`).

PR tanasida **"Xavfsizlik"** bo'limi doim bo'ladi: qanday tekshiruvlar
qo'yilgani va qaysi rol nima qila olishi yozib o'tiladi.

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
| `docs/tz/01-umumiy-va-funksional.md` | **To'liq TZ, 1–3-bo'lim:** maqsad, scope, atamalar, RBAC matritsasi, barcha funksional talablar |
| `docs/tz/02-ai-va-texnik.md` | **To'liq TZ, 4–11-bo'lim:** test moduli, AI spetsifikatsiyasi, NFR, arxitektura, ERD, 15 bosqichli roadmap, DoD |
| `docs/01-loyiha-holati.md` | **Hozirgi holat:** nima bitgan, qaysi PR'lar, baza holati, papka tuzilishi |
| `docs/02-konvensiyalar.md` | Kod yozish qoidalari, naqshlar, oldin yo'l qo'yilgan xatolar |
| `docs/03-keyingi-ishlar.md` | Keyingi bosqich rejasi, ochiq qarorlar, audit ro'yxati |
| `docs/04-migratsiyalar.md` | Migratsiya tarixi va qoidalari |
| `docs/05-tolqinlar-rejasi.md` | **Ish tartibi:** 6 bosqich × 5 to'lqin (0→1→2→3→4) |
| `docs/06-olchov-natijalari.md` | 0-to'lqin o'lchov natijalari va ularga asoslangan ustuvorliklar |
| `docs/07-xavfsizlik.md` | **Xavfsizlik modeli:** hujum yuzasi, rollar matritsasi, DDoS/fishing himoyasi |
| `docs/TZ.md` | Boshlang'ich TZ (v1.1) — tarixiy hujjat |

## 3. Ish jarayoni (MAJBURIY)

1. **Hech qachon `main` ga to'g'ridan-to'g'ri push qilinmaydi.**
2. Ishchi shox: `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098`.
   Barcha yangi shoxlar shundan ochiladi va shunga PR qilinadi.
3. Har bir o'zgarish uchun: **yangi shox → commit → PR**.
   PR tanasi o'zbek tilida, ichida **test rejasi** (bosqichma-bosqich) va
   **xavfsizlik bo'limi** bo'ladi.
4. **Merge'ni faqat loyiha egasi bosadi.**
5. Agent faqat uch holatda to'xtab ruxsat so'raydi: **sxema/migratsiya
   o'zgarishi**, **mavjud ma'lumotni ko'chirish (backfill)**, **yangi paket**.
6. Commit xabarlari: `feat(scope): ...`, `fix(scope): ...` — o'zbek tilida izoh.
7. Bosqich tugagach `docs/01-loyiha-holati.md` va `docs/03-keyingi-ishlar.md`
   yangilanadi — shunda bilim chatda emas, repoda saqlanadi.

## 4. Egasi qanday test qiladi

Lokal yo'l: `D:\schoolCRM\teacherCRM` (Windows), baza `teacher_crm` @ `localhost:5432`.

```bash
git fetch origin
git checkout <shox-nomi>
npm install
npm run typecheck      # tez tekshiruv
npm run lint
npm test               # Vitest
npm run build
npm start              # ishlab chiqarish rejimi — dev'da ko'rinmaydigan xatolar shu yerda chiqadi
```

Agar `prisma/schema.prisma` o'zgargan bo'lsa:

```bash
npx prisma migrate dev --name <nom>   # yangi migratsiya
npx prisma migrate deploy             # mavjud migratsiyalarni qo'llash
npx prisma generate
```

> **Muhim:** `db push` endi ishlatilmaydi — loyiha `prisma migrate` ga o'tdi
> (`prisma/migrations/0_init`). Sababi `docs/04-migratsiyalar.md` da.

> Interfeys tuzatishlarida `git pull` dan keyin brauzerda majburiy
> yangilash (**Ctrl+Shift+R**) kerak — CSS keshdan olinadi va "tuzatilmadi"
> degan chalkashlik chiqadi.

## 5. Eng muhim qoidalar (oldin yo'l qo'yilgan xatolar asosida)

0. **Xavfsizlik — 0-bo'limdagi ro'yxat.** Har safar, istisnosiz.
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
   `src/components/nav-config.ts` ni birga yangilang.
6. **Katta faylni push qilgandan keyin qayta o'qib tekshiring** (ayniqsa JSON) —
   payload kesilishi jimgina sodir bo'ladi.
7. **Interfeysda "yaxshilash" kiritmang.** Egasi so'ramagan vizual o'zgarish
   buzilish hisoblanadi. Faqat so'ralgan narsa qilinadi.
8. **Layout'da `vh`/`dvh` va foizni aralashtirmang** va kontent maydonida ichki
   skrol konteyneri yaratmang — ikkita skrolbar chiqadi.
9. **Muhit o'zgaruvchilari `AUTH_` prefiksi bilan** (Auth.js v5). `NEXTAUTH_SECRET`
   va `NEXTAUTH_URL` — v4 nomlari, kod ularni **o'qimaydi**.

## 6. Texnologiyalar

Next.js 14.2.15 (App Router) + TypeScript · Tailwind + shadcn/ui ·
PostgreSQL + Prisma (migrate) · Auth.js v5 (JWT) · next-intl (uz/ru/en) ·
Vitest · GitHub Actions CI · Vercel AI SDK (keyinroq) · SMS: Eskiz.uz (keyinroq).

Eslatma: Next.js 14.2.15 eskirgan — yangilash `docs/03-keyingi-ishlar.md` dagi
navbatda turadi.
