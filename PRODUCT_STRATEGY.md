# Product Strategy — Agent 2: Customization & High-Impact Features

**Date**: 2026-07-15
**Strategist**: Agent 2 — Product Strategist
**Objective**: Define a customization/white-label strategy and prioritize high-impact features that address the friction points identified by Agent 1.

---

## Executive Summary

This document presents two strategic initiatives:

1. **Customization & White-Label Strategy**: Allow users to personalize the app's theme, branding, and terminology — making it feel like "their" app and increasing retention.
2. **High-Impact Feature Roadmap**: Three features (Recurring Transactions, WhatsApp Invoicing, Debt Tracking Dashboard) that directly solve the critical friction points from the UX report.

Each feature includes a technical implementation plan grounded in the existing React + Vite + Dexie.js + Tailwind architecture.

---

## Part 1: Customization & White-Label Strategy

### 1.1 Theme Customization (Primary Color)

**User Need**: Different businesses have different brand colors. A bakery might want warm orange, a clinic might want calming teal. Currently, the app is locked to Samsung Blue.

**User Flow**:
1. Settings → Appearance → Primary Color
2. Color picker (preset palette + custom hex input)
3. App instantly re-renders with new primary color
4. Income/Expense/Withdrawal colors remain fixed (semantic), only primary changes

**Technical Implementation**:

**Step 1: CSS Variables in `src/styles/index.css`**
```css
:root {
  --color-primary: #1F6FE8;
  --color-primary-50: #E8F1FE;
  --color-primary-100: #D0E2FD;
  /* ... shades 200-900 */
}
```

**Step 2: Tailwind Config uses CSS variables**
```js
// tailwind.config.js
colors: {
  primary: {
    DEFAULT: 'var(--color-primary)',
    50: 'var(--color-primary-50)',
    // ...
  }
}
```

**Step 3: Settings stores the chosen color**
```js
// On color selection:
await db.setSetting('theme_primary_color', '#FF6B35')
applyTheme('#FF6B35')
```

**Step 4: `applyTheme()` generates shades and sets CSS variables**
```js
function applyTheme(hex) {
  const shades = generateShades(hex) // { 50, 100, ..., 900 }
  Object.entries(shades).forEach(([shade, color]) => {
    document.documentElement.style.setProperty(`--color-primary-${shade}`, color)
  })
}
```

**Step 5: Load on app launch** (in `App.jsx`):
```js
useEffect(() => {
  const color = await db.getSetting('theme_primary_color', '#1F6FE8')
  applyTheme(color)
}, [])
```

**Effort**: 4-6 hours (CSS variable migration + color picker UI + shade generation utility)

**Preset Palette** (One UI-inspired):
- Samsung Blue `#1F6FE8` (default)
- Warm Orange `#FF6B35` (bakeries, food)
- Forest Green `#2E7D32` (grocery, agriculture)
- Royal Purple `#7B1FA2` (beauty, tailoring)
- Teal `#00897B` (clinic, health)
- Crimson `#C62828` (repair, hardware)
- Custom (hex input)

---

### 1.2 Branding (Logo Upload)

**User Need**: Replace the default wallet icon in the header with the business's logo. Creates ownership and pride.

**User Flow**:
1. Settings → Branding → Upload Logo
2. File picker (image/png, image/jpeg)
3. Logo stored locally (IndexedDB blob or base64)
4. Header shows logo instead of default icon
5. Optional: Business name text appears next to logo

**Technical Implementation**:

**Step 1: Store logo in Dexie as base64**
```js
// New setting: 'brand_logo' (base64 string)
// New setting: 'business_name' (string)
async function uploadLogo(file) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64 = e.target.result
    // Resize to 128x128 using canvas to keep storage small
    const resized = await resizeImage(base64, 128, 128)
    await db.setSetting('brand_logo', resized)
    await db.setSetting('business_name', name)
  }
  reader.readAsDataURL(file)
}
```

**Step 2: Image resize utility** (canvas-based, no external lib)
```js
function resizeImage(base64, maxW, maxH) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxW / img.width, maxH / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = base64
  })
}
```

