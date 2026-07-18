# NAV_SOP_COMPLIANCE — مطابقة إصلاح التنقّل مع SOP

**التاريخ:** 2026-07-19  
**الوكيل:** ٤+٥  

## التحقق النهائي

| البند | الحالة |
|---|---|
| `npm run build` نظيف | ✅ 554 KB |
| تبديل تبويبات بـ`replace` | ✅ BottomNav line 110 |
| الرجوع من تبويب فرعي → الرئيسية مباشرة | ✅ (replace = flat history) |
| الرجوع من الرئيسية → تأكيد الخروج | ✅ useExitConfirm في HomePage |
| الرجوع بطبقة مفتوحة → يغلق آخر طبقة | ✅ useBackDismiss في BottomSheet |
| إغلاق الورقة بضغطة واحدة بلا تلعثم | ✅ isClosingRef guard (لا setTimeout) |
| هيدر الرئيسية: شعار + سطران يسار، الجرس يمين | ✅ |
| التاريخ في subheader لا مكدّساً في الشريط | ✅ variant="home" subheader |
| الاسم مقصوص بأمان (truncate + min-w-0) | ✅ |
| db/index.js 100% untouched | ✅ |

**رابط آخر commit:** https://github.com/Qays7753/Accounting/commit/3fe8721
