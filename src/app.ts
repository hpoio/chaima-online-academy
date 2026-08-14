import path from "path";
import helmet from "helmet";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "@/config/env";
import { errorHandler } from "@/middleware/errorHandler";

import authRoutes from "@/modules/auth/auth.routes";
import studentsRoutes from "@/modules/students/students.routes";
import lessonsRoutes from "@/modules/lessons/lessons.routes";
import statsRoutes from "@/modules/stats/stats.routes";
import flashcardsRoutes from "@/modules/flashcards/flashcards.routes";
import mediaRoutes from "@/media/media.routes";

export const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'"],
      },
    },
  })
);
app.use(express.static(path.join(__dirname, "..", "public")));
app.get("/teacher", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "teacher.html")));
app.get("/student", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "student.html")));
app.use(cors({
  origin(origin, callback) {
    // طلبات بدون Origin (مثل curl أو تطبيقات موبايل أصلية) مسموحة دائمًا
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] طلب مرفوض من مصدر غير مسموح به: "${origin}" — المسموح به حاليًا: ${env.corsOrigins.join(", ")}`);
    callback(new Error("غير مسموح لهذا المصدر بالوصول (CORS)"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
// ملاحظة أمنية: لا نقدّم /uploads كملفات عامة مباشرة — كل وسائط الدروس تمر عبر
// /api/media وتتطلب رمز دخول صالح (راجع src/modules/media/media.routes.ts)
app.use("/api/media", mediaRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/flashcards", flashcardsRoutes);

app.use(errorHandler);
