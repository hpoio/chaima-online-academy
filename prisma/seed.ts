import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/hash";
import { generateActivationCode } from "../src/utils/activationCode";
import { sha256 } from "../src/utils/hash";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_TEACHER_EMAIL ?? "chaima@academy.com";
  const password = process.env.SEED_TEACHER_PASSWORD ?? "ChangeMe123!";

  const teacher = await prisma.teacher.upsert({
    where: { email },
    update: {},
    create: { name: "الأستاذة شيماء", email, passwordHash: await hashPassword(password) },
  });

  const code = generateActivationCode();
  const student = await prisma.student.create({
    data: {
      name: "ياسمين ب.",
      createdById: teacher.id,
      activationCode: {
        create: { codeHash: sha256(code), codeSuffix: code.split("-")[2] },
      },
    },
  });

  await prisma.lesson.create({
    data: {
      title: "Present Perfect — القواعد",
      type: "VIDEO",
      skill: "GRAMMAR",
      level: "INTERMEDIATE",
      teacherId: teacher.id,
    },
  });

  console.log("✅ تمت التعبئة الأولية");
  console.log(`   بريد الأستاذ: ${email} / كلمة المرور: ${password}`);
  console.log(`   رمز تفعيل الطالب التجريبي (${student.name}): ${code}`);
}

main().finally(() => prisma.$disconnect());