**Step 3: Header component reads logo**
```jsx
// In HomePage header:
const { settings } = useSettings()
{settings.brand_logo ? (
  <img src={settings.brand_logo} alt="logo" className="w-11 h-11 rounded-full object-cover" />
) : (
  <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center">
    <Icon name="wallet" />
  </div>
)}
{settings.business_name && (
  <h1 className="text-2xl font-bold">{settings.business_name}</h1>
)}
```

**Effort**: 3-4 hours (upload UI + resize util + header integration)

---

### 1.3 Terminology Customization (Menu Labels)

**User Need**: Different businesses use different terms. A tutor calls them "sessions" not "orders". A clinic calls them "appointments". A barber calls them "visits". Currently, the bottom nav says "الطلبات" (Orders) for everyone.

**User Flow**:
1. Settings → Terminology → Edit Labels
2. Form with current labels as defaults:
   - "Orders" → "Sessions" / "Appointments" / "Visits"
   - "Customer Name" → "Patient Name" / "Student Name"
   - "Order Type" → "Service" / "Treatment"
3. Changes apply instantly across the app

**Technical Implementation**:

**Step 1: Terminology settings in Dexie**
```js
// Default terminology
const DEFAULT_TERMS = {
  orders: 'الطلبات',
  order: 'طلب',
  customer: 'الزبون',
  customerName: 'اسم الزبون',
  orderType: 'نوع الطلب',
  newOrder: 'طلب جديد',
}
// Stored as setting: 'custom_terms' = { ...DEFAULT_TERMS, ...userOverrides }
```

**Step 2: `useTerms()` hook**
```js
export function useTerms() {
  const { settings } = useSettings()
  return { ...DEFAULT_TERMS, ...(settings.custom_terms || {}) }
}
```

**Step 3: Replace hardcoded strings**
```jsx
// Before:
<h1>الطلبات</h1>
// After:
const t = useTerms()
<h1>{t.orders}</h1>
```

**Step 4: Terminology editor in Settings**
- Pre-built presets: "Shop", "Clinic", "Salon", "Tutor", "Custom"
- Each preset fills the form with appropriate terms
- Custom mode: edit each field individually

**Presets**:
| Preset | Orders → | Customer → | Order Type → |
|--------|----------|------------|-------------|
| Shop (default) | الطلبات | الزبون | نوع الطلب |
| Clinic | المواعيد | المريض | نوع العلاج |
| Salon | الحجوزات | العميل | الخدمة |
| Tutor | الحصص | الطالب | المادة |
| Repair | التذاكر | العميل | نوع الصيانة |

**Effort**: 6-8 hours (hook + string migration across all components + editor UI)

---

## Part 2: High-Impact Feature Roadmap

### 2.1 Recurring Transactions (P0 — Directly solves UX Friction #3)

**Problem**: Monthly rent, bills, subscriptions must be manually re-entered every cycle. Causes churn.

**Solution**: Users can mark any transaction as "recurring" with a frequency. The app auto-generates transactions on schedule.

**User Flow**:
1. In TransactionFormSheet, new toggle: "تكرار" (Repeat)
2. Options: لا (No) | يومي (Daily) | أسبوعي (Weekly) | شهري (Monthly)
3. When saving, if repeat ≠ "No", also create a recurring rule
4. On app launch, check for due recurring rules, auto-generate transactions
5. Settings → Recurring tab: view/edit/pause all recurring rules

**Technical Implementation**:

**Step 1: New Dexie table (schema v4)**
```js
this.version(4).stores({
  // ... existing tables
  recurring: '++id, type, frequency, nextDate, active, createdAt'
})
```

**Step 2: Recurring record structure**
```js
{
  id: auto,
  type: 'income' | 'expense' | 'withdrawal',
  amount: 300,
  description: 'إيجار المحل',
  category: 'إيجار',
  frequency: 'monthly', // daily | weekly | monthly
  nextDate: epoch_ms, // next occurrence
  active: true,
  createdAt: epoch_ms,
}
```

**Step 3: Auto-generate on app launch** (in `App.jsx` or a dedicated module)
```js
export async function processRecurringTransactions() {
  const now = Date.now()
  const due = await db.recurring
    .where('nextDate')
    .belowOrEqual(now)
    .and(r => r.active)
    .toArray()

  for (const r of due) {
    // Create the transaction
    await db.addTransaction({
      type: r.type,
      amount: r.amount,
      description: r.description,
      category: r.category,
      date: new Date(r.nextDate),
      recurringId: r.id, // link back
    })

    // Advance nextDate
    const next = calculateNextDate(r.nextDate, r.frequency)
    await db.recurring.update(r.id, { nextDate: next })
  }

  return due.length // number of transactions generated
}
```

