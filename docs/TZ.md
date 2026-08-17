# 📘 [CRM] Xususiy Maktab CRM — Texnik Topshiriq (TZ)

> **Texnik Topshiriq (TZ) — v1.1**
>
> Xususiy maktab uchun AI bilan boyitilgan to'liq CRM tizimi. Ushbu hujjat loyihaning
> **yagona haqiqat manbai (single source of truth)** hisoblanadi: talablar, arxitektura,
> ma'lumotlar modeli va ishlab chiqish bosqichlari shu yerda belgilangan.
>
> **Muallif:** Senior dasturchi nuqtai nazaridan tuzilgan. **Egasi:** Otajon Asatullayev.

---

## 0. Kelishilgan qarorlar / Changelog

Bu bo'lim TZ tasdiqlanish jarayonida kelishib olingan qarorlarni qayd etadi. Asosiy
matn (1–11 bo'limlar) original v1.0 ga sodiq qoladi; bu yerdagi qarorlar ustuvor.

### v1.1 — kelishilgan qo'shimchalar

- **Ko'p maktablilik (multi-tenant).** Loyiha bir nechta maktabga sotiladi, shuning uchun
  tizim **boshidanoq ko'p maktabli** quriladi. Deyarli barcha asosiy entitilar `schoolId`
  (tenant) ga bog'lanadi; RBAC va barcha so'rovlar tenant doirasi bilan cheklanadi
  (tenant isolation). Batafsil: [2.2. Ko'p maktablilik](#22-kop-maktablilik-multi-tenant).
- **O'quvchi logini alohida.** O'quvchiga ota-onadan **alohida** login/parol beriladi.
  Ota-ona va O'quvchi — ikki alohida rol; test yechish, o'z natijalarini ko'rish
  o'quvchining o'z akkaunti orqali amalga oshadi.
- **O'quvchi rasmi — ixtiyoriy.** Hozircha rasm yuklash **majburiy emas**. Rasm
  yuklanmasa, standart **user (avatar) belgisi** ko'rsatiladi. Rasm yuklash keyinchalik
  to'liq yoqilishi mumkin (dizayn/storage tayyor bo'lganda).

---

## 1. Umumiy ma'lumot

### 1.1. Loyiha maqsadi

Xususiy maktabning kundalik boshqaruvini bitta zamonaviy web-platformada birlashtirish:
o'quvchi va o'qituvchilar bazasi, dars jadvali, davomat, baholar, jarima ball tizimi,
choraklik reyting, to'lovlar (buxgalteriya), hisobotlar va ota-onalar bilan aloqa (SMS).
Tizim sun'iy intellekt bilan boyitiladi — test tuzish va o'quvchini tahlil qilish.

### 1.2. Loyiha doirasi (Scope)

✅ **Doiraga kiradi:** 4 rolli web-ilova (Admin, O'qituvchi, Buxgalter, Ota-ona/O'quvchi),
o'quvchi/o'qituvchi boshqaruvi, sinf va jadval, davomat, baho, mezon asosidagi jarima
ball, choraklik statistika va reyting, to'lov/kontrakt, dashboard va hisobotlar, SMS
xabarnoma, 3 til (uz/ru/en), test moduli (qo'lda va fayl orqali import, test natijasi
reytingi), AI test generatori va tahlil. **(v1.1: ko'p maktablilik ham doiraga kiradi.)**

🚫 **Hozircha doiradan tashqarida (kelajak):** mobil ilova (native), onlayn dars (video),
moliyaviy soliq hisobotlari integratsiyasi, biometrik davomat qurilmalari. Bular
kelajakdagi kengaytmalar bo'limida qayd etilgan.

### 1.3. Muvaffaqiyat mezonlari

- Har bir rol faqat o'ziga tegishli ma'lumotni ko'radi va boshqaradi (xavfsiz RBAC).
- Har bir maktab faqat o'z ma'lumotini ko'radi (tenant isolation).
- Davomat va baho kiritish 3 tugmadan oshmagan qadamda bajariladi (tez ish).
- Choraklik reyting va 1-2-3 o'rin avtomatik hisoblanadi.
- To'lov holati (to'langan/qarzdor) real vaqtda ko'rinadi.
- Ota-onaga SMS avtomatik yuboriladi (davomat, baho, to'lov eslatmasi).
- AI namunaga qarab o'sha darajadagi va mavzudagi testni tuzib beradi.
- Interfeys 3 tilda to'liq ishlaydi.

### 1.4. Atamalar lug'ati

| Atama | Ma'nosi |
| --- | --- |
| RBAC | Role-Based Access Control — rolga asoslangan ruxsat tizimi |
| Multi-tenant | Ko'p ijarachi — bitta tizim bir nechta maktabga xizmat qiladi, ma'lumot izolyatsiyalanadi |
| Chorak (Quarter/Term) | O'quv yilining bir qismi (1-2-3-4 chorak) |
| Kontrakt | O'quvchining oylik to'lov shartnomasi |
| Jarima ball | Intizom buzilganda beriladi; reyting va tahlilga ta'sir qiladi |
| LLM | Large Language Model — AI matn modeli (GPT, Claude, Gemini) |
| i18n | Internationalization — ko'p tillilik |

---

## 2. Foydalanuvchi rollari va ruxsatlar (RBAC)

Tizimda 4 asosiy rol mavjud. Har bir rol o'z vazifasiga mos ruxsatga ega.

- 👤 **Admin / direksiya** — o'z maktabidagi barcha modullarni to'liq boshqaradi.
- **O'qituvchi** — o'z sinflari bo'yicha davomat, baho, jarima ball, AI test.
- **Buxgalter** — kontrakt, to'lov, moliyaviy hisobotlar.
- **Ota-ona** — faqat o'z farzandi ma'lumotini ko'radi.
- **O'quvchi** — o'z ma'lumotini ko'radi va testlarni yechadi (alohida login).

> **v1.1 izoh:** Ota-ona va O'quvchi endi **alohida rollar**. Original matritsadagi
> "Ota-ona/O'quvchi" ustuni ikkalasiga ham taalluqli (o'z/farzandi doirasida ko'rish),
> qo'shimcha ravishda O'quvchi test yechish huquqiga ega.
>
> **Platforma darajasi:** ko'p maktablilik uchun kelajakda **Super Admin** (platforma
> egasi) roli qo'shiladi — maktablarni (tenantlarni) yaratadi/boshqaradi. Maktab ichidagi
> Admin faqat o'z maktabi bilan cheklanadi.

### 2.1. Ruxsatlar matritsasi

| Modul / Amal | Admin | O'qituvchi | Buxgalter | Ota-ona/O'quvchi |
| --- | --- | --- | --- | --- |
| Foydalanuvchilar boshqaruvi | ✅ To'liq | ❌ | ❌ | ❌ |
| O'quvchilar bazasi | ✅ To'liq | 👁 O'z sinfi | 👁 Ko'rish | 👁 O'zi/farzandi |
| O'qituvchilar bazasi | ✅ To'liq | 👁 O'z profili | ❌ | ❌ |
| Sinf / jadval | ✅ To'liq | 👁 O'z jadvali | ❌ | 👁 Ko'rish |
| Davomat | ✅ To'liq | ✅ Kiritish | ❌ | 👁 Ko'rish |
| Baholar | ✅ To'liq | ✅ Kiritish | ❌ | 👁 Ko'rish |
| Jarima ball | ✅ To'liq | ✅ Berish | ❌ | 👁 Ko'rish |
| Jarima mezonlari (sozlash) | ✅ To'liq | ❌ | ❌ | ❌ |
| Reyting / statistika | ✅ To'liq | 👁 O'z sinfi | 👁 Ko'rish | 👁 O'zi/farzandi |
| To'lov / kontrakt | ✅ To'liq | ❌ | ✅ To'liq | 👁 O'z hisobi |
| Hisobot / dashboard | ✅ To'liq | 👁 O'z sinfi | 👁 Moliya | ❌ |
| SMS xabarnoma | ✅ To'liq | ✅ O'z sinfiga | ✅ To'lov | ❌ |
| AI test generatori | ✅ | ✅ | ❌ | ❌ |
| AI o'quvchi tahlili | ✅ | ✅ O'z sinfi | ❌ | 👁 O'zi/farzandi |
| Test yechish | ❌ | ❌ | ❌ | ✅ O'quvchi |

> 🔑 **Izoh:** ✅ = to'liq boshqarish (yaratish/tahrirlash/o'chirish), 👁 = faqat ko'rish
> (belgilangan doirada), ❌ = ruxsat yo'q. Barcha ruxsatlar **o'z maktabi (tenant)**
> doirasida amal qiladi.

