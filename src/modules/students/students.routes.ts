import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireTeacher } from "@/middleware/auth";
import * as service from "./students.service";

const router = Router();
router.use(requireAuth, requireTeacher);

router.get("/", async (req, res, next) => {
  try {
    res.json(await service.listStudents(req.user!.sub));
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  name: z.string().min(2).max(80),
  gender: z.enum(["MALE", "FEMALE"]),
});

router.post("/", async (req, res, next) => {
  try {
    const { name, gender } = createSchema.parse(req.body);
    const result = await service.createStudent(req.user!.sub, name, gender);
    // plainCode يُعرض مرة واحدة فقط في هذه الاستجابة تحديدًا
    res.status(201).json({
      id: result.id,
      name: result.name,
      activationCode: result.plainCode,
    });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
});

router.patch("/:id", async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const student = await service.updateStudent(req.user!.sub, req.params.id, data);
    res.json(student);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await service.deleteStudent(req.user!.sub, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/regenerate-code", async (req, res, next) => {
  try {
    const result = await service.regenerateActivationCode(req.user!.sub, req.params.id);
    res.json({ activationCode: result.plainCode });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({ status: z.enum(["ACTIVE", "DISABLED"]) });

router.patch("/activation-codes/:activationCodeId/status", async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    await service.setActivationStatus(req.user!.sub, req.params.activationCodeId, status);
    res.json({ success: true, status });
  } catch (err) {
    next(err);
  }
});

export default router;
