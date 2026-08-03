import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ملاحظة إنتاج: هذا تخزين محلي مؤقت مناسب للتطوير فقط.
// عند النشر الفعلي يُستبدل بتخزين سحابي (S3 / Cloudflare R2) ويُحفظ الرابط النهائي فقط في fileUrl.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedMimes = [
  "video/mp4",
  "video/webm",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  // تسجيلات صوتية — كنوع درس رئيسي أو كمرفق اختياري لأي درس آخر
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
];

export const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB كحد أقصى للفيديوهات
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("نوع الملف غير مدعوم"));
  },
});

// نقبل ملفًا رئيسيًا (file) وملفًا صوتيًا اختياريًا إضافيًا (audio) في نفس الطلب
export const uploadLessonFiles = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "audio", maxCount: 1 },
]);