**Step 4: `calculateNextDate()` utility**
```js
function calculateNextDate(currentDate, frequency) {
  const d = new Date(currentDate)
  switch (frequency) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
  }
  return d.getTime()
}
```

**Step 5: UI in TransactionFormSheet**
```jsx
<div>
  <label>التكرار</label>
  <div className="grid grid-cols-4 gap-2">
    {[
      { value: 'none', label: 'بدون' },
      { value: 'daily', label: 'يومي' },
      { value: 'weekly', label: 'أسبوعي' },
      { value: 'monthly', label: 'شهري' },
    ].map(opt => (
      <button
        onClick={() => setFrequency(opt.value)}
        className={frequency === opt.value ? 'bg-primary text-white' : 'bg-background'}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>
```

**Step 6: Recurring management in Settings**
- List all active recurring rules
- Each row: description, amount, frequency, next date, pause/resume, delete
- "Paused" rules don't auto-generate but retain their nextDate

**Effort**: 1 day (schema + launch processor + UI toggle + management list)

---

### 2.2 WhatsApp Invoicing (P1 — Quick Win for Service Businesses)

**Problem**: Users want to send a simple payment receipt or invoice via WhatsApp. Currently, WhatsApp sharing only works for orders, not for general transactions.

**Solution**: A "Share Receipt" button on any transaction that generates a 3-line receipt and opens WhatsApp.

**User Flow**:
1. After saving a transaction, show "مشاركة إيصال" (Share Receipt) button
2. Or: In Finance list, tap a transaction → "Share Receipt"
3. Generates formatted receipt text
4. Opens WhatsApp share (Web Share API or wa.me)

**Receipt Format** (3-5 lines):
```
إيصال قبض

المبلغ: 1,500
الوصف: دفعة من زبون
التاريخ: 15 يوليو 2026

شكراً لتعاملكم معنا
```

**Technical Implementation**:

**Step 1: Receipt template function** (in `src/utils/whatsapp.js`)
```js
export function buildReceiptText(transaction, businessName) {
  const typeLabel = transaction.type === 'income' ? 'إيصال قبض' :
                    transaction.type === 'expense' ? 'إيصال صرف' : ''
  const amount = (transaction.amount || 0).toLocaleString('en-US')
  const date = formatArabicDate(transaction.date)
  const desc = transaction.description || ''

  return `${typeLabel}\n\nالمبلغ: ${amount}\n${desc ? `الوصف: ${desc}\n` : ''}التاريخ: ${date}\n\n${businessName || 'شكراً لتعاملكم معنا'}`
}
```

**Step 2: Share receipt function**
```js
export async function shareReceipt(transaction, businessName) {
  const text = buildReceiptText(transaction, businessName)
  if (navigator.share) {
    await navigator.share({ title: 'إيصال', text })
  } else {
    await navigator.clipboard.writeText(text)
    alert('تم نسخ الإيصال')
  }
}
```

**Step 3: UI trigger in TransactionFormSheet** (after save)
```jsx
{saved && (
  <button onClick={() => shareReceipt(savedTransaction, businessName)}>
    مشاركة إيصال واتساب
  </button>
)}
```

**Step 4: Optional: Receipt settings in SettingsPage**
- Editable receipt footer text ("شكراً لتعاملكم معنا")
- Toggle: show/hide business name on receipt
- Toggle: include a thank-you message

**Effort**: 3-4 hours (template + share function + UI button)

---

### 2.3 Debt Tracking Dashboard (P0 — Directly solves UX Friction #2)

**Problem**: No way to track ongoing receivables (customer owes me) or payables (I owe supplier). Makes app unusable for credit-based businesses.

**Solution**: A dedicated "Debts" section with two lists (owed to me / I owe), customer balances, and a settlement flow.

**User Flow**:
1. New 5th bottom-nav tab OR a section within Finance: "الديون" (Debts)
2. Two cards at top: "مستحق لي" (Owed to me: 450) | "مستحق علي" (I owe: 120)
3. List of debt records: customer name, amount, date, status (unpaid/partial/paid)
4. Tap a debt → detail view → "تسجيل دفعة" (Record Payment)
5. Payment creates an income transaction AND updates debt balance

