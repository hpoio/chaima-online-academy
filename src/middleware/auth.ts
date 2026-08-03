import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "@/utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: { code: "NO_TOKEN", message: "التوثيق مطلوب" } });
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: { code: "INVALID_TOKEN", message: "الجلسة غير صالحة" } });
  }
}

export function requireTeacher(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "TEACHER") {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "هذا الإجراء خاص بالأستاذ فقط" } });
  }
  next();
}

export function requireStudent(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "STUDENT") {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "هذا الإجراء خاص بالتلميذ فقط" } });
  }
  next();
}
