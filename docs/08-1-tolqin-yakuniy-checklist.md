# 1-to'lqin — yakuniy yopilish checklisti

> **Maqsad:** xavfsizlik to'lqinini rasmiy yopishdan oldin bajarilishi shart bo'lgan ishlarni bitta joyda saqlash.
>
> **Tartib:** 1-to'lqin to'liq yopilmaguncha 2-to'lqin (tezlik) va 7-bosqich boshlanmaydi.
>
> **Tuzilgan sana:** 2026-09-21

## 1. Hozirgi boshlang'ich nuqta

| Band | Qiymat |
| --- | --- |
| Ishchi branch | `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098` |
| Boshlang'ich commit | `524d1762db0a348b05a50ce9421dc372db15a58d` |
| So'nggi integratsiya | PR #108 — `grades.ts` dagi o'lik kodni olib tashlash |
| Checklist branch | `claude/wave-1-final-checklist` |
| Ochiq pull request | 0 ta |
| Rasmiy holat | **Yopilmagan — yakuniy tekshiruv va PR F qolgan** |

Bu checklist branchi integratsiya branchidan ochildi. Yakuniy kod ishlari alohida task branchlarda bajariladi va faqat integratsiya branchiga PR orqali qo'shiladi.

## 2. Yopilish qoidasi

Quyidagi uchta shart bajarilmaguncha 1-to'lqin `Done` deb belgilanmaydi:

- [ ] Barcha **P0** bloklovchi bandlar bajarildi yoki loyiha egasi tomonidan ongli ravishda qaror qilindi va hujjatlashtirildi.
- [ ] Avtomatik va qo'lda tekshiruvlar haqiqiy branchda bajarildi; natijalar saqlandi.
- [ ] `docs/01`, `docs/03`, `docs/05`, `docs/07` va ushbu checklist real kod holatiga moslashtirildi.

Yakuniy yopilish PR'si o'zbek tilida bo'ladi va unda alohida **Test rejasi** hamda **Xavfsizlik** bo'limlari bo'ladi.

## 3. P0 — sxema va migratsiya auditlari

> Bu bo'lim ma'lumotlar bazasiga ta'sir qilishi mumkin. Backup, aniq reja va loyiha egasining tasdig'isiz `migrate`, `UPDATE`, `DELETE` yoki backfill bajarilmaydi.

### 3.1. Sxema nuqsonlarini tasdiqlash

- [ ] `prisma/schema.prisma` ning integratsiya branchidagi to'liq nusxasi o'qildi.
- [ ] `docs/04-migratsiyalar.md` bilan sxema solishtirildi.
- [ ] `Student.userId` masalasi uchun yakuniy qaror yozildi.
- [ ] `Grade.lessonId = NULL` bo'lgan eski yozuvlar uchun son va holatni faqat `SELECT` bilan aniqlash rejasi tayyorlandi.
- [ ] `Grade` unique cheklovi NULL qiymatlar sababli aylanib o'tilmasligi uchun yechim tanlandi.
- [ ] `BigInt` agregatsiya masalasi tekshirildi.
- [ ] `Test.questions` uchun zod validatsiyasi kerak yoki kerak emasligi qaror qilindi.
- [ ] `PR #86` dagi `NOT VALID` CHECK larni `VALIDATE` qilish rejasi yozildi.

### 3.2. Ma'lumot xavfsizligi va migratsiya

- [ ] Lokal yoki staging baza backupi olindi.
- [ ] Backfill oldidan va keyin bajariladigan `SELECT` tekshiruvlari yozildi.
- [ ] Backfill natijasi qanday tekshirilishi belgilandi.
- [ ] Qaytarish/rollback rejasi yozildi.
- [ ] Loyiha egasi sxema va backfillga aniq tasdiq berdi.
- [ ] Yangi migration nomi va maqsadi belgilandi.
- [ ] Migration lokal/staging bazada qo'llandi.
- [ ] `npx prisma migrate status` muvaffaqiyatli o'tdi.
- [ ] `npm run db:generate` bajarildi.
- [ ] Ishlab turgan ma'lumotlar bilan regressiya tekshirildi.

