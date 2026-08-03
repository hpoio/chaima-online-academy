import { PrismaClient } from "@prisma/client";

// نسخة واحدة مشتركة من Prisma Client عبر كل التطبيق
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
