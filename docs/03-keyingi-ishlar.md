# Keyingi ishlar

## 1. 5-bosqich: DAVOMAT (yo'qlama) — keyingi vazifa

Egasi bilan kelishilgan qarorlar:

- **Aniqlik darajasi:** davomat **har bir dars uchun alohida** belgilanadi
  (TZ 3.5 bo'yicha), kunlik emas.
- **Kim belgilaydi:**
  - `ADMIN` — barcha darslarga;
  - `TEACHER` — **o'zi dars beradigan** darslarga;
  - **sinf rahbari** — o'z sinfining **barcha** darslariga.

### Baza

**Sxema o'zgarmaydi.** `Attendance` modeli tayyor:
`studentId`, `lessonId`, `date` (`@db.Date`), `status`, `note`,
`@@unique([studentId, lessonId, date])`, `@@index([studentId, date])`,
`@@index([lessonId, date])`. `AttendanceStatus` enum: `PRESENT`, `ABSENT`,
`LATE`, `EXCUSED`. `/attendance` yo'li `rbac.ts` da ADMIN/TEACHER/PARENT uchun
allaqachon ochiq. `attendanceScope` va `assertCanAccessAttendance` yozilgan.

### Qilinadigan ishlar

1. **`src/lib/scope.ts` — `lessonScope` tuzatiladi.** Hozir `TEACHER` uchun
   faqat `{ teacher: { userId } }`. Sinf rahbari o'z sinfining hamma darsiga
   kirishi uchun `OR` ga `{ class: { homeroomTeacher: { userId } } }` qo'shiladi.
   Qolgan hamma joy (`assertCanAccessLesson`, davomat action'lari) avtomatik
   moslashadi.
2. **`src/lib/attendance.ts` (yangi)** — zod sxemalar, holat ro'yxati va
   yorliqlari, davomat foizini hisoblash yordamchilari.
3. **`/attendance` — tez kiritish ekrani (asosiy ish):**
   - sana + dars tanlanadi (tanlangan sana kuniga mos darslar chiqadi);
   - butun sinf bir ekranda, har o'quvchi yonida 4 tugma;
   - yuqorida **"Hammasini keldi deb belgilash"**;
   - bitta `Saqlash` → tranzaksiya ichida `upsert` (idempotent);
   - allaqachon belgilangan dars ochilsa mavjud holatlar tanlangan chiqadi.
4. **`/attendance/journal`** — sinf × sana matritsasi (hafta bo'yicha) va foizlar.
5. **Statistika** — o'quvchi kartasida davomat foizi va qoldirgan darslar;
   sinf bo'yicha umumiy foiz, eng ko'p qoldirganlar.
6. **Xavfsizlik** — har bir saqlash `assertCanAccessLesson` dan o'tadi;
   `PARENT` faqat ko'radi; `ACCOUNTANT` umuman ko'rmaydi; audit yoziladi.
7. **Tarjimalar** — `attendance` nomkosmasi. Katta JSON fayllarga tegmaslik
   uchun alohida fayl + `src/i18n/request.ts` da qo'shish tavsiya etilgan.
8. **SMS** — TZ 3.5 da bor, lekin provayder 10-bosqichda ulanadi. Hozir faqat
   `Message` jadvaliga `QUEUED` yozuv qo'yish joyi qoldiriladi.

## 2. Ochiq qarorlar (egasi bilan kelishilgan, hali bajarilmagan)

| Mavzu | Qaror |
| --- | --- |
| TZ 3.1.1 — sessiya bekor qilish | **B varianti:** har bir yozuv amali va kritik server action'da `isActive` tekshiriladi. Keyinroq qo'shiladi |
| TZ 3.14.6 — eksport | O'quvchi/o'qituvchi ro'yxatini `.xlsx` ga eksport; ustunlar **import shabloni bilan bir xil** |
| O'quvchi formasi | Qayta chizish kerak (UX yaxshilash) |
| Baho tizimi | 5 balli / 100 balli — sozlama orqali (6-bosqichda hal qilinadi) |

## 3. Xavfsizlik auditi — qolgan punktlar

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

## 4. Keyingi bosqichlar uchun eslatmalar

- **6-bosqich (baholar/reyting):** `Grade` va `Quarter` modellari tayyor.
  Reyting formulasi sozlanadigan bo'lishi kerak (o'rtacha ball − jarima
  koeffitsienti + test natijasi).
- **7-bosqich (jarima):** `PenaltyCriterion` mezonlarini faqat admin boshqaradi,
  ball mezondan avtomatik olinadi.
- **8-bosqich (to'lov):** `Contract` → `Invoice` → `Payment` zanjiri tayyor;
  oylik invoice avtomatik generatsiya qilinadi; summalar `Int` (so'm).
- **11-bosqich (testlar):** matn formati `?`/`+`/`-` (TZ 4.1);
  `src/lib/test-questions.ts` allaqachon mavjud — tekshirib ko'ring.
