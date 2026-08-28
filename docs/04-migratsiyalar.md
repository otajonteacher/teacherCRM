# Migratsiyalar

2026-08-28 dan boshlab baza sxemasi **migratsiyalar** bilan boshqariladi.
`prisma db push` davri tugadi.

## Nima uchun kerak

TZ ning DoD bo'limida talab bor: *"migratsiyalar versiyalangan bo'lishi
kerak"*. Xavfsizlik auditining 12-bandi ham shu.

Amaliy sabablar:

- **Tarix.** Har o'zgarish raqamlangan SQL fayl bo'lib qoladi — "bu ustun
  qachon va nima uchun qo'shildi" savoliga javob bor.
- **Qaytarish.** Xato o'zgarish qilinsa, orqaga qadam bor.
- **Serverga chiqish.** Mijoz serverida `npx prisma migrate deploy` bitta
  buyruq bilan hamma narsani qo'llaydi. `db push` esa "bu ustunni
  o'chiraymi?" deb so'raydi — va bir noto'g'ri `y` ma'lumotni yo'q qiladi.

## Hozirgi holat

```
prisma/migrations/
├── 0_init/migration.sql     ← butun sxema (poydevor)
└── migration_lock.toml
```

Baza `_prisma_migrations` xizmat jadvali bilan kuzatiladi. Tekshirish:

```cmd
npx prisma migrate status
```

Kutilgan javob: `Database schema is up to date!`

## Nima uchun 0_init birlashtirilgan

> Bu bo'limni o'chirmang. Kelajakda kimdir "nega 19-avgust migratsiyasi
> yo'q?" deb so'rashi mumkin — javob shu yerda.

Avval `prisma/migrations/20260819061500_security_schema_hardening/` degan
migratsiya bor edi. Uning o'z izohida shunday yozilgan edi:

```sql
-- Mavjud db:push bazasiga ALTER (to'liq init emas).
```

Ya'ni u faqat `ALTER TABLE`, `CREATE INDEX`, `ADD COLUMN` dan tashkil
topgan — bitta ham `CREATE TABLE` yo'q, chunki jadvallar `db push` bilan
allaqachon yaratilgan deb hisoblangan.

**Muammo:** bunday tarix bo'sh bazada ishlamaydi. Yangi serverda
`migrate deploy` yurgizilsa, `ALTER TABLE "User"` da to'xtaydi — chunki
`User` jadvali hali mavjud emas.

Ustiga to'liq `0_init` qo'shilsa, ziddiyat paydo bo'ladi:

| Tartib | Migratsiya | Natija |
|---|---|---|
| 1 | `0_init` | Hamma jadval yaratiladi, tugallangan holatda |
| 2 | `20260819061500_...` | `CREATE TYPE "DiscountType"` → xato: allaqachon mavjud |

Shuning uchun ikkisi **bitta poydevorga birlashtirildi**. `0_init` hozirgi
`schema.prisma` ning to'liq aksi, ya'ni 19-avgustdagi barcha o'zgarishlar
(indekslar, `mustChangePassword`, `updatedAt` ustunlari, `DiscountType`)
uning ichida.

Eski fayl **git tarixida saqlanadi**:

```cmd
git log --all --oneline -- prisma/migrations/20260819061500_security_schema_hardening
```

Birlashtirish bo'sh bazada sinovdan o'tkazildi: alohida `teacher_crm_sinov`
bazasi yaratilib, `migrate deploy` yurgizildi —
`All migrations have been successfully applied`. Sinov bazasi keyin
o'chirildi.

## Kundalik tartib

### Sxemani o'zgartirish

```cmd
npx prisma migrate dev --name jarima_ballari_qoshildi
```

Nom **o'zbekcha, pastki chiziq bilan** yoziladi va nima qilinganini
aytadi. `update`, `fix`, `new` kabi ma'nosiz nomlar yaramaydi.

Bu buyruq uch ishni qiladi: SQL faylni yozadi, bazaga qo'llaydi, Prisma
Client ni qayta yaratadi.

### Serverga chiqarish

```cmd
npx prisma migrate deploy
```

Faqat qo'llanmagan migratsiyalarni qo'llaydi, hech narsa so'ramaydi,
hech narsa o'chirmaydi. Ishlab chiqarishda **faqat shu** ishlatiladi.

### Holatni tekshirish

```cmd
npx prisma migrate status
```

## Qat'iy qoidalar

1. **`npx prisma db push` ni ishlatmang.** U migratsiya yozmaydi va
   tarixni buzadi. `package.json` da `db:push` skripti qolgan — lekin
   unga tegmang. (JSON izohni qo'llab-quvvatlamaydi, shuning uchun
   ogohlantirish shu yerda.)
2. **Qo'llangan migratsiyani tahrirlamang.** Fayl bir marta bazaga
   tushgach o'zgarmaydi. Xato bo'lsa — yangi migratsiya yoziladi.
3. **`prisma/migrations/` git ga tushadi.** `.gitignore` da bloklanmagan,
   shunday qolishi kerak.
4. **Ma'lumot o'chiradigan migratsiyadan oldin zaxira.** `DROP COLUMN`,
   `DROP TABLE` yoki tur o'zgartirish bo'lsa — avval zaxira.
5. **Migratsiya bilan kod bitta PR da.** Sxema o'zgarishi va uni
   ishlatadigan kod ajralmasligi kerak.

## Zaxira olish

```cmd
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -d teacher_crm -f D:\schoolCRM\zaxira-YYYY-MM-DD.sql
```

Zaxira **loyiha papkasidan tashqarida** saqlanadi. Sabab: repo ochiq, va
`.gitignore` da `*.sql` bloklanmagan — papka ichida bo'lsa `git add .`
bilan butun baza internetga chiqib ketishi mumkin.

Qaytarish:

```cmd
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d teacher_crm -f D:\schoolCRM\zaxira-YYYY-MM-DD.sql
```

## Keyingi ish (hali bajarilmagan)

- CI ga `prisma migrate status` qadamini qo'shish — haqiqiy test bazasi
  paydo bo'lgandan keyin.
- `Grade` jadvalidagi eski takroriy yozuvlarni tozalash (6-bosqichdan
  qolgan). Tekshirish so'rovi:

  ```sql
  SELECT "studentId", "lessonId", date::date, type, count(*)
  FROM "Grade" GROUP BY 1,2,3,4 HAVING count(*) > 1;
  ```
