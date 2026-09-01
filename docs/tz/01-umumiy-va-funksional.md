# Texnik Topshiriq (TZ) v1.0 — 1-qism: Umumiy, RBAC, funksional talablar

> Bu Notion'dagi **"[CRM] Xususiy Maktab CRM — Texnik Topshiriq (TZ) v1.0"**
> hujjatining to'liq nusxasi (1–3-bo'limlar). 4–11-bo'limlar:
> `docs/tz/02-ai-va-texnik.md`. Qisqartma: `docs/00-tz-qisqacha.md`.
>
> TZ loyihaning **yagona haqiqat manbai** (single source of truth): talablar,
> arxitektura, ma'lumotlar modeli va bosqichlar shu yerda belgilangan.
> Egasi: Otajon Asatullayev.

---

# 1. Umumiy ma'lumot

## 1.1. Loyiha maqsadi

Xususiy maktabning kundalik boshqaruvini bitta zamonaviy web-platformada
birlashtirish: o'quvchi va o'qituvchilar bazasi, dars jadvali, davomat, baholar,
jarima ball tizimi, choraklik reyting, to'lovlar (buxgalteriya), hisobotlar va
ota-onalar bilan aloqa (SMS). Tizim sun'iy intellekt bilan boyitiladi — test
tuzish va o'quvchini tahlil qilish.

## 1.2. Loyiha doirasi (Scope)

**✅ Doiraga kiradi:** 4 rolli web-ilova (Admin, O'qituvchi, Buxgalter,
Ota-ona/O'quvchi), o'quvchi/o'qituvchi boshqaruvi (jumladan fayldan ommaviy
import), sinf va jadval, davomat, baho, mezon asosidagi jarima ball, choraklik
statistika va reyting, to'lov/kontrakt, dashboard va hisobotlar, SMS xabarnoma,
3 til (uz/ru/en), test moduli (qo'lda va fayl orqali import, test natijasi
reytingi), AI test generatori va tahlil.

**🚫 Hozircha doiradan tashqarida (kelajak):** mobil ilova (native), onlayn dars
(video), moliyaviy soliq hisobotlari integratsiyasi, biometrik davomat
qurilmalari. Bular 11-bo'limda qayd etilgan.

## 1.3. Muvaffaqiyat mezonlari

- Har bir rol faqat o'ziga tegishli ma'lumotni ko'radi va boshqaradi (xavfsiz RBAC).
- Davomat va baho kiritish **3 tugmadan oshmagan qadamda** bajariladi (tez ish).
- Choraklik reyting va 1-2-3 o'rin avtomatik hisoblanadi.
- To'lov holati (to'langan/qarzdor) real vaqtda ko'rinadi.
- Ota-onaga SMS avtomatik yuboriladi (davomat, baho, to'lov eslatmasi).
- AI namunaga qarab o'sha darajadagi va mavzudagi testni tuzib beradi.
- Interfeys 3 tilda to'liq ishlaydi.

## 1.4. Atamalar lug'ati

| Atama | Ma'nosi |
| --- | --- |
| RBAC | Role-Based Access Control — rolga asoslangan ruxsat tizimi |
| Chorak (Quarter/Term) | O'quv yilining bir qismi (1-2-3-4 chorak) |
| Kontrakt | O'quvchining oylik to'lov shartnomasi |
| Jarima ball | Intizom buzilganda beriladi; reyting va tahlilga ta'sir qiladi |
| LLM | Large Language Model — AI matn modeli (GPT, Claude, Gemini) |
| i18n | Internationalization — ko'p tillilik |

---

# 2. Foydalanuvchi rollari va ruxsatlar (RBAC)

Tizimda 4 asosiy rol mavjud. Har bir rol o'z vazifasiga mos ruxsatga ega.

- **Admin / direksiya** — barcha modullarni to'liq boshqaradi.
- **O'qituvchi** — o'z sinflari bo'yicha davomat, baho, jarima ball, AI test.
- **Buxgalter** — kontrakt, to'lov, moliyaviy hisobotlar.
- **Ota-ona / O'quvchi** — faqat o'z (yoki farzandi) ma'lumotini ko'radi.

## 2.1. Ruxsatlar matritsasi

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

**🔑 Izoh:** ✅ = to'liq boshqarish (yaratish/tahrirlash/o'chirish),
👁 = faqat ko'rish (belgilangan doirada), ❌ = ruxsat yo'q.

---

# 3. Funksional talablar

## 3.1. Autentifikatsiya va ruxsatlar

