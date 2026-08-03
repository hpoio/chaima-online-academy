import { Router } from "express";
import { z } from "zod";
import { Skill, Level, LessonType } from "@prisma/client";
import { requireAuth, requireTeacher, requireStudent } from "@/middleware/auth";
import { uploadLessonFiles } from "@/config/upload";
import * as service from "./lessons.service";

const router = Router();

// متاح لأي مستخدم موثّق (طالب أو أستاذ) — يغذّي مكتبة الدروس في الواجهتين
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const skill = req.query.skill as Skill | undefined;
    const level = req.query.level as Level | undefined;
    const type = req.query.type as LessonType | undefined;
    const search = req.query.search as string | undefined;
    res.json(await service.listLessons({ skill, level, type, search }));
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(LessonType),
  skill: z.nativeEnum(Skill),
  level: z.nativeEnum(Level),
});

router.post(
  "/",
  requireAuth,
  requireTeacher,
  uploadLessonFiles,
  async (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const files = req.files as { file?: Express.Multer.File[]; audio?: Express.Multer.File[] } | undefined;
      const fileUrl = files?.file?.[0] ? `/uploads/${files.file[0].filename}` : undefined;
      // تسجيل صوتي اختياري يرافق أي نوع درس (فيديو/صورة/PDF) أو يكون نفسه الملف الرئيسي عند النوع AUDIO
      const audioUrl = files?.audio?.[0] ? `/uploads/${files.audio[0].filename}` : undefined;
      const lesson = await service.createLesson(req.user!.sub, { ...body, fileUrl, audioUrl });
      res.status(201).json(lesson);
    } catch (err) {
      next(err);
    }
  }
);

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(LessonType).optional(),
  skill: z.nativeEnum(Skill).optional(),
  level: z.nativeEnum(Level).optional(),
});

router.patch("/:id", requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    await service.updateLesson(req.user!.sub, req.params.id, body);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, requireTeacher, async (req, res, next) => {
  try {
    await service.deleteLesson(req.user!.sub, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

const viewSchema = z.object({ watchedSeconds: z.number().int().nonnegative() });

router.post("/:id/view", requireAuth, requireStudent, async (req, res, next) => {
  try {
    const { watchedSeconds } = viewSchema.parse(req.body);
    await service.logView(req.user!.sub, req.params.id, watchedSeconds);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
