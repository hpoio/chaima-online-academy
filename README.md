# CHAIMA ONLINE ACADEMY — Backend

## التشغيل المحلي

```bash
npm install
cp .env.example .env        # عدّل القيم (خصوصًا DATABASE_URL و JWT secrets)
npx prisma migrate dev --name init
npm run seed                 # ينشئ حساب أستاذ + طالب تجريبي ويطبع رمز التفعيل في الطرفية
npm run dev                  # http://localhost:4000
```

## خريطة الربط مع الـ Front-end الموجود

الواجهة الحالية تستخدم بيانات وهمية ثابتة. هذا الجدول يوضّح أي طلب API يستبدل أي جزء من الـ mock data، ليتم استبدال كل `mock array` بـ `fetch` مطابق دون تغيير شكل المكوّنات:

| مكان الاستخدام في الواجهة | Endpoint | ملاحظات |
|---|---|---|
| شاشة دخول التلميذ (إدخال الرمز) | `POST /api/auth/student/login` | يُرسل `{ code, deviceId }`. `deviceId` يُولَّد مرة واحدة بـ `crypto.randomUUID()` ويُخزَّن في localStorage — هو أساس "الجهاز يبقى موثّقًا". الاستجابة تحوي `accessToken` (يُحفظ في الذاكرة/state) بينما `refreshToken` يُحفظ تلقائيًا في httpOnly cookie |
| عند فتح التطبيق لاحقًا (بدون إعادة إدخال الرمز) | `POST /api/auth/refresh` | يُستدعى عند بدء تشغيل التطبيق؛ إن نجح نحصل على `accessToken` جديد دون شاشة تسجيل دخول |
| تسجيل دخول الأستاذ | `POST /api/auth/teacher/login` | `{ email, password }` |
| بطاقات الإحصائيات في لوحة الأستاذ | `GET /api/stats/overview` | يعيد `activeStudents`, `totalLessons`, `weeklyViews`, `mostViewedLessons` — مطابقة تمامًا لبطاقات الـ mock الأربع |
| جدول "التلاميذ ورموز التفعيل" | `GET /api/students` | يعيد كل طالب مع `maskedCode` (مثل `CH-****-9A`) و `status` |
| زر "تعطيل/تفعيل" في الجدول | `PATCH /api/students/activation-codes/:id/status` | body: `{ status: "ACTIVE" \| "DISABLED" }` |
| نافذة "طالب جديد" | `POST /api/students` | يعيد الرمز **الصريح مرة واحدة فقط** في هذه الاستجابة — على الواجهة عرضه في نافذة تأكيد وتنبيه الأستاذ بنسخه فورًا |
| بطاقات الدروس (لوحة الأستاذ والتلميذ) | `GET /api/lessons?skill=&level=&search=` | نفس query params تُستخدم لفلاتر الشرائح (chips) الموجودة في واجهة التلميذ |
| زر "رفع درس جديد" | `POST /api/lessons` (multipart/form-data، حقل `file`) | + حقول `title, type, skill, level` |
| تشغيل درس من جهة التلميذ | `POST /api/lessons/:id/view` | يُستدعى دوريًا أثناء المشاهدة لتغذية الإحصائيات |

## نظام المصادقة عبر رمز التفعيل — كيف يحقق المتطلبات الأمنية

1. **رمز واحد ↔ جهاز واحد فقط**: عمود `boundDeviceId` في `ActivationCode` يُملأ عند أول استخدام. أي محاولة من `deviceId` مختلف تُرفض بـ `409 DEVICE_MISMATCH` ولا تُبدّل الجهاز المربوط تلقائيًا (فقط الأستاذ يملك صلاحية `reset-device`).
2. **البقاء موثّقًا دون إعادة إدخال الرمز**: `refreshToken` يُخزَّن في httpOnly cookie مرتبط بنفس `deviceId`، فتُجدَّد الجلسة تلقائيًا عبر `/api/auth/refresh`.
3. **رصد الاستخدام غير المصرح به**: كل محاولة (ناجحة أو فاشلة) تُسجَّل في `LoginAttempt` مع السبب (`DEVICE_MISMATCH`, `DISABLED`, `NOT_FOUND`) — يمكن بناء تنبيه في لوحة الأستاذ لاحقًا يعرض "3 محاولات دخول مرفوضة على رمز X".
4. **لا تخزين للرمز الصريح**: نُخزّن `SHA-256(code)` فقط، والرمز الصريح يُعرض للأستاذ مرة واحدة فقط عند الإنشاء.

## الخطوة التالية المقترحة

بناء endpoints البث المباشر (`LiveSession`) وربطها بمزوّد خارجي (Jitsi غالبًا الأنسب بداية لأنه مجاني ولا يحتاج حساب مطوّر مدفوع)، ثم توليد رابط `joinUrl` عشوائي لكل جلسة.
