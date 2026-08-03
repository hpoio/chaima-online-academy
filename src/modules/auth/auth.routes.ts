import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "./auth.controller";
import { requireAuth, requireTeacher } from "@/middleware/auth";

const router = Router();

// حماية إضافية ضد محاولات تخمين رموز التفعيل بالقوة الغاشمة
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_ATTEMPTS", message: "محاولات كثيرة، حاول لاحقًا" } },
});

router.post("/student/login", loginLimiter, controller.studentLogin);
router.post("/teacher/login", loginLimiter, controller.teacherLogin);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

// إعادة تعيين الجهاز المربوط برمز تفعيل — إجراء أستاذ محمي
router.post(
  "/activation-codes/:activationCodeId/reset-device",
  requireAuth,
  requireTeacher,
  controller.resetDevice
);

export default router;
