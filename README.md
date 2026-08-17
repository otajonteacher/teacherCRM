# 🎓 Maktab CRM (teacherCRM)

Xususiy maktab uchun AI bilan boyitilgan CRM tizimi. Bu repozitoriy bosqichma-bosqich quriladi; ushbu bosqichda **poydevor + autentifikatsiya va rollar (RBAC)** tayyor.

To'liq Texnik Topshiriq (TZ) Notion'da yuritiladi.

## 🧱 Texnologiyalar

| Qatlam | Texnologiya |
| --- | --- |
| Frontend + Backend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Ma'lumotlar bazasi | PostgreSQL + Prisma ORM |
| Autentifikatsiya | Auth.js (NextAuth v5) — login/parol + RBAC |
| Ko'p tillilik | next-intl (uz / ru / en) |

## ✅ Talablar (nima o'rnatish kerak)

1. **Node.js** 18.18+ (tavsiya: 20 yoki 22) — https://nodejs.org
2. **PostgreSQL** 14+ — https://www.postgresql.org/download/
   - yoki Docker orqali: `docker run --name crm-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`
3. **npm** (Node bilan birga keladi)

## 🚀 Ishga tushirish

```bash
# 1. Bog'liqliklarni o'rnatish
npm install

# 2. Muhit o'zgaruvchilarini sozlash
cp .env.example .env
#  .env faylida DATABASE_URL va AUTH_SECRET ni to'ldiring
#  AUTH_SECRET generatsiya qilish:
npx auth secret         # yoki: openssl rand -base64 32

# 3. Prisma klientini generatsiya qilish
npm run db:generate

# 4. Ma'lumotlar bazasi jadvallarini yaratish
npm run db:push          # tez usul (dev)
#  yoki migratsiya bilan: npm run db:migrate

# 5. Demo ma'lumotlarni yuklash (4 rol, fanlar, jarima mezonlari)
npm run db:seed

# 6. Loyihani ishga tushirish
npm run dev
```

Brauzerda oching: **http://localhost:3000** (avtomatik `/uz` ga yo'naltiradi).

## 👤 Demo hisoblar (parol hammasida: `password123`)

| Rol | Login |
| --- | --- |
| Administrator | `admin@maktab.uz` |
| O'qituvchi | `teacher@maktab.uz` |
| Buxgalter | `accountant@maktab.uz` |
| Ota-ona / O'quvchi | `parent@maktab.uz` |

Har bir rol o'ziga mos yon menyuni ko'radi (RBAC).

## 📂 Loyiha tuzilishi

```text
prisma/
  schema.prisma       # To'liq ma'lumotlar modeli (barcha entitilar)
  seed.ts             # Demo ma'lumotlar
messages/             # Tarjimalar: uz.json, ru.json, en.json
src/
  auth.ts             # Auth.js konfiguratsiyasi (credentials + rollar)
  middleware.ts       # next-intl til yo'naltirish
  i18n/               # i18n konfiguratsiya, navigatsiya, so'rov
  lib/                # db (Prisma), utils, rbac
  components/         # UI (shadcn), sidebar, til almashtirgich
  app/
    [locale]/
      login/          # Kirish sahifasi
      (app)/          # Himoyalangan qism (auth guard)
        dashboard/    # Boshqaruv paneli
    api/auth/         # Auth.js route handler
```

## 🗺 Keyingi bosqichlar

O'quvchi/o'qituvchi bazasi → sinf/jadval → davomat → baho + reyting → jarima ball → to'lovlar → hisobot → SMS → test moduli → AI.
