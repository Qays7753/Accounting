# HEADER_AUDIT — توحيد نظام الهيدر والمكوّنات المشتركة

**التاريخ:** 2026-07-18  
**الوكيل:** ١ (البحث والتشخيص)  
**المرجع:** `نظام-التصميم-SOP.md` v2  
**النطاق:** الصفحات السبع (`HomePage`, `FinancePage`, `OrdersPage`, `ReportsPage`, `DebtsPage`, `QuickPosPage`, `SettingsPage`) + `src/styles/index.css` + `src/components/layout/` + `tailwind.config.js`

---

## ملخص تنفيذي

كل صفحة من الصفحات السبع تكتب `<header>` يدوياً بقيم مختلفة — لا مكوّن مشترك. انحرافات في: الحشو (`px-4` مقابل `px-5`)، الـpt (`pt-8` مقابل `pt-12`)، حجم العنوان (`text-lg` / `text-2xl` / `text-[30px]` مع `font-extrabold -tracking-[.5px]`)، السلوك sticky (٥ صفحات ثابتة، ٢ غير ثابتة)، الظل عند السكرول (غير موجود)، البحث (ثابت يبتلع مساحة)، primitives مكرّرة (segmented control ثلاث مرات)، وقيم عشوائية كثيرة (`rounded-[18px]`, `gap-[18px]`, `bottom-[-1.5px]`, `w-[46px]`).

كما يوجد class ميّت `.sticky-header` في `index.css` دون أي مستهلك، وتعليقات نسخ `// V2/V3/V4/V5` منثورة في 5+ ملفات.

تم توثيق 12 مشكلة (P1–P12) بموقعها ورقم سطرها وقيمتها الحالية والحل المقترح من SOP.

---

## P1 — لا مكوّن هيدر مشترك (السبب الجذري)

**الموقع:**
| الصفحة | سطر `<header>` | سطر `</header>` |
|---|---|---|
| `HomePage.jsx` | 148 | 172 |
| `FinancePage.jsx` | 152 | 212 |
| `OrdersPage.jsx` | 119 | 199 |
| `ReportsPage.jsx` | 166 | 215 |
| `DebtsPage.jsx` | 107 | 119 |
| `QuickPosPage.jsx` | 130 | 142 |
| `SettingsPage.jsx` | 293 | 295 |

**الحالة الحالية:** مجلد `src/components/layout/` فيه `AppLayout.jsx` و`BottomNav.jsx` فقط — لا `PageHeader.jsx`.

**الحل:** إنشاء `src/components/layout/PageHeader.jsx` بواجهة:
```jsx
<PageHeader
  title="المالية"                          // أو variant="home" لعرض الشعار+التحية
  actions={[{icon:'plus', onClick, label}]}
  search={{ value, onChange, placeholder }} // اختياري → أيقونة تتوسّع
  subheader={<SegmentedControl .../>}       // صف ثانوي
/>
```
ثم إعادة بناء هيدر كل صفحة فوقه.

---

## P2 — حشو غير موحّد

| الصفحة | الحشو الأفقي | pt (بعد safe-area-top) |
|---|---|---|
| `HomePage` | `px-5` (سطر 148, 224, 269, 317, 346, 377, 401) | `pt-12` |
| `FinancePage` | `px-4` (سطر 152) | `pt-8` |
| `OrdersPage` | `px-4` (سطر 119) | `pt-8` |
| `ReportsPage` | `px-4` (سطر 166) | `pt-8` |
| `DebtsPage` | `px-4` (سطر 107) | `pt-8` |
| `QuickPosPage` | `px-4` (سطر 130) | `pt-8` |
| `SettingsPage` | `px-5` (سطر 293, 297) | `pt-8` |

**المشكلة:** `px-5` (20px) في Home وSettings مقابل `px-4` (16px) في الباقي → حافة يمنى غير محاذية عند التنقّل. كذلك `pt-12` (48px) في Home مقابل `pt-8` (32px) في الباقي → إيقاع رأسي مكسور.

**الحل من SOP §3:** هامش الشاشة = 16px (`px-4`). `pt` موحّد من الشبكة بعد `safe-area-top`.

---

## P3 — ثلاث معالجات مختلفة للعنوان + قيم عشوائية