## 4. P0 — secret scanning va repository qarori

- [ ] Repository public qoladimi yoki private qilinadimi — qaror yozildi.
- [ ] Agar public qolsa, GHAS/secret scanning imkoniyati bo'yicha qaror yozildi.
- [ ] `.env`, token, parol va CSV fayllari repository tarixida tekshirildi.
- [ ] `.env.example` ichida haqiqiy sirlar yo'qligi tasdiqlandi.
- [ ] `login-parollar*.csv` va root CSV fayllari `.gitignore` bilan himoyalangani tasdiqlandi.
- [ ] Secret scan natijasi saqlandi.
- [ ] Topilgan sir bo'lsa, faqat fayldan o'chirish emas, tegishli credential rotate qilish rejasi yozildi.

## 5. P1 — mavjud xavfsizlik qatlamlarini yakuniy tekshirish

### 5.1. Auth, RBAC va scope

- [ ] `ADMIN`, `TEACHER`, `ACCOUNTANT`, `PARENT` rollari bo'yicha sahifa ruxsatlari tekshirildi.
- [ ] Har bir yozish actionida auth va role tekshiruvi borligi tekshirildi.
- [ ] Begona o'quvchi/o'qituvchi/sinf ID'si bilan so'rov yuborilganda ma'lumot chiqmasligi tekshirildi.
- [ ] `findUnique({ where: { id } })` orqali scope'siz kirishlar qayta audit qilindi.
- [ ] `PERMISSION_DENIED` yozuvi maxfiy ma'lumot sizdirmasligi tekshirildi.
- [ ] “Topilmadi” va “ruxsat yo'q” javoblari enumerationga yo'l qo'ymasligi tekshirildi.

### 5.2. Rate limit

- [ ] Login cheklovi 6-noto'g'ri urinishda ishlashi tekshirildi.
- [ ] Server qayta ishga tushgandan keyin login cheklovi saqlanishi tekshirildi.
- [ ] `RateHit` kalitida email/telefon ochiq ko'rinmasligi tekshirildi.
- [ ] Server action va import preview cheklovlari tekshirildi.
- [ ] Middleware va route-guard limitlarining xotirada qolishi ochiq cheklov sifatida hujjatlashtirildi.
- [ ] Ko'p instansiyali production uchun WAF yoki keyingi infratuzilma qarori yozildi.

### 5.3. Import, eksport va maxfiy ma'lumot

- [ ] `.xlsx` fayl hajmi, qator va ustun chegaralari tekshirildi.
- [ ] Preview hech narsa yozmasligi tekshirildi.
- [ ] Commit preview'ni chetlab o'tuvchi qo'lda payloadni qayta validatsiya qilishi tekshirildi.
- [ ] Server `.xlsx` eksportidagi formula injection himoyasi tekshirildi.
- [ ] Klient CSV eksportidagi formula injection himoyasi Excel bilan qo'lda tekshirildi.
- [ ] Boshlang'ich parollar CSV orqali berilgach o'chirilishi qoidasi hujjatlashtirildi.
- [ ] Loglarda parol, token, hash, telefon va DATABASE_URL chiqmasligi tekshirildi.

### 5.4. Ochiq security qarorlari

- [ ] 8 belgilik parol siyosati ongli mahsulot qarori sifatida tasdiqlandi.
- [ ] Eski qisqa parollarni majburiy almashtirish kerak yoki kerak emasligi hal qilindi.
- [ ] `AcademicYear.isCurrent` uchun yagona qiymat kafolati bo'yicha qaror yozildi.
- [ ] `assignStudentsAction` va alohida ko'chirish amali bo'yicha yakuniy xatti-harakat tekshirildi.
- [ ] SSG sahifalarida rolga bog'liq ma'lumot keshlanmasligi tekshirildi.
- [ ] Middleware matcheridagi nuqtali yo'llar masalasi uchun qaror yozildi.
- [ ] Rad etishlar uchun markazlashgan alert/monitoring zarurati baholandi.