- Login/parol orqali kirish (email yoki telefon + parol).
- Rolga asoslangan ruxsat (RBAC) — har bir sahifa va API himoyalangan.
- Sessiya boshqaruvi, xavfsiz parol (hashing), parolni tiklash.
- Har bir muhim amal audit jurnaliga yoziladi (kim, nima, qachon).

### 3.1.1. Sessiya bekor qilish siyosati (ochiq qaror)

> 🔐 **Hozirgi holat:** sessiya JWT asosida (token brauzer cookie'sida saqlanadi,
> serverda emas). Middleware Edge runtime'da ishlagani uchun bazaga murojaat
> qilmaydi — hisob holati (`isActive`, rol, `mustChangePassword`) Node runtime
> tomonida **30 daqiqada bir marta** qayta tekshiriladi. Ya'ni bloklangan hisob
> eng ko'p 30 daqiqa davomida sahifalar bo'ylab yura oladi. Bu xato emas,
> ataylab qilingan murosa: tezlik va ishonchlilik uchun.

Variantlar (ishga tushirishdan oldin bittasi tanlanadi):

- **A — hozirgi:** davriy tekshiruv (30 daqiqa). Navigatsiya tez, bazaga yuk yo'q.
  Bloklash kechikadi.
- **B — arzon yaxshilanish:** barcha yozuv amallari va kritik server action'larda
  har safar `isActive` tekshiriladi. Navigatsiya tez qoladi, bloklangan hisob esa
  hech qanday o'zgarish kirita olmaydi (faqat ko'rishi mumkin).
- **C — to'liq:** sessiyalar bazada saqlanadi (database session strategy).
  Bloklash bir zumda kuchga kiradi, lekin har bir so'rovda bitta qo'shimcha baza
  o'qishi paydo bo'ladi.

Hozirgi tavsiya: **A ni saqlab, B ni qo'shish**. C ga faqat haqiqiy ehtiyoj
bo'lsa o'tiladi.

## 3.2. O'quvchilar bazasi

- O'quvchi profili: ism/familiya, tug'ilgan sana, jinsi, rasm, manzil, sinf,
  ota-ona aloqasi, qabul sanasi, holati (faol/bitirgan/chiqib ketgan).
- Qabul/ro'yxatga olish jarayoni (yangi o'quvchi qo'shish).
- Qidiruv, filtrlash (sinf, holat), ro'yxat va karta ko'rinishi.
- Har bir o'quvchi kartasida: davomat, baho, jarima ball, to'lov tarixi,
  AI tahlil bir joyda.

## 3.3. O'qituvchilar bazasi

- O'qituvchi profili: shaxsiy ma'lumot, fanlar, biriktirilgan sinflar, kontakt.
- O'qituvchini foydalanuvchi (login) bilan bog'lash.
- Dars yuklamasi va jadvalini ko'rish.

## 3.4. Sinflar/guruhlar va dars jadvali

- Sinf/guruh yaratish (masalan 9-A), sinf rahbari, o'quv yili.
- Fanlar ro'yxati.
- Haftalik dars jadvali: kun, vaqt, fan, o'qituvchi, xona.
- Ziddiyatni tekshirish (bitta o'qituvchi bir vaqtda ikki joyda bo'lmasligi).

## 3.5. Davomat (yo'qlama)

- O'qituvchi dars bo'yicha davomatni belgilaydi: **keldi / kelmadi / kechikdi /
  sababli**.
- Tez kiritish interfeysi (butun sinfni bir ekranda).
- Davomat statistikasi (o'quvchi/sinf bo'yicha foiz).
- Kelmagan o'quvchi ota-onasiga avtomatik SMS (ixtiyoriy sozlama).

## 3.6. Baholar va o'zlashtirish

- Baho kiritish: o'quvchi, fan, chorak, baho, turi (kundalik/nazorat/imtihon), sana.
- Baho tizimi sozlanadi (5 balli / 100 balli — konfiguratsiya).
- O'rtacha ball avtomatik hisoblanadi (fan va chorak bo'yicha).
- Baho jurnali ko'rinishi (sinf × fan).

## 3.7. Choraklik statistika va reyting (1-2-3 o'rin)

