# الحسابات — Offline-First PWA for Jordanian Micro Businesses

> تطبيق محاسبة وإدارة طلبات بسيط واحترافي، يعمل بدون إنترنت، مصمم للشركات الصغيرة جداً في الأردن.

A production-ready, **100% offline-first** Progressive Web App for micro and small businesses in Jordan (plumbers, electricians, small shops, service providers). Built with React + Vite + Tailwind CSS + Dexie.js. Looks and feels like a native Samsung One UI app.

---

## ✨ Key Features

### 📱 Native App Experience
- **100% Offline**: All data stored locally via IndexedDB. No backend, no servers.
- **Installable PWA**: Add to home screen, works like a native app (no App Store needed).
- **Samsung One UI Design**: Light mode, large touch targets, soft shadows, bottom sheets.
- **Haptic Feedback**: Vibration on every button press, save, and delete.
- **Smooth Animations**: Slide-up bottom sheets, fade-ins, scale transitions.

### 🌍 Arabic-First
- **100% Arabic RTL**: Native right-to-left layout throughout.
- **Cairo + IBM Plex Sans Arabic** fonts for clean, readable Arabic typography.
- **No Currency Symbols**: Numbers displayed with commas only (e.g., `1,500`), per Jordanian convention.
- **Localized Dates**: Arabic month names, 12-hour format with ص/م.

### 💰 Simple Cash Accounting
- **Opening Balances**: Onboard with cash available + debts (owed to me / I owe).
- **Income (قبض)**: Record money received.
- **Expense (صرف)**: Record money paid.
- **Personal Withdrawal (سحب شخصي)**: Tracked separately — does NOT affect business profit.
- **Live Formatting**: Type `1500` → instantly shows `1,500` while typing.
- **Net Profit** = Total Income − Total Expenses (excludes personal withdrawals).

### 📋 Order Tracking
- **List View**: Searchable, filterable by status (In Progress / Ready / Closed).
- **Calendar View**: Monthly One UI-style calendar with colored status dots per day.
- **Order Details**: Full info, status quick-change, WhatsApp share, edit, delete.
- **Statuses**: In Progress (yellow), Ready (blue), Closed (gray).

### 🔔 Smart Notifications
- **Local Notifications**: Reminders 1 hour before scheduled orders.
- **Permission Flow**: User-friendly Arabic prompts.
- **Periodic Check**: Every 60 seconds + on app foreground.

### 💾 Backup & Restore
- **JSON Export**: Native Share Sheet (WhatsApp, Drive, email) or download fallback.
- **JSON Restore**: File picker to import previous backup.
- **Weekly Reminder**: Gentle banner if 7+ days since last backup.

### 📲 WhatsApp Integration
- **Template Editor**: Plain text with placeholder buttons (no code).
- **Placeholders**: `[اسم الزبون]`, `[نوع الطلب]`, `[حالة الطلب]`, `[المبلغ]`, `[التاريخ]`.
- **Direct Share**: Opens `wa.me/<phone>` if customer has phone, else Web Share API.

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.3 |
| Build Tool | Vite | 5.4 |
| Styling | Tailwind CSS (custom One UI theme) | 3.4 |
| Database | Dexie.js (IndexedDB wrapper) | 4.0 |
| PWA | vite-plugin-pwa + Workbox | 0.20 / 7.1 |
| Routing | react-router-dom | 6.26 |
| Fonts | Cairo + IBM Plex Sans Arabic | Google Fonts |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/Qays7753/Accounting.git
cd Accounting

# Install dependencies
npm install

# Start development server
npm run dev
# → Open http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

### First Run
On first launch, the app shows an onboarding screen:
1. **Welcome** — introduction
2. **Cash Available** — enter current cash on hand
3. **Debts** (optional) — debts owed to me / debts I owe
4. **Done** — ready to use

---

## 📦 Deployment (Cloudflare Pages)

1. Run `npm run build` to produce the `dist/` folder.
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/).
3. Connect your GitHub repo or upload `dist/` directly.
4. Set build command: `npm run build`
5. Set output directory: `dist`
6. Deploy. No environment variables required.

The app is fully static and works on any static hosting (Netlify, Vercel, GitHub Pages, etc.).

---

## 📁 Project Structure

