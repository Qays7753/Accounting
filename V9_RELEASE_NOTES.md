# V9 RELEASE NOTES — Diagnostic Engine & Smart Inventory

**التاريخ:** 2026-07-19  
**الإصدار:** V9  
**المستودع:** https://github.com/Qays7753/Accounting

---

## الميزات الجديدة

### ١. محرّك التشخيص (Diagnostic Engine)
- `src/utils/diagnostics.js` — يحسب ٧ مقاييس مالية ذكية:
  - المبيعات اليومية، الديون المتأخرة، مخزون راكد، أيام الصمود
  - اتجاه المبيعات الأسبوعي، الطلبات المعلّقة، النقد المتاح
- `src/config/diagnostic_rules.json` — ٤ قواعد SWOT:
  - **قوة:** نمو المبيعات > ١٠٪ → أخضر
  - **تهديد:** ديون متأخرة > ٣× المبيعات اليومية → أحمر + تذكير واتساب
  - **فرصة:** طلبات معلّقة → تركوازي + روح للطلبات
  - **ضعف:** صمود < ١٤ يوم → برتقالي + شوف المالية
- كل قاعدة لها نصّان (بسيط + احترافي) + إجراء قابل للتنفيذ

### ٢. بطاقات SWOT في الرئيسية
- `src/components/ui/DiagnosticCard.jsx` — بطاقة بصرية بـ٤ ألوان دلالية
- قسم "مهام اليوم وتشخيص مشروعك" في `HomePage`
- يتحدّث ديناميكياً مع كل تغيير في البيانات + تبديل الوضع

### ٣. المخزون الذكي (Smart Inventory)
- جدول `items` جديد في Dexie v8
- **تصنيف تلقائي:** qty ≤ ٥ و unit_cost > ١٥ → تتبّع بالعدد؛ وإلا → بالعادة
- **تتبّع تنبؤي:** يحسب موعد الطلب التالي = متوسط الأيام بين المشتريات
- **تتبّع دقيق:** يخصم ١ عند كل بيع
- صفحة `InventoryPage.jsx` كاملة:
  - قائمة مع شارات «بالعدد»/«بالعادة»
  - تنبيه المخزون المنخفض (حدّ أحمر يميني)
  - زر «اطلب الآن» للأصناف التي تجاوزت موعد الطلب
  - زر «تسجيل شراء» لتحديث المخزون
  - حارس إرسال على كل الأزرار
- أُضيفت لشريط التنقّل السفلي (بدل POS)

---

## الملفات الجديدة/المُعدَّلة

| الملف | الوصف |
|---|---|
| `src/utils/diagnostics.js` (جديد) | computeSnapshot + diagnose + evalCondition |
| `src/config/diagnostic_rules.json` (جديد) | ٤ قواعد SWOT مع نصوص بسيط/احترافي |
| `src/components/ui/DiagnosticCard.jsx` (جديد) | بطاقة SWOT بـ٤ ألوان + زر إجراء |
| `src/pages/InventoryPage.jsx` (جديد) | صفحة المخزون الذكي |
| `src/db/index.js` (مُعدَّل) | Dexie v8 + items table + ٦ دوال مخزون |
| `src/pages/HomePage.jsx` (مُعدَّل) | قسم التشخيص |
| `src/components/layout/BottomNav.jsx` (مُعدَّل) | Inventory بدل POS |
| `src/components/ui/Icon.jsx` (مُعدَّل) | alertTriangle icon |
| `src/App.jsx` (مُعدَّل) | /inventory route |
| `src/utils/terms_*.js` (مُعدَّل) | nav_inventory |

## التحقق

- `npm run build`: ٠ أخطاء، ٥٨٤ KB
- لا أكواد hex قديمة في `src/`
- لا `purple` في `tailwind.config.js`
- Cloud Sync + Auth: ١٠٠٪ غير ممسوسة (git diff verified)
- `db/index.js`: schema v8 سليم، المنطق المحاسبي محفوظ
- SOP: تِراكوتّا `#CC785C`، عاجي `#F0EEE6`، rounded-card، shadow-card، ٤٤px لمس
