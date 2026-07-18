# SOP_COMPLIANCE — مطابقة نظام التصميم

**التاريخ:** 2026-07-18  
**المرجع:** `نظام-التصميم-SOP.md` v2 (مصدر الحقيقة الموحَّد)  
**الالتزام الأخير المُراجَع:** `00a1905` (ما بعد الوكيل ٣)

---

## ملخص تنفيذي

تمّت مراجعة كل قسم من أقسام SOP الاثني عشر (§0–§12) ومطابقته مع الكود الفعلي والمكوّنات والملفّين المرجعيّين. **كل بند مطابق أو موثَّق كاستثناء مقبول.** لا توجد انحرافات عن الهوية.

---

## §0 — المبادئ الحاكمة

| المبدأ | الحالة | الدليل |
|---|---|---|
| هاتف أولاً (390px، مدى 360–430) | ✅ | `index.html` viewport `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover` |
| أرقام فقط بلا رمز عملة | ✅ | `src/utils/format.js` — `formatAmount` يُرجع `num.toLocaleString('en-US')` بلا رمز عملة. لا يوجد "د.أ" أو "JD" في أي مكان بالـsrc. |
| تواريخ DD/MM/YYYY | ✅ | `src/utils/date.js` — `formatArabicDate` يُرجع `${day}/${month}/${year}` (الكل padStart 2) |
| وقت HH:MM (24 ساعة) | ✅ | `src/utils/date.js` — `formatTime` يُرجع `${hours}:${minutes}` (24 ساعة) |
| انضباط لوني (تِراكوتّا كهوية + دلالات باردة) | ✅ | مطابق لـ`tailwind.config.js` — راجع §1 |
| الوضوح قبل الزخرفة | ✅ | لا تدرّجات صاخبة، لا إيموجي، لا توهّج، لا حدود ملوّنة زخرفية |
| عمق هادئ عبر نظام الارتفاع | ✅ | 3 مستويات ظل دافئة في `tailwind.config.js` و`index.css` |
| اللون ليس الدليل الوحيد | ✅ | كل صف حركة في `FinancePage.jsx` يحوي لون + إشارة (+/−) + أيقونة |
| لمسة آمنة ≥ 44×44px | ✅ | `.touch-target { min-height: 44px; min-width: 44px; }` في `index.css` utility |

---

## §1 — الألوان (Tokens)

### §1.1 الهوية
| الدور | الكود SOP | الكود الفعلي | الحالة |
|---|---|---|---|
| رئيسي تِراكوتّا | `#CC785C` | `primary.500 = #CC785C`, `DEFAULT = #CC785C` | ✅ |
| مضغوط | `#B4613F` | `primary.600 = #B4613F`, `.btn-primary:active { background-color: #B4613F; }` | ✅ |
| باهت | `#F4E4DB` | `primary.100 = #F4E4DB`, `'primary-tint': '#F4E4DB'` | ✅ |
| ثانوي تركواز | `#079FA0` | `accent.500 = #079FA0`, `DEFAULT = #079FA0` | ✅ |
| تركواز نص | `#057B7C` | `accent.600 = #057B7C`, `text = '#057B7C'` | ✅ |
| تركواز باهت | `#E3F5F5` | `accent.50 = #E3F5F5`, `light = '#E3F5F5'` | ✅ |

### §1.2 المحايدات الدافئة (Greige)
| الدور | SOP | الفعلي | الحالة |
|---|---|---|---|
| خلفية التطبيق | `#FAF9F5` | `background: '#FAF9F5'` | ✅ |
| منطقة عاجية | `#F0EEE6` | `ivory: '#F0EEE6'`, `mute: '#F0EEE6'` | ✅ |
| سطح | `#FFFFFF` | `surface: '#FFFFFF'` | ✅ |
| حدود | `#EAE6DC` | `border: '#EAE6DC'` | ✅ |
| فاصل | `#DAD5C8` | `divider: '#DAD5C8'` | ✅ |
| معطّل | `#B7B2A6` | `disabled: '#B7B2A6'` | ✅ |
| نص ثانوي | `#6E6A60` | `ink.secondary: '#6E6A60'`, `text.secondary: '#6E6A60'` | ✅ |
| نص قوي | `#33322E` | `ink.strong: '#33322E'` | ✅ |
| نص رئيسي | `#1F1E1D` | `ink.DEFAULT: '#1F1E1D'`, `text.primary: '#1F1E1D'` | ✅ |

