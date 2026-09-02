-- Parol oxirgi marta qachon almashtirilgani.
--
-- Nima uchun kerak: sessiya JWT (serverda saqlanmaydi), shuning uchun parol
-- almashtirilganda o'g'irlangan token o'z-o'zidan yaroqsiz bo'lmaydi. Shu
-- ustun tokenning berilgan vaqti bilan solishtiriladi: parol almashgan
-- vaqtidan OLDIN berilgan har qanday token darhol bekor qilinadi.
--
-- NULL = parol hech qachon almashtirilmagan (mavjud hisoblar). Ular uchun
-- hech narsa o'zgarmaydi - birinchi almashtirishdan keyin ishlay boshlaydi.
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
