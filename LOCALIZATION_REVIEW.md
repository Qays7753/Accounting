# Localization & Terminology Review — Agent 4

**Date**: 2026-07-15
**Reviewer**: Agent 4 — Localization & Terminology Specialist
**Scope**: Review all Arabic UI strings for Levant-wide universality (Jordan, Palestine, Syria, Lebanon), professional tone, and clarity for low-tech users.
**Method**: Extracted all Arabic strings from the codebase, evaluated each for regional comprehension, and proposed a user-facing terminology customization system.

---

## Executive Summary

The app's Arabic copy is **generally good** — it uses Modern Standard Arabic (MSA) that is widely understood across the Levant. However, the review identified **15 terminology issues** ranging from minor regional ambiguity to terms that may confuse specific business types. The most impactful recommendation is to add a **Terminology Customization feature** (already proposed in `PRODUCT_STRATEGY.md`) so each business can adapt labels to their domain.

**Top 3 Findings:**
1. **"زبون" vs "عميل" vs "مراجع"** — The app uses "زبون" (customer) exclusively, but clinics say "مراجع", lawyers say "موكل", and some regions prefer "عميل". Needs customization.
2. **"طلب" is too generic** — For a tutor, it's "حصة" (session). For a clinic, it's "موعد" (appointment). For a barber, it's "زيارة" (visit). The term "طلب" (order) feels transactional for service businesses.
3. **"قبض" and "صرف"** — These are excellent Levant-wide terms, but may need tooltip explanations for very low-tech users who might expect "دخل" (income) and "خرج" (expense).

---

## 1. Current Arabic String Inventory

### 1.1 Navigation & Headers
| Location | Current String | Assessment |
|----------|---------------|------------|
| Bottom Nav | الرئيسية | ✅ Universal |
| Bottom Nav | السجل المالي | ✅ Good, but "المالية" is shorter |
| Bottom Nav | الطلبات | 🟡 Too transactional for services |
| Bottom Nav | الإعدادات | ✅ Universal |
| Home Header | أهلاً بك | ✅ Universal, warm |
| Finance Header | السجل المالي | ✅ OK (same as nav) |
| Orders Header | الطلبات | 🟡 Same issue |
| Settings Header | الإعدادات | ✅ Universal |

### 1.2 Home Dashboard
| Location | Current String | Assessment |
|----------|---------------|------------|
| Cash Card | الرصيد المتاح | ✅ Universal |
| Cash Card subtitle | إجمالي النقد المتاح حالياً | ✅ Clear |
| Today's Income | قبض اليوم | ✅ Levant-standard |
| Today's Expense | صرف اليوم | ✅ Levant-standard |
| Month Summary | ملخص هذا الشهر | ✅ Universal |
| Month labels | القبض / الصرف / صافي الربح | ✅ Good |
| Upcoming Orders | الطلبات القادمة | 🟡 "القادمة" is OK but "القادمة" could be "القادمة" — no issue |

### 1.3 Finance Page
| Location | Current String | Assessment |
|----------|---------------|------------|
| Search placeholder | ابحث في المعاملات... | ✅ Universal |
| Filter: Today | اليوم | ✅ Universal |
| Filter: This Week | هذا الأسبوع | ✅ Universal |
| Filter: This Month | هذا الشهر | ✅ Universal |
| Filter: All | الكل | ✅ Universal |
| Summary labels | قبض / صرف / سحب شخصي | ✅ Good |
| Transaction label (income) | قبض | ✅ Levant-standard |
| Transaction label (expense) | صرف | ✅ Levant-standard |
| Transaction label (withdrawal) | سحب شخصي | ✅ Clear and distinct |
| Delete action | حذف | ✅ Universal |
| Undo snackbar | تم حذف المعاملة / تراجع | ✅ Universal |

### 1.4 Orders Page
| Location | Current String | Assessment |
|----------|---------------|------------|
| View toggle | قائمة / تقويم | ✅ Universal |
| Status: In Progress | قيد التنفيذ | ✅ Professional, universal |
| Status: Ready | جاهز | ✅ Universal |
| Status: Closed | مغلق | 🟡 Could be "تم التسليم" for services |
| New Order button | + (icon) | ✅ Icon is universal |
| Order Type field | نوع الطلب | 🟡 "نوع الطلب" is OK for shops, but services need "نوع الخدمة" |
| Order Type suggestions | إصلاح، صيانة، شراء، حجز، تركيب، خدمة، توريد | ✅ Good variety |
| Customer Name | اسم الزبون | 🟡 See "زبون" discussion below |
| Amount | المبلغ | ✅ Universal |
| Scheduled Date | التاريخ | ✅ Universal |
| Scheduled Time | الوقت | ✅ Universal |
| Notes | ملاحظات | ✅ Universal |
| Fallback customer | زبون | 🟡 Same as above |

