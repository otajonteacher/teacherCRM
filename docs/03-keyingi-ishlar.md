# Keyingi ishlar

## 1. 6-bosqich: BAHOLAR va REYTING — keyingi vazifa

`Grade` va `Quarter` modellari sxemada tayyor.

### 1.1. Kelishilgan qarorlar (egasi tasdiqlagan — muhokama yopilgan)

| Mavzu | Qaror |
| --- | --- |
| **Baho tizimi** | **Faqat 100 ballik.** 5 ballik variant **qilinmaydi**, sozlama ham kerak emas — kodni sodda tuting |
| **Kim baho qo'yadi** | **Faqat fan o'qituvchisi**, faqat **o'zi dars beradigan** darsga. Sinf rahbari boshqa fandan baho qo'ya **olmaydi** |
| **ADMIN** | **Hamma narsaga to'liq ruxsat** — baho qo'yadi, o'zgartiradi, o'chiradi. Cheklov yo'q |
| `ACCOUNTANT`, `PARENT` | Baho **qo'ya olmaydi**. `PARENT` faqat o'z farzandining bahosini **ko'radi** |

> **Diqqat — davomatdan FARQLI qoida!** Davomatda sinf rahbari o'zi
> o'qitmaydigan fanga ham davomat qo'ya oladi (`lessonScope` da
> `OR: [{ teacher }, { class: { homeroomTeacher } }]`). **Bahoda bu qoida
> ishlamaydi.** `gradeScope` / baho qo'yish action'i uchun `TEACHER` sharti
> faqat `{ lesson: { teacher: { userId } } }` bo'lishi kerak — homeroom shoxi
> qo'shilmaydi. Buni chalkashtirib yuborish oson, ehtiyot bo'ling.

### 1.2. 100 ballik tizim tafsilotlari

- Baho qiymati: butun son, **0–100**. zod: `z.number().int().min(0).max(100)`.
- Bazada `Grade.value` — `Int`. Kasr ball yo'q.
- Interfeysda tugma emas, **raqam kiritish maydoni** (davomatdagi 4 tugmadan
  farqli). Klaviaturadan tez kiritish uchun `inputMode="numeric"`.