## 6. P1 — test va build darvozasi

Quyidagi buyruqlar aynan yakuniy integratsiya branchida yoki undan chiqarilgan yakuniy PR branchida bajariladi:

- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npx prisma migrate status`
- [ ] `npm run build`
- [ ] Kerak bo'lsa `npm start` va production smoke test

Test natijasida quyidagilar aniq yozib olinadi:

- [ ] Test fayllari soni.
- [ ] O'tgan testlar soni.
- [ ] Yiqilgan testlar soni.
- [ ] Oldin `(0)` bilan o'tib ketgan suite qolmaganligi.
- [ ] Typecheck va build xatosiz tugagani.

## 7. P1 — hujjatlarni sinxronlashtirish

- [ ] `docs/01-loyiha-holati.md` PR #100–#108 va PR F holatini aks ettiradi.
- [ ] `docs/03-keyingi-ishlar.md` endi bajarilgan va qolgan ishlarni ajratadi.
- [ ] `docs/05-tolqinlar-rejasi.md` 0-to'lqin yopilganini va 1-to'lqin yakuniy statusini to'g'ri ko'rsatadi.
- [ ] `docs/07-xavfsizlik.md` H4–H5 ishlari va qolgan risklarni aks ettiradi.
- [ ] Parol minimumi hujjatlarda amaldagi qarorga mos: **8 belgi**.
- [ ] Testlar soni taxmin bilan emas, oxirgi `npm test` natijasi bilan yoziladi.
- [ ] PR #102–#108 dagi muhim xavfsizlik qarorlari hujjatga qo'shiladi.
- [ ] Ochiq qarorlar “bajarildi” deb noto'g'ri belgilanmaydi.

## 8. Rasmiy yopilish PR'i

- [ ] Checklistning barcha P0 bandlari yopildi.
- [ ] Qolgan P1 bandlar uchun egasi, muddat va keyingi PR ko'rsatildi.
- [ ] PR tavsifida “nima edi / nega xavfli / nima qilindi” bo'limlari bor.
- [ ] PR tavsifida to'liq test rejasi bor.
- [ ] PR tavsifida xavfsizlik bo'limi bor.
- [ ] O'zgargan fayllar push qilingandan keyin qayta o'qildi.
- [ ] PR haqiqatan integratsiya branchiga ochilgani tekshirildi.
- [ ] Loyiha egasi merge qildi.
- [ ] Merge'dan keyin `docs/01` va `docs/03` yana yangilandi.
- [ ] 1-to'lqin statusi `✅ yopildi` deb belgilandi.

## 9. 2-to'lqinga o'tish darvozasi

Faqat 1-to'lqin rasmiy yopilgandan keyin:

1. `/schedule` prefetch toshqinini to'xtatish;
2. Prisma connection poolingni o'rganish;
3. `loading.tsx` skeletonlar;
4. 307 redirect zanjirini qisqartirish;
5. `/ranking`dagi ketma-ket so'rovlarni `Promise.all` bilan tahlil qilish;
6. sahifalash;
7. faqat o'lchovdan keyin indeks va `groupBy`.

**2-to'lqin boshlanishidan oldin yangi biznes moduli yoki 7-bosqichga o'tilmaydi.**

## 10. Hozirgi ustuvor keyingi qadam

> **Birinchi ish:** PR F sxema/migratsiya auditini alohida branchda boshlashdan oldin uning o'zgarishlar ro'yxati, backup talabi, backfill SQL rejasi va rollback rejasi yoziladi.
>
> Sxema yoki mavjud ma'lumotga ta'sir qiladigan amal loyiha egasining tasdig'isiz bajarilmaydi.