```
accounting-app/
├── public/
│   ├── icon.svg, icon-192.png, icon-512.png   # App icons
│   └── apple-touch-icon.png, favicon.png
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── BackupReminderBanner.jsx       # Proactive backup reminder
│   │   │   └── ErrorBoundary.jsx              # Global error handler
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx                  # Main layout wrapper
│   │   │   └── BottomNav.jsx                  # 4-tab bottom navigation
│   │   ├── sheets/
│   │   │   ├── Fab.jsx                        # Floating Action Button + sheet
│   │   │   ├── TransactionFormSheet.jsx       # Add/edit income/expense/withdrawal
│   │   │   ├── OrderFormSheet.jsx             # Add/edit order
│   │   │   └── OrderDetailSheet.jsx           # Order details + actions
│   │   └── ui/
│   │       ├── Icon.jsx                       # 30+ outlined SVG icons
│   │       ├── BottomSheet.jsx                # One UI-style bottom sheet
│   │       ├── Snackbar.jsx                   # Undo snackbar (5s)
│   │       ├── EmptyState.jsx                 # Empty state component
│   │       ├── AmountInput.jsx                # Live-formatted number input
│   │       └── CalendarView.jsx               # Monthly calendar with status dots
│   ├── db/
│   │   └── index.js                           # Dexie.js schema + helpers
│   ├── hooks/
│   │   └── useDatabase.js                     # useTransactions, useOrders, useDashboardStats
│   ├── pages/
│   │   ├── HomePage.jsx                       # Dashboard
│   │   ├── FinancePage.jsx                    # Transaction list + search/filter
│   │   ├── OrdersPage.jsx                     # Orders list + calendar
│   │   ├── SettingsPage.jsx                   # Backup, WhatsApp, security, app info
│   │   └── OnboardingPage.jsx                 # Opening balances flow
│   ├── utils/
│   │   ├── accounting.js                      # Cash flow calculations
│   │   ├── backup.js                          # Export/Restore/Reminder
│   │   ├── date.js                            # Arabic date formatting
│   │   ├── format.js                          # Number formatting (commas)
│   │   ├── haptics.js                         # Vibration feedback
│   │   ├── notifications.js                   # Local notifications
│   │   └── whatsapp.js                        # WhatsApp template + sharing
│   ├── styles/
│   │   └── index.css                          # Tailwind + One UI components
│   ├── App.jsx                                # Root component + routing
│   └── main.jsx                               # Entry point + PWA registration
├── R&D_REPORT.md                              # Agent 7 R&D findings
├── TASKS.md                                   # Agent swarm progress tracker
├── index.html                                 # HTML shell (RTL, fonts, PWA meta)
├── package.json
├── tailwind.config.js                         # One UI design system
├── postcss.config.js
└── vite.config.js                             # Vite + PWA config
```

---

## 🗄️ Database Schema

Managed by Dexie.js (IndexedDB). Version 3.

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `transactions` | Cash flow records | `type`, `[type+dateTimestamp]`, `dateTimestamp`, `category`, `orderId`, `amount` |
| `orders` | Order tracking | `status`, `[status+scheduledTimestamp]`, `scheduledTimestamp`, `customerName`, `customerId` |
| `customers` | Customer directory | `name`, `phone`, `archived` |
| `settings` | App settings (key-value) | `&key` (unique) |
| `meta` | App state flags | `&key` (unique) |
| `notifications` | Scheduled notification log | `orderId`, `scheduledTime`, `sent` |

### Transaction Types
- `income` — Money received (قبض)
- `expense` — Money paid (صرف)
- `withdrawal` — Personal withdrawal (سحب شخصي)
- `opening_balance` — Initial balance from onboarding

### Order Statuses
- `in_progress` — قيد التنفيذ (yellow)
- `ready` — جاهز (blue)
- `closed` — مغلق/تم التسليم (gray)

---

## ✅ Master Checklist Verification

All 20 items from the Master Checklist have been verified:

1. ✅ App works 100% offline after first load (PWA service worker + IndexedDB)
2. ✅ Git repository contains all source code (excl. node_modules)
3. ✅ Database schema optimized with compound indexes
4. ✅ No currency symbols displayed anywhere
5. ✅ Numbers formatted with commas (1,500)
6. ✅ Opening Balances screen appears only on first launch
7. ✅ Personal Withdrawals tracked separately from business expenses
8. ✅ Undo snackbar works for 5 seconds on delete
9. ✅ Calendar view shows order dots by status
10. ✅ Local Notifications trigger for order reminders
11. ✅ Backup export uses phone's native Share Sheet
12. ✅ WhatsApp template editor uses plain text, no code
13. ✅ UI strictly follows One UI (light mode, large targets, bottom sheets)
14. ✅ Haptic feedback present on key actions
15. ✅ Empty states guide the user
16. ✅ Search and Filter work in Finance section
17. ✅ `inputmode="decimal"` on all number inputs
18. ✅ Pagination implemented (20 records per page)
19. ✅ R&D review completed and critical feedback implemented
20. ✅ `TASKS.md` updated with final completion status

---

## 🎨 Design System — Terracotta Warm Identity (SOP v2)

### Colors
Identity is **FIXED** to Terracotta. Not user-selectable.

