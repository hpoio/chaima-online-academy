import { Router } from "express";
import { requireAuth, requireTeacher } from "@/middleware/auth";
import * as service from "./stats.service";

const router = Router();

router.get("/overview", requireAuth, requireTeacher, async (req, res, next) => {
  try {
    res.json(await service.getOverview(req.user!.sub));
  } catch (err) {
    next(err);
  }
});

export default router;
