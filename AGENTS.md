# teacherCRM — AI agent uchun kirish nuqtasi

> ⚠️ **DIQQAT: `main` shoxi orqada.** Butun ishlab chiqish quyidagi shoxda:
>
> ```
> claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098
> ```
>
> Kodni va hujjatlarni **shu shoxdan** o'qing (`ref` parametrida shox nomini
> ko'rsating). `main` da faqat shu yo'riqnoma turadi.

## Birinchi navbatda o'qiladigan hujjatlar

Ishchi shoxda (`ref = claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098`):

| Fayl | Nima uchun |
| --- | --- |
| `AGENTS.md` | To'liq yo'riqnoma: ish jarayoni, majburiy qoidalar, tuzoqlar |
| `docs/00-tz-qisqacha.md` | Texnik topshiriq qisqartmasi: rollar, RBAC matritsasi, 15 bosqichli roadmap |
| `docs/01-loyiha-holati.md` | Hozirgi holat: nima bitgan, qaysi PR'lar, baza holati, papka tuzilishi |
| `docs/02-konvensiyalar.md` | Kod naqshlari va oldin yo'l qo'yilgan xatolar |
| `docs/03-keyingi-ishlar.md` | Keyingi bosqich (davomat) rejasi, ochiq qarorlar, audit ro'yxati |

## Loyiha haqida qisqa

Xususiy maktab uchun CRM: o'quvchi/o'qituvchi bazasi, sinf va dars jadvali,
davomat, baholar, jarima ball, reyting, to'lovlar, hisobotlar, SMS va AI modullari.

Stack: Next.js 14 App Router + TypeScript, Tailwind + shadcn/ui,
PostgreSQL + Prisma, Auth.js (JWT), next-intl (uz/ru/en).

**1–4-bosqich bajarilgan** (poydevor, auth/RBAC, o'quvchi–o'qituvchi bazasi va
Excel import, sinflar va dars jadvali). **Keyingisi — 5-bosqich: davomat.**

## Uchta majburiy qoida

1. `main` ga to'g'ridan-to'g'ri push qilinmaydi. Har bir o'zgarish:
   ishchi shoxdan yangi shox → commit → **draft PR** (o'zbek tilida, test rejasi bilan).
   **Merge'ni faqat loyiha egasi bosadi.**
2. `messages/uz.json`, `ru.json`, `en.json` fayllarini to'liq qayta yozmang —
   payload kesilib ilova buzilgan holat bo'lgan. Sababi va yechimi:
   `docs/02-konvensiyalar.md`.
3. Muloqot va barcha interfeys matnlari **o'zbek tilida**.
