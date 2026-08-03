import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as authService from "./auth.service";
import { env } from "@/config/env";

const REFRESH_COOKIE = "chaima_refresh";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

function meta(req: Request) {
  const deviceId = (req.headers["x-device-id"] as string) ?? req.body.deviceId;
  return {
    deviceId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

const studentLoginSchema = z.object({
  code: z.string().min(6).max(20),
  deviceId: z.string().min(8),
});

export async function studentLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const body = studentLoginSchema.parse(req.body);
    if (!body.deviceId) throw new authService.AppError(400, "MISSING_DEVICE_ID", "معرّف الجهاز مطلوب");

    const result = await authService.studentLogin(body.code, meta(req));
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    res.json({ student: result.student, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

const teacherLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  deviceId: z.string().min(8).optional().default("teacher-web"),
});

export async function teacherLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const body = teacherLoginSchema.parse(req.body);
    const result = await authService.teacherLogin(body.email, body.password, {
      ...meta(req),
      deviceId: body.deviceId,
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    res.json({ teacher: result.teacher, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new authService.AppError(401, "NO_SESSION", "لا توجد جلسة نشطة");
    const result = await authService.refreshAccessToken(token, meta(req));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function resetDevice(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user!.sub;
    const result = await authService.resetActivationDevice(req.params.activationCodeId, teacherId);
    res.json({ success: true, activationCode: result.id });
  } catch (err) {
    next(err);
  }
}