| الصفحة | عنوان الصفحة | القيمة |
|---|---|---|
| `HomePage` | `businessName` | `text-lg font-bold` (سطر 160) |
| `OrdersPage` | `t.orders_title` | `text-2xl font-bold` (سطر 121) |
| `QuickPosPage` | `t.pos_title` | `text-2xl font-bold` (سطر 132) |
| `FinancePage` | `t.finance_title` | `text-[30px] font-extrabold -tracking-[.5px]` (سطر 154) |
| `ReportsPage` | `t.reports_title` | `text-[30px] font-extrabold -tracking-[.5px] mb-3` (سطر 167) |
| `DebtsPage` | `t.debts_title` | `text-[30px] font-extrabold -tracking-[.5px]` (سطر 109) |
| `SettingsPage` | `t.settings_title` | `text-[30px] font-extrabold -tracking-[.5px]` (سطر 294) |

**المشكلة:** ثلاثة أنماط مختلفة + `text-[30px]` قيمة عشوائية (دليل غياب توكِن). SOP §5 يحدّد مقياس طباعة.

**الحل من SOP §5:** تعريف مقياس عناوين في `tailwind.config.js`:
- `text-title` = 28px / 700 (عنوان الصفحة الكبير)
- `text-title-sm` = 20px / 700 (عنوان الصفحة الصغير أو المنكمش)

ثم تطبيقه على كل عنوان. عنوان واحد ينكمش (SOP §6.1): يبدأ كبيراً ثم ينكمش في الشريط 56px عند السكرول.

---

## P4 — سلوك sticky متناقض

| الصفحة | sticky؟ |
|---|---|
| `HomePage` | ❌ لا (سطر 148: `px-5 pt-12 pb-4 safe-area-top` بلا sticky) |
| `FinancePage` | ✅ `sticky top-0 bg-background z-20` (سطر 152) |
| `OrdersPage` | ✅ (سطر 119) |
| `ReportsPage` | ✅ (سطر 166) |
| `DebtsPage` | ✅ (سطر 107) |
| `QuickPosPage` | ✅ (سطر 130) |
| `SettingsPage` | ❌ لا (سطر 293: `px-5 pt-8 pb-3 safe-area-top` بلا sticky) |

**المشكلة:** الهيدر يثبت في 5 صفحات ويمشي مع السكرول في 2 → تجربة غير متّسقة.

**الحل من SOP §6:** شريط علوي (56px) ملتصق في **كل** الصفحات بنفس المنطق داخل `PageHeader`.

---

## P5 — `.sticky-header` معرّف وغير مستخدم (كود ميّت)

**الموقع:** `src/styles/index.css` الأسطر 164–169:
```css
.sticky-header {
  @apply sticky top-0 z-20;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(250,249,245,0.88);
}
```

**التحقق:** `grep -rn "sticky-header" src/pages/ src/components/` → **0 نتائج**. الكلاس معرّف ولا صفحة تستخدمه. الصفحات تستخدم `sticky top-0 bg-background` خام بدلاً منه.

**الحل من SOP §8.2:** تطبيق سلوك `.sticky-header` (blur + خلفية عاجية شفافة) داخل `PageHeader`، وحذف الكلاس الميّت إن لم يُستعمل خارجياً.

---

## P6 — لا ظلّ عند السكرول

**الموقع:** كل الهيدرات الملتصقة تستخدم `bg-background` بلا ظل (5 صفحات).

**المشكلة:** المحتوى ينزلق تحت شريط مسطّح بلا فصل بصري = يبدو مكسوراً. SOP §4.1/§6 ينصّ: مسطّح عند القمّة، ويظهر `shadow-header` حين يمرّ المحتوى تحته.

**الحل:** مستمع سكرول (أو `IntersectionObserver` على عنصر حارس) يفعّل `shadow-header` عند `scrollTop > 0` فقط، ضمن `PageHeader`. التوكِن `shadow-header` موجود في `tailwind.config.js` (سطر 179: `0 6px 20px rgba(60,50,40,.10)`).

---

## P7 — البحث يبتلع المساحة الرأسية

**الموقع:**
- `FinancePage.jsx` الأسطر 178–191: `<input type="search">` كامل العرض **ثابت** في الهيدر
- `OrdersPage.jsx` الأسطر 157–169: نفس النمط

**المشكلة:** يستهلك ~64px دائماً ويضيّق مساحة المحتوى.

**الحل:** تحويل البحث إلى **أيقونة** في الشريط العلوي؛ عند الضغط يتوسّع حقل بحث ينزلق فوق صف العنوان (أو يكشف الصف الثانوي)، وعند الإفراغ+فقدان التركيز يعود أيقونة. يوفّر ~64px في كل صفحة قائمة.

---

## P8 — حمولة sticky ضخمة

**الموقع:** هيدر `FinancePage` الملتصق (سطر 152) = عنوان + بطاقة صافي (سطر 158) + بحث (سطر 178) + segmented control (سطر 194) ≈ **40% من الشاشة**.

**المشكلة:** يخالف SOP §4.1: «الكروم الثابت ≤ 30% من ارتفاع الشاشة».

