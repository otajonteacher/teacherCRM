# Loyiha holati (oxirgi yangilash: 5-bosqich tugagandan keyin)

## 1. Shoxlar

| Shox | Vazifasi |
| --- | --- |
| `main` | Ishga tushirish uchun. **Orqada** — PR #1 hali merge qilinmagan |
| `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098` | **Ishchi shox** — hamma ish shu yerda to'planadi |
| `claude/<vazifa-nomi>` | Har bir vazifa uchun vaqtinchalik shox → draft PR |

Yangi ish boshlaganda: `create_branch(from_branch = ishchi shox)`.

## 2. Bosqichlar holati

**Bajarilgan: 5 / 15.** Keyingi vazifa — **6-bosqich: baholar va reyting**.

### 1–2-bosqich: poydevor + auth/RBAC ✅

- Next.js 14 App Router, Tailwind, shadcn/ui, Prisma + PostgreSQL, next-intl.
- Auth.js (JWT, `maxAge` 8 soat, `updateAge` 1 soat), login email **yoki** telefon bilan.
- 4 rol, `roleAllowedPaths` bilan sahifa darajasidagi RBAC (`src/lib/rbac.ts`).
- `src/lib/scope.ts` — ma'lumot darajasidagi doira (IDOR himoyasi), fail-closed.
- Audit jurnali, xavfsizlik sarlavhalari, rate limiter, `env.ts` validatsiyasi,
  parol siyosati, xato sahifalari, logger, birinchi kirishda parol almashtirish.

### 3-bosqich: o'quvchi va o'qituvchi bazasi ✅

- O'quvchi va o'qituvchi CRUD, filtrlar, qidiruv.
- **Excel import** (`src/lib/imports.ts`, `excel.ts`, `import-guards.ts`):
  shablon → yuklash → preview → dublikat siyosati (`skip`/`update`) → tasdiqlash.
- Umumiy UI: `src/components/import-wizard.tsx` (generic, `TRow` bilan).
- Shablon API: `GET /api/import-template/{students|teachers|classes}`.
- O'qituvchi hisobi `mustChangePassword = true` bilan yaratiladi, boshlang'ich
  parol bir martalik `.csv` bo'lib beriladi.

### 4-bosqich: sinflar va dars jadvali ✅

- `AcademicYear` + `Quarter`, `Subject`, `LessonPeriod` (qo'ng'iroq jadvali).
- Sinflar CRUD; yangi sinf yaratishda **joriy o'quv yili avtomatik tanlanadi**.
- Haftalik dars jadvali `/schedule`: sinf/o'qituvchi filtri, jadval ko'rinishi.
- Har bir bo'sh uyada **"+"** tugmasi — forma o'sha kun va dars vaqti bilan
  to'ldirilib ochiladi (`#lesson-form` ga scroll).
- Ziddiyat tekshiruvi: o'qituvchi/sinf/xona bir vaqtda band bo'lmasligi
  (`src/lib/lessons.ts` + bazada `@@unique`).
- **Sinflarni Excel'dan import** (`src/lib/class-imports.ts`, `/classes/import`).

### 5-bosqich: davomat ✅

- **`/attendance`** — tezkor kiritish: sana → dars → butun sinf bitta ekranda,
  har o'quvchida 4 tugma (Keldi / Kelmadi / Kechikdi / Sababli),
  **"Hammasini keldi deb belgilash"**, bitta `Saqlash`.
