# Albasri App Web Control

المجلد `/app` يحتوي على واجهة الويب المستخدمة مع AppCreator24.

## الروابط

- الصفحة الرئيسية: https://albasritv.github.io/app/
- صفحة القنوات: https://albasritv.github.io/app/channels.html?id=bein-sports
- لوحة الأدمن: https://albasritv.github.io/app/admin.html
- البيانات: https://albasritv.github.io/app/data/data.json

## طريقة العمل

1. افتح `admin.html` من الجوال.
2. أنشئ GitHub Fine-grained personal access token لمستودع `albasritv/albasritv.github.io` فقط.
3. امنحه صلاحية Contents: Read and write.
4. الصق التوكن في لوحة الأدمن. لا يتم حفظه في Local Storage.
5. أضف/عدّل الأقسام والقنوات.
6. اضغط "حفظ على GitHub".
7. الصفحة الرئيسية والقنوات تقرأ `data/data.json` تلقائياً.

## AppCreator24

ضع رابط الصفحة الرئيسية داخل قسم HTML/Web في AppCreator24:

`https://albasritv.github.io/app/`

الأقسام لا تحتاج صفحات منفصلة. الصفحة الرئيسية تحول تلقائياً إلى:

`channels.html?id=SECTION_ID`

## تشغيل البصري بلاير

صفحة القنوات تبني Intent من إعدادات `player` داخل `data.json`.
الافتراضي:

- scheme: `bsrplayer`
- host: `play`
- package: `com.bsr.player.pro`

إذا مشروع البصري بلاير يستخدم Scheme أو Host مختلفاً، غيّره من لوحة الأدمن.

## ملاحظة أمنية مهمة

GitHub Pages ومستودع البيانات هنا عامّان. لا تضع روابط بث أو Cookies أو مفاتيح DRM سرية إذا كنت لا تريد أن تكون قابلة للقراءة من ملف JSON العام. للروابط الحساسة استخدم Worker/API محمي وأرسل للتطبيق رابط الـAPI بدلاً من السر نفسه.