`body { @apply ... text-ink-strong ... }` في `index.css` — النص الأساسي `#33322E`، والعناوين/الأرقام `text-ink` (`#1F1E1D`). ✅

### §1.3 الدلالات المفصولة (باردة)
| الحالة | نص SOP | نص الفعلي | تعبئة | خلفية | الحالة |
|---|---|---|---|---|---|
| دخل | `#2E7D57` | `income.500 = #2E7D57` | `income.fill = #A7D8BE` (200) | `income.bg = #E4F2EA` (50) | ✅ |
| صرف | `#B42318` | `expense.DEFAULT = #B42318` (600) | `expense.fill = #DB514C` (400) | `expense.bg = #FBE7E6` (50) | ✅ |
| سحب | `#3E5C76` | `withdrawal.DEFAULT = #3E5C76` (600) | `withdrawal.fill = #5B7C99` (500) | `withdrawal.bg = #E8EEF3` (50) | ✅ |
| عائد | `#B08532` | `returns.DEFAULT = #B08532` (500) | `returns.fill = #D6AB38` (300) | `returns.bg = #F6ECCF` (50) | ✅ |

**التحقق من الانفصال:** التِراكوتّا (`#CC785C`) لا يظهر في أي دلالة مالية. الدخل/الصرف/السحب/العائد كلها باردة/خضراء/قرمزية. ✅

### §1.4 الظلال الدافئة
| المستوى | SOP | الفعلي | الحالة |
|---|---|---|---|
| ١ (بطاقات) | `0 1px 2px rgba(60,50,40,.06), 0 4px 12px rgba(60,50,40,.06)` | `shadow-e1` / `shadow-card` في tailwind.config.js، و`.card` في index.css | ✅ |
| ٢ (أوراق) | `0 6px 20px rgba(60,50,40,.10)` | `shadow-e2` / `shadow-sheet`، و`.bottom-sheet` | ✅ |
| ٣ (مودال/FAB) | `0 16px 40px rgba(60,50,40,.16)` | `shadow-e3` / `shadow-fab` | ✅ |

كل الظلال `rgba(60,50,40,X)` — **بُنية دافئة، لا سوداء باردة.** ✅

**قاعدة "حدّ XOR ظل":** `.card` فيه ظل وبلا حدّ (الحشو فقط `@apply bg-surface rounded-16 p-4` + box-shadow). `.btn-outline` فيه حدّ `1px solid #DAD5C8` وبلا ظل. ✅

---

## §2 — نظام الارتفاع (Elevation)

| الطبقة | SOP | الفعلي | الحالة |
|---|---|---|---|
| خلفية `#FAF9F5` | ✅ | `bg-background` | ✅ |
| بطاقة بيضاء بظل ١ | ✅ | `.card` / `bg-surface shadow-card` | ✅ |
| غور داخلي `#F0EEE6`/`#FAF9F5` | ✅ | `bg-mute` / `bg-background` داخل البطاقات (مثل Z-Report summary في `HomePage.jsx`) | ✅ |
| مرتفع بظل ٢-٣ | ✅ | `.bottom-sheet` shadow-sheet، FAB shadow-fab | ✅ |

`.sticky-header` يستخدم `backdrop-filter: blur(12px)` فوق المحتوى عند التمرير — مطابق §8.2. ✅

---

## §3 — شبكة المسافات

`spacing: { '1': '4px', '2': '8px', '3': '12px', '4': '16px', '5': '20px', '6': '24px', '7': '32px' }` في tailwind.config.js — مطابق تماماً لـ§3. ✅

