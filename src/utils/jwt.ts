import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "@/config/env";

export type AccessTokenPayload = {
  sub: string; // studentId أو teacherId
  role: "STUDENT" | "TEACHER";
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

/** توليد قيمة refresh token عشوائية صريحة (تُرسل للعميل مرة واحدة، ونخزّن hash فقط) */
export function generateRefreshTokenValue(): string {
  return jwt.sign(
    { rnd: crypto.randomUUID() },
    env.jwt.refreshSecret,
    { expiresIn: `${env.jwt.refreshTtlDays}d` as jwt.SignOptions["expiresIn"] }
  );
}
