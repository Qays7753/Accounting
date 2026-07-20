# RECON REPORT — Accounting App Refactor (Layers + Overview)

**Author:** Agent 1 — Recon & Plan
**Baseline commit:** `2d20b6c` on `main`
**Build verified:** `npm run build` succeeded in 4.88s, 0 errors, 40 PWA precache entries. Timestamp: 2026-07-20 09:43:43 UTC.
**Pre-existing warning (ignore):** Vite reports `src/db/index.js is dynamically imported by src/utils/notifications.js but also statically imported by …` — this is a chunking hint, NOT an error. No action required.

---

## A. Current Layer System Map

The app already separates **terminology** from **features** (V12 refactor):
- `language_mode` (`'simple' | 'pro'`) — terminology only (street vs formal accounting).
- `active_layer` (`1 | 2 | 3`) — features/screens (Daily / Manager / Investor).
- These are orthogonal and independent.

| File | Role | What it does for Layer 1 (Daily) | What it does for Layer 2 (Manager) | What it does for Layer 3 (Investor) | Broken vs. intended model |
|---|---|---|---|---|---|
| `src/context/TermsContext.jsx` | Holds the two settings + migration logic | `activeLayer=1` (default) | `activeLayer=2` — but no per-layer feature flag consumption in pages | `activeLayer=3`, exposes `isInvestorMode=true` via `useIsInvestorMode()` | Healthy. Old `report_mode` is migrated. **No defect.** Layer 2 has no feature consumers yet. |
| `src/App.jsx` (`AppRoutes` lines 80–125) | Routes between pages | All operational routes (`/`, `/finance`, `/orders`, `/debts`, `/pos`, `/reports`, `/settings`, `/inventory`) | Same routes as Layer 1 — no manager-specific routing | **Amputates every route** — `<Route path="*" element={<InvestorDashboard />} />` (line 103). The only escape is the `خروج` button inside InvestorDashboard. | **Defect B1.** Investor replaces the whole app; no `/overview`, no BottomNav, no way to mix daily work with executive view. |
| `src/components/layout/AppLayout.jsx` | Shell wrapper | `bg-background` + `BottomNav` + `pb-28` | Same as Layer 1 | **Returns a stripped layout** (lines 11–20): `bg-white`, NO `BottomNav`, NO padding. | **Defect B2.** BottomNav is hidden for investor, so there is no in-app navigation at all in Layer 3. |
| `src/components/layout/BottomNav.jsx` | Bottom nav (5–6 tabs) | Home / Finance / Orders (+POS/Inventory) / Settings | Same as Layer 1 | Never rendered (AppLayout bypasses it) | **Defect B2 (cont.).** No `/overview` tab; investor never sees nav. No layer-3 entry chip. |
| `src/components/layout/PageHeader.jsx` | Shared sticky 56px header | variant="home" shows logo+greeting+BuildStamp; default shows title; optional `subheader` slot | Same as Layer 1 | Not used by InvestorDashboard (it hand-rolls its own `<header>`) | **Defect B3.** No slot for an Overview KPI chip in the home header. SOP §6.1 mandates PageHeader for ALL screens, but InvestorDashboard bypasses it. |
| `src/components/common/BuildStamp.jsx` | TEMPORARY dev build-time stamp | Renders in home header via `<BuildStamp />` (line 165 of PageHeader) | Same | Not shown | Healthy. **Must stay** (orchestrator constraint). Toggled by `SHOW_BUILD_STAMP = true`. |
| `src/pages/InvestorDashboard.jsx` | Executive panel + strategic inputs | n/a | n/a | Renders KPI pyramid (10 KPIs), income-statement waterfall, balance-sheet cards, FAB→4 strategic inputs (asset/loan/capital/draw), PDF export, WhatsApp reminders | **Defect B4.** Strategic inputs (asset/loan/capital/draw) are siloed here. After each save it calls `window.location.reload()` (lines 382, 395, 404, 413) — poor UX, loses the 30s debounce sync window. Bypasses `PageHeader`. |
| `src/pages/HomePage.jsx` | Operational home (812 lines) | Full home: stats, transaction list, diagnostic cards, FAB → sheets | Same as Layer 1 (no manager features) | Same as Layer 1 (investor never reaches it because App.jsx amputates) | **Defect B5.** HomePage is **completely layer-unaware** — no `useActiveLayer` import. No Overview chip. No conditional content for layer 2/3. |
| `src/pages/OnboardingPage.jsx` | 3-step first-run wizard | Step 0: shop name. Step 1: "ما نوع نشاطك؟" (ready-made vs manufactured). Step 2: done. | Same as Layer 1 | Same as Layer 1 | **Defect B6.** The business-model question captures `business_model` ('ready' \| 'manufactured') in `meta`, but does NOT capture layer intent. Sets `report_mode='simple'` (old key, migrated to layer=1). An investor-intent user is never identified at onboarding. |
| `src/pages/SettingsPage.jsx` (lines 533–618) | Layer switcher UI | Layer 1 button (اليومي) | Layer 2 button (المدير) — but no manager features consume it | Layer 3 button (المستثمر) — just sets state; App.jsx then amputates routes | Healthy as a switcher. But switching to Layer 3 immediately kicks the user out of every screen into InvestorDashboard — no graceful "open Overview on top of daily work" path. |
| `src/utils/financialReports.js` | Pure compute engine for reports | Used by ReportsPage | Same | Used by InvestorDashboard (full data source) | **Healthy — this is the data source for the new Overview.** Functions: `gatherReportData(db)`, `computeIncomeStatement(data)`, `computeBalanceSheet(data)`, `computeKPIs(data)`. All return `{ value, available, missing }` pattern. |
| `src/db/index.js` | Dexie DB (schema v9) | Operational tables | V9 added `bom_components`, `purchase_records`, `items.auto_deduct/item_type` | V9 added `fixed_assets`, `loans`; methods `addFixedAsset`, `addLoan`, `injectCapital`, `ownerDraw` | Healthy. KV API: `getSetting/setSetting`, `getMeta/setMeta`. **Do NOT bump schema unless absolutely necessary** — if so, add a v10 that preserves all v9 stores + data. |
| `src/components/ui/Icon.jsx` | Outlined SVG icon set (~45 glyphs) | Used everywhere | Same | Used in InvestorDashboard action sheet | **Defect B7.** No analytics/chart glyph (no bar-chart, no pie, no graph). For the new Overview chip, the closest existing glyph is `trendingUp` or `accountBalanceWallet`. Agent 4 should add ONE new path (e.g. `chartBar`) — this is allowed (no new hex / no new font). |
| `src/components/ui/SegmentedControl.jsx` | Sliding pill/underline control | Used on Finance/Reports/Orders pages | Same | Not used in InvestorDashboard | Healthy. **Reuse this for the Overview date-range selector (اليوم / الأسبوع / الشهر)** — pill variant. Do NOT hand-roll. |
| `src/components/ui/BottomSheet.jsx` | Draggable expandable sheet | Used by HomePage/SettingsPage/etc. | Same | Used by InvestorDashboard strategic-input forms | Healthy. Focus-trapped, `role="dialog"`, back-button dismisses. Reuse for any modal in Overview. |
| `src/main.jsx` | Root: BrowserRouter + ErrorBoundary + TermsProvider + SW register | Boots app | Same | Same | Healthy. `lazyWithReload` is in `App.jsx` (not here). SW hybrid update strategy is wired here. |
| `src/components/common/ErrorBoundary.jsx` | Catches render errors; self-heals stale-chunk crashes | Active | Active | Active | **LOAD-BEARING.** Auto-recovers once for `ChunkLoadError` via `forceRefreshApp(true)`. Do NOT break. |
| `src/utils/pwaUpdate.js` | SW unregister + cache wipe + reload | Used by ErrorBoundary + SettingsPage | Same | Same | **LOAD-BEARING.** `forceRefreshApp(reload=true)`. Keep. |
| `src/context/CloudSyncContext.jsx` | Google Drive AppData sync; debounced upload on every DB write | Active | Active | Active | **LOAD-BEARING.** `markSynced(ts)` persists sync time. Uses Dexie `table.hook('creating'/'updating'/'deleting')` — NOT `db.on('changes')` / `dexie-observable` (which crash). Never reintroduce those. |

