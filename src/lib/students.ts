import { z } from "zod";
import { StudentStatus } from "@prisma/client";

function emptyToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().max(200).optional());

export const studentWriteSchema = z.object({
  firstName: z.preprocess(emptyToUndefined, z.string().min(1).max(80)),
  lastName: z.preprocess(emptyToUndefined, z.string().min(1).max(80)),
  dateOfBirth: optionalText,
  gender: z.preprocess(emptyToUndefined, z.enum(["male", "female"]).optional()),
  address: optionalText,
  classId: optionalText,
  status: z.preprocess(
    (value) => emptyToUndefined(value) ?? StudentStatus.ACTIVE,
    z.nativeEnum(StudentStatus)
  ),
  guardianName: optionalText,
  guardianPhone: optionalText,
  guardianRelation: optionalText,
});

export const studentUpdateSchema = studentWriteSchema.extend({
  id: z.preprocess(emptyToUndefined, z.string().min(1)),
});

export type StudentWriteInput = z.infer<typeof studentWriteSchema>;
