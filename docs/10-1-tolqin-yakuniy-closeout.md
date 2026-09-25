# 1-to'lqin — yakuniy closeout qarori

> **Sana:** 2026-09-25
>
> **Integratsiya branch:** `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098`
>
> **Maqsad:** 1-to'lqinni rasmiy yopish uchun kod, ma'lumotlar auditi,
test/build va migratsiya holatini bitta yakuniy yozuvga jamlash.

## 1. Qaror

**PR F bo'yicha data-fix yoki backfill kerak emas.** Read-only auditda F2/F3
uchun tekshirilgan ma'lumotlar yaxlitligi shartlari buzilmagan.

1-to'lqin closeout uchun F2 migratsiyasidagi 8 ta `NOT VALID` CHECK constraintni
alohida migration bilan `VALIDATE` qilish qo'shildi:

```text
prisma/migrations/20260925153000_validate_f2_constraints/migration.sql
```

Bu migration ma'lumotni o'zgartirmaydi. Agar eski qatorlarda violation bo'lsa,
PostgreSQL migrationni xato bilan to'xtatadi; qatorlar avtomatik o'chirilmaydi.

## 2. Read-only baza auditi

Audit `teacher_crm`, `public` schema bazasida bajarildi.

| Tekshiruv | Natija |
| --- | ---: |
| Jami studentlar | 27 |
| `Student.userId` bo'sh | 27 |
| `Class.academicYearId IS NULL` | 0 |
| `Lesson.periodId IS NULL` | 0 |
| `Grade.lessonId IS NULL` | 0 |
| Dublikat baho guruhlari | 0 |
| Joriy o'quv yili | 1 |
| `AcademicYear.isCurrent = false` | 0 |
| Noto'g'ri `RankingSetting` | 0 |
| Email va phonesiz `User` | 0 |
| F2 CHECK violationlari | 0 |

`Student.userId` optional relation bo'lgani sababli 27 ta studentning hali
user hisobiga ulanmaganligi F2 violation deb hisoblanmadi. Agar kelajakda har
bir student uchun login talab qilinsa, bu alohida product qarori bo'ladi.

Auditda 8 ta F2 constraint topildi va ularning dastlabki holati
`convalidated = false` edi. Ular uchun validation migration alohida qo'shildi.

## 3. Yakuniy texnik gate

2026-09-25 kuni integratsiya branchida bajarildi:

```text
npm run typecheck — PASS
npm run lint       — PASS, 0 warning, 0 error
npm test           — PASS, 8 test file, 183 test
npm run build      — PASS, 72/72 static pages
npx prisma migrate status — PASS, 5 migration up to date
```

Vitest chiqargan Vite CJS API deprecation xabari warning bo'lib, build yoki
testni yiqitmadi.

## 4. Validationni qo'llash tartibi

1. Lokal yoki staging bazada backup olinadi.
2. Yangi migration stagingda qo'llanadi:

   ```bash
   npx prisma migrate deploy
   npx prisma migrate status
   ```

3. `convalidated = true` bo'lgan 8 ta constraint katalog so'rovi bilan
   tasdiqlanadi.
4. Typecheck, lint, test va build qayta bajariladi.
5. Shundan keyin closeout PR merge qilinadi.

Production bazada `VALIDATE CONSTRAINT` qo'lda bajarilmaydi; migration orqali
qo'llanadi. Backup loyiha papkasidan tashqarida saqlanadi.

## 5. 1-to'lqinni yopish sharti

Quyidagilar bajarilgach, 1-to'lqin rasmiy yopiladi:

- [x] F2/F3 kod va read-only audit yakunlandi.
- [x] Typecheck, lint, test, build muvaffaqiyatli.
- [x] Migration status audit qilindi.
- [ ] Validation migration stagingda muvaffaqiyatli qo'llandi.
- [ ] Hujjatlar closeout holatiga sinxronlashtirildi.
- [ ] Yakuniy closeout PR merge qilindi.

Validation migration qo'llanilmaguncha 1-to'lqin `deyarli yopilgan`, lekin
rasmiy yopilgan deb belgilanmaydi.

## 6. Keyingi bosqich

Yakuniy closeout PR merge qilingandan keyin 2-to'lqin boshlanadi:

1. `/schedule` prefetch toshqinini kamaytirish;
2. Prisma connection poolingni o'rganish;
3. `loading.tsx` skeletonlar;
4. redirect zanjirini qisqartirish;
5. `/ranking` so'rovlarini parallel qilish;
6. pagination;
7. faqat yangi o'lchovdan keyin indeks va `groupBy`.

7-bosqichga 1-to'lqin yopilmaguncha o'tilmaydi.
