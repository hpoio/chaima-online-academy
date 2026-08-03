import argon2 from "argon2";
import crypto from "crypto";

/**
 * لكلمات مرور الأساتذة: argon2 (salt عشوائي لكل عملية، بطيء عمدًا لمقاومة القوة الغاشمة).
 * تستخدم فقط في مقارنة 1:1 (البريد معروف أولًا، ثم نتحقق من كلمة المرور لذلك الحساب تحديدًا).
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

/**
 * لرموز التفعيل ورموز الـ refresh: نحتاج البحث عن السجل انطلاقًا من القيمة الصريحة المُرسلة
 * (بدون معرفة صاحبها مسبقًا)، لذا لا يصلح argon2 (salt عشوائي يمنع البحث المباشر).
 * الحل: SHA-256 حتمي على فهرس فريد UNIQUE في قاعدة البيانات.
 * الأمان يعتمد هنا على الإنتروبيا العالية لرمز التفعيل نفسه (12+ محرف عشوائي)
 * وليس على الـ hashing algorithm، تمامًا كما تُخزَّن مفاتيح API لدى مزودي الخدمات.
 */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
