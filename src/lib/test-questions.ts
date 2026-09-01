import { z } from "zod";

/**
 * Test.questions JSON validatsiyasi (Punkt 15-f).
 * Fayl importi yoki AI natijasi DB ga yozilishidan OLDIN parse qilinadi.
 */

export const testOptionSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean(),
});

export const testQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(testOptionSchema).min(2),
});

export const questionsSchema = z
  .array(testQuestionSchema)
  .min(1)
  .refine(
    (questions) =>
      questions.every((q) => q.options.some((option) => option.correct)),
    { message: "Har bir savolda kamida bitta to'g'ri javob bo'lishi kerak." }
  );

export type TestQuestions = z.infer<typeof questionsSchema>;
