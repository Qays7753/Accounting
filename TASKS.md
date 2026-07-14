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

## Agent 3: The UI/UX Engineer
**Status**: ⏳ PENDING

---

## Agent 4: The Accounting Logic Developer
**Status**: ⏳ PENDING

---

## Agent 5: The Calendar & Notification Developer
**Status**: ⏳ PENDING

---

## Agent 6: The Integration & Backup Developer
**Status**: ⏳ PENDING

---

## Agent 7: The R&D & Systems Analyst
**Status**: ⏳ PENDING

---

## Agent 8: The QA & Reviewer
**Status**: ⏳ PENDING
