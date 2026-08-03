import { Router } from "express";
import { z } from "zod";
import { Skill, Level } from "@prisma/client";
import { requireAuth, requireTeacher } from "@/middleware/auth";
import * as service from "./flashcards.service";

const router = Router();

// متاح لأي مستخدم موثّق (طالب أو أستاذ)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const skill = req.query.skill as Skill | undefined;
    const level = req.query.level as Level | undefined;
    res.json(await service.listFlashcards({ skill, level }));
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  question: z.string().min(2),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  correctIndex: z.number().int().min(0).max(2),
  skill: z.nativeEnum(Skill).optional(),
  level: z.nativeEnum(Level).optional(),
});

router.post("/", requireAuth, requireTeacher, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const card = await service.createFlashcard(req.user!.sub, body);
    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, requireTeacher, async (req, res, next) => {
  try {
    await service.deleteFlashcard(req.user!.sub, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
