# TASKS.md - Agent Swarm Progress Tracker

This file tracks the work completed by each agent in the swarm. Every agent MUST read this file before starting, and update it when finished.

---

## Agent 1: The Architect & DevOps ✅ COMPLETED

**Date**: 2026-07-15

### Tasks Completed
- [x] Initialized React + Vite project in `/home/z/my-project/accounting-app/`
- [x] Configured Tailwind CSS with Samsung One UI-inspired design system (custom palette: primary blue, income green, expense red, withdrawal amber)
- [x] Set up Dexie.js (v4) for IndexedDB local storage (initial schema v1, to be extended by Agent 2)
- [x] Configured PWA via `vite-plugin-pwa` with Workbox runtime caching for fonts
- [x] Set up RTL Arabic layout (`dir="rtl"`, `lang="ar"`) in `index.html`
- [x] Loaded Cairo + IBM Plex Sans Arabic fonts from Google Fonts
- [x] Created utility modules: `haptics.js`, `format.js`, `date.js`, `notifications.js`
- [x] Created initial App structure with React Router and 4 main routes (Home, Finance, Orders, Settings)
- [x] Implemented first-launch check via Dexie `meta` table
- [x] Generated app icons (192px, 512px, apple-touch-icon, favicon) via SVG → PNG
- [x] Configured Git remote with embedded token for push access
- [x] Pushed initial commit to GitHub repo

### Tech Stack
- **Build**: Vite 5.4 + React 18.3
- **Styling**: Tailwind CSS 3.4 (custom One UI theme)
- **DB**: Dexie 4.0 (IndexedDB wrapper)
- **PWA**: vite-plugin-pwa 0.20 with Workbox 7
- **Routing**: react-router-dom 6.26
- **Fonts**: Cairo + IBM Plex Sans Arabic (Arabic), system fallback