| Purpose | Color | Hex |
|---------|-------|-----|
| Background (warm ivory) | Greige | `#FAF9F5` |
| Ivory mute (sections) | Greige | `#F0EEE6` |
| Surface (cards) | White | `#FFFFFF` |
| Borders | Warm | `#EAE6DC` |
| Dividers | Warm | `#DAD5C8` |
| Ink (primary text) | Warm black | `#1F1E1D` |
| Ink strong | Warm dark | `#33322E` |
| Ink secondary | Warm grey | `#6E6A60` |
| **Primary — Terracotta** | Terracotta | `#CC785C` |
| Primary pressed | Darker terracotta | `#B4613F` |
| Primary tint | Pale terracotta | `#F4E4DB` |
| Accent — Teal | Teal | `#079FA0` |
| Income / Profit | Cool green | `#2E7D57` |
| Expense / Loss | Crimson | `#B42318` |
| Personal Withdrawal (steel blue) | Steel blue | `#3E5C76` |
| Investment Returns (gold, rare) | Gold | `#B08532` |
| Status: In Progress | Amber | `#C99100` |
| Status: Ready | Teal | `#079FA0` |
| Status: Closed | Warm grey | `#6E6A60` |

### Typography
- **Primary**: IBM Plex Sans Arabic (headings + body)
- **Numbers**: IBM Plex Mono (`tnum` for tabular alignment)
- Sizes 12–28 / weights 400–700 per SOP §5

### Components
- `card` — White background, rounded 16, e1 warm shadow, **no border**
- `btn-primary` — Terracotta `#CC785C`, rounded 12, 48 height, active scale
- `btn-secondary` — Teal `#079FA0`, same shape
- `input-field` — White bg, 1px warm border, focus teal border, 48 height
- `chip` — Pill, 36 height; active = terracotta bg + white text
- `bottom-sheet` — Rounded top 20, drag handle `#DAD5C8`, slide-up animation
- `fab` — Fixed bottom-left (RTL), 56×56, terracotta, shadow level 3

### Warm Shadows (no cold greys anywhere)
- `shadow-e1` / `shadow-card`: `0 1px 2px rgba(60,50,40,.06), 0 4px 12px rgba(60,50,40,.06)`
- `shadow-e2` / `shadow-sheet`: `0 6px 20px rgba(60,50,40,.10)`
- `shadow-e3` / `shadow-fab`: `0 16px 40px rgba(60,50,40,.16)`

---

## 🔧 Configuration

### PWA Manifest
- `name`: الحسابات - إدارة المحاسبة والطلبات
- `short_name`: الحسابات
- `theme_color`: #FFFFFF
- `background_color`: #FFFFFF
- `display`: standalone
- `orientation`: portrait
- `lang`: ar, `dir`: rtl

### Service Worker
- **Strategy**: Auto-update (registers and updates silently)
- **Precache**: All JS, CSS, HTML, icons, fonts
- **Runtime Caching**: Google Fonts (CacheFirst, 1 year)
- **Navigation Fallback**: index.html (SPA)

---

## 🤖 Agent Swarm Development

This project was built by a sequential swarm of 8 AI agents (initial build), followed by a 6-agent Deep Engineering Audit:

### Initial Build (Agents 1-8)
1. **Agent 1 — Architect & DevOps**: Project setup, PWA config, Git
2. **Agent 2 — DB Specialist**: Dexie.js schema, indexes, relationships
3. **Agent 3 — UI/UX Engineer**: All components, pages, One UI design
4. **Agent 4 — Accounting Logic**: Onboarding, cash flow, business rules
5. **Agent 5 — Calendar & Notifications**: Calendar view, local notifications
6. **Agent 6 — Integration & Backup**: Backup/restore, WhatsApp, reminders
7. **Agent 7 — R&D Analyst**: Code review, bug fixes, R&D_REPORT.md
8. **Agent 8 — QA & Reviewer**: Final verification, README

### Deep Engineering Audit (Agents 1-6)
1. **Agent 1 — Code Architect & Performance Auditor**: Lazy-loaded routes, debounced search, memoized filters, fixed memory leaks in notification service
2. **Agent 2 — Lead UI/UX Reviewer (Visuals)**: Semantic HTML, ARIA roles, RTL toggle direction fix, accessibility improvements
3. **Agent 3 — Lead UI/UX Reviewer (Interaction)**: Fixed swipe-to-delete stale state bug, AmountInput sync, timezone bugs, timer cleanup
4. **Agent 4 — Database & Accounting Logic Specialist**: Index-based pagination for 10k+ records, fixed cash balance logic (debts excluded)
5. **Agent 5 — QA Tester**: Verified all success criteria, wrote QA_REPORT.md, fixed WhatsApp date formatting
6. **Agent 6 — DevOps & Final Committer**: Final build, README update, GitHub push

See `TASKS.md` for detailed progress log, `R&D_REPORT.md` for R&D findings, and `QA_REPORT.md` for QA test results.

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Initial JS bundle (gzip) | ~98 KB |
| Lazy-loaded pages (gzip) | 3-4 KB each |
| Service Worker precache | 24 entries (398 KB) |
| Build time | ~2.5s |
| Pagination page size | 20 records |
| Search debounce | 300ms |
| Snackbar undo duration | 5000ms |

---

## 📝 License

Proprietary — Built for Jordanian micro businesses.

## 👥 Target Audience

- Micro and small businesses in Jordan
- Simple education level, non-accountants
- Both product-based and service-based businesses
- Plumbers, electricians, small shops, service providers

---

## 🔄 Version

**v1.0.0** — Initial release (2026-07-15)
