# 1-to'lqin — yakuniy yopilish checklisti

> **Maqsad:** xavfsizlik to'lqinini rasmiy yopishdan oldin bajarilishi shart bo'lgan yakuniy tekshiruvlarni bitta joyda saqlash.
>
> **Tartib:** 1-to'lqin to'liq yopilmaguncha 2-to'lqin va 7-bosqich boshlanmaydi.
>
> **Tuzilgan sana:** 2026-09-21

## 1. Boshlang'ich nuqta

| Band | Qiymat |
| --- | --- |
| Ishchi branch | `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098` |
| Integratsiya commit'i | `524d1762db0a348b05a50ce9421dc372db15a58d` |
| So'nggi integratsiya | PR #108 — `grades.ts` dagi o'lik kodni olib tashlash |
| Checklist branch | `claude/wave-1-final-checklist` |
| Checklist PR | **#109 ochiq** |
| Rasmiy holat | **Kod ishlari deyarli tugagan; yakuniy darvoza hali yopilmagan** |

## 2. Hozirgacha yopilgan katta qismlar

Quyidagi ishlar integratsiya branchida mavjud va qayta bajarilmaydi:

- [x] 0-to'lqin: migratsiya, test poydevori, CI, query log va o'lchov.
- [x] F2 sxema yaxlitligi: PR #86.
- [x] F3 bahoni darsga majburiy bog'lash va `Grade.lessonId` NULL teshigini yopish: PR #87.
- [x] G1–G4b: parol siyosati, import preview himoyasi, jim xatolar, doimiy rate limit: PR #88–#95.
- [x] H2–H5: menyu, sinf ko'chirish, rad etish auditi, scope, import parity va o'lik kod: PR #97–#108.
- [ ] Checklist PR #109 integratsiya branchiga merge qilindi.

> Eski `docs/01`, `docs/03`, `docs/05`, `docs/07` hujjatlarining ayrim qismlari PR #86–#108 dan ortda qolgan. Ularning “PR F qoldi” degan yozuvlari to'liq joriy holat emas.

## 3. P0 — ma'lumotlar bazasi yakuniy tekshiruvi

> Bu bandlar baza yoki mavjud ma'lumotga tegishi mumkin. `UPDATE`, `DELETE`, `VALIDATE CONSTRAINT`, backfill yoki production migration loyiha egasining tasdig'isiz bajarilmaydi.

### 3.1. F2/F3 migratsiyalarini tekshirish

- [ ] `prisma migrate status` — migratsiyalar to'liq qo'llangan.
- [ ] `Grade.lessonId IS NULL` qatorlari soni read-only `SELECT` bilan tekshirildi.
- [ ] `Grade(studentId, lessonId, date, type)` bo'yicha dublikatlar soni tekshirildi.
- [ ] F3 backfillidan keyin noaniq yoki qolib ketgan baholar yo'qligi tekshirildi.
- [ ] PR #86 da `NOT VALID` qo'shilgan 8 ta CHECK cheklovining holati tekshirildi.
- [ ] Har bir `NOT VALID` constraint uchun avval buzilgan qatorlarni topuvchi `SELECT` tayyorlandi.
- [ ] Constraintlarni `VALIDATE` qilish uchun backup va rollback rejasi belgilandi.
- [ ] Loyiha egasi production/staging bazada validation bajarishga tasdiq berdi.
- [ ] `VALIDATE CONSTRAINT` natijalari hujjatlashtirildi.
- [ ] `AcademicYear.isCurrent` poygasi bo'yicha qaror yozildi: hozirgi ilova tranzaksiyasi yetarlimi yoki keyingi alohida PR kerakmi.

### 3.2. Qat'iy migratsiya qoidalari

- [ ] `prisma/migrations/` dagi qo'llangan fayl tahrirlanmadi.
- [ ] Yangi sxema o'zgarishi bo'lsa, kod va migration bitta PRga kiritiladi.
- [ ] Backup loyiha papkasidan tashqarida saqlandi.
- [ ] `db push` ishlatilmadi.

## 4. P0 — secret scanning va repository qarori

- [ ] Repository public qoladimi yoki private qilinadimi — qaror yozildi.
- [ ] Public qolsa, GHAS/secret scanning bo'yicha qaror yozildi.
- [ ] `.env`, token, parol va `login-parollar*.csv` bo'yicha repository tarixi tekshirildi.
- [ ] `.env.example` faqat namunaviy qiymatlardan iboratligi tasdiqlandi.
- [ ] Secret scanning natijasi saqlandi.
- [ ] Sir topilsa, faqat faylni o'chirish emas, tegishli credential rotate qilindi.

## 5. P1 — qolgan security qarorlari

### 5.1. Parol va seed

- [x] Amaldagi parol siyosati **8 belgi** ekanligi `src/lib/password.ts`da ko'rsatilgan.
- [x] `prisma/seed.ts` `passwordError(seedPassword)` orqali `SEED_PASSWORD`ni shu siyosat bilan tekshiradi.
- [ ] Seed tekshiruvining regression testi va hujjatdagi holati yakuniy test darvozasida tasdiqlanadi.
- [ ] Eski, amaldagi siyosatdan qisqa parollarni `mustChangePassword` bilan majburiy almashtirish kerak yoki kerak emasligi hal qilindi.
- [ ] Import parollari va `mustChangePassword` oqimi qayta tekshirildi.

### 5.2. Rate limit va monitoring