### 1.5 Settings Page
| Location | Current String | Assessment |
|----------|---------------|------------|
| Section: Data Management | إدارة البيانات | ✅ Universal |
| Backup | نسخة احتياطية | ✅ Universal |
| Backup description | تصدير البيانات إلى ملف | ✅ Clear |
| Restore | استعادة من نسخة | ✅ Universal |
| Restore description | استيراد البيانات من ملف | ✅ Clear |
| Section: WhatsApp | واتساب | ✅ Universal (brand name) |
| WhatsApp Template | قالب رسالة الطلب | 🟡 "الطلب" again — for services, "الرسالة" alone is better |
| Section: Security | الأمان | ✅ Universal |
| PIN Lock | قفل التطبيق برمز PIN | ✅ Clear |
| Section: App | التطبيق | ✅ Universal |
| Install Instructions | كيفية تثبيت التطبيق | ✅ Universal |
| About | حول التطبيق | ✅ Universal |
| Factory Reset | حذف جميع البيانات | ✅ Clear (dangerous action, clear wording) |
| Notifications | تفعيل تذكيرات الطلبات | 🟡 "تذكيرات الطلبات" — for services, "تذكيرات المواعيد" is better |

### 1.6 Onboarding
| Location | Current String | Assessment |
|----------|---------------|------------|
| Welcome title | أهلاً بك في الحسابات | ✅ Warm, universal |
| Welcome subtitle | للبدء، لا تحتاج لسجلات سابقة. فقط أدخل ما تملكه الآن. | ✅ Excellent — reduces anxiety |
| Cash step title | كم تملك من النقد الآن؟ | ✅ Direct, clear |
| Cash step description | أدخل المبلغ الذي تملكه حالياً نقداً (في الصندوق أو البنك). سيكون هذا هو رصيدك الافتتاحي. | ✅ Very clear, "الصندوق" is commonly understood |
| Debts step title | الديون (اختياري) | ✅ Universal |
| Debts step label 1 | ديون لي على الآخرين (يطلبون مني) | 🟡 "يطلبون مني" is colloquial Jordanian. "مستحقة لي" is more professional |
| Debts step label 2 | ديون علي للآخرين (أطلب منهم) | 🟡 Same — "أطلب منهم" is colloquial |
| Done title | تم الإعداد بنجاح! | ✅ Universal |

### 1.7 Transaction Form
| Location | Current String | Assessment |
|----------|---------------|------------|
| Income title | تسجيل قبض | ✅ Levant-standard |
| Expense title | تسجيل صرف | ✅ Levant-standard |
| Withdrawal title | سحب شخصي | ✅ Clear |
| Amount label (income) | المبلغ المستلم | ✅ Universal |
| Amount label (expense) | المبلغ المدفوع | ✅ Universal |
| Amount label (withdrawal) | المبلغ المسحوب | ✅ Universal |
| Description | الوصف | ✅ Universal |
| Description placeholder (income) | مثال: دفعة من زبون، مبيعات اليوم... | 🟡 "زبون" issue |
| Description placeholder (expense) | مثال: شراء مواد، فاتورة كهرباء... | ✅ Good examples |
| Description placeholder (withdrawal) | مثال: سحب للمصروف الشخصي... | ✅ Clear |
| Category | الفئة | ✅ Universal |
| Category placeholder | الفئة (اختياري) | ✅ Clear |
| Save button | حفظ | ✅ Universal |
| Update button | تحديث | ✅ Universal |

### 1.8 Order Detail Sheet
| Location | Current String | Assessment |
|----------|---------------|------------|
| Title | تفاصيل الطلب | 🟡 "الطلب" issue |
| Amount | المبلغ | ✅ Universal |
| Scheduled Date | موعد التنفيذ | ✅ Good — "موعد" works for both products and services |
| Notes | ملاحظات | ✅ Universal |
| Linked Payments | مدفوعات مرتبطة | ✅ Clear |
| Change Status | تغيير الحالة | ✅ Universal |
| Share | مشاركة | ✅ Universal |
| Edit | تعديل | ✅ Universal |
| Delete | حذف الطلب | 🟡 "الطلب" issue |
| Delete confirm | اضغط للتأكيد - سيتم حذف الطلب نهائياً | ✅ Clear warning |

