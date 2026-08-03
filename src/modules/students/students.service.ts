import { prisma } from "@/config/db";
import { generateActivationCode, maskForDisplay } from "@/utils/activationCode";
import { sha256 } from "@/utils/hash";
import { AppError } from "@/modules/auth/auth.service";

export async function createStudent(teacherId: string, name: string, gender: "MALE" | "FEMALE") {
  // نولّد رمزًا فريدًا مع إعادة محاولة نادرة في حال تصادم عشوائي (احتمال ضئيل جدًا لكنه ممكن رياضيًا)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateActivationCode();
    const codeHash = sha256(code);
    try {
      const student = await prisma.student.create({
        data: {
          name,
          gender,
          createdById: teacherId,
          activationCode: {
            create: { codeHash, codeSuffix: code.split("-")[2] },
          },
        },
        include: { activationCode: true },
      });
      // الرمز الصريح يُعاد مرة واحدة فقط هنا ليعرضه الأستاذ/يسلّمه للتلميذ يدويًا
      return { ...student, plainCode: code };
    } catch (e: any) {
      if (e.code === "P2002") continue; // تصادم فريد نادر، أعد المحاولة برمز جديد
      throw e;
    }
  }
  throw new AppError(500, "CODE_GENERATION_FAILED", "تعذّر توليد رمز تفعيل فريد، حاول مجددًا");
}

export async function listStudents(teacherId: string) {
  const students = await prisma.student.findMany({
    where: { createdById: teacherId },
    include: { activationCode: true },
    orderBy: { createdAt: "desc" },
  });

  return students.map((s: (typeof students)[number]) => ({
    id: s.id,
    name: s.name,
    gender: s.gender,
    createdAt: s.createdAt,
    activationCode: s.activationCode && {
      id: s.activationCode.id,
      status: s.activationCode.status,
      maskedCode: `CH-****-${s.activationCode.codeSuffix}`,
      boundDevice: Boolean(s.activationCode.boundDeviceId),
      boundAt: s.activationCode.boundAt,
    },
  }));
}

export async function updateStudent(
  teacherId: string,
  studentId: string,
  data: { name?: string; gender?: "MALE" | "FEMALE" }
) {
  const result = await prisma.student.updateMany({
    where: { id: studentId, createdById: teacherId },
    data,
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "التلميذ غير موجود");
  }
  return prisma.student.findUnique({ where: { id: studentId }, include: { activationCode: true } });
}

export async function deleteStudent(teacherId: string, studentId: string) {
  const result = await prisma.student.deleteMany({
    where: { id: studentId, createdById: teacherId },
  });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "التلميذ غير موجود");
  }
}

export async function regenerateActivationCode(teacherId: string, studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { activationCode: true },
  });
  if (!student || student.createdById !== teacherId) {
    throw new AppError(404, "NOT_FOUND", "التلميذ غير موجود");
  }

  // نولّد رمزًا جديدًا فريدًا؛ الرمز القديم يُبطَل تلقائيًا بمجرد استبدال بصمته
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateActivationCode();
    const codeHash = sha256(code);
    try {
      await prisma.activationCode.upsert({
        where: { studentId },
        update: {
          codeHash,
          codeSuffix: code.split("-")[2],
          status: "ACTIVE",
          boundDeviceId: null,
          boundAt: null,
        },
        create: { studentId, codeHash, codeSuffix: code.split("-")[2] },
      });
      // الرمز الصريح يُعاد مرة واحدة فقط هنا ليعرضه الأستاذ/يسلّمه للتلميذ يدويًا
      return { plainCode: code };
    } catch (e: any) {
      if (e.code === "P2002") continue; // تصادم فريد نادر، أعد المحاولة برمز جديد
      throw e;
    }
  }
  throw new AppError(500, "CODE_GENERATION_FAILED", "تعذّر توليد رمز تفعيل فريد، حاول مجددًا");
}

export async function setActivationStatus(
  teacherId: string,
  activationCodeId: string,
  status: "ACTIVE" | "DISABLED"
) {
  const activation = await prisma.activationCode.findUnique({
    where: { id: activationCodeId },
    include: { student: true },
  });
  if (!activation || activation.student.createdById !== teacherId) {
    throw new AppError(404, "NOT_FOUND", "الرمز غير موجود");
  }
  return prisma.activationCode.update({
    where: { id: activationCodeId },
    data: { status },
  });
}
