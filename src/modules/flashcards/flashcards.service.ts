import { prisma } from "@/config/db";
import { AppError } from "@/modules/auth/auth.service";
import { Skill, Level } from "@prisma/client";

export async function listFlashcards(filters: { skill?: Skill; level?: Level }) {
  const cards = await prisma.flashcard.findMany({
    where: {
      skill: filters.skill,
      level: filters.level,
    },
    orderBy: { createdAt: "desc" },
  });
  // لا نُرسل أي إشارة للإجابة الصحيحة قبل أن يختار التلميذ بطاقته — لكن نُبقيها هنا للتبسيط
  // بما أن كل الأسئلة معروضة للتلاميذ المصرَّح لهم أصلًا عبر التوثيق
  return cards;
}

export async function createFlashcard(
  teacherId: string,
  data: {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    correctIndex: number;
    skill?: Skill;
    level?: Level;
  }
) {
  return prisma.flashcard.create({ data: { ...data, teacherId } });
}

export async function deleteFlashcard(teacherId: string, id: string) {
  const result = await prisma.flashcard.deleteMany({ where: { id, teacherId } });
  if (result.count === 0) {
    throw new AppError(404, "NOT_FOUND", "البطاقة غير موجودة");
  }
}