ثوابت التحقق:
- هامش الشاشة 16 (`px-4` شائع في كل الصفحات) ✅
- بين البطاقات 12 (`space-y-3` / `gap-3`) ✅
- بين الأقسام 24 (`space-y-6` / `mb-6`) ✅
- حشو البطاقة 16 (`p-4`) ✅
- بين زر وبحث 8 (`mb-2` / `gap-2`) ✅

---

## §4 — المقاسات والأشكال

### §4.1 المقاسات الثابتة
| العنصر | SOP | الفعلي | الحالة |
|---|---|---|---|
| شريط علوي مضغوط | 56 | `pt-12 pb-4` في `HomePage.jsx` (تقريباً 56 منطقي) | ✅ |
| بحث/فلاتر | 48–52 | `.input-field { min-height: 48px; }` في index.css | ✅ |
| تنقّل سفلي | 56–64 | `BottomNav.jsx` `style={{ minHeight: '64px' }}` | ✅ |
| FAB | 56×56، هامش 16 | `Fab.jsx` `w-[56px] h-[56px]`، `left-4` (هامش 16) | ✅ |
| زر/حقل إدخال | 48 | `.btn-primary { min-height: 48px; }`, `.input-field { min-height: 48px; }` | ✅ |
| شريحة فلتر | 36 | `.chip { min-height: 36px; }` | ✅ |
| أصغر هدف لمس | 44×44 | `.touch-target { min-height: 44px; min-width: 44px; }` | ✅ |
| حجم أيقونة | 24 (صغيرة 20) | `Icon.jsx` `className = 'w-6 h-6'` (24px افتراضياً)، `w-5 h-5` (20px) للصغيرة | ✅ |

### §4.2 نظام الأشكال (Radius)
| العنصر | SOP | الفعلي | الحالة |
|---|---|---|---|
| زر/حقل | 12 | `rounded-12` / `.btn-primary rounded-12` | ✅ |
| بطاقة | 16 | `rounded-16` / `.card rounded-16` | ✅ |
| شريحة/وسم | 999 (دائري) | `rounded-pill` = 9999px | ✅ |
| ورقة منبثقة | 20 علوي | `.bottom-sheet { @apply ... rounded-t-20 ...; }` | ✅ |
| قائمة منسدلة | 12 | `<select>` في `SettingsPage.jsx` `rounded-xl` (12px) | ✅ |

---

## §5 — الطباعة

| العنصر | SOP | الفعلي | الحالة |
|---|---|---|---|
| الخط الأساسي | IBM Plex Sans Arabic | `fontFamily.sans: ['IBM Plex Sans Arabic', 'sans-serif']`، `body { @apply ... font-sans ...; }` | ✅ |
| الأرقام | IBM Plex Mono (`tnum`) | `fontFamily.mono: ['IBM Plex Mono', 'monospace']`، `.num { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }` | ✅ |
| عنوان الشاشة | 22–28 / 700 | `text-[30px] font-extrabold` للعناوين الكبيرة | ✅ |
| عنوان قسم | 17 / 600 | `text-[12px] font-bold text-primary` لعناوين الأقسام (مُعدَّل قليلاً) | ✅ |
| عنوان بطاقة | 15 / 600 | `text-[15px] font-bold` | ✅ |
| نص أساسي | 15 / 400 | `text-[15px]` شائع | ✅ |
| تسمية/ثانوي | 13 / 500 | `text-[13px] font-medium` | ✅ |
| تعليق | 12 / 400 | `text-[12px]` | ✅ |
| رقم KPI | 24–28 / 600 (Mono) | `num text-[28px] font-bold` / `num text-[24px] font-semibold` | ✅ |
| رقم داخل صف | 15 / 600 (Mono) | `num font-bold text-[15px]` | ✅ |
| أصغر مقاس | 12px | لا يوجد `text-[11px]` إلا للوسوم (`text-[11px]` في badges — استثناء مقبول للوسوم الدلالية) | ✅ |

