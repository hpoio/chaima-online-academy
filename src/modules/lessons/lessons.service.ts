import { prisma } from "@/config/db";
import { Skill, Level, LessonType } from "@prisma/client";

export type LessonFilters = {
  skill?: Skill;
  level?: Level;
  type?: LessonType;
  search?: string;
};

export async function listLessons(filters: LessonFilters) {
  return prisma.lesson.findMany({
    where: {
      skill: filters.skill,
      level: filters.level,
      type: filters.type,
      title: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
    },
    include: { liveSession: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLesson(teacherId: string, data: {
  title: string;
  description?: string;
  type: LessonType;
  skill: Skill;
  level: Level;
  fileUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  durationSec?: number;
}) {
  return prisma.lesson.create({ data: { ...data, teacherId } });
}

export async function updateLesson(teacherId: string, lessonId: string, data: {
  title?: string;
  description?: string;
  type?: LessonType;
  skill?: Skill;
  level?: Level;
}) {
  return prisma.lesson.updateMany({ where: { id: lessonId, teacherId }, data });
}

export async function deleteLesson(teacherId: string, lessonId: string) {
  return prisma.lesson.deleteMany({ where: { id: lessonId, teacherId } });
}

// يُستدعى من واجهة التلميذ عند بدء/تقدّم مشاهدة درس — يغذّي الإحصائيات
export async function logView(studentId: string, lessonId: string, watchedSeconds: number) {
  return prisma.activityLog.create({ data: { studentId, lessonId, watchedSeconds } });
}