---

## B. Structural Defects Inventory (with line numbers + code excerpts)

### B1. Investor replaces the whole app — `src/App.jsx` lines 98–107

```jsx
// Investor Mode: read-only executive dashboard (all routes show it)
if (isInvestor) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="*" element={<InvestorDashboard />} />
      </Routes>
    </Suspense>
  )
}
```
**Problem:** Every operational route disappears in Layer 3. There is no `/overview` route. The only way back is the `خروج` button inside InvestorDashboard (line 214: `setActiveLayer(1); navigate('/')`). The comment "read-only executive dashboard" is also stale — the dashboard has strategic-input FABs.

**Fix direction:** Drop this branch. Instead, register `/overview` as a normal lazy route available to ALL layers. Investor layer keeps all daily routes + adds `/overview`. BottomNav stays visible in every layer.

### B2. BottomNav is hidden for investor — `src/components/layout/AppLayout.jsx` lines 11–20

```jsx
// Investor mode: hide BottomNav, full-width layout, stark white bg
if (isInvestor) {
  return (
    <div className="min-h-screen bg-white transition-colors duration-400">
      <main role="main">
        {children}
      </main>
      <UpdatePrompt />
    </div>
  )
}
```
**Problem:** Investor has zero in-app navigation. The `bg-white` is also wrong outside `/overview` — SOP §13.1 limits the stark white + terracotta-blocks treatment to the Overview screen ONLY.