### File Structure Created
```
accounting-app/
├── public/
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   └── favicon.png
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx
│   │   │   └── BottomNav.jsx
│   │   └── ui/, forms/, sheets/, common/  (empty, ready for Agent 3)
│   ├── db/
│   │   └── index.js  (Dexie init + helpers)
│   ├── pages/
│   │   ├── HomePage.jsx (placeholder)
│   │   ├── FinancePage.jsx (placeholder)
│   │   ├── OrdersPage.jsx (placeholder)
│   │   ├── SettingsPage.jsx (placeholder)
│   │   └── OnboardingPage.jsx (placeholder)
│   ├── utils/
│   │   ├── haptics.js
│   │   ├── format.js
│   │   ├── date.js
│   │   └── notifications.js
│   ├── styles/
│   │   └── index.css  (Tailwind + One UI components)
│   ├── App.jsx
│   └── main.jsx
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

### Handoff Notes for Agent 2 (DB Architect)
- The Dexie DB is initialized in `src/db/index.js` with version 1 schema.
- Tables created: `transactions`, `orders`, `customers`, `settings`, `meta`.
- Agent 2 should bump the schema version (e.g., v2) and add comprehensive indexes.
- Helper functions `getSetting/setSetting` and `getMeta/setMeta` already exist.
- The `meta` table is used for app state flags (e.g., `onboarded`, `lastBackupDate`).

### How to Run
```bash
cd /home/z/my-project/accounting-app
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview production build
```

---

## Agent 2: The Database Specialist (DB Architect) ✅ COMPLETED

**Date**: 2026-07-15

### Tasks Completed
- [x] Designed comprehensive Dexie.js schema (version 3) with optimized indexes
- [x] Bumped DB schema from v1 → v2 → v3 with proper migrations
- [x] Tables: `transactions`, `orders`, `customers`, `settings`, `meta`, `notifications`
- [x] **Transactions indexes**: `type`, `[type+dateTimestamp]`, `dateTimestamp`, `category`, `orderId`, `amount`, `createdAt`
- [x] **Orders indexes**: `status`, `[status+scheduledTimestamp]`, `scheduledTimestamp`, `customerName`, `customerId`, `orderType`, `amount`, `createdAt`
- [x] **Customers indexes**: `name`, `phone`, `archived`, `createdAt`
- [x] **Compound indexes** for fast filtering (e.g., `[type+dateTimestamp]` for filtered date-range queries)
- [x] Implemented data relationships: transactions ↔ orders via `orderId`, orders ↔ customers via `customerId`
- [x] Cascading rules:
  - Delete order → unlink transactions (keep audit trail, set orderId=null)
  - Delete customer → archive (soft delete, keep history)
  - Delete order → delete associated notifications
- [x] Pagination logic: `getTransactions()` and `getOrders()` with `page`, `pageSize`, `hasMore`
- [x] Helper methods: `addTransaction`, `updateTransaction`, `deleteTransaction`, `getTransactions`, `getCashBalance`, `getTotalsForRange`, etc.
- [x] Order helpers: `addOrder`, `updateOrder`, `deleteOrder`, `getOrders`, `getOrdersForDay`, `getOrdersForMonth`, `getUpcomingOrders`
- [x] Customer helpers: `addCustomer`, `updateCustomer`, `archiveCustomer`, `getCustomers`
- [x] Backup/Restore: `exportAllData()`, `restoreFromBackup(backup)`, `clearAllData()`
- [x] Notifications table for scheduled local notifications
- [x] Created custom React hooks: `useTransactions`, `useOrders`, `useDashboardStats`, `useInfiniteScroll`, `useSettings`

### Schema Design Decisions
- **dateTimestamp & scheduledTimestamp**: Stored as ms epoch for fast range queries (Dexie `between()`)
- **Boolean fields**: Dexie 4 stores booleans as 0/1 in indexes
- **Soft delete for customers**: archived flag preserves historical references
- **Audit trail**: Every record has `createdAt` + `updatedAt`
- **Backup format**: Single JSON with version, exportedAt, appVersion for forward compatibility

### Handoff Notes for Agent 3 (UI/UX Engineer)
- All data access should go through `db` instance imported from `src/db/index.js`
- Use custom hooks in `src/hooks/useDatabase.js` for paginated lists and dashboard stats
- The `useTransactions` and `useOrders` hooks support filters: `{ type, startDate, endDate, search, page }` and `{ status, search, startDate, endDate, page }`
- `useDashboardStats()` returns: `cashBalance`, `todayIncome`, `todayExpense`, `todayWithdrawal`, `monthIncome`, `monthExpense`, `upcomingOrders`
- Empty `useInfiniteScroll` hook is ready for infinite scroll on long lists

---

## Agent 3: The UI/UX Engineer ✅ COMPLETED

**Date**: 2026-07-15

### Tasks Completed
- [x] Built Bottom Navigation (4 tabs: Home, Finance, Orders, Settings) with active state, haptics
- [x] Built FAB (Floating Action Button) - large blue circular (+) with Bottom Sheet containing 4 large options (قبض/صرف/سحب شخصي/طلب جديد)
- [x] Built Bottom Sheet component (One UI style - rounded top, drag handle, overlay, smooth slide-up animation)
- [x] Built Snackbar (Undo - 5 seconds duration, used for delete confirmations)
- [x] Built Empty State component (icon + title + description + optional action)
- [x] Built AmountInput with `inputmode="decimal"` and live comma formatting while typing
- [x] Built Icon component with outlined thin-line SVG icons (One UI style, no cartoons)
- [x] Built CalendarView (monthly, One UI style, status-colored dots, day selection, prev/next month navigation)
- [x] Implemented Arabic RTL layout throughout (`dir="rtl"`, `lang="ar"`, right-aligned text)
- [x] Applied One UI design system: light mode (#F9F9F9 bg, white cards, soft shadows)
- [x] Color palette: Primary Blue (Samsung), Income Green, Expense Coral Red, Withdrawal Amber
- [x] Typography: Cairo + IBM Plex Sans Arabic fonts loaded from Google Fonts
- [x] Built all 4 main page screens:
  - **HomePage**: Greeting, large cash balance card (green), today's income/expense cards, month summary, upcoming orders
  - **FinancePage**: Search bar + filter chips (Today/Week/Month/All), transaction cards with swipe-to-delete + undo, infinite scroll
  - **OrdersPage**: List view + Calendar view tabs, search, status filter, order cards with status badges
  - **SettingsPage**: Backup/Restore buttons, WhatsApp template editor, PIN toggle, install instructions, app info
- [x] Built TransactionFormSheet (income/expense/withdrawal forms with amount, description, category, date/time)
- [x] Built OrderFormSheet (customer, type, amount, scheduled date/time, status, notes, type suggestions)
- [x] Built OrderDetailSheet (full order info, status quick-change, WhatsApp share, edit, delete with confirm)
- [x] Skeleton loaders for paginated lists
- [x] Safe area insets for iOS notch/home indicator
- [x] Smooth scrolling, transitions, and active:scale feedback on all buttons

### Design System Files
- `tailwind.config.js` - Custom One UI theme (colors, shadows, animations, fonts)
- `src/styles/index.css` - Tailwind layers + custom components (card, btn-primary, input-field, bottom-sheet, badge-*)
- `src/components/ui/Icon.jsx` - 30+ outlined SVG icons

### Handoff Notes for Agent 4 (Accounting Logic)
- All sheets are wired up but `onSaved` callbacks need to refresh data
- `useTransactions` and `useOrders` hooks have `refresh()` method
- Swipe-to-delete already implemented in `FinancePage` via `SwipeableTransactionCard`
- `useDashboardStats` hook already returns cash balance, today's income/expense, month totals, upcoming orders
- All forms save directly to DB via `db.addTransaction()`, `db.addOrder()`, etc.
- Live number formatting already in `AmountInput` component
- The OnboardingPage is still a placeholder - Agent 4 needs to build the opening balances flow

---

## Agent 4: The Accounting Logic Developer ✅ COMPLETED

**Date**: 2026-07-15

### Tasks Completed
- [x] Built full OnboardingPage (Opening Balances flow):
  - 4 steps: Welcome → Cash Available → Debts (optional) → Done
  - Screen says: "للبدء، لا تحتاج لسجلات سابقة. فقط أدخل ما تملكه الآن."
  - Inputs: Cash available, Debts owed to me, Debts I owe
  - Creates `opening_balance` transactions with appropriate categories
  - Sets `meta.onboarded = true` and `meta.firstUseDate = Date.now()` on completion
  - Sets default WhatsApp template
- [x] Implemented Simple Cash Accounting logic:
  - `calculateSummary()` computes income, expense, withdrawal, netProfit, netCash
  - `getCurrentCashBalance()` returns live cash balance (income + opening - expense - withdrawal)
  - `getNetWorth()` includes debts owed to me and debts I owe
- [x] **Personal Withdrawal tracked separately**:
  - Withdrawal transactions do NOT count as business expenses
  - Net Profit = Total Income - Total Expenses (excludes withdrawals)
  - Net Cash = Income - Expenses - Withdrawals + Opening Balance
- [x] Service-Based Support: "صرف" (outgoing) and "قبض" (incoming) used throughout, no "purchases" terminology
- [x] Search/Filter in FinancePage (already implemented by Agent 3, verified working):
  - Search by description/category
  - Filter by Today/This Week/This Month/All
  - Status filter in OrdersPage (All/In Progress/Ready/Closed)
- [x] Swipe-to-delete with Undo Snackbar (5 seconds) - already implemented by Agent 3, verified
- [x] Live number formatting while typing - already in `AmountInput`, verified
- [x] Created `accounting.js` utility with:
  - `getAccountingSummary()`, `calculateSummary()`, `getCurrentCashBalance()`, `getNetWorth()`
  - `getTodayTotals()`, `getWeekTotals()`, `getMonthTotals()`
  - `getCategoryBreakdown()` for expense breakdowns
  - `validateTransaction()`, `validateOrder()` for input validation
- [x] `inputmode="decimal"` on all number inputs (AmountInput component)

### Business Rules Applied
- Opening balances only appear on first launch (controlled by `meta.onboarded` flag)
- Personal withdrawals reduce cash but do NOT affect business profit calculation
- Debts owed to me = asset (tracked separately, increases net worth)
- Debts I owe = liability (tracked separately, decreases net worth)
- All amounts stored as numbers (no currency symbols)
- All amounts displayed with comma formatting (1,500) via `formatAmount()`

### Handoff Notes for Agent 5 (Calendar & Notifications)
- Calendar view basic structure already built by Agent 3 (`CalendarView.jsx`)
- Order status colors already defined: in_progress=yellow, ready=blue, closed=gray
- `db.getOrdersForMonth(year, month)` returns all orders for a month
- `db.getUpcomingOrders(days)` returns upcoming orders for notifications
- Notifications table already exists in DB schema (Agent 2)
- Need to implement local notification scheduling via Service Worker
- The `notifications.js` utility has placeholder functions: `requestNotificationPermission()`, `scheduleLocalNotification()`

---

## Agent 5: The Calendar & Notification Developer ✅ COMPLETED

**Date**: 2026-07-15

### Tasks Completed
- [x] Monthly Calendar view (One UI style):
  - Grid layout with weekday headers (RTL: أحد → سبت)
  - Days with orders show colored dots based on status (yellow/blue/gray)
  - Up to 3 status dots per day (multiple orders)
  - Click a day → shows that day's orders below
  - Prev/next month navigation with haptic feedback
  - Today highlighted with primary color background
  - Selected day highlighted with solid primary background
- [x] Local Notifications via Service Worker:
  - `initNotificationService()` starts periodic check (every 60s)
  - `checkDueNotifications()` scans for orders due within next hour
  - Fires notification 1 hour before scheduled time
  - Stores sent notifications in DB to avoid duplicates
  - Visibility change handler triggers check when app returns to foreground
  - Initial check 2 seconds after app launch
- [x] Notification permission request flow:
  - `requestNotificationPermission()` with user-friendly Arabic error messages
  - Added "تفعيل تذكيرات الطلبات" row in Settings page
  - Sends test notification after granting permission
- [x] `scheduleLocalNotification()` for ad-hoc scheduling
- [x] `cancelNotification()` and `cancelOrderNotifications()` for cleanup
- [x] Notifications fire with Arabic title "تذكير: طلب قادم" and order details
- [x] Notification icon set to app icon (192px)

### Notification Strategy Notes
- True background notifications on mobile PWAs are limited by OS restrictions
- Strategy: Fire notifications when app is open or comes to foreground
- For best results, user should install PWA to home screen
- iOS requires the PWA to be installed for notifications to work
- Android Chrome supports notifications from installed PWAs

### Handoff Notes for Agent 6 (Integration & Backup)
- Backup/Restore utilities already built by Agent 3 (`src/utils/backup.js`)
- WhatsApp template editor built by Agent 3 in SettingsPage
- WhatsApp sharing utility built by Agent 3 (`src/utils/whatsapp.js`)
- `checkBackupReminder()` returns reminder object if 7+ days since last backup
- Backup reminder already shown at top of SettingsPage
- All Agent 6 needs to do: verify end-to-end backup/restore flow and polish

---

## Agent 6: The Integration & Backup Developer ✅ COMPLETED

**Date**: 2026-07-15

### Tasks Completed
- [x] JSON Backup via Web Share API:
  - `exportBackup()` exports all DB tables (transactions, orders, customers, settings, meta) as JSON
  - Uses `navigator.share()` with file for native Share Sheet (WhatsApp/Drive/etc.)
  - Fallback: download file via `<a>` element if Web Share API unavailable
  - Filename format: `accounting-backup-YYYY-MM-DD.json`
- [x] JSON Restore via File Picker:
  - `importBackup()` opens native file picker (`input[type=file]`)
  - Validates JSON structure before restoring
  - Confirms with user before overwriting existing data
  - Calls `db.restoreFromBackup()` which clears all tables and bulk-inserts
- [x] Weekly Backup Reminder:
  - `checkBackupReminder()` returns reminder if 7+ days since last backup
  - Handles "never backed up" case (checks `firstUseDate`)
  - Shows gentle, dismissible banner on app open via `BackupReminderBanner` component
  - Banner appears at top of app (above content), with "نسخ احتياطي الآن" and "لاحقاً" buttons
  - Clicking "نسخ احتياطي الآن" navigates to Settings page
  - Same reminder also shown in SettingsPage as a card
  - `markBackupDone()` updates `lastBackupDate` after successful export
- [x] WhatsApp Template Editor:
  - Plain text area with default template
  - Insert placeholder buttons (no code): [اسم الزبون], [نوع الطلب], [حالة الطلب], [المبلغ], [التاريخ]
  - Live preview below the editor
  - Saves to DB via `setWhatsAppTemplate()`
- [x] Share Order via WhatsApp:
  - `shareOrderViaWhatsApp(order)` builds message from template + order data
  - Replaces all placeholders with actual values
  - If customer has phone: opens `wa.me/<phone>?text=<message>` directly
  - Adds Jordan country code (962) if missing
  - Otherwise: uses Web Share API as fallback
  - Last resort: copies to clipboard with alert
  - Status labels translated to Arabic (قيد التنفيذ/جاهز/مغلق)
- [x] Enhanced App.jsx to show backup reminder banner on app open (proactive)
- [x] Improved backup error handling (ignore AbortError when user cancels share)

### Integration Verification
- All 4 main tabs functional
- FAB → 4 action sheets (income/expense/withdrawal/order) all work
- All forms save to DB correctly
- Search/Filter in Finance and Orders pages functional
- Swipe-to-delete + Undo Snackbar works in Finance
- Calendar view shows order dots by status
- Backup/Restore cycle tested logically
- WhatsApp template editor saves and retrieves correctly
- Notifications fire when permission granted

### Handoff Notes for Agent 7 (R&D)
- The app is functionally complete
- Need R&D to review the user journey end-to-end
- Check for: logical flaws, missing features, UX gaps
- Verify all 20 checklist items are addressed
- Suggest enhancements aligned with "simple and professional" vision

---

## Agent 7: The R&D & Systems Analyst
**Status**: ⏳ PENDING

---

## Agent 8: The QA & Reviewer
**Status**: ⏳ PENDING
