# TZ — BAJARILISH HOLATI (to'liq holat)

> Bu hujjat TZ ning **har bir talabini kod bilan solishtirib** belgilaydi.
> Manba: repo `otajonteacher/teacherCRM`, shox
> `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098`.
> Tekshirilgan sana: **2026-08-26** (6-bosqich yakunlangandan keyin).
>
> To'liq TZ matni: `docs/tz/01-umumiy-va-funksional.md` va
> `docs/tz/02-ai-va-texnik.md`.

## Belgilar

| Belgi | Ma'nosi |
| --- | --- |
| ✅ | Bajarilgan — kod mavjud va ishlaydi |
| 🟡 | Qisman — asosiy qismi bor, to'liq emas yoki tekshirish kerak |
| ❌ | Bajarilmagan — hali yozilmagan |
| 🔒 | Ochiq qaror — texnik yechim yoki egasining qarori kerak |

---

## UMUMIY YAKUN

| Bosqich (TZ 8-bo'lim) | Holat |
| --- | --- |
| 1. Poydevor | ✅ Bajarilgan |
| 2. Auth va rollar | ✅ Bajarilgan |
| 3. O'quvchi va o'qituvchi bazasi + import | ✅ Bajarilgan (eksport qolgan) |
| 4. Sinf/guruh va dars jadvali | ✅ Bajarilgan |
| 5. Davomat (yo'qlama) | ✅ Bajarilgan |
| 6. Baholar + choraklik reyting | ✅ **Bajarilgan** |
| 7. Jarima ball tizimi | ❌ Keyingi navbat |
| 8. To'lovlar / kontraktlar | ❌ |
| 9. Dashboard va hisobotlar | 🟡 Dashboard skeleti bor, KPI/grafik yo'q |
| 10. SMS xabarnomalar | 🟡 Navbat (QUEUED) ishlaydi, provayder ulanmagan |
| 11. Test moduli | ❌ (`src/lib/test-questions.ts` poydevori bor) |
| 12. AI yadrosi | ❌ |
| 13. AI test generatori | ❌ |
| 14. AI o'quvchi tahlili | ❌ |
| 15. AI yordamchi (chat) | ❌ |

**Bajarilgan: 6 / 15.**

**Ma'lumotlar bazasi:** `prisma/schema.prisma` — TZ dagi **butun ma'lumotlar
modeli allaqachon yozilgan** (`Penalty`, `PenaltyCriterion`, `Contract`,
`Invoice`, `Payment`, `Message`, `Test`, `TestResult` ham). Ya'ni 7–11-bosqichlar
uchun jadval yaratish kerak emas — faqat interfeys va biznes-logika yoziladi.

6-bosqichda sxemaga kirgan o'zgarishlar (TZ ning 7-bo'limi — ERD — shu bo'yicha
yangilanishi kerak):

- **`RankingSetting`** modeli qo'shildi — reyting formulasi koeffitsientlari
  (singleton, `id = "global"`). TZ ning ERD bo'limida yo'q.
- **`Grade.lessonId`** (ixtiyoriy, `onDelete: SetNull`) — baho **fanga emas,
  darsga** bog'lanadi.
- **`Grade.date`** → `@db.Date` (vaqt qismi olib tashlandi).
- **`@@unique([studentId, lessonId, date, type])`** — takrorlanishga qarshi.

> ⚠️ Sxema o'zgargani uchun `npx prisma db push` ishga tushirilishi shart.

**Mavjud sahifalar (`src/app/[locale]/(app)/`):** `dashboard`, `students`,
`teachers`, `classes`, `schedule`, `attendance` (+ `journal`), `journal`,
`grades`, `ranking`, `subjects`, `academic-years`, `lesson-periods`.

---

# 2. RBAC — ruxsatlar matritsasi

| Modul / Amal | TZ talabi | Holat |
| --- | --- | --- |
| Foydalanuvchilar boshqaruvi | Admin ✅ | ❌ Sahifa yo'q (`/users` yozilmagan) |
| O'quvchilar bazasi | Admin to'liq, o'qituvchi o'z sinfi, buxgalter ko'rish, ota-ona farzandi | ✅ `studentScope` bilan to'liq |
| O'qituvchilar bazasi | Admin to'liq | ✅ |
| Sinf / jadval | Admin to'liq, o'qituvchi o'z jadvali | ✅ |
| Davomat | Admin to'liq, o'qituvchi kiritish, ota-ona ko'rish | ✅ `roles: [ADMIN, TEACHER]` + `assertCanAccessLesson` |
| Baholar | Admin/o'qituvchi kiritish, ota-ona ko'rish | ✅ Kiritish — `/journal` (`gradingLessonScope`); ko'rish — `/grades`, ota-ona ham kiradi |
| Jarima ball va mezonlar | Admin/o'qituvchi | ❌ |
| Reyting / statistika | Barcha rollar doira bo'yicha | ✅ `/ranking` — sozlamani faqat ADMIN o'zgartiradi |
| To'lov / kontrakt | Admin + buxgalter | ❌ |
| Hisobot / dashboard | Rolga mos | 🟡 Faqat skelet |
| SMS xabarnoma | Admin/o'qituvchi/buxgalter | 🟡 Navbat bor, sahifa yo'q |
| AI modullari | Admin/o'qituvchi | ❌ |

**Poydevor sifatida tayyor:** `src/lib/rbac.ts` (`roleAllowedPaths`),
`src/lib/auth-guard.ts` (`requireAdmin`, `requireTeaching`, `requireFinance`),
`src/lib/scope.ts` (doira funksiyalari + `assertCanAccess*`).

> **Baho doirasi — davomatdan FARQLI, ataylab:**
> `lessonScope` (davomat) sinf rahbarligini **qo'shadi**, `gradingLessonScope`
> (baho) esa **qo'shmaydi**. Ya'ni sinf rahbari o'zi o'qitmaydigan fandan baho
> qo'ya olmaydi, lekin davomat yuritadi. Buni "xato" deb tuzatmang — TZ talabi.

> ⚠️ **Diqqat qiling:** `src/components/nav-config.ts` da menyu bandlari
> **oldindan** yozib qo'yilgan. Hali **mavjud emas** (bosilganda 404):
> `/penalties`, `/penalty-criteria`, `/rewards`, `/reward-criteria`,
> `/payments`, `/reports`, `/messages`, `/tests`, `/ai-assistant`, `/users`.
> Ularni yashirish yoki "tez kunda" belgisi qo'yish kerak.
>
> Shuningdek menyuda **`rewards` / `reward-criteria` (rag'bat ball)** bandlari
> bor — bu **TZ da yo'q**, keyin qo'shilgan g'oya. TZ ga rasmiy ravishda
> kiritilishi kerak.

---

# 3. Funksional talablar

## 3.1. Autentifikatsiya va ruxsatlar — ✅

| Talab | Holat |
| --- | --- |
| Email yoki telefon + parol bilan kirish | ✅ |
| RBAC — har bir sahifa himoyalangan | ✅ `rbac.ts` + middleware |
| Sessiya boshqaruvi | ✅ JWT (8 soat) |
| Parol hashing | ✅ `src/lib/password.ts` |
| Birinchi kirishda parol almashtirish | ✅ `mustChangePassword` |
| Parolni tiklash (self-service) | 🟡 Yo'q — hozircha admin qo'lda tiklaydi |
| Audit jurnali | ✅ `src/lib/audit.ts` + `AuditLog` |
| Rate limiting (login) | ✅ `src/lib/rate-limit.ts` |

### 3.1.1. Sessiya bekor qilish siyosati — 🔒 OCHIQ QAROR

Hozir **A varianti** ishlayapti (30 daqiqalik davriy tekshiruv).
Kelishilgan reja: **B variantini qo'shish** — har bir yozuv amalida `isActive`
tekshiriladi. **Hali bajarilmagan.**

## 3.2. O'quvchilar bazasi — ✅ (bitta qism qolgan)

| Talab | Holat |
| --- | --- |
| Profil maydonlari (ism, sana, jinsi, rasm, manzil, sinf, vasiy, qabul sanasi, holat) | ✅ |
| Yangi o'quvchi qo'shish | ✅ |
| Qidiruv va filtr (sinf, holat) | ✅ |
| Ro'yxat ko'rinishi | ✅ |
| Karta ko'rinishida davomat + baho + jarima + to'lov + AI bir joyda | 🟡 Davomat va baho hisobi tayyor, lekin kartaga hali ulanmagan; jarima/to'lov modullari yo'q |
| Forma UX'ini qayta chizish | 🔒 Egasi so'ragan, hali qilinmagan |

## 3.3. O'qituvchilar bazasi — ✅

| Talab | Holat |
| --- | --- |
| Profil, fanlar, kontakt | ✅ |
| Foydalanuvchi (login) bilan bog'lash | ✅ `Teacher.userId` |
| Dars yuklamasi va jadvalini ko'rish | 🟡 Jadvalda o'qituvchi filtri bor; alohida "yuklama" hisobi yo'q |

## 3.4. Sinflar va dars jadvali — ✅

| Talab | Holat |
| --- | --- |
| Sinf yaratish, sinf rahbari, o'quv yili | ✅ (joriy o'quv yili avtomatik tanlanadi) |
| Fanlar ro'yxati | ✅ `/subjects` |
| Haftalik jadval (kun, vaqt, fan, o'qituvchi, xona) | ✅ `/schedule` |
| Ziddiyat tekshiruvi | ✅ O'qituvchi/sinf/xona bandligi + bazada `@@unique` |
| Qo'ng'iroq jadvali (dars vaqtlari) | ✅ `/lesson-periods` — TZ da alohida yozilmagan, qo'shimcha |
| Sinflarni Excel'dan import | ✅ TZ da yo'q — qo'shimcha (PR #37) |

## 3.5. Davomat — ✅ BAJARILGAN

| Talab | Holat |
| --- | --- |
| 4 holat: keldi / kelmadi / kechikdi / sababli | ✅ `AttendanceStatus` |
| Tez kiritish (butun sinf bir ekranda) | ✅ `/attendance` |
| Jurnal ko'rinishi | ✅ `/attendance/journal` (haftalik) va `/journal` (kunlik, baho bilan) |
| Davomat statistikasi (foiz) | 🟡 Jurnalda bor; o'quvchi kartasiga ulanmagan |
| Kelmaganning ota-onasiga SMS | 🟡 `Message` jadvaliga `QUEUED` yoziladi, haqiqiy yuborish 10-bosqichda |
| Xavfsizlik: o'qituvchi faqat o'z darsiga | ✅ `assertCanAccessLesson` + sinf tarkibi filtri |
| Tranzaksiya va idempotentlik | ✅ `upsert` + `$transaction` |
| Audit | ✅ `UPDATE / Attendance` |

> Qisqartmalar `K` (keldi) / `SZ` (sababsiz) / `SL` (sababli) / `KCH` (kechikdi)
> kodda ishlatiladi (`ATTENDANCE_ABBREVIATIONS`), TZ da hujjatlashtirilmagan —
> TZ ga kiritilishi kerak.

## 3.6. Baholar va o'zlashtirish — ✅ BAJARILGAN

| Talab | Holat |
| --- | --- |
| Baho kiritish (o'quvchi / fan / sana / tur) | ✅ `/journal` — bir kun, sinfning hamma darsi ustun bo'lib chiqadi |
| Baho turi: kundalik / nazorat / imtihon | ✅ `GradeType` + jurnalda tur tanlovi |
| Chorak bog'lanishi | ✅ Sana bo'yicha `Quarter` avtomatik topiladi |
| 5 balli / 100 balli sozlama | 🔒 **Qaror: 0–100 balli tanlandi.** 5 balli ko'rinish qo'shilmadi — TZ ga yozilishi kerak |
| O'rtacha ball | ✅ `averageOf` — o'quvchi, fan va sinf kesimida |
| Baho jurnali (sinf × fan) | ✅ `/grades` — kunlik va haftalik ko'rinish (faqat o'qish) |
| Xavfsizlik: o'qituvchi faqat o'z fanidan | ✅ `gradingLessonScope` + `assertCanGradeLesson` |
| Audit | ✅ Har bir baho o'zgarishi nomma-nom yoziladi (eski → yangi qiymat) |

**Muhim arxitektura qarori:** baho **darsga** bog'lanadi (`Grade.lessonId`),
fanga emas. Shu tufayli bir kunda bir fandan ikki dars bo'lsa — ikki alohida
ustun. `lessonId` NULL bo'lgan eski baholar fan bo'yicha eng chapdagi bo'sh
ustunga joylanadi (ma'lumot yo'qolmaydi).

**Baho yozishning yagona yo'li — `/journal`.** `/grades` da forma ham, Server
Action ham ataylab yo'q.

## 3.7. Choraklik statistika va reyting (1-2-3 o'rin) — ✅ BAJARILGAN

| Talab | Holat |
| --- | --- |
| Choraklik reyting | ✅ `/ranking` |
| 1-2-3 o'rin belgilari | ✅ |
| Doira: sinf / parallel / maktab | ✅ `RANKING_SCOPES` — `parallel` TZ da ta'riflanmagan |
| Formula sozlanadigan | ✅ `RankingSetting` (bazada, faqat ADMIN, audit bilan) |
| Jarima ballning ta'siri | ✅ `penaltyFactor` — 7-bosqich ulanishi bilan ishlaydi |
| Test natijasining ta'siri | ✅ `testWeight` — 11-bosqich ulanishi bilan ishlaydi |
| Diagrammalar | ✅ Fan kesimida va chorak dinamikasi |

> 🔒 **Formula TZ dan farq qiladi.** TZ da: `o'rtacha baho − jarima + test`.
> Kodda og'irlikli: `(baho×gradeWeight + test×testWeight)/(gw+tw) −
> ball×penaltyFactor/100`, natija 0–100 ga qisiladi. Sabab: oddiy ayirmada
> test balli baho bilan bir xil vaznga ega bo'lib qolardi. **TZ ga yozilishi
> kerak.**

## 3.8. Jarima ball tizimi — ❌

`PenaltyCriterion` va `Penalty` jadvallari tayyor. Kerak: mezonlar boshqaruvi
(faqat admin), mezon tanlab jarima berish, statistika. Reyting allaqachon
jarima ballini hisobga oladi — mezonlar sahifasi qo'shilishi bilan ishlaydi.

## 3.9. To'lovlar / kontraktlar — ❌

`Contract` → `Invoice` → `Payment` zanjiri jadval darajasida tayyor.
Interfeys, oylik invoice generatsiyasi, qarzdorlik holati — yo'q.

## 3.10. Hisobotlar va dashboard — 🟡

`/dashboard` sahifasi mavjud, lekin TZ dagi KPI'lar (o'quvchilar soni, davomat
foizi, o'rtacha ball, oylik tushum, qarzdorlar), grafiklar, davr filtri va
PDF/Excel eksporti — yo'q. O'rtacha ball va davomat foizi hisobi endi tayyor
(`grades.ts`, `attendance.ts`) — dashboardga ulash qoldi.

## 3.11. SMS xabarnomalar — 🟡

| Talab | Holat |
| --- | --- |
| `Message` jadvali va holatlar (QUEUED/SENT/FAILED) | ✅ |
| Davomat uchun avtomatik xabar navbatga qo'yilishi | ✅ |
| Provayder integratsiyasi (Eskiz.uz / Play Mobile) | ❌ |
| Shablonlar 3 tilda | ❌ (hozir matn kodda, faqat o'zbekcha) |
| Xabarlar jurnali sahifasi | ❌ |

## 3.13. Ko'p tillilik — ✅

3 til (uz/ru/en) to'liq ishlaydi, til foydalanuvchi profilida saqlanadi.
6-bosqich tarjimalari alohida fayllarda:
`messages/{grades,journal,ranking}/{uz,ru,en}.json`.
SMS shablonlari hali tarjima qilinmagan (3.11 ga bog'liq).

## 3.14. Import / eksport — ✅ (eksport qolgan)

| Talab | Holat |
| --- | --- |
| 4 qadamli jarayon (shablon → yuklash → preview → tasdiq) | ✅ |
| O'quvchi importi | ✅ `/students/import` |
| O'qituvchi importi | ✅ `/teachers/import` |
| Sinf importi | ✅ `/classes/import` (TZ da yo'q, qo'shimcha) |
| Shablon yuklab olish | ✅ `/api/import-template/{students,teachers,classes}` |
| Xato qatorlarni `.csv` bo'lib olish | ✅ |
| Dublikat siyosati (o'tkazib yuborish / yangilash) | ✅ |
| 5 MB / 1000 qator cheklovi | ✅ |
| Faqat ADMIN + audit | ✅ |
| Boshlang'ich parollar bir martalik faylda | ✅ |
| **`.csv` faylni yuklash** | 🟡 Hozir faqat `.xlsx` va `.xls` qabul qilinadi — TZ 3.14.1 da CSV ham bor |
| **3.14.6 Eksport (`.xlsx`)** | ❌ Qilinmagan — ochiq vazifa |

---

# 4. Test moduli va AI — ❌

| Talab | Holat |
| --- | --- |
| 4.1 Testni qo'lda kiritish | ❌ |
| 4.1 Matn joylashtirib (`?` / `+` / `-` format) | 🟡 `src/lib/test-questions.ts` mavjud — parser poydevori bor, interfeys yo'q |
| 4.1 `.txt` / `.docx` fayldan import | ❌ |
| 4.2 Test o'tkazish va avtomatik baholash | ❌ (`Test`, `TestResult` jadvallari tayyor) |
| 4.3 Test reytingi (1-2-3 o'rin) | ❌ — lekin reyting formulasida `testWeight` joyi tayyor |
| 4.4 AI test generatori (few-shot) | ❌ |
| 4.5 AI o'quvchi tahlili | ❌ |
| 4.6 AI yordamchi (chat) | ❌ |
| 4.7 Provider-agnostic AI arxitekturasi | ❌ Vercel AI SDK hali ulanmagan |

---

# 5. Nofunksional talablar

| Talab | Holat |
| --- | --- |
| Xavfsizlik: hashing, RBAC, audit, XSS/CSRF/SQL-injection | ✅ Auditdan o'tgan, tuzatishlar kiritilgan |
| Ma'lumot doirasi (IDOR himoyasi) | ✅ `scope.ts` — fail-closed |
| Xavfsizlik sarlavhalari (headers) | ✅ |
| Indekslar | 🟡 `Grade` da 4 indeks + unique bor; boshqa jadvallarda ba'zilari qolgan (audit #13) |
| Pagination | 🟡 Ro'yxatlarda to'liq emas. **Reyting so'rovlari og'ir** — bir yillik baholar xotiraga o'qiladi, `groupBy` ga o'tkazish kerak |
| Migratsiyalar versiyalangan | ❌ Hozir `db push` — `migrate dev --name init` kerak (audit #12). 6-bosqichda sxema o'zgargani uchun ayniqsa muhim |
| Backup siyosati | ❌ Hujjatlashtirilmagan |
| Avtomatik testlar (vitest + RBAC testlari) | ❌ (audit #16) — eng katta bo'shliq |
| CI (GitHub Actions) | ❌ (audit #17) |
| Responsive (mobil brauzer) | 🟡 Keng jadvallar (jurnal, baholar) gorizontal siljiydi; har bir sahifa sinalmagan |
| `loading.tsx` (skeleton) | ❌ (audit #19) |
| Lokalizatsiya (3 til, so'm, sana) | ✅ |

---

# 9. Qabul mezonlari (Definition of Done)

- [x] Har bir **mavjud** modul o'z ruxsat matritsasiga mos ishlaydi
- [ ] Asosiy amallar uchun avtomatik testlar mavjud — **❌**
- [x] TypeScript typecheck xatosiz
- [x] Interfeys 3 tilda ishlaydi
- [ ] Ma'lumotlar bazasi migratsiyalari versiyalangan — **❌** (`db push` bilan ishlanmoqda)
- [x] Har bir yirik o'zgarish uchun tushuntiruvchi hujjat va draft PR
- [x] O'quvchi va o'qituvchini fayldan import qilish ishlaydi

---

# Qisqa xulosa: eng ustuvor qolgan ishlar

1. **`npx prisma db push`** — 6-bosqich sxema o'zgarishini bazaga tushirish,
   so'ng migratsiya tarixini boshlash (`migrate dev --name init`).
2. **Menyudagi mavjud bo'lmagan sahifalar** — yashirish yoki "tez kunda" qilish
   (foydalanuvchi bosganda 404 ko'rmasin).
3. **7-bosqich — jarima ball** (reyting uni allaqachon kutayotgan).
4. **TZ ga yozilishi kerak bo'lgan qarorlar:** 0–100 shkala, og'irlikli reyting
   formulasi, `RankingSetting` (ERD), `parallel` doirasi, rag'bat ball tizimi,
   davomat qisqartmalari.
5. **Eksport (TZ 3.14.6)** va **CSV importi** — import moduli yarim qolgan qismi.
6. **3.1.1 B varianti** — bloklangan hisob hech narsa yozolmasligi.
7. **Avtomatik testlar + CI** — tizim kattalashgani sayin zarur bo'ladi.