**Fix direction:** Remove the investor branch entirely. The single layout (lines 23–31) handles all layers. `/overview` renders its own stark-white treatment internally (scoped), not at the layout level.

### B3. No Overview slot in PageHeader — `src/components/layout/PageHeader.jsx`

The home variant (lines 103–116) shows logo + greeting + date. There is no chip/KPI slot in the header itself. The `subheader` prop (line 195) is the secondary row that scrolls with content — this is the correct place for a date-range SegmentedControl on the Overview page, NOT for a chip.

**Fix direction:** For the home Overview entry chip, Agent 4 should add it inside the home variant's left block (next to logo+greeting), styled with `accent` (teal) tokens per SOP §1. Alternatively (cleaner), render it as a small tappable KPI card in the home `subheader` slot.

The InvestorDashboard hand-rolls its own `<header>` (lines 198–222) — bypassing PageHeader. SOP §6.1 says "ممنوع كتابة `<header>` يدوياً في أي صفحة". Agent 5 should migrate InvestorDashboard → `/overview` and switch it to `PageHeader`.

### B4. Strategic inputs siloed in InvestorDashboard — `src/pages/InvestorDashboard.jsx`

The 4 strategic inputs (Add Asset, Add Loan, Inject Capital, Owner Draw) live as FAB→BottomSheet inside InvestorDashboard (lines 344–415). Each save calls `window.location.reload()` (lines 382, 395, 404, 413) — this throws away the 30-second debounced cloud-sync window and gives a jarring UX.

**Fix direction:** Move the 4 strategic-input sheets into a dedicated module (e.g. `src/components/sheets/StrategicActionSheets.jsx`) so they can be triggered from `/overview`. Replace `window.location.reload()` with a local data refresh (`setData(await gatherReportData(db))` or a `useReducer` bump). The DB helpers `db.addFixedAsset / db.addLoan / db.injectCapital / db.ownerDraw` stay — they are correct.

### B5. HomePage is layer-unaware — `src/pages/HomePage.jsx`

Grep confirms: no `useActiveLayer`, no `useIsInvestorMode`, no `activeLayer`, no `setActiveLayer` references anywhere in the file. The only TermsContext hooks used are `useTerms()` and `useLanguageMode()` (line 30). HomePage renders identically for Layer 1, 2, and 3.

