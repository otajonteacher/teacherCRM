-- 1-to'lqin closeout — F2 CHECK constraintlarini eski qatorlar bo'yicha tasdiqlash
--
-- F2 migratsiyasida eski ma'lumotni bloklamaslik uchun quyidagi CHECK
-- constraintlar NOT VALID sifatida qo'shilgan edi. Read-only auditda
-- violationlar 0 chiqdi; endi ularni to'liq VALIDATE qilamiz.
--
-- Bu fayl mavjud ma'lumotni o'zgartirmaydi: faqat PostgreSQL constraint
-- validatsiyasini yakunlaydi. Auditda violation bo'lsa, migration xato bilan
-- to'xtaydi va qatorlar o'zgarmaydi.

ALTER TABLE "Class"
  VALIDATE CONSTRAINT "Class_grade_check";

ALTER TABLE "Lesson"
  VALIDATE CONSTRAINT "Lesson_dayOfWeek_check";

ALTER TABLE "Contract"
  VALIDATE CONSTRAINT "Contract_monthlyAmount_check";

ALTER TABLE "Invoice"
  VALIDATE CONSTRAINT "Invoice_amount_check";

ALTER TABLE "PenaltyCriterion"
  VALIDATE CONSTRAINT "PenaltyCriterion_points_check";

ALTER TABLE "Penalty"
  VALIDATE CONSTRAINT "Penalty_points_check";

ALTER TABLE "TestResult"
  VALIDATE CONSTRAINT "TestResult_score_check";

ALTER TABLE "TestResult"
  VALIDATE CONSTRAINT "TestResult_percent_check";
