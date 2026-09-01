# 0-to'lqin · O'lchov natijalari (2026-08-31)

Ikki qismli o'lchov: `QUERY_LOG=1 npm run dev` (baza so'rovlari) va
`npm run build` + `npm start` + brauzer DevTools (haqiqiy tezlik).
Sinov bazasi — **kichik** (1 faol sinf, bir nechta o'quvchi, 3 o'qituvchi).

---

## 1-qism · Baza so'rovlari (dev)

83 so'rov, 10 sahifa qo'lda bosib chiqilgan.

| O'lchov | Natija |
| --- | --- |
| Jami so'rov | 83 |
| Jami baza vaqti | ~450 ms |
| 100 ms dan uzun so'rov | **0 ta** |
| Eng uzun so'rov | 78 ms (`User` — birinchi, sovuq ulanish) |
| O'rtacha so'rov | ~5 ms |

Sahifa 10–20 sekund ochilgani ko'ringan joylarda vaqtning deyarli hammasi
`next dev` kompilyatsiyasiga ketgan (`Compiled /[locale]/login in 19.2s`).
Kompilyatsiyadan keyin xuddi shu sahifalar 160–900 ms da ochilgan.

**Xulosa:** hozirgi ma'lumot hajmida indeks yoki `groupBy` shoshilinch emas.

### Sahifalar kesimi (dev, kompilyatsiyadan keyin)

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

---

## 2-qism · Production o'lchovi (`npm start` + DevTools)

### Build hajmi — sog'lom

| Ko'rsatkich | Natija |
| --- | --- |
| Shared JS | 87.2 kB |
| Eng og'ir sahifa | `/journal`, `/attendance` — 141 kB |
| Middleware | 87.7 kB |
| Statik sahifa | 72/72 |

Next.js uchun bu yaxshi ko'rsatkich (chegara ~170 kB). Frontend hajmi muammo
emas.

### Sahifa ochilishi — tez

`/uz/dashboard` birinchi ochilishi:

| So'rov | Status | Vaqt |
| --- | --- | --- |
| `localhost` | 307 (yo'naltirish) | 54 ms |
| `uz` | 307 (yo'naltirish) | 341 ms |
| `dashboard` (document, 17.5 kB) | 200 | 401 ms |
| DOMContentLoaded | | 651 ms |
| Load | | 1.44 s |

Sahifaning o'zi tez. Lekin ikki bosqichli **307 yo'naltirish** 395 ms yeydi —
bu foydalanuvchi hech narsa ko'rmay turgan vaqt.

---

## 3-qism · ENG MUHIM TOPILMA: prefetch toshqini

DevTools pastidagi yig'indi:

```
83 requests   344 kB transferred   Finish: 1.9 min
```

**1.9 daqiqa** — sahifa ochilgandan keyin fonda davom etgan tarmoq faoliyati.

Sababi: `/schedule` sahifasidagi jadval har katak uchun `<Link>` yaratadi va
Next.js ularning **har birini oldindan yuklaydi** (prefetch). Natijada
quyidagi ko'rinishdagi o'nlab so'rov ketadi:

```
schedule?day=1&period=cmt4oky9c...&_rsc=1qjk2   171 ms
schedule?day=2&period=cmt4oky9c...&_rsc=1qjk2   358 ms
schedule?day=3&period=cmt4oky9c...&_rsc=1qjk2   388 ms
...   (6 kun × har dars vaqti × har sinf)
schedule?day=6&period=cmt4oviqj...&_rsc=1qjk2   631 ms
```

**Nima uchun bu jiddiy:** har bir prefetch — bu shunchaki fayl yuklash emas,
**serverda to'liq sahifa render qilish va baza so'rovlari**. Ya'ni bitta
foydalanuvchi `/schedule` ni ochganda server o'nlab marta ishlaydi.

Hozir sezilmaydi, chunki ma'lumot kichik va server lokal. Real sharoitda:

- 30 o'qituvchi bir vaqtda jadvalni ochsa → server yuzlab render qiladi;
- har render baza so'rovlari yuboradi → ulanish hovuzi to'lib qoladi;
- o'qituvchi telefonda mobil internet bilan ishlaydi → keraksiz 344 kB.

Menyu havolalari ham prefetch qilinadi (`students?_rsc` 393 ms,
`teachers?_rsc` 405 ms, `classes?_rsc` 419 ms, `schedule?_rsc` 430 ms,
`attendance?_rsc` 439 ms) — bu me'yoriy va foydali, chunki havola soni oz.
Muammo faqat **jadval kataklari** kabi ko'p havolali joylarda.

### Yechim (2-to'lqin, 1-o'rin)

1. `/schedule` jadvalidagi katak havolalariga `prefetch={false}`;
2. yoki kataklarni havola emas, tugma qilib, holatni URL orqali emas
   klient tomonda boshqarish;
3. `/journal` va `/grades` jadvallarini ham shu nuqtai nazardan tekshirish.

Bu indeks qo'shishdan **ancha katta** samara beradi — chunki bu yerda gap
so'rovni tezlashtirishda emas, **keraksiz so'rovni butunlay yo'q qilishda**.

---

## Topilgan boshqa muammolar

### Prisma klienti ko'p marta yaratilyapti

`[so'rov] log yoqildi` xabari **15+ marta** chiqdi. U faqat yangi
`PrismaClient` yaratilganda chiqadi — ya'ni `db.ts` dagi `globalForPrisma`
singleton'i har route uchun qayta ishlayapti, har biri alohida ulanish
hovuzi ochadi. 2.3-band (connection pooling) uchun to'g'ridan-to'g'ri dalil.

### `npm start` da login butunlay ishlamagan

`UntrustedHost` — Auth.js v5 `Host` sarlavhasiga ishonmaydi, `trustHost`
sozlamasi yo'q edi. **Dev rejimida bu xato ko'rinmaydi.** Ya'ni o'lchov
o'tkazilmaganda bu faqat tizim serverga qo'yilgan kuni ma'lum bo'lardi.
Tuzatildi (`trustHost` PR).

### Ikki bosqichli 307 yo'naltirish

`/` → `/uz` → `/uz/dashboard` = 395 ms bo'sh kutish. Middleware'dagi til
aniqlash zanjiri. 2-to'lqinda qisqartirilishi mumkin.

### `pages.signIn: "/login"` — til prefiksi yo'q

Haqiqiy sahifa `/uz/login`. Auth.js qaytarganda `/login` ga yuboradi va
middleware qayta yo'naltiradi. Aylanma yo'naltirish xavfi — 1-to'lqinda.

### `/dashboard` bo'sh

Birorta ham baza so'rovi yubormadi — sahifa hali statik. 3-to'lqinda
to'ldiriladi.

### `Grade` va `Attendance` — kuzatuvda

Jurnalda `Grade` 25 ms, `Attendance` 14 ms — ma'lumot deyarli yo'q holatda.
Indekssizlikning ehtimoliy belgisi, `EXPLAIN ANALYZE` bilan tekshiriladi.

---

## 2-to'lqin ustuvorliklari — dalilga asoslangan yangi tartib

| O'rin | Ish | Asos |
| --- | --- | --- |
| 1 | **Prefetch toshqinini to'xtatish** (`/schedule`) | 83 so'rov, 1.9 daqiqa fon faoliyati |
| 2 | Prisma klienti / ulanish hovuzi | log 15+ marta yoqildi |
| 3 | `loading.tsx` skeletonlar | sezilgan tezlikka eng arzon ta'sir |
| 4 | 307 yo'naltirish zanjirini qisqartirish | 395 ms bo'sh kutish |
| 5 | `Promise.all` (`/ranking` 12 ketma-ket so'rov) | kelajakka tayyorgarlik |
| 6 | Sahifalash | hozir ro'yxatlar to'liq yuklanadi |
| 7 | Indekslar, `groupBy` | real ma'lumotdan keyin |

Eski rejadagi "2.1 Indekslar — 10–100 baravar samara" birinchi o'rindan
oxirga tushdi: hech bir so'rov 100 ms dan oshmadi. O'rniga o'lchov
ko'rsatgan haqiqiy muammolar birinchi o'ringa chiqdi.

---

## 0-to'lqin yakuni

| Band | Holat |
| --- | --- |
| 0.1 Tezlikni o'lchash | ✅ |
| 0.2 So'rovlarni log qilish | ✅ |
| 0.3 Migratsiya tizimi | ✅ |
| 0.4 Testlar poydevori (66 test) | ✅ |
| 0.5 CI | ✅ |

**0-to'lqin yopildi.** Keyingi: 1-bosqich · 1-to'lqin (xavfsizlik).