**Fix direction:** Agent 4 adds the Overview entry chip in the home header (visible in every layer). Agent 6 makes HomePage conditionally render manager-only content when `activeLayer === 2` (e.g. predictive-restock radar card) — but that may be out of scope for this refactor; the orchestrator should confirm.

### B6. OnboardingPage fails to capture layer intent — `src/pages/OnboardingPage.jsx`

Step 1 (lines 97–152) asks "ما نوع نشاطك؟" with two answers:
- `'ready'` (منتجات جاهزة) — tag icon, terracotta
- `'manufactured'` (منتجات أُصنِعَت) — trendingUp icon, teal

This captures `business_model` only. It does NOT ask whether the user wants Daily / Manager / Investor mode, and never writes `active_layer`. Line 39 writes `await db.setSetting('report_mode', 'simple')` — the OLD key, which TermsContext migrates to `language_mode='simple', active_layer=1`.

**Fix direction:** Agent 6 adds a Step 1.5 (or extends Step 1) asking "كيف تريد استخدام التطبيق؟" with three options (يومي / مدير / مستثمر) → writes `active_layer` directly. Keep Step 1's business_model question. Drop the legacy `report_mode` write (TermsContext migration handles old installs).

### B7. No analytics glyph in Icon.jsx — `src/components/ui/Icon.jsx`

The icon set has ~45 glyphs but no chart/analytics glyph. The closest semantic matches:
- `trendingUp` — used for income arrows, semantically "growth"
- `accountBalanceWallet` — used for hero in the dc.html identity page
- `savings` — used for "right of merchant" jar

**Fix direction:** Agent 4 adds ONE new path to `Icon.jsx`, e.g. `chartBar` (a simple 3-bar chart outline). This is allowed — adding an SVG path does not violate "no new hex values / no new fonts / no gradients / no emoji / no glow". Use it for the Overview chip.

### B8. (Bonus) Layer 2 has no feature consumers

`activeLayer === 2` is settable from Settings but no page reads it. The DB schema (v9) has `items.auto_deduct`, `items.item_type`, `bom_components`, `purchase_records` — all unused. This is out of scope for the Overview refactor but worth flagging: if Agent 6 touches HomePage, it should at minimum not regress Layer 2.

### B9. (Bonus) InvestorDashboard uses `bg-ink` (dark) Net Profit card — `src/pages/InvestorDashboard.jsx` line 289

```jsx
<div className="bg-ink rounded-card p-4 mt-4">
```
SOP §13.1 permits ONE "number island" with `#2A2521` (warm dark ink, not the system `#1F1E1D`). The current `bg-ink` (`#1F1E1D`) is close but not the documented `#2A2521`. Agent 5 should use `#2A2521` (either inline or as a new scoped token inside the Overview component). This is a scoped exception — do NOT change the global `ink` token.

---

## C. Token Reference Sheet

All values confirmed against `tailwind.config.js` (lines 20–159) and the two `.dc.html` identity files. The Tailwind tokens are the source of truth; the `.dc.html` files mirror them 1:1.

### Identity (SOP §1)

| Role | Hex | Tailwind token | Usage |
|---|---|---|---|
| Primary — Terracotta | `#CC785C` | `primary` / `primary-500` | Primary actions, identity touch, important links. **NOT on numbers.** |
| Primary — pressed | `#B4613F` | `primary-600` | Pressed/active state |
| Primary — tint | `#F4E4DB` | `primary-100` / `primary-tint` (legacy alias) | Light bg for primary element, active tab bg |
| Accent — Teal | `#079FA0` | `accent` / `accent-500` | **Overview chip uses this.** Interaction, active tab, interactive icons. |
| Accent — text/link | `#057B7C` | `accent-600` / `accent.text` | Small text/link on light bg (higher contrast) |
| Accent — light bg | `#E3F5F5` | `accent-50` / `accent.light` | Active element light bg |

### Warm Greige Neutrals (SOP §1)