---

## 2. Critical Terminology Issues

### Issue #1: "زبون" (Customer) — Regional & Domain Variation

**Current**: "زبون" used everywhere (7 occurrences)

**Problem**: 
- In Jordan/Palestine: "زبون" is common in retail/food
- In Syria: "عميل" is more common
- In clinics: "مراجع" or "مريض" (patient)
- In legal: "موكل" (client)
- In salons: "زبون" is OK
- Some users find "زبون" too informal

**Recommendation**: 
- Keep "زبون" as default (most universally understood in Levant retail context)
- Add terminology customization so clinics can switch to "مريض", lawyers to "موكل", etc.
- Presets in terminology settings:
  - متجر (Shop): زبون
  - عيادة (Clinic): مريض
  - صالون (Salon): عميل
  - مدرس (Tutor): طالب
  - تصليح (Repair): عميل

**Affected files**: `OrderFormSheet.jsx`, `OrdersPage.jsx`, `whatsapp.js` (template), description placeholders

---

### Issue #2: "طلب" (Order) — Too Transactional for Services

**Current**: "طلب" used in nav, headers, forms, detail sheets (12+ occurrences)

**Problem**:
- For a tutor: "حصة" (session) — "طلب" feels wrong
- For a clinic: "موعد" (appointment) — "طلب" is impersonal
- For a barber: "زيارة" (visit) — "طلب" is too commercial
- For a plumber: "مهمة" or "استدعاء" — "طلب" is OK but not ideal
- "طلب" implies a physical product being ordered, which alienates service businesses

**Recommendation**:
- Keep "الطلبات" as default (broadest coverage for retail/product businesses)
- Terminology customization with presets:
  - متجر: الطلبات / طلب / نوع الطلب
  - عيادة: المواعيد / موعد / نوع العلاج
  - صالون: الحجوزات / حجز / الخدمة
  - مدرس: الحصص / حصة / المادة
  - تصليح: التذاكر / تذكرة / نوع الصيانة
- The `useTerms()` hook (proposed in `PRODUCT_STRATEGY.md`) would replace all hardcoded strings

**Affected files**: `BottomNav.jsx`, `OrdersPage.jsx`, `OrderFormSheet.jsx`, `OrderDetailSheet.jsx`, `Fab.jsx`, `HomePage.jsx`

---

### Issue #3: "مغلق" (Closed) — Ambiguous for Services

**Current**: Status "closed" → "مغلق"

**Problem**: 
- For a shop: "مغلق" means the order is done ✅
- For a clinic: "مغلق" sounds like the clinic is closed (confusing)
- For a service: "تم التنفيذ" or "مكتمل" is clearer

**Recommendation**:
- Change "مغلق" to "تم التسليم" (Delivered) for product businesses
- Or make status labels customizable via terminology settings
- Best option: change to "مكتمل" (Completed) which works for both products and services

**Affected files**: `OrdersPage.jsx`, `OrderFormSheet.jsx`, `OrderDetailSheet.jsx`, `CalendarView.jsx`, `whatsapp.js`

---

### Issue #4: Colloquial Phrasing in Onboarding

**Current**:
- "ديون لي على الآخرين (يطلبون مني)" — "يطلبون مني" is colloquial Jordanian
- "ديون علي للآخرين (أطلب منهم)" — "أطلب منهم" is colloquial

**Problem**: These parenthetical explanations use informal spoken Arabic. While clear to Jordanians, Syrian/Palestinian users might find the phrasing odd. Also, mixing MSA with colloquial in the same sentence is jarring.

**Recommendation**:
- Change to: "ديون لي على الآخرين (مستحقة لي)"
- Change to: "ديون علي للآخرين (مستحقة علي)"
- "مستحقة" is professional MSA understood across all Levant countries

**Affected files**: `OnboardingPage.jsx`

---

### Issue #5: "سحب شخصي" Clarity

**Current**: "سحب شخصي" (Personal Withdrawal)

