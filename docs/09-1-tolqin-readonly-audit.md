# 1-to'lqin — read-only baza auditi

> **Maqsad:** F2/F3 migratsiyalaridan keyingi mavjud ma'lumotlarni o'zgartirmasdan tekshirish.
>
> **Muhim:** bu fayldagi barcha SQL faqat `SELECT` yoki PostgreSQL katalogini o'qishdan iborat. `UPDATE`, `DELETE`, `INSERT`, `ALTER`, `VALIDATE CONSTRAINT` va backfill bu bosqichda bajarilmaydi.
>
> **Tayanch branch:** `claude/crm-foundation-auth-3bcbb961056f80d9b49700a9e920f098`
>
> **Tayanch commit:** `524d1762db0a348b05a50ce9421dc372db15a58d`

## 1. Ishga tushirish tartibi

1. Avval backup mavjudligini tasdiqlang.
2. Read-only PostgreSQL foydalanuvchisi bilan staging yoki lokal bazaga ulang.
3. Har bir so'rovning natijasini sana, baza muhiti va commit bilan saqlang.
4. Biror muammo chiqsa, shu yerda to'xtang — hech narsani avtomatik tuzatmang.
5. Natijalarni alohida closeout PRga qo'shing.

## 2. Migratsiya holati

```bash
npx prisma migrate status
```

Kutiladigan holat: barcha migrationlar qo'llangan, pending yoki failed migration yo'q.

## 3. F2/F3 majburiy ustunlar

### 3.1. `Student.userId` bo'yicha umumiy holat

```sql
SELECT
  count(*) AS total_students,
  count(*) FILTER (WHERE "userId" IS NULL) AS students_without_user,
  count(DISTINCT "userId") FILTER (WHERE "userId" IS NOT NULL) AS linked_user_count
FROM "Student";
```

`userId` NULL bo'lishi ruxsat etilgan holat bo'lishi mumkin; bu natija ma'lumotni to'g'rilash uchun emas, faqat audit uchun.

### 3.2. `Class.academicYearId`

```sql
SELECT "id", "name", "academicYearId"
FROM "Class"
WHERE "academicYearId" IS NULL;
```

Kutiladigan natija: 0 qator.

### 3.3. `Lesson.periodId`

```sql
SELECT "id", "classId", "subjectId", "dayOfWeek", "periodId"
FROM "Lesson"
WHERE "periodId" IS NULL;
```

Kutiladigan natija: 0 qator.

### 3.4. `Grade.lessonId`

```sql
SELECT "id", "studentId", "subjectId", "date", "type", "value"
FROM "Grade"
WHERE "lessonId" IS NULL
ORDER BY "date", "studentId";
```

Kutiladigan natija: 0 qator.

### 3.5. Baholar dublikatlari

```sql
SELECT
  "studentId",
  "lessonId",
  "date",
  "type",
  count(*) AS duplicate_count
FROM "Grade"
GROUP BY "studentId", "lessonId", "date", "type"
HAVING count(*) > 1
ORDER BY duplicate_count DESC, "date";
```

Kutiladigan natija: 0 qator.

## 4. `NOT VALID` constraintlar holati

### 4.1. PostgreSQL katalogidagi barcha validatsiya qilinmagan constraintlar

```sql
SELECT
  n.nspname AS schema_name,
  cls.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cls.relnamespace
WHERE NOT con.convalidated
ORDER BY n.nspname, cls.relname, con.conname;
```

F2 bo'yicha quyidagi 8 nom alohida qayd qilinadi:

- `Class_grade_check`
- `Lesson_dayOfWeek_check`
- `Contract_monthlyAmount_check`
- `Invoice_amount_check`
- `PenaltyCriterion_points_check`
- `Penalty_points_check`
- `TestResult_score_check`
- `TestResult_percent_check`

### 4.2. F2 constraintlarining aynan holati

```sql
SELECT
  cls.relname AS table_name,
  con.conname AS constraint_name,
  con.convalidated,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
WHERE con.conname IN (
  'Class_grade_check',
  'Lesson_dayOfWeek_check',
  'Contract_monthlyAmount_check',
  'Invoice_amount_check',
  'PenaltyCriterion_points_check',
  'Penalty_points_check',
  'TestResult_score_check',
  'TestResult_percent_check'
)
ORDER BY cls.relname, con.conname;
```

`convalidated = false` — constraint mavjud, lekin eski qatorlar bo'yicha hali VALIDATE qilinmagan degani. Bu bosqichda uni o'zgartirmang.

## 5. F2 constraintlarining eski qatorlardagi buzilishlari