**Technical Implementation**:

**Step 1: New transaction types**
```js
// Add to transaction types:
type: 'debt_given'    // I gave credit (customer owes me)
type: 'debt_settled'  // Customer paid back a debt
type: 'debt_taken'    // I took credit (I owe supplier)
type: 'debt_paid'     // I paid back a debt I owed
```

**Step 2: Transaction schema extension**
```js
// Add fields:
{
  ...existing,
  customerId: number | null,     // link to customer
  debtStatus: 'unpaid' | 'partial' | 'settled',
  debtAmountPaid: number,         // running total of partial payments
  linkedDebtTransactionId: number | null, // links settlement to original debt
}
```

**Step 3: Debt dashboard queries**
```js
// In db/index.js:
async getReceivables() {
  // All debt_given transactions where status !== 'settled'
  return await this.transactions
    .where('type').equals('debt_given')
    .and(t => t.debtStatus !== 'settled')
    .toArray()
}

async getPayables() {
  return await this.transactions
    .where('type').equals('debt_taken')
    .and(t => t.debtStatus !== 'settled')
    .toArray()
}

async getCustomerBalance(customerName) {
  const debts = await this.transactions
    .where('customerName').equals(customerName)
    .toArray()
  let owedToMe = 0, iOwe = 0
  for (const t of debts) {
    if (t.type === 'debt_given' && t.debtStatus !== 'settled') owedToMe += t.amount
    if (t.type === 'debt_taken' && t.debtStatus !== 'settled') iOwe += t.amount
  }
  return { owedToMe, iOwe, net: owedToMe - iOwe }
}

async settleDebt(debtTransactionId, paymentAmount) {
  const debt = await this.transactions.get(debtTransactionId)
  const newPaid = (debt.debtAmountPaid || 0) + paymentAmount
  const isFullySettled = newPaid >= debt.amount

  // Create the settlement transaction (income if receivable, expense if payable)
  await this.addTransaction({
    type: debt.type === 'debt_given' ? 'income' : 'expense',
    amount: paymentAmount,
    description: `تسديد دين: ${debt.description}`,
    category: 'تسديد دين',
    date: new Date(),
    linkedDebtTransactionId: debtTransactionId,
  })

  // Update the debt
  await this.updateTransaction(debtTransactionId, {
    debtAmountPaid: newPaid,
    debtStatus: isFullySettled ? 'settled' : 'partial',
  })
}
```

**Step 4: Debt form sheet** (new component)
- Fields: customer name, amount, description, type (owed to me / I owe), due date (optional)
- Creates a `debt_given` or `debt_taken` transaction

**Step 5: Debt dashboard component**
```jsx
function DebtDashboard() {
  const [receivables, setReceivables] = useState([])
  const [payables, setPayables] = useState([])

  useEffect(() => {
    db.getReceivables().then(setReceivables)
    db.getPayables().then(setPayables)
  }, [])

  const totalReceivable = receivables.reduce((s, d) => s + (d.amount - (d.debtAmountPaid || 0)), 0)
  const totalPayable = payables.reduce((s, d) => s + (d.amount - (d.debtAmountPaid || 0)), 0)

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card title="مستحق لي" amount={totalReceivable} color="income" />
        <Card title="مستحق علي" amount={totalPayable} color="expense" />
      </div>

      {/* Receivables list */}
      <DebtList title="ديون لي على الآخرين" debts={receivables} />

      {/* Payables list */}
      <DebtList title="ديون علي للآخرين" debts={payables} />
    </div>
  )
}
```

**Step 6: Home dashboard card**
```jsx
// In HomePage, add a card showing net debt position:
<div className="bg-surface rounded-2xl p-4 shadow-card">
  <p>صافي الديون</p>
  <p>{formatAmount(totalReceivable - totalPayable)}</p>
  <p>مستحق لي: {totalReceivable} | مستحق علي: {totalPayable}</p>
</div>
```

**Effort**: 2 days (schema + queries + debt form + dashboard + settlement flow + home card)

---

## Part 3: Implementation Priority & Quick Wins