> 🏆 Har chorak yakunida tizim o'quvchilarning umumiy o'rtacha ballini
> (baho + jarima ball ta'sirini hisobga olib) hisoblab, reyting tuzadi va
> **1-2-3 o'rin** egalarini alohida ajratib ko'rsatadi (sinf bo'yicha va butun
> maktab bo'yicha).

- Reyting mezoni sozlanadi (faqat o'rtacha ball yoki ball minus jarima).
- Top-3 alohida ko'rsatiladi (medal/rasm bilan), to'liq reyting jadvali.
- Choraklararo taqqoslash (o'sish/pasayish grafigi).
- Reyting manbalari: choraklik baho, jarima ball ta'siri va **test natijalari**
  (4.3-bo'lim) birga hisobga olinishi mumkin (sozlanadi).

## 3.8. Jarima ball tizimi (mezonlar asosida)

Jarima balllari **oldindan belgilangan mezonlar** bo'yicha beriladi. Mezonlar
ro'yxatini **faqat bosh admin** yaratadi va boshqaradi.

- **Mezonlar boshqaruvi (admin):** har bir mezon kiritiladi — nomi, tavsifi,
  ball miqdori, kategoriya (masalan: kechikish, darsni qoldirish, intizom,
  forma qoidasi). Admin mezon qo'shadi, tahrirlaydi, o'chiradi.
- **Jarima berish (o'qituvchi/admin):** tayyor mezonlardan biri tanlanadi va
  o'quvchiga qo'llanadi — ball **avtomatik mezondan olinadi**, qo'shimcha izoh
  yoziladi.
- Jarima balllari o'quvchi profili va reytingga ta'sir qiladi (sozlanadigan
  koeffitsient).
- Ota-onaga xabar (ixtiyoriy); jarima tarixi, statistikasi va mezon bo'yicha
  kesim (qaysi mezon ko'p uchraydi).

## 3.9. To'lovlar / oylik kontraktlar (buxgalteriya)

- Kontrakt: o'quvchi, oylik summa, chegirma, boshlanish/tugash sanasi.
- Oylik hisob-faktura (invoice) avtomatik generatsiya.
- To'lovni qabul qilish: summa, usul (naqd/karta/o'tkazma), sana, kvitansiya.
- Qarzdorlik holati: to'langan / qisman / qarzdor.
- To'lov eslatmasi SMS orqali (muddat yaqinlashganda / o'tganda).
- Moliyaviy hisobot: oylik tushum, qarzdorlar ro'yxati.

## 3.10. Hisobotlar va dashboard

- Rolga mos dashboard (Admin — umumiy; O'qituvchi — sinf; Buxgalter — moliya;
  Ota-ona — farzand).
- Asosiy ko'rsatkichlar (KPI): o'quvchilar soni, davomat foizi, o'rtacha ball,
  oylik tushum, qarzdorlar.
- Grafik va diagrammalar, davr bo'yicha filtr.
- Hisobotni eksport qilish (PDF/Excel).

## 3.11. Xabarnomalar (SMS)

- Ota-onaga SMS: davomat, baho, jarima, to'lov eslatmasi, umumiy e'lonlar.
- Shablonlar (3 tilda), avtomatik va qo'lda yuborish.
- Yuborilgan xabarlar jurnali va holati (yuborildi/xato).
- Provayder: **Eskiz.uz** yoki **Play Mobile** (O'zbekiston).

## 3.12. AI modullari

Batafsil 4-bo'limda (`docs/tz/02-ai-va-texnik.md`). Qisqacha: AI test generatori
(namunadan o'rganadigan), o'quvchi tahlili, AI yordamchi.

## 3.13. Ko'p tillilik (i18n)

- Interfeys 3 tilda: o'zbek, rus, ingliz.
- Til foydalanuvchi profili bo'yicha saqlanadi va istalgan vaqt almashtiriladi.
- SMS shablonlari ham 3 tilda.

## 3.14. Fayldan ommaviy import (o'quvchi va o'qituvchi)

> 📥 **Maqsad:** tizimni ishga tushirishda yuzlab o'quvchi va o'qituvchini qo'lda
> kiritish o'rniga, maktabda mavjud ro'yxatni **Excel (.xlsx) yoki CSV** fayldan
> bir marta yuklab olish. Import faqat **Admin** uchun ochiq.

### 3.14.1. Import jarayoni (4 qadam)

1. **Shablon yuklab olish** — tizim tayyor `.xlsx` shablon beradi (ustun
   sarlavhalari va namuna qator bilan). O'quvchi va o'qituvchi uchun alohida
   shablon.
2. **Fayl yuklash** — `.xlsx` yoki `.csv`. Maksimal hajm 5 MB, bir faylda
   1000 qatorgacha.
3. **Oldindan ko'rish va tekshirish (preview)** — yozishdan OLDIN tizim har bir
   qatorni tekshirib jadvalda ko'rsatadi: ✅ tayyor, ⚠️ ogohlantirish (dublikat),
   ❌ xato (sababi bilan). Bu qadamda bazaga **hech narsa yozilmaydi**.
4. **Tasdiqlash** — admin tasdiqlagach faqat to'g'ri qatorlar yoziladi. Yakunda
   hisobot: nechta qo'shildi / yangilandi / o'tkazib yuborildi. Xato qatorlar
   alohida `.csv` bo'lib yuklab olinadi — tuzatib qayta yuklash uchun.

### 3.14.2. O'quvchi faylining ustunlari

| Ustun | Majburiy | Izoh |
| --- | --- | --- |
| Familiya | ✅ | — |
| Ism | ✅ | — |
| Tug'ilgan sana | ❌ | YYYY-MM-DD yoki DD.MM.YYYY |
| Jinsi | ❌ | o'g'il / qiz |
| Manzil | ❌ | — |
| Sinf | ❌ | mavjud sinf nomi (masalan 9-A) |
| Holat | ❌ | faol (default) / bitirgan / chiqib ketgan |
| Vasiy F.I.Sh. | ❌ | vasiy yaratilishi uchun telefon bilan birga kerak |
| Vasiy telefon | ❌ | +998XXXXXXXXX |
| Qarindoshlik | ❌ | ota / ona / vasiy |

### 3.14.3. O'qituvchi faylining ustunlari

| Ustun | Majburiy | Izoh |
| --- | --- | --- |
| F.I.Sh. | ✅ | — |
| Email | ⚠️ | email yoki telefon — kamida bittasi shart (login sifatida ishlatiladi) |
| Telefon | ⚠️ | +998XXXXXXXXX |
| Fanlar | ❌ | vergul bilan: Matematika, Fizika |
| Interfeys tili | ❌ | uz / ru / en (default uz) |
| Holat | ❌ | faol (default) / faolsiz |
| Boshlang'ich parol | ❌ | bo'sh bo'lsa tizim xavfsiz parol generatsiya qiladi |

### 3.14.4. Qoidalar va tekshiruvlar

- Ustun sarlavhalari shablondagidek bo'ladi; ustunlar tartibi muhim emas,
  ortiqcha ustunlar e'tiborsiz qoldiriladi.
- **Dublikat aniqlash:** o'quvchi — familiya + ism + tug'ilgan sana;
  o'qituvchi — email yoki telefon. Admin tanlaydi: dublikatni o'tkazib yuborish
  (default) yoki mavjud yozuvni yangilash.
- Sinf nomi topilmasa qator xato bilan belgilanadi (sozlama bilan sinfni
  avtomatik yaratish mumkin).
- Bitta xato qator butun importni to'xtatmaydi — to'g'ri qatorlar yoziladi
  (partial import), xatolar hisobotga tushadi.
- Yozish paketlar (batch) bilan, tranzaksiya ichida bajariladi — uzilish bo'lsa
  yarim yozuv qolmaydi.
- Bir xil fayl ikki marta yuklansa dublikat qoidasi tufayli takroriy yozuv paydo
  bo'lmaydi (**idempotent**).

### 3.14.5. Xavfsizlik va audit

- Faqat ADMIN roli: `/students/import`, `/teachers/import`.
- Yuklangan fayl serverda saqlanmaydi — oqimda o'qiladi va darhol o'chiriladi.
- Har bir import audit jurnaliga yoziladi: kim, qachon, fayl nomi, qatorlar soni,
  natija. Parollar va shaxsiy qiymatlar jurnalga tushmaydi.
- Import qilingan o'qituvchi hisoblari `mustChangePassword = true` bilan
  yaratiladi; boshlang'ich parollar faqat bir marta ekranda ko'rsatiladi yoki
  bir martalik fayl sifatida beriladi.
- Voyaga yetmaganlar ma'lumoti uchun minimal ustunlar tamoyili saqlanadi.

### 3.14.6. Eksport (import bilan juft ishlaydi)

- O'quvchilar va o'qituvchilar ro'yxati joriy filtr bo'yicha `.xlsx` ga eksport
  qilinadi.
- Eksport fayli import shabloni bilan **bir xil ustunlarga** ega — ya'ni
  **eksport → Excelda tahrirlash → qayta import** oqimi ishlaydi.

### 3.14.7. Texnik amalga oshirish

- `.xlsx` o'qish/yozish: SheetJS (xlsx) yoki ExcelJS; `.csv` da ajratuvchi
  (`,` yoki `;`) avtomatik aniqlanadi.
- Fayl faqat server tomonda (Server Action) o'qiladi; har bir qator zod bilan
  tekshiriladi — mavjud `studentWriteSchema` / `teacherWriteSchema` qayta
  ishlatiladi, ya'ni qo'lda qo'shish va import bir xil qoidaga tayanadi.
- Katta fayllar 100 qatorli paketlarda qayta ishlanadi, foydalanuvchiga progress
  ko'rsatiladi.
