# V12 Release Notes — Layer 2 Implementation, UX Polish & Strict Architecture Separation

**التاريخ:** 2026-07-20  
**الإصدار:** V12  
**المستودع:** https://github.com/Qays7753/Accounting

---

## الميزات الرئيسية

### ١. فصل معماري صارم: اللغة ≠ الطبقة
- `language_mode` ('simple' | 'pro'): يتحكم في المصطلحات فقط — لا يغيّر الواجهة
- `active_layer` (1 | 2 | 3): يتحكم في الميزات والشاشات والإدخالات
- مستخدم Layer 2 يمكنه استخدام لغة بسيطة. مستخدم Layer 3 يمكنه استخدام لغة بسيطة.
- ترحيل تلقائي من `report_mode` القديم إلى النظام الجديد

### ٢. Layer 2 (المدير) — مخزون تنبؤي + خصم تلقائي
- **Dexie v9:** `linked_item_id` في `quick_products`، `bom_components`، `purchase_records`، `auto_deduct`، `item_type`
- **deductOnSale:** عند بيع منتج في Layer 2، يقرأ BOM ويخصم المواد الخام تلقائياً
- **مخزون تنبؤي:** «عادتك تطلبه كل X يوم. اطلب الآن» بناءً على إيقاع `purchase_records`

### ٣. Layer 3 (المستثمر) — لوحة تفاعلية + إدخال استراتيجي
- **ليست للقراءة فقط بعد الآن!** FAB (+) يفتح قائمة:
  - إضافة أصل ثابت (اسم + قيمة + عمر افتراضي)
  - إضافة قرض (وصف + مبلغ + نوع: عليّ/لي)
  - حقن رأس مال (مبلغ → دخل)
  - سحب للبيت (مبلغ → سحب شخصي)
- جميع الإدخالات تؤثر ديناميكياً على الميزانية و KPIs
- جداول جديدة: `fixed_assets` و `loans`

### ٤. الإعدادات المنفصلة
- «لغة العرض»: بسيطة / احترافية (تحكم في المصطلحات)
- «طبقة التطبيق»: اليومي / المدير / المستثمر (تحكم في الميزات)

---

## الملفات المُعدَّلة

| الملف | التغيير |
|---|---|
| `src/context/TermsContext.jsx` | فصل `language_mode` عن `active_layer` + ترحيل تلقائي |
| `src/db/index.js` | Dexie v9: ٥ جداول/حقول جديدة + deductOnSale(BOM) + Layer 3 methods |
| `src/pages/SettingsPage.jsx` | مبدّلان منفصلان: لغة + طبقة |
| `src/pages/InvestorDashboard.jsx` | FAB + ٤ أوراق إدخال استراتيجي |
| `src/pages/QuickPosPage.jsx` | خصم تلقائي في Layer 2 |
| `src/pages/HomePage.jsx` | استخدام `languageMode` بدل `reportMode` |
| `src/pages/ReportsPage.jsx` | استخدام `languageMode` بدل `reportMode` |

## التحقق

- `npm run build`: ٠ أخطاء، ١.٣٧ MB
- لا أكواد hex قديمة في `src/`
- Dexie v9 schema سليم
- الفصل معماري صارم: language_mode ≠ active_layer
- Layer 2: خصم تلقائي يعمل عبر BOM
- Layer 3: إدخال استراتيجي يعمل (أصول/قروض/رأس مال/سحب)
