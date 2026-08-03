import { prisma } from "@/config/db";

export async function getOverview(teacherId: string) {
  const [activeStudents, totalLessons, weeklyViews, mostViewed] = await Promise.all([
    prisma.activationCode.count({
      where: { status: "ACTIVE", student: { createdById: teacherId } },
    }),
    prisma.lesson.count({ where: { teacherId } }),
    prisma.activityLog.count({
      where: {
        lesson: { teacherId },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.lesson.findMany({
      where: { teacherId },
      take: 5,
      orderBy: { activityLogs: { _count: "desc" } },
      include: { _count: { select: { activityLogs: true } } },
    }),
  ]);

  return {
    activeStudents,
    totalLessons,
    weeklyViews,
    mostViewedLessons: mostViewed.map((l: (typeof mostViewed)[number]) => ({
      id: l.id,
      title: l.title,
      views: l._count.activityLogs,
    })),
  };
}
