-- Punkt 12/13/15 + mustChangePassword — bitta migratsiya.
-- Mavjud db:push bazasiga ALTER (to'liq init emas).

CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'AMOUNT');

ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Attendance" ALTER COLUMN "date" TYPE DATE USING ("date"::date);
ALTER TABLE "Attendance" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Grade" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Penalty" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Contract" ADD COLUMN "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "Contract" ADD COLUMN "discountValue" INTEGER NOT NULL DEFAULT 0;
UPDATE "Contract" SET "discountValue" = "discount";
ALTER TABLE "Contract" DROP COLUMN "discount";

ALTER TABLE "Invoice" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Payment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Student_classId_status_idx" ON "Student"("classId", "status");
CREATE INDEX "Lesson_classId_dayOfWeek_idx" ON "Lesson"("classId", "dayOfWeek");
CREATE INDEX "Lesson_teacherId_dayOfWeek_idx" ON "Lesson"("teacherId", "dayOfWeek");
CREATE INDEX "Attendance_studentId_date_idx" ON "Attendance"("studentId", "date");
CREATE INDEX "Attendance_lessonId_date_idx" ON "Attendance"("lessonId", "date");
CREATE INDEX "Grade_studentId_quarterId_idx" ON "Grade"("studentId", "quarterId");
CREATE INDEX "Grade_subjectId_quarterId_idx" ON "Grade"("subjectId", "quarterId");
CREATE INDEX "Penalty_studentId_date_idx" ON "Penalty"("studentId", "date");
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");
CREATE INDEX "Payment_invoiceId_date_idx" ON "Payment"("invoiceId", "date");
CREATE INDEX "Message_status_createdAt_idx" ON "Message"("status", "createdAt");
CREATE INDEX "TestResult_testId_score_idx" ON "TestResult"("testId", "score");
CREATE INDEX "TestResult_studentId_takenAt_idx" ON "TestResult"("studentId", "takenAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
