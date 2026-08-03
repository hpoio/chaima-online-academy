import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { verifyAccessToken } from "@/utils/jwt";

const router = Router();
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

/**
 * تقديم الملفات المرفوعة (فيديو/صوت/PDF/صور) بشكل محمي:
 * - يتطلب رمز دخول صالح (نفس accessToken) كمعامل رابط ?token=...
 *   لأن عناصر <video>/<audio>/<img> لا يمكنها إرسال ترويسة Authorization.
 * - الرمز قصير العمر (نفس مدة صلاحية accessToken) فلا يبقى الرابط صالحًا للمشاركة طويلًا.
 * - يدعم Range requests حتى يعمل التقديم/الترجيع (seek) في الفيديو بشكل طبيعي.
 */
router.get("/*", (req: Request, res: Response) => {
  const token = (req.query.token as string) || "";
  try {
    verifyAccessToken(token); // نتحقق فقط من الصلاحية، أي مستخدم موثّق (أستاذ أو تلميذ) يكفي
  } catch {
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "رابط غير صالح أو منتهي الصلاحية" } });
  }

  const requested = req.params[0] as string; // بعد /api/media/
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const absPath = path.join(UPLOADS_ROOT, safePath);

  // منع الخروج خارج مجلد uploads (Path traversal)
  if (!absPath.startsWith(UPLOADS_ROOT)) {
    return res.status(400).json({ error: { code: "BAD_PATH", message: "مسار غير صالح" } });
  }
  if (!fs.existsSync(absPath)) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "الملف غير موجود" } });
  }

  // نمنع تحميله كملف منفصل بواجهة "حفظ باسم" الافتراضية للمتصفح، ونعرضه inline فقط
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");

  const stat = fs.statSync(absPath);
  const range = req.headers.range;
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
    });
    fs.createReadStream(absPath, { start, end }).pipe(res);
  } else {
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Accept-Ranges", "bytes");
    fs.createReadStream(absPath).pipe(res);
  }
});

export default router;