- O'rtacha ball ko'rsatilganda 1 xona kasr (masalan `86.4`).
- Harf/so'z bilan izoh kerak bo'lsa faqat **ko'rsatishda** hisoblanadi
  (masalan 86–100 “a'lo”), bazada saqlanmaydi.

### 1.3. Qilinadigan ishlar

1. **`src/lib/grades.ts`** — zod sxemalar (0–100), o'rtacha ball hisobi,
   chorak bo'yicha yig'ish. Davomat moduli (`src/lib/attendance.ts`)
   tuzilishini namuna qilib oling.
2. **Baho qo'yish ekrani** — davomat bilan bir xil naqsh: sana → dars → butun
   sinf bitta ekranda, bitta `Saqlash`, `upsert` bilan idempotent.
   **Dars ro'yxati faqat o'qituvchining o'z darslaridan** iborat bo'ladi
   (ADMIN uchun hammasi).
3. **Reyting** — choraklik. Formula **sozlanadigan** bo'lishi kerak:
   o'rtacha ball − jarima koeffitsienti + test natijasi.
4. **Xavfsizlik** — `AGENTS.md` 0-bo'limidagi majburiy ro'yxat bo'yicha:
   `gradeScope`, `assertCanAccessGrade`, sinf tarkibi filtri (forma begona
   `studentId` yuborsa tashlanadi), audit. `ADMIN` uchun bo'sh filtr.
5. **Tarjimalar** — `messages/grades/{uz,ru,en}.json` (alohida fayl usuli).

## 2. Alohida "Jurnal" menyusi — egasining yangi talabi

> Egasining so'zi: *"Jurnal degan menu qo'shib quyamiz (bu menu davomat
> sahifasining ichida emas alohida menu sifatida qo'shiladi). Jurnal sahifasiga
> kirsa sinflar tanlangach usha sinf uchun bir kunlik jurnal to'liq hamma fan va
> har bir bolaga necha baho quyilgani to'liq chiqishi kerak. Oldingi kunni
> tanlasa oldingi kun chiqishi kerak."*

Bu **qog'oz sinf jurnalining elektron ko'rinishi** — an'anaviy jurnalda ham bir
sahifada bitta kunning hamma darsi va hamma bolaning bahosi turadi.

### Talab

- **Alohida top-level menyu:** `/journal` (davomat sahifasining ichida emas).
  Hozirgi `/attendance/journal` — faqat davomat matritsasi; yangi `/journal`
  esa **baho + davomat birlashtirilgan kunlik jurnal**.
- Kirishda: **sinf tanlanadi** + **sana tanlanadi** (sukut bo'yicha bugun).
- Chiqadigan ko'rinish: **matritsa** — qatorlar: o'quvchilar; ustunlar: o'sha
  kunning **hamma darslari** (jadvaldan olinadi, dars soati tartibida).
- Har bir katakda: **baho** (0–100; bir darsda bir necha baho bo'lishi mumkin —
  hammasi ko'rinadi) **va davomat holati** (masalan `85` yoki `Y` / `85, 90`).
- Sana o'zgartirilsa (oldingi kun) — o'sha kunning jadvali va yozuvlari chiqadi.
- O'ng chetda: o'quvchining o'sha kunlik o'rtacha bahosi.
- Faqat **o'qish** uchun — bu ko'rish/chop etish ekrani, kiritish emas.
  (Kiritish o'z sahifalarida: `/attendance` va baho qo'yish ekrani.)

### Bajarilish vaqti

**6-bosqichdan KEYIN.** Sababi: jurnalning asosiy mazmuni — baholar, ular esa
6-bosqichda paydo bo'ladi. Hozir qilinsa, faqat davomat ustunlari bilan yarim
bo'sh jadval chiqadi va ikkinchi marta qayta yozish kerak bo'ladi.

Egasi bilan kelishilgan: **talab TZ ga yozib qo'yildi, oxirida bajariladi.**

### Bajarilganda esda tutiladigan narsalar

- `rbac.ts` (`roleAllowedPaths`) va `nav-config.ts` — ikkisi birga yangilanadi.
- Doira: `classScope` + `studentScope` + `gradeScope` + `attendanceScope`.
  `PARENT` kirsa **faqat o'z farzandining qatori** ko'rinishi kerak — butun
  sinf jurnali ota-onaga ko'rsatilmaydi (bu maxfiylik talabi, muhim!).
- `ADMIN` — hamma sinf, hamma sana, cheklovsiz.
- `ACCOUNTANT` — kira olmaydi.
- Sana `searchParams` dan keladi → regex bilan tekshiriladi (`DATE_TEXT_PATTERN`).
- N+1 so'rovdan saqlanish: bir kunlik baholar va davomat **bitta-bitta**
  so'rovda olinadi va xotirada `Map` bilan guruhlanadi (davomat jurnalida
  shunday qilingan).

## 3. Ochiq qarorlar (egasi bilan kelishilgan, hali bajarilmagan)

| Mavzu | Qaror |
| --- | --- |
| TZ 3.1.1 — sessiya bekor qilish | **B varianti:** har bir yozuv amali va kritik server action'da `isActive` tekshiriladi. Keyinroq qo'shiladi |
| TZ 3.14.6 — eksport | O'quvchi/o'qituvchi ro'yxatini `.xlsx` ga eksport; ustunlar **import shabloni bilan bir xil** |
| O'quvchi formasi | Qayta chizish kerak (UX yaxshilash) |
| Baho tizimi | ✅ **Yopildi: faqat 100 ballik** |
| Baho qo'yish huquqi | ✅ **Yopildi: faqat fan o'qituvchisi + ADMIN** |
| Jurnal (`/journal`) | Alohida menyu, kunlik baho+davomat matritsasi — **6-bosqichdan keyin** |

## 4. Davomat moduli — qolgan kichik ishlar

5-bosqich yopildi (PR #38), lekin ataylab qoldirilgan:

- **O'quvchi kartochkasida davomat foizi** va qoldirgan darslar soni
  (`/students/[id]`). Hisob-kitob funksiyalari `src/lib/attendance.ts` da
  tayyor (`attendancePercent`, `missedLessons`) — faqat sahifaga qo'shish qoldi.
- Davomatni `.xlsx` ga eksport (TZ 3.14.6 bilan birga qilinsa mantiqiy).

## 5. Xavfsizlik auditi — qolgan punktlar

| № | Ish |
| --- | --- |
| 12 | `npx prisma migrate dev --name init` — migratsiya tarixini boshlash |
| 13 | Qolgan `@@index` larni qo'shish |
| 14 | `Student.userId` (A varianti — o'quvchining o'z hisobi) |
| 15 | Sxema nuqsonlari: `BigInt` agregatsiya, `Test.questions` uchun zod validatsiya |
| 16 | `vitest` + RBAC/doira testlari |
| 17 | GitHub Actions CI (typecheck + lint + test) |
| 19 | `loading.tsx` fayllari (skeleton) |
| 20 | Tozalash: sidebar'da eng uzun mos kelish bo'yicha aktiv holat (`/penalties` va `/penalty-criteria` chalkashligi) |
| 9 | `/api` uchun umumiy qoida (middleware `/api/*` ni tekshirmaydi — har bir route o'zi tekshiradi) |
| — | Next.js 14.2.15 eskirgan — yangilash rejalashtirilsin |

## 6. Keyingi bosqichlar uchun eslatmalar

- **7-bosqich (jarima):** `PenaltyCriterion` mezonlarini faqat admin boshqaradi,
  ball mezondan avtomatik olinadi.
- **8-bosqich (to'lov):** `Contract` → `Invoice` → `Payment` zanjiri tayyor;
  oylik invoice avtomatik generatsiya qilinadi; summalar `Int` (so'm).
- **10-bosqich (SMS):** davomat moduli allaqachon `Message` jadvaliga `QUEUED`
  yozuv qo'yadi — provayder ulanganda navbatdagilar jo'natiladi.
- **11-bosqich (testlar):** matn formati `?`/`+`/`-` (TZ 4.1);
  `src/lib/test-questions.ts` allaqachon mavjud — tekshirib ko'ring.
