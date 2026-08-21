import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { env } from "../src/lib/env";

const db = new PrismaClient();

async function main() {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "Seed productionda ishlamaydi. Demo hisoblar prod'ga tushmasligi kerak."
    );
  }

  const seedPassword = env.SEED_PASSWORD;
  if (!seedPassword) {
    throw new Error(
      "SEED_PASSWORD .env da yo'q. .env.example ni ko'rib qo'ying."
    );
  }

  console.log("🌱 Seed boshlandi...");

  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const users: { email: string; fullName: string; role: Role }[] = [
    { email: "admin@maktab.uz", fullName: "Bosh Administrator", role: Role.ADMIN },
    { email: "teacher@maktab.uz", fullName: "Aziz O'qituvchi", role: Role.TEACHER },
    { email: "accountant@maktab.uz", fullName: "Malika Buxgalter", role: Role.ACCOUNTANT },
    { email: "parent@maktab.uz", fullName: "Karim Ota-ona", role: Role.PARENT },
  ];

  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        role: u.role,
        isActive: true,
      },
      create: {
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash,
        mustChangePassword: false,
      },
    });
  }
  console.log(
    `✅ ${users.length} ta foydalanuvchi. Yangi hisob paroli: SEED_PASSWORD. Mavjud hisob paroli o'zgarmaydi.`
  );

  const subjects = [
    { nameUz: "Matematika", nameRu: "Математика", nameEn: "Mathematics" },
    { nameUz: "Fizika", nameRu: "Физика", nameEn: "Physics" },
    { nameUz: "Ona tili", nameRu: "Родной язык", nameEn: "Native language" },
    { nameUz: "Ingliz tili", nameRu: "Английский язык", nameEn: "English" },
    { nameUz: "Tarix", nameRu: "История", nameEn: "History" },
  ];
  for (const s of subjects) {
    const exists = await db.subject.findFirst({ where: { nameUz: s.nameUz } });
    if (!exists) await db.subject.create({ data: s });
  }
  console.log(`✅ ${subjects.length} ta fan yaratildi`);

  const admin = await db.user.findUnique({ where: { email: "admin@maktab.uz" } });
  const criteria = [
    { name: "Darsga kechikish", points: 1, category: "Intizom" },
    { name: "Darsni sababsiz qoldirish", points: 3, category: "Davomat" },
    { name: "Forma qoidasini buzish", points: 1, category: "Forma" },
    { name: "Darsda tartibsizlik", points: 2, category: "Intizom" },
  ];
  for (const c of criteria) {
    const exists = await db.penaltyCriterion.findFirst({ where: { name: c.name } });
    if (!exists) {
      await db.penaltyCriterion.create({
        data: { ...c, createdById: admin?.id },
      });
    }
  }
  console.log(`✅ ${criteria.length} ta jarima mezoni yaratildi`);

  const yearName = "2025-2026";
  let year = await db.academicYear.findFirst({ where: { name: yearName } });
  if (!year) {
    year = await db.academicYear.create({
      data: {
        name: yearName,
        startDate: new Date("2025-09-01"),
        endDate: new Date("2026-05-31"),
        isCurrent: true,
      },
    });
    const quarters = [
      { name: 1, startDate: "2025-09-01", endDate: "2025-11-02" },
      { name: 2, startDate: "2025-11-10", endDate: "2025-12-28" },
      { name: 3, startDate: "2026-01-12", endDate: "2026-03-22" },
      { name: 4, startDate: "2026-04-01", endDate: "2026-05-31" },
    ];
    for (const q of quarters) {
      await db.quarter.create({
        data: {
          name: q.name,
          startDate: new Date(q.startDate),
          endDate: new Date(q.endDate),
          academicYearId: year.id,
        },
      });
    }
    console.log("✅ O'quv yili va 4 ta chorak yaratildi");
  }

  const teacherUser = await db.user.findUnique({
    where: { email: "teacher@maktab.uz" },
  });
  const parentUser = await db.user.findUnique({
    where: { email: "parent@maktab.uz" },
  });
  if (!teacherUser || !parentUser || !year) {
    throw new Error("Seed: foydalanuvchi yoki o'quv yili topilmadi");
  }

  const teacher = await db.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id },
  });

  let klass = await db.class.findFirst({ where: { name: "9-A" } });
  if (!klass) {
    klass = await db.class.create({
      data: {
        name: "9-A",
        grade: 9,
        academicYearId: year.id,
        homeroomTeacherId: teacher.id,
      },
    });
  }

  let guardian = await db.guardian.findFirst({
    where: { userId: parentUser.id },
  });
  if (!guardian) {
    guardian = await db.guardian.create({
      data: {
        userId: parentUser.id,
        fullName: parentUser.fullName,
        phone: "+998901234567",
        relation: "ota",
      },
    });
  }

  const demoStudents = [
    {
      firstName: "Ali",
      lastName: "Karimov",
      guardianId: guardian.id,
    },
    {
      firstName: "Madina",
      lastName: "Tursunova",
      guardianId: null as string | null,
    },
  ];
  for (const s of demoStudents) {
    const exists = await db.student.findFirst({
      where: { firstName: s.firstName, lastName: s.lastName },
    });
    if (!exists) {
      await db.student.create({
        data: {
          firstName: s.firstName,
          lastName: s.lastName,
          classId: klass.id,
          guardianId: s.guardianId,
          status: "ACTIVE",
        },
      });
    }
  }
  console.log("✅ Demo sinf 9-A va 2 ta o'quvchi yaratildi");

  console.log("🌱 Seed yakunlandi.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed xatosi:", e);
    await db.$disconnect();
    process.exit(1);
  });
