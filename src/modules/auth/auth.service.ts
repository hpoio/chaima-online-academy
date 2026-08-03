import { prisma } from "@/config/db";
import { sha256, verifyPassword } from "@/utils/hash";
import { signAccessToken, generateRefreshTokenValue } from "@/utils/jwt";
import { env } from "@/config/env";

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type DeviceMeta = { deviceId: string; ipAddress?: string; userAgent?: string };

// ------------------------------------------------------------
// تسجيل دخول الطالب عبر رمز التفعيل
// ------------------------------------------------------------
export async function studentLogin(code: string, meta: DeviceMeta) {
  const codeHash = sha256(code.trim().toUpperCase());

  const activation = await prisma.activationCode.findUnique({
    where: { codeHash },
    include: { student: true },
  });

  // الرمز غير موجود إطلاقًا
  if (!activation) {
    await logAttempt(null, meta, false, "NOT_FOUND");
    throw new AppError(401, "INVALID_CODE", "رمز التفعيل غير صحيح");
  }

  // الرمز معطّل من طرف الأستاذ
  if (activation.status === "DISABLED") {
    await logAttempt(activation.id, meta, false, "DISABLED");
    throw new AppError(403, "CODE_DISABLED", "تم تعطيل هذا الرمز، يرجى التواصل مع الأستاذ");
  }

  // أول استخدام على الإطلاق: نربط الرمز بهذا الجهاز فورًا
  if (!activation.boundDeviceId) {
    await prisma.activationCode.update({
      where: { id: activation.id },
      data: { boundDeviceId: meta.deviceId, boundAt: new Date() },
    });
  }
  // الرمز مربوط بجهاز آخر: رفض صريح — هذا هو قلب متطلب الأمان
  else if (activation.boundDeviceId !== meta.deviceId) {
    await logAttempt(activation.id, meta, false, "DEVICE_MISMATCH");
    throw new AppError(
      409,
      "DEVICE_MISMATCH",
      "هذا الرمز مستخدم حاليًا على جهاز آخر. تواصل مع الأستاذ لإعادة تعيين الجهاز"
    );
  }

  await logAttempt(activation.id, meta, true, "OK");

  const tokens = await issueTokens({
    role: "STUDENT",
    studentId: activation.studentId,
    ...meta,
  });

  return {
    student: { id: activation.student.id, name: activation.student.name, gender: activation.student.gender },
    ...tokens,
  };
}

// يسمح للأستاذ بفكّ ربط الجهاز الحالي (مثلاً الطالب غيّر هاتفه)
export async function resetActivationDevice(activationCodeId: string, teacherId: string) {
  const activation = await prisma.activationCode.findUnique({
    where: { id: activationCodeId },
    include: { student: true },
  });
  if (!activation || activation.student.createdById !== teacherId) {
    throw new AppError(404, "NOT_FOUND", "الرمز غير موجود");
  }
  return prisma.activationCode.update({
    where: { id: activationCodeId },
    data: { boundDeviceId: null, boundAt: null },
  });
}

// ------------------------------------------------------------
// تسجيل دخول الأستاذ
// ------------------------------------------------------------
export async function teacherLogin(email: string, password: string, meta: DeviceMeta) {
  const teacher = await prisma.teacher.findUnique({ where: { email } });
  if (!teacher || !(await verifyPassword(teacher.passwordHash, password))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }

  const tokens = await issueTokens({ role: "TEACHER", teacherId: teacher.id, ...meta });
  return { teacher: { id: teacher.id, name: teacher.name, email: teacher.email }, ...tokens };
}

// ------------------------------------------------------------
// تجديد access token عبر refresh token محفوظ في cookie
// ------------------------------------------------------------
export async function refreshAccessToken(refreshToken: string, meta: DeviceMeta) {
  const refreshTokenHash = sha256(refreshToken);
  const session = await prisma.session.findUnique({ where: { refreshTokenHash } });

  if (!session || session.revoked || session.expiresAt < new Date()) {
    throw new AppError(401, "INVALID_SESSION", "انتهت الجلسة، يرجى تسجيل الدخول من جديد");
  }
  // جهاز مختلف يحاول استخدام refresh token طالب آخر — إبطال فوري لكل جلسات هذا الحساب
  if (session.deviceId && session.deviceId !== meta.deviceId) {
    await prisma.session.updateMany({
      where: { studentId: session.studentId, teacherId: session.teacherId },
      data: { revoked: true },
    });
    throw new AppError(401, "SESSION_HIJACK_SUSPECTED", "تم إبطال الجلسة لأسباب أمنية");
  }

  const accessToken = signAccessToken({
    sub: (session.studentId ?? session.teacherId)!,
    role: session.role,
  });
  return { accessToken };
}

export async function logout(refreshToken: string) {
  const refreshTokenHash = sha256(refreshToken);
  await prisma.session.updateMany({ where: { refreshTokenHash }, data: { revoked: true } });
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
async function issueTokens(params: {
  role: "STUDENT" | "TEACHER";
  studentId?: string;
  teacherId?: string;
  deviceId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const accessToken = signAccessToken({
    sub: (params.studentId ?? params.teacherId)!,
    role: params.role,
  });
  const refreshToken = generateRefreshTokenValue();
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      role: params.role,
      studentId: params.studentId,
      teacherId: params.teacherId,
      refreshTokenHash: sha256(refreshToken),
      deviceId: params.deviceId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

async function logAttempt(
  activationCodeId: string | null,
  meta: DeviceMeta,
  success: boolean,
  reason: string
) {
  if (!activationCodeId) return; // لا يوجد سجل لرمز غير موجود أصلًا في قاعدة البيانات
  await prisma.loginAttempt.create({
    data: {
      activationCodeId,
      deviceId: meta.deviceId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      success,
      reason,
    },
  });
}
