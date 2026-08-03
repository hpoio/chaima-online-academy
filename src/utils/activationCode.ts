import { customAlphabet } from "nanoid";

// أبجدية بدون أحرف/أرقام متشابهة بصريًا (0/O, 1/I/L) لتقليل أخطاء الطلاب عند الكتابة
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const gen4 = customAlphabet(ALPHABET, 4);
const gen2 = customAlphabet(ALPHABET, 2);

export function generateActivationCode(): string {
  return `CH-${gen4()}-${gen2()}`;
}

/** يعيد آخر 4 خانات للعرض في لوحة الأستاذ دون كشف الرمز الكامل: CH-****-9A */
export function maskForDisplay(code: string): string {
  const parts = code.split("-");
  return `CH-****-${parts[2] ?? "??"}`;
}
