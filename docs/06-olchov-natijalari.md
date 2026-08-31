# 0-to'lqin · O'lchov natijalari (2026-08-31)

Manba: `QUERY_LOG=1 npm run dev`, 83 so'rov, 10 sahifa qo'lda bosib chiqilgan.
Sinov bazasi — **kichik** (1 faol sinf, bir nechta o'quvchi, 3 o'qituvchi).

## Asosiy xulosa: sekinlikning sababi baza EMAS

| O'lchov | Natija |
| --- | --- |
| Jami so'rov | 83 |
| Jami baza vaqti | ~450 ms |
| 100 ms dan uzun so'rov | **0 ta** |
| Eng uzun so'rov | 78 ms (`User` — birinchi, sovuq ulanish) |
| O'rtacha so'rov | ~5 ms |

Sahifa 10–20 sekund ochilgani ko'ringan joylarda vaqtning deyarli hammasi
`next dev` kompilyatsiyasiga ketgan:

```
✓ Compiled /[locale]/[...rest] in 20.6s
✓ Compiled /[locale]/login in 19.2s
GET /uz/login 200 in 21651ms   ← shundan bazaga 127ms
```

Kompilyatsiya tugagach xuddi shu sahifalar **160–900 ms** da ochilgan.

**Demak:** 2-to'lqinda indeks qo'shish yoki `groupBy` ga o'tish shoshilinch
emas. Rejadagi "10–100 baravar tezlashadi" taxmini hozirgi ma'lumot hajmida
tasdiqlanmadi.

## Sahifalar kesimi (kompilyatsiyadan keyingi haqiqiy vaqt)

| Sahifa | So'rov | Vaqt |
| --- | --- | --- |
| `/students` | 5 | 419 ms |
| `/teachers` | 6 | 185 ms |
| `/classes` | 5 | 225 ms |
| `/schedule` | 12 | 868 ms |
| `/attendance` | 2 | 195 ms |
| `/journal` (sinf tanlangan) | 7 | 633 ms |
| `/grades` | 6 | 574 ms |
| `/ranking` (sinf kesimi) | 12 | 1175 ms |

## Topilgan haqiqiy muammolar

### 1. Prisma klienti ko'p marta yaratilyapti — ENG MUHIM

`[so'rov] log yoqildi` xabari **15+ marta** chiqdi. Bu xabar faqat yangi
`PrismaClient` yaratilganda chiqadi. Ya'ni `db.ts` dagi `globalForPrisma`
singleton'i har route uchun qayta ishlayapti — har biri **alohida ulanish
hovuzi** ochadi.

Dev'da bu shunchaki xotira sarfi. Lekin bu 2.3-bandning (connection pooling)
to'g'ridan-to'g'ri isboti: ishlab chiqarishda har route o'z hovuzini ochsa,
Postgres ulanish chegarasiga urilamiz. `EXPLAIN` emas, **shu** birinchi
tekshirilishi kerak.

### 2. Har sahifada keraksiz `SELECT 1`

#3, #19, #31, #34, #45, #52, #69 — 7 marta `SELECT 1`. Bu ulanish tirikligini
tekshirish so'rovi va yuqoridagi 1-muammoning yon ta'siri: har yangi klient
o'zini tekshiradi.

### 3. `/ranking` — 12 ketma-ket so'rov

#57–#68 ketma-ket ketadi: `RankingSetting` → `AcademicYear` → `Quarter` →
`Class` → `Student` → `Grade` → `Attendance` → `Penalty` → `TestResult` →
`Grade` → `Subject`.

Hozir har biri 0–9 ms, chunki ma'lumot yo'q. 500 o'quvchida har biri
50–300 ms bo'ladi → 12 × 150 ms = **1.8 sekund faqat kutishga**. Mustaqil
so'rovlarni `Promise.all` ga o'tkazish o'z kuchida qoladi — lekin bu
**kelajak uchun**, hozirgi og'riq uchun emas.

### 4. `Grade` va `Attendance` — kuzatuvda

Jurnalda `Grade` 25 ms, `Attendance` 14 ms — ma'lumot deyarli yo'q holatda.
Bu indeks yo'qligining ehtimoliy belgisi. `EXPLAIN ANALYZE` bilan
tekshirilishi kerak, lekin shoshilinch emas.

### 5. `/dashboard` bo'sh

Birorta ham so'rov yubormadi — sahifa hali statik. 3-to'lqinda to'ldiriladi.

## 2-to'lqin ustuvorliklari — qayta ko'rildi

Dalilga asoslangan yangi tartib:

| Eski reja | Yangi holat |
| --- | --- |
| 2.1 Indekslar ("eng katta samara") | **pasaytirildi** — hech bir so'rov 100 ms dan oshmadi |
| 2.2 `Promise.all` | **saqlanadi** — `/ranking`, `/schedule` uchun, kelajakka tayyorgarlik |
| 2.3 Ulanish hovuzi | **1-o'ringa ko'tarildi** — klient ko'payishi o'lchovda ko'rindi |
| 2.4 Sahifalash | saqlanadi — hozir ro'yxatlar to'liq yuklanadi |
| 2.5 `groupBy` | saqlanadi, lekin real ma'lumotdan keyin |
| 2.6 `loading.tsx` | **ko'tarildi** — sezilgan tezlikka eng arzon ta'sir |

## Hali o'lchanmagan

`npm run build` + `npm start` o'lchovi (0.1-band) olinmadi. `next dev`
kompilyatsiya vaqti haqiqiy tezlikni yashiradi — shuning uchun ishlab
chiqarish rejimidagi raqamlar 2-to'lqin boshlanishidan oldin kerak.