### Top 3 "Quick Wins" (ship in 1 week or less)

| # | Feature | Effort | Impact | Why It's a Quick Win |
|---|---------|--------|--------|---------------------|
| 1 | **Edit Transaction** | 2-3 hours | 🔴 Critical | TransactionFormSheet already supports `editData` — only the UI trigger (tap card or swipe-edit) is missing. 100% of users benefit immediately. |
| 2 | **WhatsApp Invoicing** | 3-4 hours | 🟡 High | Builds on existing `shareOrderViaWhatsApp` pattern. Just needs a new `buildReceiptText()` function and a "Share Receipt" button. Service businesses (tutor, freelancer, repair) will use this daily. |
| 3 | **Theme Color Picker** | 4-6 hours | 🟡 High | CSS variable migration is straightforward. Users get instant personalization, increasing emotional ownership of the app. Differentiates from competitors. |

### Medium-Term Features (2-4 weeks)

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 4 | Recurring Transactions | 1 day | 🔴 Critical (prevents churn) |
| 5 | Debt Tracking Dashboard | 2 days | 🔴 Critical (unlocks credit businesses) |
| 6 | Logo Upload + Business Name | 3-4 hours | 🟡 Medium |
| 7 | Terminology Customization | 6-8 hours | 🟡 Medium (high for niche businesses) |

### Long-Term Vision (1-2 months)

| # | Feature | Notes |
|---|---------|-------|
| 8 | Order-to-Payment Linking | Auto-close orders when fully paid |
| 9 | Quick-Add Favorites | For high-volume businesses (barber, food cart) |
| 10 | Simple Reports (monthly PDF) | Export monthly summary for accountant |
| 11 | Multi-currency | For border businesses |
| 12 | Dark Mode | CSS variables already support it |

---

## Part 4: Technical Architecture for Customization

### Settings-Driven Architecture

All customization flows through the existing `settings` table and `useSettings()` hook:

```
User changes setting (color/logo/term)
        ↓
db.setSetting(key, value)
        ↓
useSettings() hook updates → React re-renders
        ↓
CSS variables / components read new values
```

### CSS Variable System (for Theme)

```css
:root {
  /* Primary - user customizable */
  --color-primary: #1F6FE8;
  --color-primary-50: #E8F1FE;
  --color-primary-100: #D0E2FD;
  /* ... up to 900 */

  /* Semantic - fixed (not customizable) */
  --color-income: #23C35B;
  --color-expense: #EB2323;
  --color-withdrawal: #B36A0C;
}
```

### Terminology Context (for Labels)

```jsx
// Create a TerminologyContext provider:
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

### Logo Storage Strategy

- Store as base64 PNG in `settings` table (key: `brand_logo`)
- Resize to 128×128 before storage (~4-8KB per logo)
- No file system access needed, works offline
- Survives backup/restore (it's just a setting)

---

## Part 5: Competitive Differentiation

### What Makes This App Unique

1. **100% Offline**: No competitor in the MENA micro-business space is fully offline-first. Most require cloud accounts.
2. **Arabic-First RTL**: Not a translated English app — designed Arabic-first.
3. **One UI Aesthetic**: Familiar to Samsung users (60%+ of Jordanian market).
4. **No Subscription**: One-time use, no paywall, no "pro" tier friction.
5. **Privacy-First**: Data never leaves the device. No analytics, no tracking.

### How Customization Strengthens Position

- **Theme + Logo**: Makes the app feel "owned" → higher retention
- **Terminology**: Adapts to any business type → broader market (clinic, salon, tutor, shop)
- **Debt Tracking**: Matches real-world credit practices in Jordan → replaces paper ledgers
- **Recurring**: Matches monthly bill cycle → becomes daily-use habit

---

## Conclusion

The three Quick Wins (Edit Transaction, WhatsApp Invoicing, Theme Color Picker) can be shipped in **under 12 hours of development** and will immediately address the top friction points while adding personalization value.

The two P0 features (Recurring Transactions, Debt Tracking) require **3 days of development** and transform the app from a "simple tracker" to a "real business tool" that can serve credit-based businesses — the core target audience.

The customization strategy (theme + logo + terminology) creates emotional ownership and differentiates the app from generic competitors, all built on the existing settings infrastructure with minimal architectural changes.