Quyidagi so'rovlar faqat constraintni buzuvchi mavjud qatorlarni ko'rsatadi. `CHECK` constraint PostgreSQL'da NULL qiymatni avtomatik buzilish deb hisoblamaydi; NULL alohida qaror sifatida qayd etiladi.

```sql
SELECT 'Class_grade_check' AS check_name, count(*) AS violations
FROM "Class"
WHERE "grade" IS NOT NULL AND NOT ("grade" BETWEEN 1 AND 11)
UNION ALL
SELECT 'Lesson_dayOfWeek_check', count(*)
FROM "Lesson"
WHERE "dayOfWeek" IS NOT NULL AND NOT ("dayOfWeek" BETWEEN 1 AND 6)
UNION ALL
SELECT 'Contract_monthlyAmount_check', count(*)
FROM "Contract"
WHERE "monthlyAmount" IS NOT NULL AND "monthlyAmount" < 0
UNION ALL
SELECT 'Invoice_amount_check', count(*)
FROM "Invoice"
WHERE "amount" IS NOT NULL AND "amount" < 0
UNION ALL
SELECT 'PenaltyCriterion_points_check', count(*)
FROM "PenaltyCriterion"
WHERE "points" IS NOT NULL AND "points" < 0
UNION ALL
SELECT 'Penalty_points_check', count(*)
FROM "Penalty"
WHERE "points" IS NOT NULL AND "points" < 0
UNION ALL
SELECT 'TestResult_score_check', count(*)
FROM "TestResult"
WHERE "score" IS NOT NULL AND "score" < 0
UNION ALL
SELECT 'TestResult_percent_check', count(*)
FROM "TestResult"
WHERE "percent" IS NOT NULL AND ("percent" < 0 OR "percent" > 100)
ORDER BY check_name;
```

Kutiladigan natija: har bir `violations` qiymati 0.

Muammo topilsa, buzilgan qatorlarni alohida identifikatorlari bilan eksport qiling, lekin shu bosqichda o'zgartirmang.

## 6. F2 bo'yicha boshqa auditlar

### 6.1. `AcademicYear.isCurrent`

```sql
SELECT
  count(*) FILTER (WHERE "isCurrent" = true) AS current_year_count,
  count(*) FILTER (WHERE "isCurrent" = false) AS non_current_year_count
FROM "AcademicYear";

SELECT "id", "name", "createdAt", "isCurrent"
FROM "AcademicYear"
WHERE "isCurrent" = true
ORDER BY "createdAt" DESC;
```

Bir nechta joriy yil chiqsa, avtomatik tuzatish qilmang; ilova tranzaksiyasi va keyingi alohida PR bo'yicha qaror kerak.

### 6.2. `RankingSetting`

```sql
SELECT "id", "gradeWeight", "testWeight", "penaltyFactor"
FROM "RankingSetting"
WHERE "id" <> 'global'
   OR "gradeWeight" < 0
   OR "gradeWeight" > 100
   OR "testWeight" < 0
   OR "testWeight" > 100
   OR ("gradeWeight" + "testWeight") <= 0
   OR "penaltyFactor" < 0;
```

Kutiladigan natija: 0 qator.

### 6.3. `User` login identifikatori

```sql
SELECT "id", "email", "phone", "role"
FROM "User"
WHERE "email" IS NULL AND "phone" IS NULL;
```

Kutiladigan natija: 0 qator.

## 7. Natijalarni qayd etish shabloni

```text
Audit sanasi/timezone: 2026-09-21, Asia/Tashkent
Muhit: [local / staging]
Git commit: [commit]
Baza backup sanasi: [sana yoki reference]

prisma migrate status: [natija]
Student.userId: [natija]
Class.academicYearId NULL: [son]
Lesson.periodId NULL: [son]
Grade.lessonId NULL: [son]
Grade duplicate groups: [son]
NOT VALID constraints: [ro'yxat]
F2 violation counts: [natija]
AcademicYear.isCurrent: [natija]
RankingSetting: [natija]
User login check: [natija]

Keyingi qaror: [VALIDATE / data issue / alohida PR / qo'shimcha audit]
```

## 8. Auditdan keyingi darvoza

- Barcha read-only natijalar saqlandi.
- Buzilish bo'lmasa, constraint validation uchun alohida reja va loyiha egasi tasdig'i olindi.
- Buzilish bo'lsa, avval alohida data-fix/backfill rejasi yozildi.
- Hech qanday ma'lumot audit vaqtida o'zgartirilmadi.
- Natijalar yakuniy 1-to'lqin closeout PRiga biriktirildi.
