import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "@/modules/auth/auth.service";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "بيانات غير صالحة", details: err.flatten() },
    });
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "حدث خطأ غير متوقع" } });
}
