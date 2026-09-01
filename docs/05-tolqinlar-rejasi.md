# To'lqinlar rejasi — 6 bosqich × 5 to'lqin

> Bu reja chatda kelishilgan, lekin hech qayerda yozilmagan edi. Chat yo'qolsa
> reja ham yo'qolardi. Shu fayl uning rasmiy nusxasi.

## Asosiy qoida — tartib buzilmaydi

Har bir bosqich ichida to'lqinlar **qat'iy 0 → 1 → 2 → 3 → 4** tartibida
bajariladi:

| To'lqin | Mazmun |
| --- | --- |
| 0 | O'lchash va poydevor (test, CI, migratsiya, query log) |
| 1 | Xavfsizlik — "ochiq eshiklarni yopish" |
| 2 | Tezlik |
| 3 | Zamonaviy dizayn |
| 4 | Hujjatlar va yakun |

**Nima uchun dizayn oxirida:** agar tartib buzilsa, dizayn o'zgarishi paytida
baho hisoblash mantiqi buzilib, buni faqat o'qituvchi shikoyat qilganda bilib
olamiz. Testlar avval yozilsa — buzilish darhol ko'rinadi.

## Infratuzilma faqat bir marta qilinadi

0-to'lqindagi uch ish butun loyihaga tegishli, bitta bosqichga emas:

- migratsiya tizimi — bitta `prisma/migrations/` papkasi;
- CI — bitta `.github/workflows/ci.yml`;
- test poydevori — bitta `vitest.config.ts`.

Xuddi shunday 3-to'lqindagi **dizayn tizimi** (ranglar, shriftlar,
komponentlar) ham bir marta qilinadi.

Shuning uchun bu ishlar **1-bosqich (Poydevor)** ichiga tushadi. Keyingi 2–6
bosqichlar o'z 0-1-2-3-4 aylanishini bosib o'tadi, lekin infratuzilmani qayta
qurmaydi — faqat o'z qismiga tegishli test, xavfsizlik, tezlik va dizayn
ishlarini bajaradi.

---

## 1-bosqich · Poydevor

Next.js, Tailwind, shadcn, Prisma, DB, i18n

