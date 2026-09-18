# BSR App Web Control

تم نقل الكتالوج الحالي للقنوات الحية من Firebase إلى بنية جديدة:

- GitHub Pages: الأقسام + أسماء القنوات + الصور + الترتيب.
- Cloudflare Worker + KV: روابط السيرفرات والهيدرز وDRM.
- AppCreator24: يفتح الصفحة الرئيسية ثم صفحة القنوات.
- عند اختيار القناة، صفحة القنوات تجلب السيرفرات من Worker ثم ترسل السيرفر المختار إلى البصري بلاير.

## الروابط
- الرئيسية: https://albasritv.github.io/app/
- القنوات: https://albasritv.github.io/app/channels.html?id=SECTION_ID
- الأدمن: https://albasritv.github.io/app/admin.html
- البيانات العامة: https://albasritv.github.io/app/data/data.json
- Worker template: app/worker.js

## إعداد Cloudflare Worker
1. أنشئ Worker جديد.
2. الصق محتوى app/worker.js.
3. أنشئ KV Namespace باسم BSR_DATA واربطه بالـWorker باسم Binding: BSR_DATA.
4. أضف Secret باسم ADMIN_KEY.
5. أضف Variable اختياري باسم ALLOWED_ORIGIN وقيمته https://albasritv.github.io
6. Deploy.
7. افتح admin.html، ضع Worker URL وAdmin Key.
8. اختر ملف bsr-private-servers-import.json ثم اضغط رفع السيرفرات.
9. بعد نجاح الرفع، ضع نفس Worker URL في Private API Base واضغط حفظ البيانات العامة.

## ملاحظة
Origin/Referer gate يقلل الوصول المباشر لكنه ليس حماية مطلقة؛ أي عميل يحتاج تشغيل البث سيحتاج في النهاية بيانات تشغيل قابلة للاستخدام.