**الحل:** **الشريط العلوي 56px فقط هو الملتصق**؛ الصفوف الثانوية (بطاقة الصافي، الـsegmented، البحث الموسّع) تمشي مع السكرول ضمن `subheader` prop.

---

## P9 — Home وSettings خارج النمط

**الموقع:** `HomePage` (سطر 148) و`SettingsPage` (سطر 293) بنية هيدر مختلفة كلياً عن باقي الصفحات.

**المشكلة:** إحساس علامة غير موحّد — Home يستخدم `pt-12` و`px-5` وبطاقة شعار+تحية، Settings يستخدم `px-5` وعنوان واحد فقط بلا sticky.

**الحل:** يستخدمان نفس `PageHeader` بنفس الشبكة/الحشو/السلوك؛ Home بـ`variant="home"` (شعار + تحية بدل العنوان)، Settings عنوان قياسي — لكن نفس الشريط الملتصق والظل.

---

## P10 — تعليقات نسخ متراكمة (أثر AI)

**الموقع:** `// V2:`, `// V3:`, `// V4 Phase 2:`, `// V5:` منثورة في 5+ ملفات. لقطة من grep:

| الملف | عدد التعليقات |
|---|---|
| `src/components/layout/BottomNav.jsx` | 1 (سطر 8) |
| `src/components/sheets/OrderDetailSheet.jsx` | 3 (سطور 22, 35, 85) |
| `src/components/sheets/OrderFormSheet.jsx` | 4 (سطور 45, 87, 137, 146) |
| `src/components/sheets/TransactionFormSheet.jsx` | 10+ (سطور 31, 33, 36, 40, 82, 84, 101, 114, 134, 139, 164) |
| `src/App.jsx` | 1 (سطر 33) |

كذلك في الصفحات: `// V4 Phase 2:`, `// V5:`, `// V6:` عشرات المواضع.

**المشكلة:** تكشف بناءً تراكمياً مولّداً لا نظاماً نظيفاً.

**الحل:** حذف تعليقات ترقيم النسخ؛ الإبقاء فقط على التعليقات التي تشرح «لماذا» غير بديهي.

---

## P11 — قيم عشوائية بدل مقياس

**الموقع (مقتطفات):**

| الملف | السطر | القيمة العشوائية | التوكِن المقترح |
|---|---|---|---|
| `OrdersPage.jsx` | 132 | `rounded-[18px]` | `rounded-card` (16px) أو تعريف `rounded-segment` (18px) |
| `OrdersPage.jsx` | 135, 144 | `rounded-[14px]` | `rounded-12` (12px) |
| `OrdersPage.jsx` | 193 | `bottom-[-1.5px] h-[3px]` | تعريف `bottom-[-2px]` كـ`underline-offset` أو استخدام `border-b-2` |
| `ReportsPage.jsx` | 170 | `rounded-[16px]` | `rounded-card` (موجود) |
| `ReportsPage.jsx` | 172 | `rounded-[12px]` | `rounded-12` (موجود) |
| `FinancePage.jsx` | 158 | `py-[18px]` | `py-5` (20px) أو `py-4` (16px) |
| `FinancePage.jsx` | 165 | `gap-[18px]` | `gap-5` (20px) |
| `FinancePage.jsx` | 181 | `w-[21px] h-[21px]` | `w-5 h-5` (20px) |
| `FinancePage.jsx` | 188 | `rounded-[18px]` | `rounded-card` |
| `FinancePage.jsx` | 194 | `rounded-[16px]` | `rounded-card` |
| `FinancePage.jsx` | 196 | `rounded-[12px]` | `rounded-12` |
| `FinancePage.jsx` | 216, 226 | `rounded-[20px]` | `rounded-sheet` (موجود) |
| `FinancePage.jsx` | 217, 227 | `rounded-[13px]` | `rounded-12` |
| `FinancePage.jsx` | 218, 228 | `w-[22px] h-[22px]` | `w-5 h-5` (20px) أو `w-6 h-6` (24px) |
| `HomePage.jsx` | 152, 154 | `w-[46px] h-[46px]` | `w-11 h-11` (44px) — هدف لمس SOP §0.8 |
| `HomePage.jsx` | 155 | `w-[26px] h-[26px]` | `w-6 h-6` (24px) |
| `HomePage.jsx` | 194, 206 | `w-[34px] h-[34px]` | `w-9 h-9` (36px) — أقرب من الشبكة |
| `SettingsPage.jsx` | 483 | `text-[16px]` | `text-base` (16px) |
| `SettingsPage.jsx` | 723, 733 | `text-[13px]` | `text-sm` (14px) |
| `SettingsPage.jsx` | 767 | `text-lg` | `text-base` |

