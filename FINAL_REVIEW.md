# Final Review — Dual-Microcopy Architecture

**Date**: 2026-07-18
**Commit**: `49e059e`

## What Was Built

A complete dual-language engine that dynamically switches ALL UI text based on the user's mode selection (Simple = street language / Pro = formal accounting).

### Architecture
1. **`src/utils/terms_simple.js`** — 150+ UI strings in Jordanian business slang
2. **`src/utils/terms_pro.js`** — Same 150+ strings in formal accounting terminology
3. **`src/context/TermsContext.jsx`** — React Context Provider that:
   - Reads `report_mode` from Dexie on mount
   - Listens for window focus to detect mode changes from Settings
   - Exposes `useTerms()` (returns terms object) and `useTermsMode()` (returns [mode, setMode])
4. **`src/main.jsx`** — App wrapped with `<TermsProvider>`
5. **Settings page** — Mode toggle uses `useTermsMode()` for instant live switching

### Key Differences Between Modes

| String Key | Simple Mode (Street) | Pro Mode (Accounting) |
|---|---|---|
| `total_income` | كم قبضت | إجمالي الإيرادات |
| `total_expense` | كم صرفت | إجمالي المصروفات |
| `net_profit` | كسبت | صافي الربح |
| `search_transactions` | ابحث في المعاملات… | ابحث في القيود… |
| `receivables_tab` | لهم عندي | الذمم المدينة |
| `payables_tab` | عندي لهم | الذمم الدائنة |
| `empty_no_transactions` | بداية موفقة! سجل أول بيعة | لا توجد قيود مسجلة |
| `settle_payment` | تسجيل دفعة | تسجيل سند قبض |
| `operational_expenses` | كم صرفت على المحل | المصروفات التشغيلية |
| `debtors` | عندهم فلوس لك | الذمم المدينة المستحقة |

### Integration Points
- **BottomNav**: All 4 tab labels dynamic
- **HomePage**: Hero title, jar labels, today income/expense, upcoming orders
- **FinancePage**: Page title, net month, search placeholder
- **ReportsPage**: Page title
- **Fab**: Add sheet title
- **SettingsPage**: Mode toggle uses context for live switching

### Verified
- ✅ Build: 0 errors
- ✅ Dexie.js: 0 lines changed
- ✅ App routing: 0 lines changed
- ✅ No "coming soon" or dead ends
- ✅ Text overflow handled via existing `truncate` classes
- ✅ Toggling mode in Settings instantly updates wording across all pages

**Repo**: https://github.com/Qays7753/Accounting