| Role | Hex | Tailwind token |
|---|---|---|
| App background | `#FAF9F5` | `background` |
| Ivory / inner well | `#F0EEE6` | `ivory` / `mute` |
| Surface (card) | `#FFFFFF` | `surface` |
| Border | `#EAE6DC` | `border` |
| Divider | `#DAD5C8` | `divider` |
| Disabled | `#B7B2A6` | `disabled` |
| Secondary text | `#6E6A60` | `ink.secondary` / `text.secondary` / `faint` / `sub` (legacy aliases) |
| Strong text | `#33322E` | `ink.strong` |
| Ink (primary text) | `#1F1E1D` | `ink` / `text.primary` |

### Cool Semantics (SOP §1 — separated from terracotta)

| State | Text/icon | Fill | Row bg | Tailwind tokens |
|---|---|---|---|---|
| Income / receipt | `#2E7D57` | `#A7D8BE` | `#E4F2EA` | `income-600` / `income.fill` / `income-50` (DEFAULT=`income-500`) |
| Expense / loss | `#B42318` | `#DC2E2F` | `#FBE7E6` | `expense-600` / `expense-400` / `expense-50` (DEFAULT=`expense-600`) |
| Personal withdrawal (steel blue) | `#3E5C76` | `#5B7C99` | `#E8EEF3` | `withdrawal-600` / `withdrawal-500` / `withdrawal-50` (DEFAULT=`withdrawal-600`) |
| Investment return (gold, rare) | `#B08532` | `#E0A200` | `#F6ECCF` | `returns-700` / `returns-300` / `returns-50` (DEFAULT=`returns-500`) |

### Warm Shadows (SOP §1, §2)

| Level | Value | Tailwind token |
|---|---|---|
| 1 — cards | `0 1px 2px rgba(60,50,40,.06), 0 4px 12px rgba(60,50,40,.06)` | `shadow-card` / `shadow-e1` |
| 2 — bar/sheet | `0 6px 20px rgba(60,50,40,.10)` | `shadow-sheet` / `shadow-e2` / `shadow-header` / `shadow-lg` |
| 3 — modal/FAB | `0 16px 40px rgba(60,50,40,.16)` | `shadow-fab` / `shadow-e3` / `shadow-xl` |

**Rule:** either a thin border OR a shadow on an element — never both.

### §13 Executive Treatment (scoped to `/overview` ONLY)

| Role | Hex | Note |
|---|---|---|
| Base bg | `#FFFFFF` | Stark white, brighter than daily ivory |
| Section bg | `#FBFAF7` | Slightly cooler for executive feel |
| Hero card (terracotta surface) | `#CC785C` / deeper `#B4613F` | Ivory text `#FAF9F5` — the bold exception |
| Number island (ONE only) | `#2A2521` | Warm dark ink + white numbers — single island |
| Hair border | `#EAE6DC` | `border` token |
| Divider | `#DAD5C8` | `divider` token |
| Primary/secondary text | `#1F1E1D` / `#6E6A60` | `ink` / `ink.secondary` |
| Profit (deepened) | `#1E7A4D` | On white — use inline `#1E7A4D`, do NOT change global `income` token |
| Loss | `#B42318` | `expense-600` |
| Gold return | `#B08532` | `returns-500` |

**Scope rule:** These exceptions apply ONLY inside `/overview`. Do not bleed them into HomePage, BottomNav, or any operational screen.

### Typography (SOP §5)

- **Font:** `IBM Plex Sans Arabic` (`font-sans` / `font-cairo` / `font-ibm` — all aliased). Numbers: `IBM Plex Mono` (`font-mono`).
- **Named scale tokens** (from `tailwind.config.js` fontSize):
  - `text-title` 28/700
  - `text-title-sm` 20/700
  - `text-section` 17/600
  - `text-card-title` 15/600
  - `text-caption` 12/400
- **Hard rule:** NO negative `letter-spacing`/`tracking` on Arabic (breaks letter joining). Tracking allowed only on small Latin labels.
- §13 numbers: IBM Plex Mono + `tabular-nums`, isolated LTR inside RTL via `unicode-bidi: isolate`. Hero numbers 34–40/700.

