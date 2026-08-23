# teacherCRM — AI agent uchun yo'riqnoma

> Bu fayl loyihada ishlaydigan **har qanday AI agent** uchun birinchi o'qiladigan
> hujjat. Kod yozishdan oldin shu faylni va `docs/` papkasidagi hujjatlarni
> o'qing. Loyiha egasi: **Otajon Asatullayev**. Muloqot tili: **o'zbek**.

## 0. QAT'IY QOIDA: xavfsizlik birinchi o'rinda

> Loyiha egasining aniq talabi: **har safar kod yozilganda xavfsizlik, hujumga
> qarshi himoya va rollar bo'yicha cheklov birinchi o'ringa qo'yiladi.** Bu
> qoida boshqa hamma narsadan (tezlik, chiroylik interfeys, qulaylik) ustun.
> Ikki xil yechim orasida tanlov bo'lsa — xavfsizrog'i tanlanadi.

Bu tizimda **maktab bolalarining shaxsiy ma'lumotlari** (F.I.Sh., tug'ilgan sana,
manzil, ota-ona telefoni), **baho va intizom yozuvlari**, hamda **to'lov
ma'lumotlari** saqlanadi. Bir dona ochiq qolgan tekshiruv butun bazani oshkor
qilishi mumkin.

### 0.1. Rollar bo'yicha asosiy qoida

| Rol | Qoida |
| --- | --- |
| **`ADMIN`** | **Hamma narsaga to'liq ruxsat — har doim, hamma sahifada, hamma amalda.** Egasining qat'iy talabi. Yangi modul yozganda admin uchun hech qanday cheklov qo'yilmaydi |
| `TEACHER` | Faqat o'z doirasi: o'zi dars beradigan darslar + sinf rahbari bo'lgan sinfi |
| `ACCOUNTANT` | Faqat moliya. Akademik ma'lumotga (baho, davomat, jurnal) kira olmaydi |
| `PARENT` | Faqat o'z farzandi, faqat **o'qish** |
| Notanish rol | **Hech narsa** (`MATCH_NOTHING`) — fail-closed |

**ADMIN implementatsiyasi.** Bu qoida allaqachon ikki joyda mavjud va shunday
qolishi kerak:

- `src/lib/rbac.ts` — `isPathAllowed`: `ADMIN` uchun **doim `true`**;
- `src/lib/scope.ts` — har bir `xScope(user)` funksiyasi `ADMIN` uchun **bo'sh
  filtr** (`{}`) qaytaradi, ya'ni cheklov yo'q.

Yangi doira funksiyasi yozganda birinchi shart doim `ADMIN` bo'lishi kerak.
Ammo **ADMIN ham audit'dan qutulmaydi** — uning har bir amali `logAudit` bilan
yoziladi (kim, qachon, nimani o'zgartirgani bilinishi kerak).

### 0.2. Har bir yangi sahifa/action uchun MAJBURIY ro'yxat

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
| 8 | **Audit** | Har bir yozuv/o'zgartirish/o'chirish `logAudit` bilan yoziladi (ADMIN ham) |
| 9 | **Xato xabari** | "Topilmadi" va "ruxsat yo'q" **bir xil** javob beradi — aks holda ID larni sanab chiqish (enumeration) mumkin bo'ladi |
| 10 | **Maxfiy ma'lumot** | Parol, token, telefon log'ga yozilmaydi (`redactMeta`, `maskIdentifier`) |

### 0.3. Doim yodda tutiladigan hujum ko'rinishlari

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
   PR tanasi o'zbek tilida, ichida **test rejasi** (bosqichma-bosqich) va
   **xavfsizlik bo'limi** bo'ladi.
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

> **Muhim:** PR merge qilinmaguncha uning kodi egasining lokal ishchi shoxida
> **yo'q**. Interfeys tuzatishlarida `git pull` dan keyin brauzerda majburiy
> yangilash (**Ctrl+Shift+R**) kerak — CSS keshdan olinadi va "tuzatilmadi"
> degan chalkashlik chiqadi.

## 5. Eng muhim qoidalar (oldin yo'l qo'yilgan xatolar asosida)

0. **Xavfsizlik — 0-bo'limdagi ro'yxat.** Har safar, istisnosiz.
1. **`messages/*.json` fayllarini to'liq qayta yozmang.** Ular katta; bir marta
   `push_files` payload'i kesilib `ru.json` buzilgan va ilova ishlamay qolgan.
   Yangi tarjima kerak bo'lsa: mavjud kalitlarni qayta ishlating yoki alohida
   fayl qilib `src/i18n/request.ts` da qo'shib yuboring (`attendance` shunday
   qilingan — namuna sifatida qarang).
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
7. **Interfeysda "yaxshilash" kiritmang.** Egasi so'ramagan vizual o'zgarish
   (masalan yashirin skrolbarni ko'rinadigan qilish) buzilish hisoblanadi.
   Faqat so'ralgan narsa qilinadi.
8. **Layout'da `vh`/`dvh` va foizni aralashtirmang** va kontent maydonida ichki
   skrol konteyneri yaratmang — ikkita skrolbar chiqadi. Yon menyu/header
   `position: sticky` bilan ushlab turiladi.

## 6. Texnologiyalar

Next.js 14.2.15 (App Router) + TypeScript · Tailwind + shadcn/ui ·
PostgreSQL + Prisma · Auth.js (JWT) · next-intl (uz/ru/en) ·
Vercel AI SDK (keyinroq) · SMS: Eskiz.uz / Play Mobile (keyinroq).

Eslatma: Next.js 14.2.15 eskirgan — yangilash `docs/03-keyingi-ishlar.md` dagi
navbatda turadi.
