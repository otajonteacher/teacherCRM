# TZ qisqartmasi — Xususiy Maktab CRM

> To'liq TZ Notion'da: **"[CRM] Xususiy Maktab CRM — Texnik Topshiriq (TZ) v1.0"**.
> Bu fayl uning kod uchun kerakli qismlarini saqlaydi.

## 1. Rollar

| Rol | Vazifasi |
| --- | --- |
| `ADMIN` | Barcha modullarni to'liq boshqaradi |
| `TEACHER` | O'z sinflari bo'yicha davomat, baho, jarima, AI test |
| `ACCOUNTANT` | Kontrakt, to'lov, moliyaviy hisobotlar |
| `PARENT` | Faqat o'z (yoki farzandi) ma'lumotini ko'radi |

## 2. Ruxsat matritsasi (qisqa)

| Modul | Admin | O'qituvchi | Buxgalter | Ota-ona |
| --- | --- | --- | --- | --- |
| Foydalanuvchilar | ✅ | ❌ | ❌ | ❌ |
| O'quvchilar | ✅ | 👁 o'z sinfi | 👁 | 👁 farzandi |
| O'qituvchilar | ✅ | 👁 o'z profili | ❌ | ❌ |
| Sinf / jadval | ✅ | 👁 o'z jadvali | ❌ | 👁 |
| Davomat | ✅ | ✅ kiritish | ❌ | 👁 |
| Baholar | ✅ | ✅ kiritish | ❌ | 👁 |
| Jarima ball | ✅ | ✅ berish | ❌ | 👁 |
| Jarima mezonlari | ✅ | ❌ | ❌ | ❌ |
| Reyting | ✅ | 👁 o'z sinfi | 👁 | 👁 |
| To'lov / kontrakt | ✅ | ❌ | ✅ | 👁 o'z hisobi |
| Hisobot / dashboard | ✅ | 👁 o'z sinfi | 👁 moliya | ❌ |
| SMS | ✅ | ✅ o'z sinfiga | ✅ to'lov | ❌ |
| AI test generatori | ✅ | ✅ | ❌ | ❌ |
| AI tahlil | ✅ | ✅ o'z sinfi | ❌ | 👁 farzandi |

✅ = to'liq, 👁 = faqat ko'rish (doira ichida), ❌ = ruxsat yo'q.

## 3. Roadmap (15 bosqich)

1. Poydevor — Next.js, Tailwind, shadcn, Prisma, DB, i18n ✅
2. Auth va rollar — 4 rol, login, RBAC ✅
3. O'quvchi/o'qituvchi bazasi — CRUD + Excel import ✅
4. Sinf/guruh va dars jadvali ✅
5. **Davomat (yo'qlama)** ← keyingi
6. Baholar + choraklik statistika + 1-2-3 reyting
7. Jarima ball tizimi (mezonlar asosida)
8. To'lovlar / kontraktlar (buxgalteriya)
9. Dashboard va hisobotlar
10. SMS xabarnomalar (Eskiz.uz / Play Mobile)
11. Test moduli (qo'lda, txt/docx import, avtomatik baholash, test reytingi)
12. AI yadrosi (Vercel AI SDK, provider-agnostic)
13. AI test generatori (namunaga asoslangan, few-shot)
14. AI o'quvchi tahlili
15. AI yordamchi (chat, RBAC hurmat qiladi)

## 4. Muhim funksional talablar

- **Davomat (3.5):** holatlar keldi/kelmadi/kechikdi/sababli; butun sinf bir
  ekranda; 3 tugmadan oshmagan qadamda kiritiladi; foiz statistikasi;
  kelmaganning ota-onasiga SMS (10-bosqichda ulanadi).
- **Reyting (3.7):** chorak yakunida o'rtacha ball (jarima ta'siri va test
  natijasi bilan, sozlanadi) → **1-2-3 o'rin** sinf va maktab bo'yicha.
- **Jarima (3.8):** ball mezondan avtomatik olinadi; mezonni faqat admin
  yaratadi/tahrirlaydi.
- **Import (3.14):** 4 qadam — shablon → yuklash → **preview (bazaga yozmaydi)**
  → tasdiqlash; xato qatorlar `.csv` bo'lib yuklab olinadi; audit yoziladi;
  idempotent (bir fayl ikki marta yuklansa dublikat paydo bo'lmaydi).
- **Eksport (3.14.6):** import shabloni bilan **bir xil ustunlar** →
  eksport → Excelda tahrirlash → qayta import oqimi ishlashi kerak.
- **Testlar (4.1):** matn formati — `?` savol, `+` to'g'ri javob, `-` noto'g'ri,
  bo'sh qator savollarni ajratadi.
- **AI (4.7):** provider-agnostic, API kalit serverda, kalit bo'lmasa ham tizim
  to'liq ishlaydi.

## 5. Qabul mezonlari (Definition of Done)

- Har bir modul ruxsat matritsasiga mos ishlaydi.
- `npm run typecheck` va lint xatosiz.
- Interfeys 3 tilda to'liq ishlaydi.
- Migratsiyalar versiyalangan.
- Har bir yirik o'zgarish uchun tushuntiruvchi hujjat va draft PR.
