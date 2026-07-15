# دليل التشغيل المحلي — Run Locally Guide

> تعليمات بسيطة جداً لتشغيل التطبيق على جهازك. لا تحتاج خبرة برمجية.

---

## 📋 المتطلبات (Prerequisites)

### 1. تثبيت Node.js

**Node.js** هو البرنامج الذي يشغل التطبيق. حمّله من الموقع الرسمي:

🔗 **[https://nodejs.org](https://nodejs.org)**

- حمّل النسخة **LTS** (الإصدار المستقر)
- للويندوز: حمّل ملف `.msi` واتبع خطوات التثبيت
- للماك: حمّل ملف `.pkg` واتبع خطوات التثبيت

**للتحقق من التثبيت:**
افتح موجه الأوامر (Terminal / CMD / PowerShell) واكتب:

```bash
node --version
```

يجب أن يظهر رقم الإصدار (مثلاً: `v20.11.0` أو أحدث).

```bash
npm --version
```

يجب أن يظهر رقم (مثلاً: `10.2.4` أو أحدث).

---

## 🚀 طريقة التشغيل (3 خطوات)

### الخطوة 1: تحميل المشروع

إذا لم تكن قد حمّلت المشروع بعد:

```bash
git clone https://github.com/Qays7753/Accounting.git
cd Accounting
```

أو حمّل ملف ZIP من GitHub واستخرجه، ثم افتح المجلد في موجه الأوامر.

---

### الخطوة 2: تثبيت الحزم (المكتبات)

في موجه الأوامر، داخل مجلد المشروع، اكتب:

```bash
npm install
```

**انتظر** — هذه الخطوة قد تستغرق 2-5 دقائق في المرة الأولى. سيتم تحميل جميع المكتبات اللازمة.

✅ **نجحت** إذا رأيت رسالة مثل: `added 417 packages in 24s`

❌ **فشلت** إذا ظهرت أخطاء حمراء. الحلول الشائعة:
- تأكد أنك في المجلد الصحيح (يجب أن يحتوي على `package.json`)
- جرّب: `npm cache clean --force` ثم `npm install` مرة أخرى
- إذا كنت على ويندوز، شغّل موجه الأوامر كمسؤول (Run as Administrator)

---

### الخطوة 3: تشغيل التطبيق

```bash
npm run dev
```

سترى رسالة مثل:

```
  VITE v5.4.21  ready in 312 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**افتح المتصفح** واذهب إلى: **http://localhost:5173**

✅ التطبيق يعمل الآن! سترى شاشة الترحيب.

---

## 📱 تجربة التطبيق كأنه على الهاتف

للحصول على أفضل تجربة، استخدم أدوات المطور (DevTools) لمحاكاة الهاتف:

### على Chrome / Edge:
1. اضغط `F12` أو `Ctrl+Shift+I` (ويندوز) / `Cmd+Option+I` (ماك)
2. اضغط أيقونة الجوال 📱 (Toggle device toolbar)
3. اختر جهازاً مثل: iPhone 12 أو Samsung Galaxy S20
4. أعد تحميل الصفحة

### على Firefox:
1. اضغط `F12`
2. اضغط أيقونة الجوال 📱
3. اختر جهازاً من القائمة

---

## 🏗️ بناء نسخة الإنتاج (Production Build)

إذا كنت تريد نسخة جاهزة للنشر على استضافة:

```bash
npm run build
```

هذا ينشئ مجلد `dist/` يحتوي على ملفات الإنتاج المضغوطة.

لمعرفة الناتج:
```bash
npm run preview
```

سيشغل خادماً على `http://localhost:4173` يعرض نسخة الإنتاج.

---

## ☁️ النشر على Cloudflare Pages (مجاني)

### الطريقة الأسهل (ربط GitHub):

1. اذهب إلى **[https://pages.cloudflare.com](https://pages.cloudflare.com)**
2. اضغط **"Create a project"** ثم **"Connect to Git"**
3. اختر مستودع `Qays7753/Accounting`
4. اضبط الإعدادات:
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** `20` (في إعدادات البيئة)
5. اضغط **"Save and Deploy"**

بعد 2-3 دقائق، ستحصل على رابط مثل:
`https://accounting-xxx.pages.dev`

التطبيق يعمل الآن على الإنترنت! 🎉

### الطريقة اليدوية (رفع مباشر):

1. شغّل `npm run build` محلياً
2. اذهب إلى Cloudflare Pages → **"Direct Upload"**
3. اسحب وأفلت مجلد `dist/`

---

## 🎨 عرض الـ HTML Mockup (بدون تثبيت)

المجلد `mockup/` يحتوي على نسخة HTML مستقلة لا تحتاج Node.js:

### الطريقة 1: افتح الملف مباشرة
افتح `mockup/index.html` في أي متصفح. يعمل فوراً!

### الطريقة 2: عبر GitHub Pages (موصى به)
1. اذهب إلى إعدادات المستودع على GitHub: **Settings → Pages**
2. تحت **"Source"**، اختر **"GitHub Actions"**
3. سيتم نشر الـ mockup تلقائياً عبر ملف `.github/workflows/deploy-mockup.yml`
4. الرابط سيكون: `https://qays7753.github.io/Accounting/`

راجع ملف `.github/workflows/deploy-mockup.yml` للتفاصيل.

---

## 🔧 استكشاف الأخطاء (Troubleshooting)

### المشكلة: `npm install` يفشل

**الحل 1:** تأكد أن Node.js مثبت
```bash
node --version  # يجب أن يظهر رقم
```

**الحل 2:** امسح الكاش وأعد المحاولة
```bash
npm cache clean --force
rm -rf node_modules package-lock.json   # ويندوز: rmdir /s node_modules
npm install
```

**الحل 3:** استخدم yarn بدلاً من npm
```bash
npm install -g yarn
yarn install
yarn dev
```

---

### المشكلة: `npm run dev` يفشل

**الحل 1:** تأكد أن المنفذ 5173 غير مستخدم
```bash
# ويندوز
netstat -ano | findstr :5173

# ماك/لينكس
lsof -i :5173
```

**الحل 2:** استخدم منفذاً آخر
```bash
npm run dev -- --port 3000
```

---

### المشكلة: الصفحة بيضاء في المتصفح

**الحل 1:** افتح Console (F12) وتحقق من الأخطاء

**الحل 2:** امسح IndexedDB
1. F12 → Application tab → IndexedDB
2. احذف قاعدة `AccountingAppDB`
3. أعد تحميل الصفحة

---

### المشكلة: التطبيق لا يعمل بدون إنترنت

**الحل:** تأكد أن Service Worker مسجل:
1. F12 → Application tab → Service Workers
2. يجب أن ترى `sw.js` بحالة `activated`

إذا لم يظهر:
1. F12 → Application → Storage → "Clear site data"
2. أعد تحميل الصفحة
3. سيتم تسجيل Service Worker تلقائياً

---

## 📂 هيكل المشروع (للمطورين)

```
Accounting/
├── src/                    # الكود المصدري
│   ├── components/         # مكونات React
│   │   ├── common/         # مكونات مشتركة (ErrorBoundary, Banner)
│   │   ├── layout/         # التخطيط (AppLayout, BottomNav)
│   │   ├── sheets/         # البطاقات السفلية (Fab, Forms, Details)
│   │   └── ui/             # عناصر الواجهة (Icon, BottomSheet, etc.)
│   ├── db/                 # قاعدة البيانات (Dexie.js / IndexedDB)
│   ├── hooks/              # React Hooks مخصصة
│   ├── pages/              # الصفحات (Home, Finance, Orders, Settings)
│   ├── utils/              # أدوات مساعدة (format, date, haptics, etc.)
│   └── styles/             # أنماط Tailwind CSS
├── public/                 # ملفات ثابتة (أيقونات)
├── mockup/                 # نسخة HTML للمعاينة (GitHub Pages)
├── .github/workflows/      # GitHub Actions (نشر تلقائي)
├── package.json            # إعدادات المشروع والحزم
├── vite.config.js          # إعدادات Vite + PWA
├── tailwind.config.js      # إعدادات Tailwind (نظام One UI)
└── index.html              # نقطة الدخول HTML
```

---

## ❓ أسئلة شائعة (FAQ)

### س: هل التطبيق يحفظ بياناتي على السحابة؟
**ج:** لا. التطبيق يعمل 100% على جهازك. جميع البيانات في IndexedDB المحلي. استخدم ميزة "نسخة احتياطية" لحفظ البيانات كملف JSON.

### س: هل أستطيع استخدام التطبيق على أكثر من جهاز؟
**ج:** نعم، لكن البيانات لا تُزامن تلقائياً. استخدم النسخ الاحتياطي/الاستعادة لنقل البيانات بين الأجهزة.

### س: هل يعمل التطبيق على iPhone؟
**ج:** نعم! أضفه للشاشة الرئيسية عبر Safari → زر المشاركة → "إضافة إلى الشاشة الرئيسية". سيعمل كتطبيق أصلي.

### س: هل أحتاج إنترنت لاستخدام التطبيق؟
**ج:** فقط في المرة الأولى لتحميل الصفحة. بعد ذلك، يعمل 100% بدون إنترنت (بفضل Service Worker).

### س: كيف أغير لون التطبيق؟
**ج:** اذهب إلى الإعدادات → المظهر → اللون الرئيسي (ميزة مقترحة، راجع `PRODUCT_STRATEGY.md`).

### س: كيف أتخلص من جميع البيانات وأبدأ من جديد؟
**ج:** الإعدادات → التطبيق → "حذف جميع البيانات" (يتطلب تأكيداً مزدوجاً).

---

## 📞 الدعم

إذا واجهت مشكلة:
1. راجع قسم **استكشاف الأخطاء** أعلاه
2. تحقق من **Console** (F12) لرسائل الخطأ
3. افتح issue على GitHub: **https://github.com/Qays7753/Accounting/issues**

---

## 📝 ملخص سريع

| الخطوة | الأمر | الوقت المتوقع |
|--------|------|--------------|
| تثبيت Node.js | من nodejs.org | 5 دقائق |
| تثبيت الحزم | `npm install` | 2-5 دقائق |
| تشغيل التطبيق | `npm run dev` | فوري |
| بناء الإنتاج | `npm run build` | ~3 ثواني |
| عرض الـ Mockup | افتح `mockup/index.html` | فوري |

---

*آخر تحديث: 15 يوليو 2026*
