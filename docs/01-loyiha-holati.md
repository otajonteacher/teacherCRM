# Loyiha holati (oxirgi yangilash: 5-bosqich boshlanishidan oldin)

## 1. Shoxlar

| Shox | Vazifasi |
| --- | --- |
| `main` | Ishga tushirish uchun. **Orqada** — PR #1 hali merge qilinmagan |
| `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098` | **Ishchi shox** — hamma ish shu yerda to'planadi |
| `claude/<vazifa-nomi>` | Har bir vazifa uchun vaqtinchalik shox → draft PR |

Yangi ish boshlaganda: `create_branch(from_branch = ishchi shox)`.

## 2. Bosqichlar holati

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

## 3. Merge qilingan PR'lar (qisqa tarix)

- **#2–#32** — poydevor, auth, xavfsizlik audit tuzatishlari, o'quvchi/o'qituvchi
  CRUD, Excel import, typecheck tuzatishlari, Edge-runtime login tuzatishi.
- **#33** — navbar (sidebar) scroll tuzatishi: sidebar alohida scroll bo'ladi,
  butun sahifa qimirlamaydi, scrollbar ko'rinmaydi.
- **#34** — 4-bosqich: akademik poydevor + sinflar CRUD + haftalik jadval.
- **#35** — `useFormState` + `redirectNever` muammosi: 5 formada `state?.error`.
- **#36** — jadvalda "+" bilan dars qo'shish; sinf formasida joriy o'quv yili.
- **#37** — sinflarni Excel'dan import.

**#1** (`ishchi shox` → `main`) hali **ochiq** — ishga tushirishdan oldin merge qilinadi.

## 4. Baza holati

`prisma/schema.prisma` **TZ'dagi butun ma'lumotlar modelini** o'z ichiga oladi —
ya'ni keyingi bosqichlar uchun jadvallar allaqachon mavjud:

- Tayyor va ishlatilayotgan: `User`, `Teacher`, `Guardian`, `Student`, `Class`,
  `Subject`, `AcademicYear`, `Quarter`, `LessonPeriod`, `Lesson`, `AuditLog`.
- Tayyor, lekin hali interfeysi yo'q: **`Attendance`**, `Grade`,
  `PenaltyCriterion`, `Penalty`, `Contract`, `Invoice`, `Payment`, `Message`,
  `Test`, `TestResult`.

> Shu sababli 5-bosqich (davomat) uchun **sxema o'zgartirish kerak emas** —
> `Attendance` modeli `@@unique([studentId, lessonId, date])` bilan tayyor.

Migratsiya tarixi hali boshlanmagan: hozircha `npx prisma db push` ishlatiladi.
`npx prisma migrate dev --name init` qilish navbatda turadi.

## 5. Papka tuzilishi

```
prisma/schema.prisma
messages/{uz,ru,en}.json        # KATTA fayllar — ehtiyot bo'ling
src/i18n/{config,navigation,request}.ts
src/components/ui/             # button, card, input, label, sheet
src/components/import-wizard.tsx
src/components/nav-config.ts
src/lib/                       # quyida
src/app/[locale]/(app)/        # sahifalar: students, teachers, subjects,
                               # academic-years, lesson-periods, classes, schedule
src/app/api/import-template/[entity]/route.ts
```

`src/lib/` fayllari: `academics.ts`, `audit.ts`, `auth-guard.ts`, `class-imports.ts`,
`classes.ts`, `db.ts`, `env.ts`, `excel.ts`, `import-guards.ts`, `imports.ts`,
`lessons.ts`, `logger.ts`, `password.ts`, `rate-limit.ts`, `rbac.ts`,
`safe-action.ts`, `scope.ts`, `students.ts`, `teachers.ts`, `test-questions.ts`,
`utils.ts`.

## 6. i18n nomkosmalari

`common`, `login`, `changePassword`, `forbidden`, `errors`, `notFound`, `roles`,
`nav` (+ `groups`), `dashboard`, `students`, `teachers`, `subjects`,
`academicYears`, `lessonPeriods`, `classes`, `schedule` (+ `days`), `import`.

Uchta fayl (uz/ru/en) **to'liq kalit parragiga ega** — biri o'zgarsa uchalasi
o'zgaradi.
