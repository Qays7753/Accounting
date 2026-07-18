# V7 RELEASE NOTES — Silent Cloud Sync & Emergency Data Recovery

**التاريخ:** 2026-07-19  
**الإصدار:** V7  
**المستودع:** https://github.com/Qays7753/Accounting

---

## الميزات الجديدة

### ١. المزامنة السحابية الصامتة (Google Drive AppData)
- ربط حساب Google بنقرة واحدة (OAuth 2.0 عبر Google Identity Services)
- طلب صلاحية `drive.appdata` فقط — تخزين مخفي مجاني خاص في Google Drive
- مزامنة تلقائية صامتة بعد 30 ثانية من آخر تغيير في قاعدة البيانات
- نظام نسختين: `current.json` + `previous.json` (نسخة احتياطية تلقائية)
- حل التعارضات (Last Write Wins) عند العودة للتطبيق
- تحديث صامت للرمز (silent refresh) — المستخدم يبقى مسجّلاً
- يعمل أوفلاين أولاً: الكتابة المحلية فورية، المزامنة عند توفر الإنترنت

### ٢. حماية البيانات الطارئة
- **حماية الحالة الفارغة:** إذا كانت قاعدة البيانات المحلية فارغة والسحابة بها بيانات، يُمنع الرفع ويُطلب الاسترجاع
- **نسخة طارئة قبل الحذف:** قبل "حذف جميع البيانات"، يُرفع `emergency_backup.json` تلقائياً
- **استرجاع النسخة المحذوفة:** زر مخفي يظهر فقط عند وجود نسخة طارئة، مع تأكيد

### ٣. واجهة الإعدادات (مطابقة SOP)
- قسم "المزامنة السحابية" جديد في الإعدادات
- زر "ربط حساب Google" (تِراكوتّا `#CC785C`)
- بطاقة حالة خضراء عند الاتصال: "آخر مزامنة: [الوقت]"
- زر "مزامنة الآن" + مؤشر سبينر أثناء المزامنة
- زر "استرجاع نسخة محذوفة" يظهر فقط عند وجود نسخة طارئة
- قسم "إدارة البيانات" اليدوي (تصدير/استيراد JSON) يبقى كـPlan B

---

## الملفات الجديدة

| الملف | الوصف |
|---|---|
| `src/utils/googleDrive.js` | OAuth 2.0 + Drive AppData API (login, findFile, uploadFile, downloadFile, renameFile, deleteFile, listFiles, silent refresh) |
| `src/context/CloudSyncContext.jsx` | مزامنة صامتة (debounced 30s, LWW, empty-state protection, emergency backup, recovery) |

## الملفات المُعدَّلة

| الملف | التغيير |
|---|---|
| `src/App.jsx` | إضافة `<CloudSyncProvider>` |
| `src/pages/SettingsPage.jsx` | قسم المزامنة السحابية + نسخة طارئة + حماية قبل الحذف |

## التحقق

- `npm run build`: 0 أخطاء، 564 KB precache
- لا أكواد hex قديمة في src/
- `tailwind.config.js` بدون `purple`
- `src/db/index.js` المنطق المحاسبي 100% غير ممسوس
- جميع الأزرار تِراكوتّا `#CC785C`، بطاقات الحالة عاجية `#F0EEE6` بظلال دافئة
- أهداف اللمس ≥ 44×44px

## ملاحظة
- يتطلب `VITE_GOOGLE_CLIENT_ID` في `.env` لتفعيل OAuth
- بدون Client ID، المزامنة السحابية معطّلة بأمان (الزر يُظهر خطأ واضح)
- النسخ الاحتياطي اليدوي (JSON export/import) يعمل دائماً كـPlan B