### 2.2. Ko'p maktablilik (multi-tenant)

Bu — **v1.1 arxitektura qarori** (bir nechta maktabga sotish uchun).

- Har bir maktab — alohida **tenant** (`School` entitisi). Barcha asosiy ma'lumotlar
  (`User`, `Student`, `Teacher`, `Class`, `Grade`, `Contract`, `Test`, ...) `schoolId`
  ga bog'lanadi.
- **Tenant isolation:** har bir so'rov joriy foydalanuvchining maktabi bilan avtomatik
  cheklanadi. Bir maktab boshqa maktab ma'lumotini hech qachon ko'rmaydi.
- **Uniqueness:** email/telefon kabi maydonlar `schoolId` bilan birgalikda noyob bo'ladi
  (bir xil email har xil maktablarda uchrashi mumkin).
- **Sozlamalar maktab bo'yicha:** baho tizimi (5/100), reyting formulasi koeffitsientlari,
  SMS shablonlari, standart til va h.k. har bir maktab uchun alohida saqlanadi.
- **Tenant aniqlash strategiyasi:** subdomen (`maktab1.crm.uz`) yoki login orqali
  (foydalanuvchi `schoolId` siga bog'langan). Yakuniy tanlov deploy bosqichida
  tasdiqlanadi (default: login orqali).

---

## 3. Funksional talablar

### 3.1. Autentifikatsiya va ruxsatlar

- Login/parol orqali kirish (email yoki telefon + parol).
- Rolga asoslangan ruxsat (RBAC) — har bir sahifa va API himoyalangan.
- **Tenant-aware auth:** login vaqtida foydalanuvchi maktabi (tenant) aniqlanadi va
  sessiyaga yoziladi.
- Sessiya boshqaruvi, xavfsiz parol (hashing), parolni tiklash.
- Har bir muhim amal audit jurnaliga yoziladi (kim, nima, qachon, qaysi maktab).

### 3.2. O'quvchilar bazasi

- O'quvchi profili: ism/familiya, tug'ilgan sana, jinsi, **rasm (ixtiyoriy — bo'lmasa
  default avatar)**, manzil, sinf, ota-ona aloqasi, qabul sanasi, holati
  (faol/bitirgan/chiqib ketgan).
- Qabul/ro'yxatga olish jarayoni (yangi o'quvchi qo'shish).
- Qidiruv, filtrlash (sinf, holat), ro'yxat va karta ko'rinishi.
- Har bir o'quvchi kartasida: davomat, baho, jarima ball, to'lov tarixi, AI tahlil bir
  joyda.

### 3.3. O'qituvchilar bazasi

- O'qituvchi profili: shaxsiy ma'lumot, fanlar, biriktirilgan sinflar, kontakt.
- O'qituvchini foydalanuvchi (login) bilan bog'lash.
- Dars yuklamasi va jadvalini ko'rish.

### 3.4. Sinflar/guruhlar va dars jadvali

- Sinf/guruh yaratish (masalan 9-A), sinf rahbari, o'quv yili.
- Fanlar ro'yxati.
- Haftalik dars jadvali: kun, vaqt, fan, o'qituvchi, xona.
- Ziddiyatni tekshirish (bitta o'qituvchi bir vaqtda ikki joyda bo'lmasligi).

### 3.5. Davomat (yo'qlama)

- O'qituvchi dars bo'yicha davomatni belgilaydi: keldi / kelmadi / kechikdi / sababli.
- Tez kiritish interfeysi (butun sinfni bir ekranda).
- Davomat statistikasi (o'quvchi/sinf bo'yicha foiz).
- Kelmagan o'quvchi ota-onasiga avtomatik SMS (ixtiyoriy sozlama).

### 3.6. Baholar va o'zlashtirish

- Baho kiritish: o'quvchi, fan, chorak, baho, turi (kundalik/nazorat/imtihon), sana.
- Baho tizimi sozlanadi (5 balli / 100 balli — konfiguratsiya, **maktab bo'yicha**).
- O'rtacha ball avtomatik hisoblanadi (fan va chorak bo'yicha).
- Baho jurnali ko'rinishi (sinf × fan).

### 3.7. Choraklik statistika va reyting (1-2-3 o'rin)

> 🏆 Har chorak yakunida tizim o'quvchilarning umumiy o'rtacha ballini (baho + jarima
> ball ta'sirini hisobga olib) hisoblab, reyting tuzadi va **1-2-3 o'rin** egalarini
> alohida ajratib ko'rsatadi (sinf bo'yicha va butun maktab bo'yicha).

- Reyting mezoni sozlanadi (faqat o'rtacha ball yoki ball minus jarima).
- Top-3 alohida ko'rsatiladi (medal/rasm bilan), to'liq reyting jadvali.
- Choraklararo taqqoslash (o'sish/pasayish grafigi).
- Reyting manbalari: choraklik baho, jarima ball ta'siri va test natijalari (4.3-bo'lim)
  birga hisobga olinishi mumkin (sozlanadi).

### 3.8. Jarima ball tizimi (mezonlar asosida)

Jarima balllari **oldindan belgilangan mezonlar** bo'yicha beriladi. Mezonlar ro'yxatini
**faqat bosh admin** yaratadi va boshqaradi.

- **Mezonlar boshqaruvi (admin):** har bir mezon kiritiladi — nomi, tavsifi, ball miqdori,
  kategoriya (masalan: kechikish, darsni qoldirish, intizom, forma qoidasi). Admin mezon
  qo'shadi, tahrirlaydi, o'chiradi.
- **Jarima berish (o'qituvchi/admin):** tayyor mezonlardan biri tanlanadi va o'quvchiga
  qo'llanadi — ball avtomatik mezondan olinadi, qo'shimcha izoh yoziladi.
- Jarima balllari o'quvchi profili va reytingga ta'sir qiladi (sozlanadigan koeffitsient).
- Ota-onaga xabar (ixtiyoriy); jarima tarixi, statistikasi va mezon bo'yicha kesim (qaysi
  mezon ko'p uchraydi).

### 3.9. To'lovlar / oylik kontraktlar (buxgalteriya)

- Kontrakt: o'quvchi, oylik summa, chegirma, boshlanish/tugash sanasi.
- Oylik hisob-faktura (invoice) avtomatik generatsiya.
- To'lovni qabul qilish: summa, usul (naqd/karta/o'tkazma), sana, kvitansiya.
- Qarzdorlik holati: to'langan / qisman / qarzdor.
- To'lov eslatmasi SMS orqali (muddat yaqinlashganda / o'tganda).
- Moliyaviy hisobot: oylik tushum, qarzdorlar ro'yxati.

### 3.10. Hisobotlar va dashboard

- Rolga mos dashboard (Admin — umumiy; O'qituvchi — sinf; Buxgalter — moliya; Ota-ona —
  farzand).
- Asosiy ko'rsatkichlar (KPI): o'quvchilar soni, davomat foizi, o'rtacha ball, oylik
  tushum, qarzdorlar.
- Grafik va diagrammalar, davr bo'yicha filtr.
- Hisobotni eksport qilish (PDF/Excel).

### 3.11. Xabarnomalar (SMS)

- Ota-onaga SMS: davomat, baho, jarima, to'lov eslatmasi, umumiy e'lonlar.
- Shablonlar (3 tilda), avtomatik va qo'lda yuborish.
- Yuborilgan xabarlar jurnali va holati (yuborildi/xato).
- Provayder: **Eskiz.uz** yoki **Play Mobile** (O'zbekiston).

### 3.12. AI modullari

Batafsil 4-bo'limda. Qisqacha: AI test generatori (namunadan o'rganadigan), o'quvchi
tahlili, AI yordamchi.

### 3.13. Ko'p tillilik (i18n)

- Interfeys 3 tilda: o'zbek, rus, ingliz.
- Til foydalanuvchi profili bo'yicha saqlanadi va istalgan vaqt almashtiriladi.
- SMS shablonlari ham 3 tilda.

---

## 4. Test moduli va AI spetsifikatsiyasi

> 🤖 **Muhim eslatma:** AI provayderi (eng kuchlisi tanlanadi) keyinchalik ulanadi. Kod
> provayderdan mustaqil (**provider-agnostic**) yoziladi — Vercel AI SDK orqali. Shu
> sababli API kaliti bo'lmasa ham tizim to'liq ishlaydi, AI modullari esa "ulanmagan"
> holatda turadi va kalit qo'yilishi bilan ishga tushadi.

### 4.1. Testlarni qo'shish (qo'lda va fayl orqali)

O'qituvchi tayyor testlarini tizimga uch usulda kirita oladi:

- **Qo'lda (forma orqali):** savol va javoblarni bittalab kiritadi, to'g'ri javob(lar)ni
  belgilaydi.
- **Matn joylashtirib (paste):** standart formatdagi matnni bir maydonga qo'yadi.
- **Fayl orqali:** `.txt` yoki `.docx` (Word) fayl yuklaydi; tizim faylni o'qib, savollarni
  avtomatik ajratadi (docx uchun matn ekstraksiyasi qilinadi).

#### Fayl / matn strukturasi standarti

Belgilar sodda va aniq — o'qituvchi adashmasligi uchun:

| Belgi | Ma'nosi |
| --- | --- |
| `?` | Savol boshlanishi (savol matni oldida) |
| `+` | To'g'ri javob (bir nechta bo'lishi mumkin — ko'p javobli savol) |
| `-` | Noto'g'ri javob |
| (bo'sh qator) | Bir savolni ikkinchisidan ajratadi |

**Namuna:**

```
? O'zbekiston poytaxti qaysi shahar?
+ Toshkent
- Samarqand
- Buxoro
- Xiva

? Suvning kimyoviy formulasi qanday?
- CO2
+ H2O
- O2
- NaCl
```

**Qoidalar:**

- Har bir savol `?` bilan boshlanadi, undan keyin javob variantlari keladi.
- Kamida bitta `+` (to'g'ri javob) bo'lishi shart.
- Savollar orasida bitta bo'sh qator qoldiriladi.
- Yuklashdan oldin tizim faylni tekshiradi (validatsiya): to'g'ri javobi yo'q yoki formati
  buzuq savolni aniq ko'rsatadi.
- Import qilingandan so'ng o'qituvchi testni ko'rib chiqadi, tahrirlaydi va saqlaydi.

### 4.2. Test o'tkazish va baholash

- Saqlangan test sinf yoki tanlangan o'quvchilarga tayinlanadi.
- O'quvchi testni **o'z akkaunti** orqali yechadi; tizim avtomatik baholaydi (to'g'ri
  javoblar soni, foizi va bali).
- Har bir urinish natijasi saqlanadi: o'quvchi, test, ball, foiz, sana, sarflangan vaqt.

### 4.3. Test natijasiga qarab reyting

> 📊 Test natijalari asosida alohida **test reytingi** hosil qilinadi: o'quvchilar ballga
> qarab tartiblanadi va **1-2-3 o'rin** ajratib ko'rsatiladi (sinf va maktab miqyosida).

- Reyting turlari: bitta test bo'yicha, fan bo'yicha (o'rtacha), umumiy davr bo'yicha.
- Test reytingi choraklik umumiy reyting bilan birlashtirilishi mumkin (sozlanadi).
- Natijalar grafik va jadvalda ko'rsatiladi hamda eksport qilinadi.

### 4.4. AI test generatori (namunaga asoslangan)

O'qituvchi ikki xil usulda test so'raydi:

1. **Parametr bo'yicha:** fan, mavzu, sinf darajasi, qiyinlik, savollar soni va turi
   (test/ochiq savol) — AI test tuzadi.
2. **Namuna bo'yicha (asosiy talab):** o'qituvchi tayyor namuna testni kiritadi/joylaydi —
   AI o'sha darajada va o'sha mavzuda o'xshash yangi test tuzadi.

> 🎯 **Namunadan o'rganish mexanizmi (few-shot):** namunadagi savollar model kirishiga
> misol sifatida beriladi. AI namunaning qiyinlik darajasi, uslubi, mavzu doirasi va savol
> formatini tahlil qilib, xuddi shunga mos yangi savollar generatsiya qiladi. Natija
> tahrirlanadi va saqlanadi.

- Generatsiya natijasi: savollar + to'g'ri javoblar + (ixtiyoriy) izoh.
- O'qituvchi tahrirlaydi, saqlaydi, qayta ishlatadi.
- Ochiq javoblarni AI baholab bera oladi (kelgusi bosqich).

### 4.5. AI o'quvchi tahlili

- Kirish ma'lumoti: baholar, davomat, jarima ball, choraklik dinamika.
- Natija: kuchli/zaif fanlar, xulq-atvor tendensiyasi, tavsiyalar (o'qituvchi va ota-ona
  uchun tabiiy tilda).
- Til: foydalanuvchi tiliga mos (uz/ru/en).

### 4.6. AI yordamchi (ma'lumot bo'yicha savol-javob)

- Admin/o'qituvchi tabiiy tilda savol beradi (masalan: "9-A sinfda bu chorak eng past
  davomat kimda?").
- AI ruxsat doirasidagi ma'lumotga asoslanib javob beradi (RBAC va tenant hurmat qilinadi).

### 4.7. AI arxitektura tamoyillari

- **Provider-agnostic (Vercel AI SDK):** OpenAI / Anthropic / Gemini o'rtasida oson
  almashish.
- AI so'rovlari **server tomonda** (API kalit hech qachon brauzerga chiqmaydi).
- Xarajat nazorati: so'rov limitlari, keshlash, log.
- Xavfsizlik: AI ga faqat kerakli, anonimlashtirilishi mumkin bo'lgan ma'lumot beriladi.

---

## 5. Nofunksional talablar (NFR)

| Kategoriya | Talab |
| --- | --- |
| Ishlash tezligi | Asosiy sahifalar tez yuklanadi; ro'yxatlar sahifalanadi (pagination) va indekslanadi. |
| Xavfsizlik | Parol hashing, RBAC, HTTPS, kirish nazorati, audit jurnali, CSRF/XSS/SQL-injection himoyasi. |
| Multi-tenant izolyatsiya | Har bir maktab faqat o'z ma'lumotini ko'radi; so'rovlar `schoolId` bilan cheklanadi. |
| Kengayuvchanlik | Modulli arxitektura; yangi maktab/filial qo'shishga tayyor ma'lumotlar modeli. |
| Ishonchlilik | Ma'lumotlar bazasi zaxira nusxasi (backup), migratsiyalar versiyalangan. |
| Qulaylik (UX) | Sodda, tez ishlaydigan interfeys; mobil brauzerda moslashuvchan (responsive). |
| Maxfiylik | Voyaga yetmaganlar ma'lumoti himoyalanadi; minimal ma'lumot tamoyili. |
| Lokalizatsiya | 3 til, sana/valyuta formati (so'm) mahalliylashtiriladi. |

---

## 6. Texnik arxitektura

### 6.1. Texnologiyalar steki

| Qatlam | Texnologiya |
| --- | --- |
| Frontend + Backend | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Ma'lumotlar bazasi | PostgreSQL + Prisma ORM |
| Autentifikatsiya | Auth.js (NextAuth) — login/parol + RBAC (tenant-aware) |
| Ko'p tillilik | next-intl (uz/ru/en) |
| AI | Vercel AI SDK (provider-agnostic) |
| SMS | Eskiz.uz / Play Mobile API |
| Fayl saqlash | Tashqi object storage (S3 / Cloudflare R2) — rasm va test fayllari uchun |
| Deploy | Vercel yoki VPS (Docker), Managed PostgreSQL |

### 6.2. Yuqori darajali arxitektura

```
              ┌───────────────────────────┐
              │      Brauzer (React UI)     │
              │   shadcn/ui + Tailwind      │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │         Next.js Server        │
              │        API / Server Actions   │
              │  ┌──────────┐  ┌───────────┐  │
              │  │ Auth.js  │  │ AI xizmati │  │
              │  │  RBAC    │  │(Vercel SDK)│  │
              │  │(tenant)  │  │            │  │
              │  └──────────┘  └───────────┘  │
              └───┬─────────┬─────────┬───────┘
                  │         │         │
         ┌────────▼──┐ ┌────▼─────┐ ┌─▼──────────┐
         │ PostgreSQL │ │   SMS    │ │ LLM         │
         │  (Prisma)  │ │ provayder│ │ provayder   │
         └────────────┘ └──────────┘ └────────────┘
```

### 6.3. Loyiha tuzilishi (taxminiy)

```
/app         -> sahifalar va API (App Router)
/components  -> UI komponentlar (shadcn/ui)
/lib         -> yordamchi funksiyalar, auth, db klient, tenant kontekst
/prisma      -> schema.prisma va migratsiyalar
/services    -> biznes-logika (davomat, baho, to'lov, AI, SMS)
/messages    -> i18n tarjimalar (uz.json, ru.json, en.json)
```

---

## 7. Ma'lumotlar modeli (ERD)

> **v1.1 eslatma:** Barcha asosiy entitilar `School` (tenant) ga bog'lanadi (`schoolId`).
> Quyidagi diagramma soddalik uchun asosiy bog'lanishlarni ko'rsatadi.

```mermaid
erDiagram
    SCHOOL ||--o{ USER : "foydalanuvchilari"
    SCHOOL ||--o{ STUDENT : "o'quvchilari"
    SCHOOL ||--o{ CLASS : "sinflari"
    USER ||--o| TEACHER : "bog'lanadi"
    USER ||--o| GUARDIAN : "bog'lanadi"
    USER ||--o| STUDENT : "login (alohida)"
    GUARDIAN ||--o{ STUDENT : "farzandi"
    CLASS ||--o{ STUDENT : "o'quvchilari"
    TEACHER ||--o{ CLASS : "rahbari"
    CLASS ||--o{ LESSON : "jadvali"
    SUBJECT ||--o{ LESSON : "fani"
    TEACHER ||--o{ LESSON : "o'qituvchisi"
    STUDENT ||--o{ ATTENDANCE : "davomati"
    LESSON ||--o{ ATTENDANCE : "darsi"
    STUDENT ||--o{ GRADE : "baholari"
    SUBJECT ||--o{ GRADE : "fani"
    QUARTER ||--o{ GRADE : "choragi"
    STUDENT ||--o{ PENALTY : "jarimalari"
    PENALTY_CRITERION ||--o{ PENALTY : "mezoni"
    STUDENT ||--o| CONTRACT : "kontrakti"
    CONTRACT ||--o{ INVOICE : "hisoblari"
    INVOICE ||--o{ PAYMENT : "to'lovlari"
    STUDENT ||--o{ MESSAGE : "xabarlari"
    TEACHER ||--o{ TEST : "testlari"
    TEST ||--o{ TEST_RESULT : "natijalari"
    STUDENT ||--o{ TEST_RESULT : "natijalari"
```

### 7.1. Asosiy entitilar (qisqacha)

> Har bir entitida (School'dan tashqari) `schoolId` maydoni ham bo'ladi (v1.1).

| Entiti | Asosiy maydonlar |
| --- | --- |
| **School** (tenant) | id, name, subdomain, gradingScale (5/100), locale, settings(JSON), status |
| User | id, schoolId, name, email/phone, passwordHash, role, locale, status |
| Student | id, schoolId, firstName, lastName, dob, gender, photo (ixtiyoriy), classId, guardianId, userId (login), enrollDate, status |
| Teacher | id, schoolId, userId, subjects, contact |
| Guardian (ota-ona) | id, schoolId, userId, fullName, phone, relation |
| Class | id, schoolId, name, grade, academicYear, homeroomTeacherId |
| Subject | id, schoolId, name(uz/ru/en) |
| Lesson (jadval) | id, schoolId, classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room |
| Attendance | id, schoolId, studentId, lessonId, date, status, note |
| Grade | id, schoolId, studentId, subjectId, quarterId, value, type, date, teacherId |
| Quarter | id, schoolId, academicYear, name(1-4), startDate, endDate |
| Penalty (jarima) | id, schoolId, studentId, criterionId, points, note, issuedBy, date |
| PenaltyCriterion (mezon) | id, schoolId, name, description, points, category, createdBy, active |
| Contract | id, schoolId, studentId, monthlyAmount, discount, startDate, endDate |
| Invoice | id, schoolId, contractId, period, amount, dueDate, status |
| Payment | id, schoolId, invoiceId, amount, method, date, receivedBy |
| Message (SMS) | id, schoolId, studentId, channel, body, status, sentAt |
| Test | id, schoolId, teacherId, subjectId, source (manual/file/ai), topic, difficulty, questions(JSON), createdAt |
| TestResult (natija) | id, schoolId, testId, studentId, score, percent, takenAt, durationSec |
| AuditLog | id, schoolId, userId, action, entity, timestamp |

---

## 8. Ishlab chiqish bosqichlari (Roadmap)

> 🗺 Har bir bosqich mustaqil ishlaydigan, sinovdan o'tgan qism sifatida topshiriladi.
> Muddat qo'yilmaydi — ketma-ketlik va tayyorlik holatiga e'tibor beramiz.

1. **Poydevor** — loyiha sozlash (Next.js, Tailwind, shadcn, Prisma, DB, i18n skeleti) + **multi-tenant asos (School modeli, tenant konteksti)**.
2. **Auth va rollar** — 5 rol (Admin, O'qituvchi, Buxgalter, Ota-ona, O'quvchi), login, tenant-aware RBAC, foydalanuvchi boshqaruvi.
3. **O'quvchi va o'qituvchi bazasi** — CRUD, profil, qabul.
4. **Sinf/guruh va dars jadvali.**
5. **Davomat (yo'qlama).**
6. **Baholar + choraklik statistika + 1-2-3 reyting.**
7. **Jarima ball tizimi.**
8. **To'lovlar / kontraktlar (buxgalteriya).**
9. **Dashboard va hisobotlar.**
10. **SMS xabarnomalar.**
11. **Test moduli** — testlarni qo'lda va fayl (txt/docx) orqali qo'shish, test o'tkazish, avtomatik baholash va test natijasi reytingi.
12. **AI yadrosi** (Vercel AI SDK, provider-agnostic — kalit keyin).
13. **AI test generatori** (namunaga asoslangan).
14. **AI o'quvchi tahlili.**
15. **AI yordamchi (chat).**

---

## 9. Qabul mezonlari (Definition of Done)

- [ ] Har bir modul o'z ruxsat matritsasiga mos ishlaydi.
- [ ] Har bir maktab faqat o'z ma'lumotini ko'radi (tenant isolation tekshirilgan).
- [ ] Asosiy amallar uchun avtomatik testlar mavjud.
- [ ] TypeScript typecheck va lint xatosiz.
- [ ] Interfeys 3 tilda ishlaydi.
- [ ] Ma'lumotlar bazasi migratsiyalari versiyalangan.
- [ ] Har bir yirik o'zgarish uchun tushuntiruvchi hujjat va draft PR.

---

## 10. Xatarlar va taxminlar

| Xatar / taxmin | Yechim |
| --- | --- |
| AI provayder kaliti hozircha yo'q | Provider-agnostic kod; AI modullari kalit qo'yilgach ishga tushadi |
| SMS provayder tanlovi va byudjeti | Eskiz.uz/Play Mobile; abstraksiya orqali oson almashtiriladi |
| Baho tizimi (5 yoki 100 balli) | Sozlamalar orqali konfiguratsiya qilinadi (maktab bo'yicha) |
| Ma'lumot maxfiyligi (voyaga yetmaganlar) | Qat'iy RBAC, audit, minimal ma'lumot |
| Ko'p maktablilik murakkabligi | Boshidan tenant konteksti; har bir so'rov `schoolId` bilan cheklanadi |

---

## 11. Kelajakdagi kengaytmalar

- Mobil ilova (React Native / PWA).
- Onlayn to'lov shlyuzi (Payme / Click).
- Video-dars va uy vazifasi moduli.
- Biometrik/QR davomat.
- Kutubxona va oshxona moduli.
- O'quvchi rasmini to'liq yoqish (object storage bilan).

---

> ✅ **Keyingi qadam:** ushbu TZ tasdiqlangach, 1–2-bosqich (poydevor + multi-tenant asos
> + auth/rollar) dan boshlaymiz. Har bosqich uchun **kod + tushuntiruvchi hujjat + draft
> PR** tayyorlanadi.