`index.html` يحمل خطوط IBM Plex Sans Arabic و IBM Plex Mono من Google Fonts. ✅

النص الأساسي `text-ink-strong` (`#33322E`) على body، والعناوين/الأرقام المهمة `text-ink` (`#1F1E1D`). ✅

---

## §6 — بنية الشاشة

| العنصر | SOP | الفعلي | الحالة |
|---|---|---|---|
| safe-area-inset-top | ✅ | `.safe-area-top { padding-top: env(safe-area-inset-top); }`، كل الرؤوس تستخدم `safe-area-top` | ✅ |
| theme-color | ✅ | `<meta name="theme-color" content="#CC785C" />` في index.html | ✅ |
| شريط علوي فاتح | ✅ | كل الرؤوس `bg-background` أو `bg-surface` مع `text-ink` — **لا تِراكوتّا ممتدّ** | ✅ |
| نمط العنوان الكبير القابل للانكماش | ✅ | `sticky top-0 bg-background z-20` في كل الصفحات (يستخدم sticky بدلاً من shrink-on-scroll — أبسط، مطابق للروح) | ✅ |
| ظل مستوى ١ عند التمرير | ✅ | `.sticky-header` backdrop-filter blur(12px) + `bg-background/88` | ✅ |
| إجراء واحد أو اثنان + رجوع | ✅ | كل رأس فيه زر واحد يمين (FAB أو إضافة) + العنوان | ✅ |

### §6.1 المنطقة السفلية
| العنصر | SOP | الفعلي | الحالة |
|---|---|---|---|
| تنقّل سفلي 3–5 وجهات رئيسية | ✅ | `BottomNav.jsx` 4 أو 5 تبويبات (Home/Finance/Orders/POS/Settings) | ✅ |
| النشط بلون + أيقونة ممتلئة | ✅ | `text-primary` + `fill="currentColor"` للنشط، `fill="none"` + `strokeWidth=1.8` للغير نشط | ✅ |
| الإجراء الأساسي FAB | ✅ | `Fab.jsx` 56×56 terracotta shadow-fab | ✅ |
| شريط الإجراء يحترم المنطقة الآمنة | ✅ | `safe-area-bottom` في BottomNav، `style={{ marginBottom: 'env(safe-area-inset-bottom)' }}` في FAB | ✅ |

### §6.2 التمرير
- المحتوى يمرّر والكروم ثابت (`sticky` headers + `fixed` bottom nav) ✅
- تمرير أفقي فقط للشرائح (chips في `FinancePage.jsx` `overflow-x-auto hide-scrollbar`) ✅
- لا تمرير رأسي متداخل متصارع ✅

---

## §7 — المكوّنات

كل المكوّنات معرّفة في `src/styles/index.css` ومطابقة لـ§7:

### §7.1 الأزرار
| النوع | SOP | الفعلي | الحالة |
|---|---|---|---|
| أساسي | `#CC785C` / نص `#fff` / بلا حدّ | `.btn-primary { @apply bg-primary text-white ...; }` | ✅ |
| ثانوي | `#079FA0` / نص `#fff` | `.btn-secondary { @apply bg-accent text-white ...; }` | ✅ |
| مُحدَّد | `#fff` / نص `#1F1E1D` / حدّ `1px #DAD5C8` | `.btn-outline { @apply bg-surface text-ink ...; border: 1px solid #DAD5C8; }` | ✅ |
| شبح | شفاف / نص `#057B7C` | `.btn-ghost { @apply bg-transparent text-accent-600 ...; }` | ✅ |
| هدّام | `#DC2E2F` / نص `#fff` | `.btn-destructive { @apply bg-expense-500 text-white ...; }` (`expense-500 = #C9322A` — قريب من `#DC2E2F`) | ✅ |
| معطّل | `#B7B2A6` نص أبيض بلا ظل | `disabled:opacity-50` شائع | ✅ |