**Assessment**: ✅ Good — this is universally understood. However, for extra clarity, the description "سحب نقدي للاستخدام الشخصي" could be simplified to "سحب من الكاش للمصروف الشخصي" to reinforce that it comes from the cash balance.

**Recommendation**: Minor — keep as is, but consider adding a one-line explanation in the form: "هذا السحب لا يؤثر على حساب الأرباح، فقط على الرصيد المتاح" (This withdrawal doesn't affect profit calculation, only available cash).

**Affected files**: `Fab.jsx`, `TransactionFormSheet.jsx`

---

## 3. Regional Dialect Comparison

### Terms That Vary Across the Levant

| English | Jordan/Palestine | Syria | Lebanon | Recommended Default |
|---------|-----------------|-------|---------|-------------------|
| Customer | زبون | عميل | زبون/عميل | زبون (customizable) |
| Money In | قبض | قبض / دخل | قبض | قبض ✅ |
| Money Out | صرف | صرف / خرج | صرف | صرف ✅ |
| Order | طلب | طلب | طلب | طلب (customizable) |
| Cash | نقد / كاش | نقد / مصاري | نقد / كاش | نقد ✅ |
| Profit | ربح | ربح | ربح | ربح ✅ |
| Expense | مصروف | مصروف | مصروف | ✅ (used in descriptions) |
| Bill/Invoice | فاتورة | فاتورة | فاتورة | فاتورة ✅ |
| Rent | إيجار | أجرة | إيجار | إيجار ✅ |
| Salary | راتب | راتب / أجر | راتب | راتب ✅ |

**Conclusion**: "قبض" and "صرف" are excellent choices — they are the standard accounting terms across the entire Levant and are more professional than colloquial alternatives like "دخل/خرج".

---

## 4. Proposed Terminology Customization Feature

### 4.1 Architecture (from PRODUCT_STRATEGY.md)

```js
// Default terminology stored in Dexie settings table
const DEFAULT_TERMS = {
  // Navigation
  nav_home: 'الرئيسية',
  nav_finance: 'السجل المالي',
  nav_orders: 'الطلبات',
  nav_settings: 'الإعدادات',

  // Orders domain
  orders: 'الطلبات',           // plural (nav, page title)
  order: 'طلب',                // singular (new order, delete order)
  orderType: 'نوع الطلب',      // field label
  newOrder: 'طلب جديد',        // FAB action
  orderDetails: 'تفاصيل الطلب', // sheet title

  // Customer
  customer: 'الزبون',          // generic
  customerName: 'اسم الزبون',  // field label
  customerFallback: 'زبون',    // when no name entered

  // Status
  status_in_progress: 'قيد التنفيذ',
  status_ready: 'جاهز',
  status_closed: 'مكتمل',      // CHANGED from 'مغلق'

  // Transactions
  income: 'قبض',
  expense: 'صرف',
  withdrawal: 'سحب شخصي',
  income_action: 'تسجيل قبض',
  expense_action: 'تسجيل صرف',
  withdrawal_action: 'سحب شخصي',

  // Finance
  cash_balance: 'الرصيد المتاح',
  today_income: 'قبض اليوم',
  today_expense: 'صرف اليوم',
  net_profit: 'صافي الربح',
  search_transactions: 'ابحث في المعاملات...',

  // Settings
  backup: 'نسخة احتياطية',
  restore: 'استعادة من نسخة',
  whatsapp_template: 'قالب رسالة واتساب',
  notifications: 'تفعيل التذكيرات',
}
```

### 4.2 Preset Packs

```js
const TERM_PRESETS = {
  shop: {
    label: 'متجر',
    terms: { ...DEFAULT_TERMS } // Default is shop-oriented
  },
  clinic: {
    label: 'عيادة',
    terms: {
      ...DEFAULT_TERMS,
      nav_orders: 'المواعيد',
      order: 'موعد',
      orders: 'المواعيد',
      orderType: 'نوع العلاج',
      newOrder: 'موعد جديد',
      orderDetails: 'تفاصيل الموعد',
      customer: 'المريض',
      customerName: 'اسم المريض',
      customerFallback: 'مريض',
      status_closed: 'اكتملت الزيارة',
    }
  },
  salon: {
    label: 'صالون',
    terms: {
      ...DEFAULT_TERMS,
      nav_orders: 'الحجوزات',
      order: 'حجز',
      orders: 'الحجوزات',
      orderType: 'الخدمة',
      newOrder: 'حجز جديد',
      orderDetails: 'تفاصيل الحجز',
      customer: 'العميل',
      customerName: 'اسم العميل',
      customerFallback: 'عميل',
    }
  },
  tutor: {
    label: 'مدرس خاص',
    terms: {
      ...DEFAULT_TERMS,
      nav_orders: 'الحصص',
      order: 'حصة',
      orders: 'الحصص',
      orderType: 'المادة',
      newOrder: 'حصة جديدة',
      orderDetails: 'تفاصيل الحصة',
      customer: 'الطالب',
      customerName: 'اسم الطالب',
      customerFallback: 'طالب',
      status_in_progress: 'مجدولة',
      status_ready: 'اكتملت',
      status_closed: 'تمت',
    }
  },
  repair: {
    label: 'تصليح',
    terms: {
      ...DEFAULT_TERMS,
      nav_orders: 'التذاكر',
      order: 'تذكرة',
      orders: 'التذاكر',
      orderType: 'نوع الصيانة',
      newOrder: 'تذكرة جديدة',
      orderDetails: 'تفاصيل التذكرة',
      customer: 'العميل',
      customerName: 'اسم العميل',
      customerFallback: 'عميل',
    }
  },
}
```

### 4.3 Implementation in React

```jsx
// src/context/TerminologyContext.jsx
import { createContext, useContext } from 'react'
import { useSettings } from '../hooks/useDatabase.js'
import { DEFAULT_TERMS } from '../utils/terminology.js'

const TerminologyContext = createContext(DEFAULT_TERMS)

export function TerminologyProvider({ children }) {
  const { settings } = useSettings()
  const terms = { ...DEFAULT_TERMS, ...(settings.custom_terms || {}) }
  return (
    <TerminologyContext.Provider value={terms}>
      {children}
    </TerminologyContext.Provider>
  )
}

export function useTerms() {
  return useContext(TerminologyContext)
}
```

```jsx
// Usage in OrdersPage.jsx:
import { useTerms } from '../context/TerminologyContext.jsx'

export default function OrdersPage() {
  const t = useTerms()
  return <h1>{t.orders}</h1>
}
```

### 4.4 Settings UI

The Settings page would have a "المصطلحات" (Terminology) section with:
1. Preset selector (Shop/Clinic/Salon/Tutor/Repair/Custom)
2. Editable fields for each term (visible when "Custom" is selected)
3. Live preview of how labels will appear
4. Save button persists to `settings.custom_terms`

---

## 5. String-by-String Recommendations

### Changes to Make Immediately (Low Risk)

| File | Current | Recommended | Reason |
|------|---------|-------------|--------|
| `OnboardingPage.jsx` | ديون لي على الآخرين (يطلبون مني) | ديون لي على الآخرين (مستحقة لي) | Professional MSA over colloquial |
| `OnboardingPage.jsx` | ديون علي للآخرين (أطلب منهم) | ديون علي للآخرين (مستحقة علي) | Same |
| `OrdersPage.jsx` | مغلق | مكتمل | Less ambiguous for services |
| `OrderFormSheet.jsx` | مغلق | مكتمل | Same |
| `OrderDetailSheet.jsx` | مغلق | مكتمل | Same |
| `CalendarView.jsx` | مغلق | مكتمل | Same |
| `whatsapp.js` | مغلق | مكتمل | Same |

### Changes to Defer to Terminology Feature (Medium Risk)

| Term | Default | Customizable To |
|------|---------|-----------------|
| الطلبات | (keep as default) | المواعيد / الحجوزات / الحصص / التذاكر |
| الزبون | (keep as default) | المريض / العميل / الطالب |
| نوع الطلب | (keep as default) | نوع العلاج / الخدمة / المادة / نوع الصيانة |
| طلب جديد | (keep as default) | موعد جديد / حجز جديد / حصة جديدة / تذكرة جديدة |
| تفاصيل الطلب | (keep as default) | تفاصيل الموعد / تفاصيل الحجز / etc. |

### Strings That Are Perfect (No Change)

- قبض / صرف / سحب شخصي — Excellent Levant-wide accounting terms
- الرصيد المتاح — Clear and professional
- صافي الربح — Universal business term
- اليوم / هذا الأسبوع / هذا الشهر / الكل — Universal
- حفظ / تحديث / حذف / تعديل / مشاركة — Universal action verbs
- قائمة / تقويم — Universal
- قيد التنفيذ / جاهز — Clear status labels
- نسخة احتياطية / استعادة — Universal

---

## 6. Right-to-Left (RTL) Considerations

### Current State: ✅ Excellent
- `dir="rtl"` set on `<html>` in `index.html`
- `lang="ar"` set on `<html>`
- All text inputs have `dir="rtl"` for Arabic, `dir="ltr"` for numbers/dates
- Icons are direction-neutral (SVG strokes)
- Bottom sheet animations work correctly in RTL

### Minor RTL Issues Found
1. **Toggle switch direction**: Already fixed in Agent 2 audit (knob slides left for ON in RTL)
2. **Swipe direction**: Swipe-to-delete works correctly (swipe left reveals delete on right)
3. **Chevron icons**: "chevronLeft" is used for "forward" navigation in RTL (correct — in RTL, left = forward)

### RTL Recommendation
No changes needed — RTL implementation is solid.

---

## 7. Number Formatting Review

### Current State: ✅ Compliant
- All amounts use `formatAmount()` which calls `toLocaleString('en-US')`
- Example: 1500 → "1,500"
- No currency symbols displayed (per requirements)
- `inputmode="decimal"` on amount inputs
- Live comma formatting while typing in `AmountInput`

### Recommendation
No changes needed — number formatting is correct and consistent.

---

## 8. Date/Time Formatting Review

### Current State: ✅ Good
- Arabic month names: يناير، فبراير، مارس، أبريل، مايو، يونيو، يوليو، أغسطس، سبتمبر، أكتوبر، نوفمبر، ديسمبر
- 12-hour format with ص/م (AM/PM)
- Relative time: "قبل ساعة"، "قبل 3 ساعات"، "أمس"

### Minor Issue
- The month names used are the **Levant/Egyptian variant** (أبريل، مايو، يونيو). In Syria, some prefer the **Syrian variant** (نيسان، أيار، حزيران). However, the Levant variants are more universally understood.
- **Recommendation**: Keep current month names. They are the most widely recognized across the Arab world.

### Date Format
- Current: `15 يوليو 2026` (DD Month YYYY) — ✅ Universal and clear
- Time: `10:30 ص` — ✅ Universal

---

## 9. Accessibility & Screen Reader Considerations

### Current State: ✅ Good (improved by Agent 2 audit)
- All interactive elements have `aria-label`
- Bottom sheets have `role="dialog"` and `aria-modal="true"`
- Snackbar has `role="status"` and `aria-live="polite"`
- Toggle switches have `role="switch"` and `aria-checked`

### Recommendation for Arabic Screen Readers
- Ensure all `aria-label` values use MSA (not colloquial) — ✅ currently compliant
- Add `aria-describedby` on form inputs to associate with help text — future enhancement

---

## 10. Summary of Recommendations

### Priority 1 — Immediate Changes (30 minutes)
1. Change "مغلق" → "مكتمل" (5 files)
2. Fix colloquial onboarding text: "يطلبون مني" → "مستحقة لي" (1 file)
3. Add clarification tooltip to "سحب شخصي": "لا يؤثر على الأرباح"

### Priority 2 — Terminology Feature (1-2 days)
4. Implement `TerminologyContext` + `useTerms()` hook
5. Add terminology settings with 5 presets (Shop/Clinic/Salon/Tutor/Repair)
6. Replace all hardcoded "الطلبات", "الزبون", "نوع الطلب" with `t.orders`, `t.customer`, `t.orderType`
7. Store custom terms in Dexie `settings` table

### Priority 3 — Future Enhancements
8. Add dialect switch (Levantine vs Gulf vs Egyptian month names)
9. Add tooltip explanations for accounting terms ("قبض = المبلغ الذي تستلمه")
10. Add bilingual mode (Arabic/English) for tourist-facing businesses

---

## Conclusion

The app's Arabic localization is **above average** for a MENA-targeted PWA. The use of "قبض/صرف" instead of colloquial "دخل/خرج" shows domain awareness. The main gap is the one-size-fits-all terminology that doesn't adapt to different business types (clinic vs shop vs tutor).

The proposed Terminology Customization feature (detailed in `PRODUCT_STRATEGY.md` section 1.3) is the single highest-impact localization improvement. It would make the app feel native to each business type without requiring separate app builds or code forks.

The immediate string changes (Priority 1) can be done in under 30 minutes and improve professionalism without any architectural changes.