### Dates / Times / Numbers (SOP §0.3, §11)

- Amounts: numbers only, thousands separator `,`, NO currency symbol. `formatAmount(value)` in `src/utils/format.js` does this.
- Direction sign: `+` for in, `−` (U+2212) for out, colored + icon.
- Dates: `DD/MM/YYYY` via `formatArabicDate(date)` in `src/utils/date.js`.
- Time: `HH:MM` 24h via `formatTime(date)`. Full datetime `DD/MM/YYYY HH:MM` via `formatArabicDateTime(date)`.

### Touch / Layout

- Min touch target `44×44px`.
- Design width `390px` (range 360–430).
- RTL throughout. Reverse directional icons; align to end (right).
- Screen margin 16, between cards 12, between sections 24, card padding 16.
- Sticky header 56px; BottomNav 56–64px + `safe-area-inset-bottom`.
- FAB 56×56, margin 16, bottom-left in RTL.

### `theme-color`

`<meta name="theme-color" content="#CC785C" />` (set in both `.dc.html` files and presumably `index.html`). §13.6 says `theme-color` transitions in sync with the 400–500ms Overview open animation. Agent 5 may update `document.querySelector('meta[name=theme-color]')` on enter/exit of `/overview` — but only if scoped.

---

## D. Existing Reusable Components Inventory

### Reuse (do NOT duplicate)