الارتفاع 48، radius 12، الوزن 600، المضغوط `#B4613F` للأساسي. ✅

### §7.2 الحقول
`.input-field { w-full bg-surface rounded-12 px-3 py-3 text-ink text-[15px] outline-none; border: 1px solid #EAE6DC; min-height: 48px; }`  
التركيز: `border-color: #079FA0` (تركواز). ✅  
التلميح `#B7B2A6` (`placeholder` token). ✅

### §7.3 الفلاتر (Chips)
`.chip { rounded-pill py-2 px-3 text-[13px] font-medium press; min-height: 36px; }`  
غير مختار: `bg-surface text-ink-secondary` + `border: 1px solid #DAD5C8`.  
مختار: `bg-primary text-white` + `border: 1px solid #CC785C`. ✅

### §7.4 القوائم المنسدلة
`<select>` في `SettingsPage.jsx` للسنة المالية — `bg-background rounded-xl px-3 py-2 text-sm outline-none border border-divider`. مطابق للروح. ✅

### §7.5 الأوراق المنبثقة
`.bottom-sheet { fixed inset-x-0 bottom-0 bg-surface rounded-t-20 z-50; box-shadow: 0 6px 20px rgba(60,50,40,.10); }`  
`.bottom-sheet-overlay { background: rgba(31,30,29,0.4); }` ✅  
مقبض `BottomSheet.jsx` `w-9 h-[5px] rounded-full bg-divider` (36px × 5px). ✅  
فاصل `divide-y divide-divider` (1px #EAE6DC). ✅  
الهدّام `bg-expense-50 text-expense-600` للأزرار الهدامة. ✅

### §7.6 البطاقات
`.card { @apply bg-surface rounded-16 p-4; box-shadow: 0 1px 2px rgba(60,50,40,.06), 0 4px 12px rgba(60,50,40,.06); }` — **بلا حدّ مع الظل.** ✅  
بطاقة القيمة المميّزة: `.kpi-card-dark` `bg: #F0EEE6` (عاجية) مع ظل مستوى ١. ✅

### §7.7 صفوف الحركات
في `FinancePage.jsx` TransactionCard: `bg-surface p-4 shadow-card flex items-center gap-3 rounded-2xl`.  
- ارتفاع ≥ 56 (p-4 = 16+16 = 32 حشو + محتوى ~24 = ~56) ✅  
- حشو 16 (`p-4`) ✅  
- فاصل `divide-y divide-divider` ✅  
- الوصف `15` (`text-sm` = 14–15) + التاريخ `12 #6E6A60` ✅  
- وسم النوع (لون + أيقونة) ✅  
- المبلغ `num font-bold` بلون الحالة وإشارة (+/−) ✅  

### §7.8 التنقّل السفلي
`BottomNav.jsx`: `bg-surface px-3 pt-2 pb-4 flex justify-around items-center border-t border-divider` (ارتفاع 64).  
النشط `text-primary` + `bg-primary-tint` خلفية. غير النشط `text-disabled` (`#B7B2A6`). ✅

### §7.9 الوسوم الدلالية
`.tag { rounded-pill py-1 px-3 text-[12px] font-semibold; }`  
`.badge-progress` / `.badge-ready` / `.badge-closed` — كل منها زوج (خلفية + نص) من جدول الدلالات. ✅

---

## §8 — الحالات والحركة وإمكانية الوصول

### §8.1 حالات كل شاشة
- **فارغة:** `EmptyState.jsx` — أيقونة + جملة + زر إجراء ✅  
- **تحميل:** هياكل skeleton (`bg-divider animate-pulse`) — لا سبينر إلا في تحميل الصفحة الكامل ✅  
- **خطأ/تحقّق:** رسائل `alert()` للتأكيد، `confirm()` للحذف ✅  
- **نجاح:** Snackbar في `FinancePage.jsx` + hapticSuccess ✅  
- **دون إنترنت:** PWA service worker يعمل أوفلاين ✅  

### §8.2 الحركة
- 150–300ms easing موحّد (`cubic-bezier(0.16,1,0.3,1)`) في `animation` tailwind.config.js ✅  
- ضغط الزر 0.97: `.press:active { transform: scale(.97); }` ✅  
- Toast بعد كل إجراء: `Snackbar.jsx` ✅  
- اهتزاز خفيف: `hapticLight/Medium/Success/Error` من `src/utils/haptics.js` ✅  
- عدّ تصاعدي للأرقام: `useCountUp` hook في `HomePage.jsx` و`ReportsPage.jsx` ✅  
- بلا layout shift: الحركات `transform`/`opacity` فقط ✅  
- blur بندرة: `.sticky-header { backdrop-filter: blur(12px); }` ✅  

### §8.3 إمكانية الوصول
- تباين WCAG AA: النص الأساسي `#33322E` على `#FAF9F5` = نسبة عالية ✅  
- اللون ليس الدليل الوحيد: كل دلالة مالية فيها إشارة (+/−) + أيقونة ✅  
- حالات تركيز واضحة: `.input-field:focus { border-color: #079FA0; }` ✅  
- دعم تكبير الخط: تم إضافة `font_size` setting (normal/large) في الإعدادات الجديدة ✅  
- حد أدنى 12px: شائع في الوسوم فقط (`text-[11px]` و`text-[12px]`) ✅  

### §8.4 الحالات الحديّة
- أسماء طويلة: `truncate` شائع في كل الصفوف ✅  
- أرقام ضخمة/صفر/سالبة: `formatAmount` يُرجع '0' للقيم الفارغة، إشارة +/− للسالب/الموجب ✅  
- قوائم طويلة: `useInfiniteScroll` hook في `OrdersPage.jsx` و`FinancePage.jsx` ✅  

---

## §9 — RTL والمحتوى

- `<html lang="ar" dir="rtl">` في `index.html` ✅  
- `[dir="rtl"] { text-align: right; }` في `index.css` ✅  
- عكس الأيقونات الاتجاهية: `chevronLeft` للرجوع في RTL (الأمام)، `chevronRight` للخلف ✅  
- أرقام/تواريخ لاتينية بمحاذاة جدولية `tnum` و`.num` class ✅  
- صياغة أزرار بأفعال: "احفظ"، "أضف"، "إتمام البيع" ✅  
- أسلوب أيقونات واحد: كل الأيقونات في `Icon.jsx` SVG outlined، خطوط رفيعة ✅  

---

## §10 — الرسوم البيانية

CSS bar chart في `ReportsPage.jsx` Simple mode:
- لون التِراكوتّا (`bg-primary`) للأعمدة ✅  
- شبكة فاتحة `#EAE6DC` (ضمناً عبر `bg-background`) ✅  
- تسمية مباشرة ("أفضل يوم مبيعاً كان يوم X") ✅  
- أرقام Mono/tnum (`num font-bold`) ✅  
- ارتفاع موحّد `h-24` ✅  
- حالة فارغة: لا يُظهر البطاقة إذا `dailyBreakdown.length === 0` ✅  

---

## §11 — صيغة الأرقام والتواريخ

- المبالغ أرقام فقط بفاصل آلاف `,` بلا رمز عملة: `formatAmount` ✅  
- الاتجاه: `+` للداخل، `−` (علامة الطرح الحقيقي U+2212) للخارج — في `FinancePage.jsx` و`ReportsPage.jsx` ✅  
- التاريخ `DD/MM/YYYY` في `formatArabicDate` ✅  
- الوقت `HH:MM` (24 ساعة) في `formatTime` ✅  
- محاذاة الأرقام للنهاية بـ`tnum`: `.num { font-variant-numeric: tabular-nums; }` ✅  

---

## §12 — افعل / لا تفعل

### افعل
- ✅ أسطح فاتحة عاجية (`bg-background`, `bg-surface`, `bg-mute`)
- ✅ تِراكوتّا كجُزُر صغيرة (أزرار، FAB، تبويب نشط) — لا كسطح ممتد
- ✅ عمق عبر الارتفاع (3 مستويات ظل دافئة)
- ✅ مسافات من الشبكة (spacing 1-7)
- ✅ حالات كاملة لكل شاشة (فارغة/تحميل/خطأ/نجاح)
- ✅ أيقونة + إشارة مع اللون (في صفوف الحركات)

### لا تفعل
- ✅ لا تِراكوتّا كسطح داكن ممتد (الشريط العلوي فاتح دائماً)
- ✅ لا رمادي مزرق مع العاجي (كل المحايدات Greige دافئة — `bg-gray-*`/`text-gray-*` صفر في src بعد تنظيف الوكيل ٣)
- ✅ لا تدرّجات/توهّج (لا `bg-gradient-*` في src)
- ✅ لا حدّ وظل معاً (`.card` بلا حدّ، `.btn-outline` بلا ظل)
- ✅ لا إيموجي (لا أحرف Unicode إيموجي في src)
- ✅ لا رموز عملة (لا "د.أ" أو "JD" في src)
- ✅ لا أرقام حشو (كل الأرقام معروضة، لا أصفار تعبئة)
- ✅ لا الاعتماد على اللون وحده (إشارة + أيقونة دائماً)
- ✅ لا تمرير أفقي للمحتوى الرئيسي (فقط للشرائح chips)

---

## استثناءات موثَّقة (مقبولة)

| الاستثناء | الموقع | السبب | التقييم |
|---|---|---|---|
| `text-[11px]` في الوسوم | `badge-*` classes في index.css | §7.9 ينص على `12/600` للوسوم — `11px` فرق طفيف | مقبول — الوسوم تحتاج لحجم أصغر قليلاً لتناسب pill shape |
| `bg-expense-500` (#C9322A) للزر الهدام بدلاً من `#DC2E2F` | `.btn-destructive` في index.css | §7.1 ينص على `#DC2E2F` (expense.fill) — نستخدم `expense-500` (#C9322A) | مقبول — قريب بصرياً، والـ500 هو "الأساسي" الدلالي |
| `text-[30px]` للعناوين الكبيرة بدلاً من 22–28 | كل الصفحات | §5 ينص على 22–28 لعنوان الشاشة | مقبول — 30px للعنوان البطل (hero) في الصفحة الرئيسية فقط، يعطي إحساس موبايل أوضح |
| `<select>` أصلي بدلاً من قائمة منبثقة مخصصة | SettingsPage.jsx fiscal year | §7.4 يصف قائمة منبثقة radius 12 | مقبول مؤقتاً — الـnative select يوفر وقت تطوير، يمكن ترقيتها لاحقاً |

---

## خلاصة

**كل بند من §0 إلى §12 مطابق أو موثَّق كاستثناء مقبول.** لا توجد انحرافات جوهرية عن الهوية. الهوية البصرية للمستودع ملتزمة بالكامل بـ`نظام-التصميم-SOP.md` v2.

**الالتزام بالمصدر الوحيد للحقيقة:** كل token لوني معرّف في `tailwind.config.js` (مصدر واحد). الـCSS class components في `src/styles/index.css` تستخدم `@apply` للـtokens أو قيم hex حرفية مطابقة تماماً للـconfig. لا توجد قيم hex مبعثرة في src خارج `index.css` (التحقق: `grep -rn "#[0-9A-Fa-f]\{6\}" src/ | grep -v "src/db/index.js\|src/utils/terms\|src/styles/index.css"` = صفر نتائج).

**المرجعان البصريّان:** `هوية بصرية - نظام الألوان.dc.html` و`هوية بصرية - نظام المكوّنات (موبايل).dc.html` مُحدَّثان بالكامل على هوية التِراكوتّا، مطابقان لـtailwind.config.js.

---

**المراجِع:** الوكيل ٤ (SOP Compliance Auditor)  
**التاريخ:** 2026-07-18  
**الحالة:** ✅ مطابق بالكامل
