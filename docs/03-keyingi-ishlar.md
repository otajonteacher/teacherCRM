# Keyingi ishlar

## 1. 6-bosqich: BAHOLAR va REYTING — bajarildi ✅

To'liq tavsif `docs/01-loyiha-holati.md` da. Qisqa xulosa:

- `/journal` — baho va davomat **kiritiladigan** yagona ekran;
- `/grades` — kunlik/haftalik o'zlashtirish hisoboti (faqat o'qish);
- `/ranking` — choraklik reyting, 1-2-3 o'rin, diagrammalar (faqat o'qish);
- baho shkalasi **0–100**, baho **darsga** bog'lanadi (`Grade.lessonId`);
- reyting formulasi sozlamasi bazada: `RankingSetting` (faqat ADMIN).

### 6-bosqichdan qolgan ishlar (ataylab keyinga surildi)

| Ish | Izoh |
| --- | --- |
| Reyting so'rovlarini `groupBy` ga o'tkazish | Hozir bir yillik baholar xotiraga o'qiladi. Sinf soni ko'paysa sekinlashadi |
| Takroriy kod | `averageOf` — `grades.ts` va `ranking.ts` da ikki marta; `parseTopN` — `journal.ts` va `ranking.ts` da; o'rin hisobi `rankByAverage` / `rankByScore` bo'lib ikkiga bo'lingan |
| `grades.ts` da o'lik kod | `gradeGridSaveSchema`, `ENTRY_PREFIX`, `cellKey`, `monthDatesForWeekdays`, `MONTH_TEXT_PATTERN`, `toGridInput` — tashlab yuborilgan "oylik jurnal" g'oyasidan qolgan. Foydalanilishi tasdiqlanmaguncha o'chirilmadi |
| Eski baholarni backfill | `Grade.lessonId` NULL bo'lgan qatorlar yangi unique cheklovga tushmaydi |
| Ota-ona uchun reyting matni | `/grades` ochildi; ota-onaga o'rin ustuni ko'rsatilmaydi (bitta o'quvchi ustida hisoblangan o'rin doim "1" chiqadi) |

## 2. Menyudagi mavjud bo'lmagan sahifalar — tuzatilishi kerak

`nav-config.ts` va `rbac.ts` da bor, lekin sahifasi hali yozilmagan (bosilsa
**404**):

`/penalties`, `/penalty-criteria`, `/rewards`, `/reward-criteria`, `/payments`,
`/reports`, `/messages`, `/tests`, `/ai-assistant`, `/users`.

Ikki yo'ldan biri tanlanadi:

1. sahifa yozilmaguncha menyudan **yashirish** (tez, tavsiya etiladi); yoki
2. har biriga "tez orada" ko'rinishidagi vaqtinchalik sahifa qo'yish.

`/rewards` va `/reward-criteria` — **TZ da umuman yo'q**. Egasi bilan
aniqlanishi kerak: mukofot tizimi TZ ga qo'shiladimi yoki menyudan olinadimi.

## 3. Ochiq qarorlar (egasi hal qilishi kerak)

| Mavzu | Holat |
| --- | --- |
| TZ 3.1.1 — sessiya bekor qilish | **B varianti:** har bir yozuv amalida `isActive` tekshiriladi. Keyinroq qo'shiladi |
| TZ 3.14.6 — eksport | O'quvchi/o'qituvchi ro'yxatini `.xlsx` ga eksport; ustunlar **import shabloni bilan bir xil** |
| O'quvchi formasi | Qayta chizish kerak (UX yaxshilash) |
| Baho tizimi | ✅ **Yopildi:** 0–100 balli. 5 balli ko'rinish qo'shilmadi |
| Reyting formulasi | TZ da `baho − jarima + test` deb yozilgan, kodda esa **og'irlikli**: `(baho×gw + test×tw)/(gw+tw) − jarima×pf/100`. TZ ga yozilishi kerak |
| `RankingSetting` | Modelda bor, TZ ning ERD bo'limida yo'q — qo'shilishi kerak |
| Reyting doirasi `parallel` | Kodda bor (bir xil parallel sinflar), TZ da ta'riflanmagan |
| Mukofot tizimi | Menyu va rbac da bor, TZ da yo'q — qaror kerak |
| Davomat qisqartmalari | `K` / `SZ` / `SL` / `KCH` — kodda bor, TZ da hujjatlashtirilmagan |

## 4. Davomat moduli — qolgan kichik ishlar

- **O'quvchi kartochkasida davomat foizi** va qoldirgan darslar soni
  (`/students/[id]`). Hisob funksiyalari `src/lib/attendance.ts` da tayyor
  (`attendancePercent`, `missedLessons`) — faqat sahifaga qo'shish qoldi.
- Davomatni `.xlsx` ga eksport (TZ 3.14.6 bilan birga qilinsa mantiqiy).

## 5. Xavfsizlik auditi — qolgan punktlar

| № | Ish |
| --- | --- |
| 12 | `npx prisma migrate dev --name init` — migratsiya tarixini boshlash. **6-bosqichdan keyin ayniqsa muhim:** sxema o'zgardi |
| 13 | Qolgan `@@index` larni qo'shish |
| 14 | `Student.userId` (A varianti — o'quvchining o'z hisobi) |
| 15 | Sxema nuqsonlari: `BigInt` agregatsiya, `Test.questions` uchun zod validatsiya |
| 16 | `vitest` + RBAC/doira testlari. **Eng katta bo'shliq:** loyihada bitta ham test yo'q |
| 17 | GitHub Actions CI (typecheck + lint + test) |
| 19 | `loading.tsx` fayllari (skeleton) |
| 20 | Sidebar'da eng uzun mos kelish bo'yicha aktiv holat (`/penalties` va `/penalty-criteria` chalkashligi) |
| 24 | ✅ 6-bosqich xavfsizligi: zod oralig'i, o'qituvchi faqat o'z fani, baho o'zgarishida audit majburiy — bajarildi |
| 9 | `/api` uchun umumiy qoida (middleware `/api/*` ni tekshirmaydi — har bir route o'zi tekshiradi) |
| — | Next.js 14.2.15 eskirgan — yangilash rejalashtirilsin |

## 6. Keyingi bosqichlar uchun eslatmalar

- **7-bosqich (jarima):** `PenaltyCriterion` mezonlarini faqat admin boshqaradi,
  ball mezondan avtomatik olinadi. Reyting allaqachon jarima ballini hisobga
  oladi (`penaltyFactor`) — mezonlar sahifasi qo'shilishi bilan ishlay boshlaydi.
- **8-bosqich (to'lov):** `Contract` → `Invoice` → `Payment` zanjiri tayyor;
  oylik invoice avtomatik generatsiya qilinadi; summalar `Int` (so'm).
- **10-bosqich (SMS):** davomat moduli allaqachon `Message` jadvaliga `QUEUED`
  yozuv qo'yadi — provayder ulanganda navbatdagilar jo'natiladi.
- **11-bosqich (testlar):** matn formati `?`/`+`/`-` (TZ 4.1);
  `src/lib/test-questions.ts` allaqachon mavjud — tekshirib ko'ring.
  Test natijalari reytingga `testWeight` orqali qo'shiladi.
- **Dizayn yangilash:** egasi 1–6-bosqichlarni qayta tahlil qilib, dizaynni
  zamonaviylashtirishni rejalashtirgan — alohida vazifa sifatida bajariladi.