| Component | Path | Purpose |
|---|---|---|
| `PageHeader` | `src/components/layout/PageHeader.jsx` | Sticky 56px header. **MUST be used by `/overview`** (replaces InvestorDashboard's hand-rolled `<header>`). Supports `title`, `variant="home"`, `actions[]`, `search`, `subheader`. |
| `BottomNav` | `src/components/layout/BottomNav.jsx` | Bottom nav. Reuse as-is. Agent 3 may add an `/overview` tab OR keep nav unchanged and use a header chip (see IMPLEMENTATION_PLAN). |
| `Icon` | `src/components/ui/Icon.jsx` | SVG icon set. Agent 4 adds ONE new path (e.g. `chartBar`) for the Overview chip. |
| `SegmentedControl` | `src/components/ui/SegmentedControl.jsx` | Pill/underline slider. **Reuse for Overview date-range (اليوم/الأسبوع/الشهر)** — pill variant. |
| `BottomSheet` | `src/components/ui/BottomSheet.jsx` | Draggable expandable sheet, focus-trapped, back-dismisses. **Reuse for strategic-input forms** in `/overview`. |
| `AmountInput` | `src/components/ui/AmountInput.jsx` | `inputMode="decimal"` amount input. Reuse in strategic-input sheets. |
| `EmptyState` | `src/components/ui/EmptyState.jsx` | Empty-state placeholder. Reuse if Overview has no data. |
| `Fab` | `src/components/sheets/Fab.jsx` | Floating action button. Reuse if `/overview` needs a FAB (it does, for strategic inputs). |
| `DiagnosticCard` | `src/components/ui/DiagnosticCard.jsx` | Used in HomePage. Not needed for Overview. |
| `PinEntrySheet` | `src/components/sheets/PinEntrySheet.jsx` | PIN entry. Not needed for Overview. |

### Utilities to reuse

| Utility | Path | Purpose |
|---|---|---|
| `formatAmount` | `src/utils/format.js` | Numbers-only amount formatting. |
| `formatArabicDate`, `formatArabicDateTime`, `formatTime` | `src/utils/date.js` | SOP-compliant date/time. |
| `gatherReportData`, `computeIncomeStatement`, `computeBalanceSheet`, `computeKPIs` | `src/utils/financialReports.js` | **The data source for `/overview`.** Pure functions, take the `db` export shape. |
| `hapticLight`, `hapticMedium`, `hapticSuccess`, `hapticError` | `src/utils/haptics.js` | Haptic feedback. |
| `useSubmitGuard` | `src/hooks/useSubmitGuard.js` | Double-submit guard for financial actions. **Use in strategic-input sheets** (replaces `window.location.reload()` pattern). |
| `useBackDismiss` | `src/hooks/useBackDismiss.js` | Back-button dismisses sheets. |
| `markSynced` | `src/context/CloudSyncContext.jsx` (via `useCloudSync()`) | Persist sync time. **LOAD-BEARING.** |

### DO NOT duplicate / DO NOT reinvent

- `db.on('changes')` / `dexie-observable` — forbidden (crashes, see `CloudSyncContext.jsx` lines 224–232 comment). Auto-sync is wired via Dexie `table.hook`.
- New color tokens / hex values / fonts / gradients / emoji / glow — forbidden.
- Hand-rolled `<header>` in any page — forbidden by SOP §6.1.
- New SegmentedControl / BottomSheet / AmountInput variants — extend the existing ones instead.

---

## E. SOP §13 Summary — Executive / Light Treatment

§13 defines a **light, bold executive panel** ("تقرير سنوي مطبوع / محطّة مالية فاتحة"). The boldness comes from **inverting color usage** (terracotta as dominant surface), NOT from changing the identity, NOT from a dark mode.

### What §13 permits (ONLY inside `/overview`):

1. **Stark white base** `#FFFFFF` (instead of daily ivory `#FAF9F5`).
2. **Section bg** `#FBFAF7` (cooler than daily).
3. **Hero card as a terracotta surface** `#CC785C` / deeper `#B4613F`, with ivory text `#FAF9F5` — the explicit bold exception to "no terracotta as extended surface" (§12 prohibition is lifted here).
4. **ONE number island** in warm dark `#2A2521` with white numbers — only one per screen.
5. **Deepened profit color** `#1E7A4D` on white (instead of `income-600` `#2E7D57`) for extra punch.
6. **Huge Mono numbers** 34–40/700, with `tabular-nums` + `unicode-bidi: isolate`.
7. **KPI pyramid** (not flat grid): hero row of 2 + 2×2 grid of 4 + bottom row of 4, grouped under section headings (Profitability / Efficiency / Liquidity).
8. **Vertical waterfall** income statement (not a table): horizontal proportional bars, terracotta full bar for revenue, hero card for net profit.
9. **Three stacked balance-sheet cards** (not a table), each with a proportional composite bar; Assets = Liabilities + Equity shown by equal bar lengths.
10. **400–500ms transition** on entry: ivory → stark white, terracotta blocks "expand" with stagger. Respects `prefers-reduced-motion`. `theme-color` transitions in sync.
11. **Entry/exit button is terracotta in both states.**

### What §13 does NOT permit:

- Dark mode (the panel is LIGHT).
- Bleeding the inverted palette into operational screens (HomePage, BottomNav, Finance, etc.).
- Sparklines on every KPI card (only on the hero).
- More than one dark number island.
- Changing the identity color, fonts, or global tokens.

### Scope confirmation

The orchestrator's task description says: **"§13 executive treatment scoped to `/overview` only."** This means:
- The `/overview` route renders the §13 treatment.
- All other routes (Home, Finance, Orders, Settings, etc.) keep the daily Layer 1/2 treatment (ivory bg, terracotta as small islands only).
- `AppLayout.jsx` must NOT apply `bg-white` globally for investor — that was Defect B2. The stark white is per-page (inside `/overview`), not per-layout.

---

## F. Build Verification

- **Command:** `cd /home/z/my-project/accounting-app && npm run build`
- **Result:** ✓ built in 4.88s
- **Errors:** 0
- **Warnings:** 1 pre-existing Vite chunking hint (`src/db/index.js is dynamically imported by src/utils/notifications.js but also statically imported by …`) — not an error, ignore.
- **PWA precache:** 40 entries, 1381.92 KiB
- **Service worker:** `dist/sw.js` + `dist/workbox-835c8c05.js` generated
- **Timestamp:** 2026-07-20 09:43:43 UTC
- **Commit:** `2d20b6cb652f7c439f21b31aff167fef23f592c9` (HEAD of `main`)

**Baseline confirmed green.** Ready for Agent 2.