- [ ] Login, server action va import preview limitlari PostgreSQL orqali saqlanishi tekshirildi.
- [ ] Server restartdan keyin login limiti saqlanishi tekshirildi.
- [ ] `RateHit` kalitlarida email/telefon ochiq ko'rinmasligi tekshirildi.
- [ ] Middleware va route-guard limitlarining Edge sabab xotirada qolishi ochiq risk sifatida qabul qilindimi — qaror yozildi.
- [ ] Markazlashgan log/alert kerakmi — qaror yozildi.
- [ ] SQL rate-limit yo'li uchun staging yoki manual test natijasi saqlandi.

### 5.3. Auth, RBAC, scope va ma'lumot sizishi

- [ ] To'rt rol bo'yicha sahifa va action ruxsatlari tekshirildi.
- [ ] Begona student/teacher/class ID bilan ma'lumot chiqmasligi tekshirildi.
- [ ] `PERMISSION_DENIED` loglari email, telefon, parol yoki xom ID sizdirmasligi tekshirildi.
- [ ] “Topilmadi” va “ruxsat yo'q” javoblari enumerationga yo'l qo'ymasligi tekshirildi.
- [ ] SSG sahifalarida rolga bog'liq ma'lumot noto'g'ri cache qilinmasligi tekshirildi.
- [ ] Middleware matcheridagi nuqtali yo'llar bo'yicha qaror yozildi.

## 6. P1 — avtomatik va qo'lda tekshiruv

Yakuniy integratsiya branchida bajariladi:

- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npx prisma migrate status`
- [ ] `npm run build`
- [ ] Kerak bo'lsa `npm start` production smoke test

Natijalar aniq yoziladi:

- [ ] Test fayllari soni.
- [ ] O'tgan testlar soni.
- [ ] Yiqilgan testlar soni.
- [ ] `(0)` bilan yashirincha o'tgan test suite yo'qligi.
- [ ] Typecheck va build xatosiz tugagani.

Qo'lda minimum sinovlar:

- [ ] Login rate limit server restartdan keyin ham ishlaydi.
- [ ] Begona student/teacher/class ID ma'lumot chiqarmaydi.
- [ ] Import preview 10/min limitni qo'llaydi.
- [ ] Excel/CSV formula injection oddiy Excel'da formula sifatida bajarilmaydi.
- [ ] Baho bor darsni o'chirish bloklanadi.
- [ ] Normal jurnal/davomat saqlashida `dropped` qiymatlar 0 bo'ladi.

## 7. P1 — hujjatlarni sinxronlashtirish

- [ ] `docs/01-loyiha-holati.md` PR #86–#108 holatini aks ettiradi.
- [ ] `docs/03-keyingi-ishlar.md` bajarilgan va qolgan ishlarni ajratadi.
- [ ] `docs/05-tolqinlar-rejasi.md` 1-to'lqin statusini to'g'ri ko'rsatadi.
- [ ] `docs/07-xavfsizlik.md` G4a/G4b va H4/H5 ishlarini aks ettiradi.
- [ ] Hozirgi parol minimumi 8 deb ko'rsatilgan.
- [ ] Testlar soni taxmin bilan emas, oxirgi `npm test` natijasi bilan yozilgan.
- [ ] Qolgan risklar “yopildi” deb noto'g'ri belgilanmagan.
- [ ] Ushbu checklistning yakuniy holati hujjatlashtirilgan.

## 8. Rasmiy yopilish darvozasi

- [ ] P0 bandlarning barchasi bajarildi yoki loyiha egasi tomonidan aniq qaror qilindi.
- [ ] P1 bandlar uchun keyingi tasklar va mas'uliyat belgilanib, bloklovchi risklar qolmadi.
- [ ] Hujjatlar real kod holatiga mos.
- [ ] Yakuniy test/build natijalari mavjud.
- [ ] 1-to'lqin yakuniy PR'i integratsiya branchiga ochildi.
- [ ] PR ichida o'zbekcha “nima edi / nega xavfli / nima qilindi”, Test rejasi va Xavfsizlik bo'limlari bor.
- [ ] Loyiha egasi merge qildi.
- [ ] Merge'dan keyin loyiha holati hujjatlari yangilandi.
- [ ] 1-to'lqin rasmiy ravishda `✅ yopildi` deb belgilandi.

## 9. 2-to'lqinga o'tish

Faqat yuqoridagi darvoza yopilgandan keyin:

1. `/schedule` prefetch toshqinini to'xtatish;
2. Prisma connection poolingni o'rganish;
3. `loading.tsx` skeletonlar;
4. 307 redirect zanjirini qisqartirish;
5. `/ranking`dagi ketma-ket so'rovlarni parallel qilish;
6. sahifalash;
7. faqat o'lchovdan keyin indeks va `groupBy`.

**2-to'lqin boshlanishidan oldin 7-bosqichga o'tilmaydi.**

## 10. Hozirgi birinchi ish

1. Checklist PR #109ni integratsiya branchiga merge qilish.
2. Read-only baza auditini o'tkazish: F2/F3 natijalari va `NOT VALID` constraintlar.
3. Secret scanning va hujjat sync bo'yicha qarorlarni yopish.
4. Seed password kodi allaqachon tekshirilgani sababli alohida seed PR ochmaslik; faqat regression test/build darvozasida tasdiqlash.
5. Shundan keyin yakuniy test/build darvozasini bajarish.

> GitHub ulanishi repository va migration fayllarini ko'rsatadi, lekin real PostgreSQL bazaga read-only ulanish bermaydi. Shuning uchun 3-bo'limdagi `SELECT`lar lokal/staging bazada bajarilib, natijasi closeout PRga qo'shiladi.
