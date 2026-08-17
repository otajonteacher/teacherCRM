# teacherCRM

Xususiy maktablar uchun AI bilan boyitilgan, **ko'p maktabli (multi-tenant)** CRM tizimi.

O'quvchi va o'qituvchilar bazasi, dars jadvali, davomat, baholar, jarima ball, choraklik
reyting, to'lov/kontrakt (buxgalteriya), hisobotlar, SMS xabarnoma, 3 tillilik (uz/ru/en)
va AI modullari (test generatori, o'quvchi tahlili, yordamchi) bir platformada.

## Texnologiyalar

Next.js (App Router) + TypeScript · Tailwind CSS + shadcn/ui · PostgreSQL + Prisma ·
Auth.js (RBAC, tenant-aware) · next-intl · Vercel AI SDK (provider-agnostic) ·
Eskiz.uz / Play Mobile (SMS).

## Hujjatlar

- 📘 **[Texnik Topshiriq (TZ)](docs/TZ.md)** — loyihaning asosiy arxitektura hujjati
  (single source of truth): talablar, RBAC, ma'lumotlar modeli va roadmap.