**المشكلة:** غياب مقياس مسافات/زوايا/طباعة = انحراف وأثر AI.

**الحل من SOP §3/§4/§5:** استبدال كل قيمة عشوائية بالتوكِن المقابل من الشبكة (4px multiples) أو تعريف توكِنات جديدة للمقاييس المتكرّرة (مثل `rounded-segment` للـsegmented control).

---

## P12 — primitives مكرّرة يدوياً

**الموقع:**
- `FinancePage.jsx` سطور 194–211: segmented control 4 خانات (نوع المعاملة)
- `ReportsPage.jsx` سطور 168–184: segmented control 5 خانات (الفترة) — نفس النمط مكرّر
- `OrdersPage.jsx` سطور 169–193: underline-tabs مختلف بصرياً (شريط سفلي بدل thumb)
- `DebtsPage.jsx` سطور 146–167: نظام تبويب مستقل (لهم عندي / عندي لهم)

**المشكلة:** لا مكوّن مشترك → انحراف بصري بين نُسخه. 3 تنفيذات مختلفة لنفس الفكرة.

**الحل:** إنشاء `src/components/ui/SegmentedControl.jsx` واحد (عدد الخانات prop، variant: `'pill'` للـthumb أو `'underline'` للشريط السفلي) واستخدامه في Finance/Reports/Orders. توحيد تبويب Debts على نفس المكوّن أو نمط موحّد.

---

## ملخص البنود المفتوحة للوكيل ٢

| البند | الأولوية | الإصلاح |
|---|---|---|
| P1 | حرج | إنشاء `PageHeader.jsx` + إعادة بناء 7 صفحات |
| P2 | حرج | توحيد `px-4` + `pt` من الشبكة |
| P3 | حرج | مقياس عناوين في config + تطبيقه |
| P4 | حرج | sticky في كل الصفحات |
| P5 | متوسط | تطبيق `.sticky-header` داخل PageHeader أو حذفه |
| P6 | عالي | ظل السكرول |
| P7 | عالي | بحث أيقونة تتوسّع |
| P8 | عالي | subheader يمشي مع السكرول |
| P9 | متوسط | Home/Settings يستخدمان PageHeader |
| P10 | منخفض | حذف تعليقات V2/V3/V4/V5 |
| P11 | عالي | استبدال القيم العشوائية بالتوكِنات |
| P12 | عالي | `SegmentedControl.jsx` مشترك |

---

## البنود التي لا تحتاج إجراءً

- `src/db/index.js` — لم يُمسّ (منطق محاسبي).
- `src/utils/*` — لم تُمسّ (PWA, notifications, backup, etc.).
- `src/context/*` — لم تُمسّ (TermsContext, HelperModeContext, SettingsContext).
- `src/components/sheets/*` — ستحصل على تنظيف تعليقات V فقط (P10)، لا تغيير وظيفي.
- `tailwind.config.js` الألوان والظلال — سليمة، فقط إضافة توكِنات مقياس جديدة.

---

## خطة العمولات المقترحة للوكيل ٢

1. `feat(ds): add typography/spacing scale tokens + SegmentedControl primitive`
   - إضافة `text-title` / `text-title-sm` لـ`fontSize` في config
   - إضافة `rounded-segment` (18px) لـ`borderRadius`
   - إنشاء `src/components/ui/SegmentedControl.jsx`

2. `feat(header): shared PageHeader (sticky top-bar, collapsing title, scroll shadow)`
   - إنشاء `src/components/layout/PageHeader.jsx`
   - sticky 56px + blur + scroll shadow + collapsing title + actions + search icon-expand + subheader

3. `refactor(pages): adopt PageHeader across all 7 screens; remove hand-rolled headers`
   - إعادة بناء هيدر كل صفحة فوق PageHeader

4. `feat(search): icon-expand search on Orders & Finance (free vertical space)`
   - تحويل البحث الثابت إلى أيقونة تتوسّع

5. `chore(cleanup): remove dead .sticky-header, V3/V4/V5 comments, arbitrary values`
   - حذف `.sticky-header` من index.css (أو دمجه في PageHeader)
   - حذف تعليقات V2/V3/V4/V5
   - استبدال كل `rounded-[..]` / `gap-[..]` / `w-[..]` بالتوكِنات

---

**خلاصة الوكيل ١:** 12 مشكلة موثَّقة بموقعها. الهوية البصرية (ألوان تِراكوتّا) سليمة — المشكلة في **عدم وجود نظام مكوّنات مشترك** وقيم عشوائية. أوصي بمتابعة الوكيل ٢ للتنفيذ.