- **`/attendance/journal`** — haftalik matritsa (o'quvchi × dushanba–shanba),
  katakda kunning eng "og'ir" holati, o'ngda foiz va qoldirgan darslar,
  sinf bo'yicha umumiy foiz va eng ko'p qoldirganlar (top-5).
- **`src/lib/attendance.ts`** — zod sxema, holatlar, foiz hisobi, sana yordamchilari.
  Barcha sana hisobi **UTC** da (`@db.Date` bilan mos kelishi uchun).
- Saqlash **idempotent**: `@@unique([studentId, lessonId, date])` + `upsert`,
  hammasi bitta `$transaction` ichida. Yarim to'ldirib saqlash mumkin.
- Foiz kelishuvi: `(Keldi + Kechikdi) / jami`. Belgi bo'lmasa `0%` emas, `—`.
- **`lessonScope` tuzatildi:** sinf rahbari o'zi o'qitmaydigan fanga ham davomat
  qo'yadi (`OR: [{ teacher }, { class: { homeroomTeacher } }]`).
- Xavfsizlik: `assertCanAccessLesson` + **sinf tarkibi filtri** (forma
  `entry:<studentId>` maydonlari yuborilgani uchun begona ID lar serverda
  tashlab yuboriladi), `PARENT` avtomatik jurnalga yo'naltiriladi (faqat
  o'qish), `ACCOUNTANT` kira olmaydi, har bir saqlash audit'ga yoziladi.
- Sababsiz kelmagan o'quvchi uchun `Message` jadvaliga `QUEUED` SMS yoziladi
  (bir xil matn takrorlanmaydi). Provayder 10-bosqichda ulanadi.
- Tarjimalar **alohida fayl**: `messages/attendance/{uz,ru,en}.json`,
  `src/i18n/request.ts` ikki manbani birlashtiradi — katta JSON fayllarga
  tegilmadi. **Keyingi modullar uchun namuna shu.**

## 3. Merge qilingan PR'lar (qisqa tarix)

- **#2–#32** — poydevor, auth, xavfsizlik audit tuzatishlari, o'quvchi/o'qituvchi
  CRUD, Excel import, typecheck tuzatishlari, Edge-runtime login tuzatishi.
- **#33** — navbar (sidebar) scroll tuzatishi.
- **#34** — 4-bosqich: akademik poydevor + sinflar CRUD + haftalik jadval.
- **#35** — `useFormState` + `redirectNever` muammosi: 5 formada `state?.error`.
- **#36** — jadvalda "+" bilan dars qo'shish; sinf formasida joriy o'quv yili.
- **#37** — sinflarni Excel'dan import.
- **#38** — **5-bosqich: davomat moduli.**
- **#39** — layout tuzatishi: ikkita skrolbar va sahifa oxiridagi bo'sh maydon.
  Yagona skrol — sahifaning o'zi; yon menyu va header `sticky`; yon menyu
  skrolbari ko'rinmaydi (`no-scrollbar`).

**#1** (`ishchi shox` → `main`) hali **ochiq** — ishga tushirishdan oldin merge qilinadi.

## 4. Baza holati

`prisma/schema.prisma` **TZ'dagi butun ma'lumotlar modelini** o'z ichiga oladi —
ya'ni keyingi bosqichlar uchun jadvallar allaqachon mavjud:

- Tayyor va ishlatilayotgan: `User`, `Teacher`, `Guardian`, `Student`, `Class`,
  `Subject`, `AcademicYear`, `Quarter`, `LessonPeriod`, `Lesson`, `Attendance`,
  `AuditLog`.
- Tayyor, lekin hali interfeysi yo'q: `Grade`, `PenaltyCriterion`, `Penalty`,
  `Contract`, `Invoice`, `Payment`, `Message` (qismán — davomat SMS navbati),
  `Test`, `TestResult`.

> **6-bosqich uchun ham sxema o'zgarishi kutilmaydi** — `Grade` va `Quarter`
> modellari tayyor. Faqat reyting sozlamasi uchun joy kerak bo'lishi mumkin.

Migratsiya tarixi hali boshlanmagan: hozircha `npx prisma db push` ishlatiladi.
`npx prisma migrate dev --name init` qilish navbatda turadi.

## 5. Papka tuzilishi

```
prisma/schema.prisma
messages/{uz,ru,en}.json        # KATTA fayllar — ehtiyot bo'ling
messages/attendance/{uz,ru,en}.json   # modul bo'yicha alohida tarjima (NAMUNA)
src/i18n/{config,navigation,request}.ts
src/components/ui/             # button, card, input, label, sheet
src/components/import-wizard.tsx
src/components/nav-config.ts
src/components/sidebar.tsx
src/lib/                       # quyida
src/app/[locale]/(app)/        # sahifalar: students, teachers, subjects,
                               # academic-years, lesson-periods, classes,
                               # schedule, attendance (+ attendance/journal)
src/app/api/import-template/[entity]/route.ts
```

`src/lib/` fayllari: `academics.ts`, `attendance.ts`, `audit.ts`, `auth-guard.ts`,
`class-imports.ts`, `classes.ts`, `db.ts`, `env.ts`, `excel.ts`,
`import-guards.ts`, `imports.ts`, `lessons.ts`, `logger.ts`, `password.ts`,
`rate-limit.ts`, `rbac.ts`, `safe-action.ts`, `scope.ts`, `students.ts`,
`teachers.ts`, `test-questions.ts`, `utils.ts`.

## 6. i18n nomkosmalari

`common`, `login`, `changePassword`, `forbidden`, `errors`, `notFound`, `roles`,
`nav` (+ `groups`), `dashboard`, `students`, `teachers`, `subjects`,
`academicYears`, `lessonPeriods`, `classes`, `schedule` (+ `days`), `import`
— bularning hammasi `messages/{uz,ru,en}.json` ichida.

`attendance` — alohida faylda: `messages/attendance/{uz,ru,en}.json`.

Asosiy uchta fayl (uz/ru/en) **to'liq kalit parragiga ega** — biri o'zgarsa
uchalasi o'zgaradi. Yangi modul qo'shganda **alohida fayl** usulini tanlang.

## 7. Layout qoidasi (PR #39 dan keyin)

- **Yagona ko'rinadigan skrol** — sahifaning o'zi (brauzerning o'ng chetidagi).
- Kontent maydonida (`main`) **ichki skrol konteyneri yaratilmaydi**.
- Yon menyu va header `position: sticky` bilan ushlab turiladi — sticky
  qo'shimcha skrolbar yaratmaydi.
- Yon menyuning ichki skroli bor, lekin skrolbari `no-scrollbar` bilan
  **yashirilgan** — buni o'zgartirmang.
- `min-h-screen` **o'ng ustunda** turadi (tashqi flex konteynerda emas) — aks
  holda sahifa oxirida bo'sh oq maydon paydo bo'ladi.