| To'lqin | Ish | Holat |
| --- | --- | --- |
| 0 | `prisma migrate` ga o'tish (`0_init`, bo'sh bazada sinovdan o'tgan) | ✅ |
| 0 | Vitest o'rnatish | ✅ |
| 0 | CI: typecheck → lint → test → build | ✅ |
| 0 | Prisma query log (vaqtinchalik, o'lchov uchun) | ⬜ |
| 1 | `env.ts` — barcha muhit o'zgaruvchilari majburiy tekshirilishi | ⬜ |
| 1 | Sirlar repoda yo'qligini tekshirish (secret scanning) | ⬜ |
| 1 | `logger.ts` — logga parol/token tushmasligi | ⬜ |
| 1 | Xato sahifalari baza strukturasini oshkor qilmasligi | ⬜ |
| 2 | Baza ulanishi: region, connection pooling (PgBouncer) | ⬜ |
| 2 | Shrift yuklash, `next.config` optimallashtirish | ⬜ |
| 3 | Dizayn tizimi: rang palitrasi, tipografiya, bo'shliqlar, radius, qorong'i rejim | ⬜ |
| 3 | shadcn komponentlarini to'ldirish: select, table, dialog, dropdown-menu, badge, tabs, toast, skeleton, tooltip, pagination, alert | ⬜ |
| 4 | `AGENTS.md` yangilash (hozir "1–4 bajarilgan" deb turadi — eskirgan) | ⬜ |
| 4 | `docs/02` ga dizayn qoidalari | ⬜ |

Kutilgan PR soni: ~7

### 1-bosqich · 0-to'lqin natijasi (bajarilgan)

- 66 test, hammasi bazasiz sof funksiyalar ustida;
- CI har PR da 5 tekshiruv yuritadi;
- `db push` dan voz kechildi, migratsiya tarixi bor — tafsiloti
  `docs/04-migratsiyalar.md` da;
- `force-dynamic` tuzatmasi bilan `next build` CI da toza o'tadi.

---

## 2-bosqich · Auth va rollar

4 rol, login, RBAC

| To'lqin | Ish |
| --- | --- |
| 0 | Testlar: `scope.ts` (har rol × har funksiya), `rbac.ts`, `password.ts`, `auth-guard.ts` — ~35 test |
| 1 | Login rate limit (brute force) |
| 1 | `mustChangePassword` chetlab o'tilmasligi |
| 1 | Parol siyosati (uzunlik, murakkablik) |
| 1 | `LOGIN_FAILED` audit yozuvi |
| 1 | Sessiya: 8 soat to'g'rimi, logout hamma joyda ishlaydimi |
| 1 | Menyudagi 10 ta 404 sahifa yopilishi (`nav-config.ts` ga `enabled: false`) |
| 2 | Har so'rovda sessiya tekshiruvi keshlanishi |
| 3 | Login sahifasi, "Parol o'zgartirish" ekrani, `/forbidden` |
| 4 | Ruxsat matritsasi hujjati: har sahifa/action → rol jadvali |

Kutilgan PR soni: ~6

### Menyudagi mavjud bo'lmagan 10 sahifa

`/penalties`, `/penalty-criteria`, `/rewards`, `/reward-criteria`, `/payments`,
`/reports`, `/messages`, `/tests`, `/ai-assistant`, `/users`

Ikki muammo: foydalanuvchi tizimni buzuq deb o'ylaydi; va `rbac.ts` da bu yo'llar
uchun ruxsat allaqachon yozilgan — sahifa yaratilgan kunda rol tekshiruvi
noto'g'ri bo'lsa ham hech kim sezmaydi.

Yechim: `nav-config.ts` ga `enabled: false` bayrog'i. Menyuda ko'rinmaydi, lekin
`rbac.ts` dagi ruxsat saqlanadi.

---

## 3-bosqich · O'quvchi / o'qituvchi bazasi

CRUD + Excel import

| To'lqin | Ish |
| --- | --- |
| 0 | Testlar: `students.ts`, `teachers.ts`, `imports.ts`, `excel.ts`, `import-guards.ts` — ~25 test |
| 1 | IDOR: `?studentId=<boshqa bola>` almashtirilsa nima bo'ladi |
| 1 | `Student.userId` — audit 14-punkti, A variant |
| 1 | Import: fayl o'lchami, qator soni, formula injection (`=CMD()` hujumi) |
| 1 | Eksport huquqi: buxgalter baholarni eksport qila oladimi (TZ da yo'q) |
| 1 | Import idempotentligi haqiqatan ishlaydimi |
| 2 | Sahifalash (hozir 500 o'quvchi to'liq yuklanadi) |
| 2 | Indekslar: `[lastName, firstName]`; `select` toraytirish; qidiruv indeksi |
| 3 | Ro'yxat ko'rinishi: qidiruv, filtr, saralash, bo'sh holat; import ustasi; mobil karta |
| 4 | Import/eksport hujjati |

Kutilgan PR soni: ~7

---

## 4-bosqich · Sinf va dars jadvali

| To'lqin | Ish |
| --- | --- |
| 0 | Testlar: `classes.ts`, `lessons.ts`, `academics.ts` — to'qnashuv mantiqi (bir o'qituvchi bir vaqtda ikki sinfda) — ~15 test |
| 1 | Sxema nuqsonlari — audit 15-punkti (a–f) |
| 1 | `academicYearId` bo'sh bo'lgan sinflar (6-bosqichda muammo bo'lgan) |
| 1 | Jadval to'qnashuvi server tomonda tekshirilishi |
| 2 | Indekslarni `EXPLAIN ANALYZE` bilan tasdiqlash |
| 2 | Jadval sahifasidagi so'rovlarni `Promise.all` |
| 3 | Dars jadvali ko'rinishi — hafta grid, drag & drop, mobil moslashuv |

Kutilgan PR soni: ~5

---

## 5-bosqich · Davomat

| To'lqin | Ish |
| --- | --- |
| 0 | Testlar: `attendance.ts` (`attendancePercent`, `worstStatus`, sana funksiyalari), `attendance-grid.ts` — ~20 test |
| 1 | Davomat yozish doirasi (`attendanceScope`) har rol uchun to'g'rimi |
| 1 | O'tgan sanaga davomat qo'yish cheklovi bormi |
| 1 | `absence-notice.ts` — SMS navbati xavfsizmi |
| 2 | Indekslar: `[studentId, date]`, `[lessonId, date]` |
| 2 | Haftalik jurnal so'rovlarini `Promise.all`; foiz hisobini bazaga o'tkazish |
| 3 | Jurnal ekrani — eng ko'p ishlatiladigan sahifa; klaviatura bilan tez kiritish (Tab / Enter / o'q tugmalari) |
| 3 | K/SZ/SL/KCH qisqartmalari uchun ko'rinadigan izoh |
| 4 | Qisqartmalar hujjati (TZ da yo'q) |

Kutilgan PR soni: ~6

---

## 6-bosqich · Baholar va reyting

| To'lqin | Ish |
| --- | --- |
| 0 | Testlar: `ranking.ts` (`finalScore`, `rankByScore` — teng ball, null, chegara), `grades.ts`, `journal.ts` — ~25 test |
| 1 | Eski baholarni backfill (`lessonId: null`) |
| 1 | `grades.ts` dagi noto'g'ri izoh ("baho fanga bog'lanadi" — aslida darsga) |
| 1 | Takrorlangan funksiyalar: `averageOf`, `parseTopN`, rank mantiqi |
| 2 | `/ranking` — `yearGrades` butun yilni xotiraga tortadi → `groupBy` |
| 2 | 8+ ketma-ket so'rov → `Promise.all`; diagrammalarni `dynamic import` |
| 3 | Baholar jadvali, reyting jadvali, diagrammalar; 1-2-3 o'rin belgilari |
| 4 | TZ §7 (ERD) ga `RankingSetting` qo'shish |

Kutilgan PR soni: ~6

---

## Umumiy

| Bosqich | PR |
| --- | --- |
| 1 · Poydevor | ~7 |
| 2 · Auth | ~6 |
| 3 · Baza + import | ~7 |
| 4 · Sinf + jadval | ~5 |
| 5 · Davomat | ~6 |
| 6 · Baholar | ~6 |
| **Jami** | **~37 PR, ~120 test** |

---

## Ish uslubi — kelishilgan

- Agent to'g'ridan-to'g'ri commit va PR qiladi, ruxsat so'rab to'xtamaydi.
- Egasi faqat **merge** qiladi.
- Har PR: o'zbekcha izoh + test rejasi + xavfsizlik bo'limi.

**Uch holatda agent to'xtab ogohlantiradi** (ma'lumot yo'qolishi mumkin):

| Holat | Nima uchun |
| --- | --- |
| Sxema o'zgarishi / migratsiya | Baza ma'lumotiga ta'sir qiladi. Avval zaxira |
| Ma'lumot ko'chirish (backfill) | Qaytarib bo'lmaydi |
| `package.json` ga yangi paket | Egasi `npm install` qilishi kerak |

---

## Egasidan qaror kutilayotgan 6 masala

Bularsiz kod TZ ga qarshi turadi.

| № | Masala | Variantlar |
| --- | --- | --- |
| 1 | Reyting formulasi | TZ: `baho − jarima + test`. Kod: `(baho×80 + test×20)/100 − ball×0.5`. Qaysi biri rasmiy? |
| 2 | Baho shkalasi | Kodda 0–100. TZ da "5 yoki 100 balli sozlama". 100 da qolamizmi? |
| 3 | `RankingSetting` | TZ ning ERD bo'limida yo'q — qo'shamizmi? |
| 4 | `parallel` qamrovi | Kodda bor, TZ da ta'riflanmagan |
| 5 | Rag'bat ball (`/rewards`) | Menyuda bor, TZ da umuman yo'q. Kerakmi? |
| 6 | Davomat qisqartmalari | `K` / `SZ` / `SL` / `KCH` — TZ da hujjatlashtirilmagan |
