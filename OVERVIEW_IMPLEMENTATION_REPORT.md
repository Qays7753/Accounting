# Overview Implementation Report — Accounting App Refactor (Layers + Overview)

**Author:** Agent 7 — QA, regression, build & ship
**Date:** 2026-07-20
**Baseline:** commit `2d20b6c` on `main`
**Pipeline:** 7 sequential sub-agents (Agent 0 → Agent 7). All work uncommitted on baseline at start of this task.

---

## 1. Summary

The three-layer model (Daily / Manager / Investor) was made non-destructive and cumulative, the investor "amputation" was removed so every operational route is reachable in every layer, and a new full-screen `/overview` route was added that renders the SOP §13 executive panel — scaled per layer — with a "معلومات تهمّك" insights panel mounted inside. A teal Overview chip in the home header (sibling of `BuildStamp`) is the entry point for all three layers. Build is GREEN (5.56s, 0 errors, 40 PWA precache entries). All load-bearing hotfixes (Dexie table hooks, `markSynced`, `forceRefreshApp`, `lazyWithReload`, `ErrorBoundary` self-heal, `BuildStamp`, `.env` with `VITE_GOOGLE_CLIENT_ID`) are verified intact.

---

## 2. Per-layer behavior

| Aspect | Layer 1 — Daily (يومي) | Layer 2 — Manager (مدير) | Layer 3 — Investor (مستثمر) |
|---|---|---|---|
| **BottomNav** | Visible (all tabs) | Visible (all tabs) | Visible (all tabs) — no longer amputated |
| **Home header Overview chip** | Teal chip, navigates to `/overview` | Teal chip, navigates to `/overview` | Teal chip, navigates to `/overview` |
| **Operational routes reachable** | `/`, `/finance`, `/orders`, `/debts`, `/pos`, `/reports`, `/settings`, `/inventory`, `/overview` | Same full set | Same full set (was previously amputated to a single wildcard → InvestorDashboard) |
| **Overview — hero metric** | Week net (single number) | Week net + margin % | Week net + owner's equity ratio |
| **Overview — KPI tiles** | 3 tiles (revenue, expense, profit) | 5 tiles (+ margin %, inventory value) | 7 tiles (+ ROI, equity, cash) |
| **Overview — analysis section** | Text summary (template-based) | Cost/margin proportional bars + inventory status + restock prediction list | Income-statement waterfall + balance-sheet cards (3 stacked) — migrated from InvestorDashboard |
| **Overview — insights panel (معلومات تهمّك)** | Renders (layer-awareness + operational alerts that apply; no L2/L3 inventory alert) | Renders (full alert set including inventory low + restock) | Renders (full alert set including strategic-asset disuse downgrade suggestion) |
| **Overview — strategic inputs (asset / loan / capital / draw)** | NOT rendered | NOT rendered | Rendered: 2-col grid of 4 action tiles + PDF export button |
| **Overview — PDF export** | Not rendered | Not rendered | Rendered (lazy-loads `jspdf`, lifts logic from InvestorDashboard lines 84–175) |
| **Onboarding layer-intent capture** | Card 1 (storefront + primary) | Card 2 (inventory + accent) | Card 3 (savings + income) — picks Layer 3 at first-run |
| **SettingsPage layer switcher** | Non-destructive `setActiveLayer(1)` + reassurance line ("تبديل الوضع لا يحذف بياناتك") | Non-destructive `setActiveLayer(2)` + reassurance line | Non-destructive `setActiveLayer(3)` + reassurance line |
| **Layer-switch data safety** | Switching down from L3 hides strategic-input UI but `fixed_assets`, `loans`, `transactions` rows from `injectCapital`/`ownerDraw` stay in DB; re-upgrade re-exposes them | Same guarantee | Same guarantee (verified: `setActiveLayer` is a pure settings write — no business-table writes) |

---

## 3. Files changed (modified)

| File | Lines Δ | One-line description |
|---|---|---|
| `src/App.jsx` | +27 / −27 net 0 (rewrite) | Removed `useIsInvestorMode` import + the `if (isInvestor)` wildcard route; registered `/overview` via `lazyWithReload`; swapped InvestorDashboard lazy import for OverviewPage. |
| `src/components/layout/AppLayout.jsx` | 32 → 30 | Removed `useIsInvestorMode` import + the `if (isInvestor)` branch; single layer-agnostic layout (`bg-background` + BottomNav + UpdatePrompt) for all three layers. |
| `src/components/layout/PageHeader.jsx` | 206 → 224 | Added optional `homeChip: ReactNode` prop; rendered as a sibling of `<BuildStamp />` in the home variant's left-actions row (visual LEFT in RTL). |
| `src/components/ui/Icon.jsx` | +4 | Added `chartBar` glyph — stroke-based 4-bar ascending chart, 24×24 viewBox (no new hex, no new font). |
| `src/pages/HomePage.jsx` | +2 | Imported `OverviewChip`; injected it via `homeChip={<OverviewChip />}` on `<PageHeader variant="home" />` (BuildStamp stays put). |
| `src/pages/OnboardingPage.jsx` | 172 → 265 | Added Step 2 (V13) layer-intent capture with 3 cards; dropped legacy `report_mode` write; `handleComplete(layer)` now persists via `setActiveLayer(n)`; added `min-h-[44px]` to both Skip buttons (SOP §0.7). |
| `src/pages/SettingsPage.jsx` | +5 | Appended reassurance line under the existing layer-switcher description (`Icon info` + `t.layer_switch_safe`). |
| `src/utils/terms_simple.js` | +112 | 10 onboarding_layer_* + layer_switch_safe (Agent 2); 50+ overview_* keys (Agent 4); 27 insight_* / insights_* keys (Agent 5). Street Arabic. |
| `src/utils/terms_pro.js` | +112 | Mirrored key-for-key with terms_simple.js. Formal accounting Arabic. |

## 4. Files created

| File | Lines | One-line description |
|---|---|---|
| `RECON_REPORT.md` | 315 | Agent 1's recon: layer-system map, 9 structural defects with line numbers, full token reference sheet, component inventory, §13 summary, build verification. |
| `IMPLEMENTATION_PLAN.md` | 401 | Agent 1's plan: 24 load-bearing global constraints + per-agent sections (2–7) with files-to-touch / not-to-touch / acceptance checks + dependency graph. |
| `OVERVIEW_IMPLEMENTATION_REPORT.md` | (this file) | Agent 7's final report — summary, per-layer behavior, files, SOP compliance, DoD verification, invariants, follow-ups, build output. |
| `src/pages/OverviewPage.jsx` | 799 | Full §13 executive panel: header band (title + layer badge + back + date-range SegmentedControl), hero metric card (terracotta surface), KPI tiles (3/5/7 by layer), layer-scaled analysis section, InsightsPanel mount, L3-only strategic actions + PDF export. Page wraps in `bg-surface` (§13 scope boundary). |
| `src/components/overview/OverviewChip.jsx` | 42 | Teal entry chip for home header (`bg-accent-50 text-accent-600`, 44px min touch, `Icon name="chartBar"` + `t.overview_chip_label`, `navigate('/overview')`). |
| `src/components/overview/InsightsPanel.jsx` | 412 | Data-driven prioritized "معلومات تهمّك" panel: candidate generation + 0–100 scoring + top-3 render. Cool semantic palette only (expense/withdrawal/returns). Action buttons call `onSwitchLayer(n)` (non-destructive) or `useNavigate()` for operational alerts. |
| `src/components/sheets/StrategicInputSheets.jsx` | 295 | Reusable module lifting the 4 strategic-input sheets (asset/loan/capital/draw) + action-menu sheet from InvestorDashboard. Replaced 4 `window.location.reload()` calls with `onSaved?.()` callback. `useSubmitGuard` on every save button. |
| `src/utils/overviewCompute.js` | 262 | Pure helpers: `computeRangeSummary`, `computeHeroMetric`, `computeKpiTiles` (layer-scaled 3/5/7), `computeRestockPrediction`. Reuses `computeIncomeStatement` / `computeBalanceSheet` / `computeKPIs` from `financialReports.js` (no financial-logic duplication). |

---

## 5. SOP compliance notes

| SOP rule | Compliance |
|---|---|
| **§0.5 / §12 — no emoji, no gradients, no glow** | Verified by grep across all new files (emoji ranges U+1F300–1FAFF / U+1F600–1F64F / U+1F680–1F6FF / U+1F1E6–1F1FF → 0 matches; `gradient`/`glow`/`bg-gradient` → 0 matches in new code). |
| **§0.7 — 44×44 px min touch target** | All interactive elements in new code verified: OverviewChip (`h-11` + `min-h-[44px]`); OverviewPage back button (`min-h-[44px]`); PDF export (`h-12` + `min-h-[44px]`); strategic-action tiles (`p-4` + content > 44px); InsightsPanel action pills (`h-11` + `min-h-[44px]`); StrategicInputSheets save buttons (use `btn-primary` which sets `min-height: 48px`); OnboardingPage Skip buttons (both fixed by Agent 6 to `min-h-[44px]`). |
| **§1 — color tokens (no new hex)** | Only one inline hex in new code: `#2A2521` in OverviewPage.jsx line 674 (the documented §13.1 dark number island for Net Profit). All other hex references are in code comments. Terracotta `bg-primary` reserved for hero card + Equity card + `btn-primary` strategic-action save buttons. KPI tiles + Insight cards use cool semantic palette only (income/expense/withdrawal/returns). |
| **§1 — either border OR shadow, never both** | Audited every card in new code: Hero card = `bg-primary` + `shadow-card` (no border — OK); Equity card = `bg-primary` + `shadow-card` (no border — OK); Net Profit island = `#2A2521` fill (no border, no shadow — OK); KPI tiles + Analysis cards + Insight cards = `bg-surface` + `border border-divider` (no shadow — OK). |
| **§5 — typography** | No new fonts (only IBM Plex Sans Arabic + IBM Plex Mono). One documented §13.5 exception: `text-[34px]` arbitrary value for hero numbers (the Tailwind scale tops out at `text-title` 28px; §13.5 explicitly specifies 34–40/700). No negative `letter-spacing` on Arabic. |
| **§6.1 — no hand-rolled `<header>`** | OverviewPage renders header band as a `<section>`, not a `<header>`. No `<header>` element in any new code (verified by grep). InsightsPanel renders `<section>`, not `<header>`. |
| **§13 — executive treatment scoped to `/overview` only** | Page wrapper is `bg-surface` (stark white `#FFFFFF`) INSIDE OverviewPage; AppLayout keeps `bg-background` (ivory) for all layers. No §13 treatment leaked to HomePage, SettingsPage, or operational screens. |
| **§13.1 — dark number island** | Exactly ONE inline `#2A2521` block (Net Profit card in OverviewPage Layer 3 analysis). No other dark islands. |
| **§13.1 — terracotta hero exception** | `bg-primary` (terracotta) used on: (a) HeroMetricCard, (b) Equity card in AnalysisLayer3, (c) `btn-primary` save buttons in StrategicInputSheets. NOT used on any insight card or KPI tile. |
| **Numbers — numbers-only via `formatAmount`** | All amounts in new code use `formatAmount(value)` (→ `toLocaleString('en-US')` comma thousands separator). No currency symbols (grep for `د.أ|JOD|JD|\$|€|£` in new files → only `$` in JS template literals, no actual currency symbols). |
| **Dates — DD/MM/YYYY via `formatArabicDate`** | All date displays in new code use `formatArabicDate` (DD/MM/YYYY). No times rendered on Overview page. |
| **RTL throughout** | `dir="rtl"` on inputs in OnboardingPage + StrategicInputSheets. The one `text-left` in OverviewPage BalanceRow (line 766) is intentional — places the formatted number adjacent to its proportional bar (with `unicode-bidi: isolate` handling LTR digit display). |
| **All text via `useTerms()`** | All NEW text in Agents 2/4/5 work uses `t.*` keys. Verified 398 keys in both `terms_simple.js` and `terms_pro.js` (0 missing on either side). Pre-existing hardcoded Arabic strings in OnboardingPage Step 1 + SettingsPage layer switcher are out of Agent 6's audit scope — flagged as follow-ups below. |
| **Double-submit guard on financial actions** | `useSubmitGuard()` used on every save button in StrategicInputSheets (4 sheets). |
| **No `window.location.reload()` after writes** | Verified: zero `window.location.reload()` calls in `OverviewPage.jsx`, `OverviewChip.jsx`, `InsightsPanel.jsx`, `StrategicInputSheets.jsx`, `overviewCompute.js` (only comment references documenting the absence). Strategic-input saves call `onSaved?.()` → parent re-fetches via `gatherReportData(db)` + `setReportData(...)` → preserves the 30-second cloud-sync debounce window. |

---

## 6. Acceptance criteria verification — 10 Definition-of-Done items

| # | DoD item | How verified |
|---|---|---|
| 1 | **Build is GREEN at every agent hand-off and at final QA.** | `npm run build` re-run at end of this task → ✓ built in 5.56s, 0 errors. PWA precache 40 entries (1412.68 KiB). Only pre-existing Vite chunking hint about `src/db/index.js` (acceptable per RECON_REPORT §F). One pre-existing esbuild warning about `>` character inside Arabic text in InventoryPage.jsx line 215 — file unchanged from baseline (verified: `git diff HEAD -- src/pages/InventoryPage.jsx` → empty). |
| 2 | **Investor layer is no longer amputated — every operational route available in every layer; `/overview` registered.** | `rg "isInvestor\|useIsInvestorMode" src/App.jsx src/components/layout/AppLayout.jsx` → 0 matches. `rg "/overview" src/App.jsx` → `<Route path="/overview" element={<OverviewPage />} />` registered in the single shared `<Routes>` block alongside `/`, `/finance`, `/orders`, `/debts`, `/pos`, `/reports`, `/settings`, `/inventory`. Helper Mode branch (separate access-restriction for employees) untouched. |
| 3 | **Onboarding captures layer intent via `setActiveLayer(n)` (non-destructive).** | OnboardingPage Step 2 (V13) renders 3 cards (Daily / Manager / Investor). Each calls `handleComplete(N)` → `await setActiveLayer(N)` (from `useActiveLayer()`), which writes `db.setSetting('active_layer', n)` AND updates React state. Legacy `report_mode` write dropped. Skip link defaults to Layer 1. Verified by reading OnboardingPage.jsx `handleComplete` (lines ~225–245). |
| 4 | **SettingsPage layer switcher uses the same non-destructive `setActiveLayer` path + reassurance line.** | SettingsPage layer-switcher buttons call existing `setActiveLayer(N)` (unchanged code path — verified at lines 583/592/601). Agent 2 added a reassurance block at line 616: `<Icon name="info" />` + `t.layer_switch_safe` ("تبديل الوضع لا يحذف بياناتك"). No confirmation modal (the switch is safe by design). |
| 5 | **`/overview` renders the full §13 executive panel.** | OverviewPage.jsx (799 lines) renders: (a) header band with title `t.overview_title` + layer badge + back button + date-range SegmentedControl (today/week/month, default 'week'); (b) hero metric card (terracotta surface `bg-primary`, ivory text, Mono number `text-[34px]` + tabular-nums); (c) KPI tiles layer-scaled (3/5/7); (d) analysis section layer-scaled (L1 text / L2 cost-margin-inventory-restock / L3 waterfall + balance sheet); (e) InsightsPanel mounted between analysis and strategic actions; (f) L3-only strategic actions (4 tiles + PDF export). Page wrapper `bg-surface` — §13 scope boundary respected (AppLayout keeps `bg-background`). |
| 6 | **Layer-scaled content (L1 / L2 / L3 each see appropriate depth).** | `overviewCompute.js` exports `computeHeroMetric`, `computeKpiTiles`, `computeRangeSummary`, `computeRestockPrediction` — each branches on `activeLayer`. Layer 1: 3 KPI tiles + text summary; Layer 2: 5 tiles + cost/margin bars + inventory + restock list; Layer 3: 7 tiles + income-statement waterfall + 3-card balance sheet + strategic actions + PDF. Verified by reading overviewCompute.js + OverviewPage render branches. |
| 7 | **Insights panel ("معلومات تهمّك") renders top-3 prioritized insights, layer-awareness always present, action buttons non-destructive.** | InsightsPanel.jsx (412 lines): generates candidates, scores 0–100 (cloud_backup_off=95, inventory_low=90 L2/3, overdue_debts=85, no_sales_today=80, layer-awareness=70, upgrade=60, downgrade=30), sorts desc, slices to 3. Layer-awareness score 70 < 80 < 85 < 90 < 95 → always present unless 3+ higher alerts fire. Action buttons call `onSwitchLayer(n)` (which is OverviewPage's `setActiveLayer` from `useActiveLayer()` — pure settings write per Agent 2's guarantee) or `useNavigate()` for operational alerts. |
| 8 | **No `window.location.reload()` in NEW code.** | `rg "window\.location\.reload" src/pages/OverviewPage.jsx src/components/overview/ src/components/sheets/StrategicInputSheets.jsx src/utils/overviewCompute.js` → only comment references documenting the absence ("NO `window.location.reload()` anywhere"). Pre-existing reloads in `App.jsx` (lazyWithReload stale-chunk recovery — load-bearing), `SettingsPage` (Google logout + emergency restore — load-bearing), `pwaUpdate.js` (the `forceRefreshApp` implementation), `ErrorBoundary.jsx` (via `forceRefreshApp`) are all out of scope and untouched. InvestorDashboard.jsx still has 4 reloads at lines 382/395/404/413 but is dead code (unrouted — see follow-ups). |
| 9 | **SOP compliance: 44px touch, RTL, no emoji/gradients, no new hex (except `#2A2521` §13 exception), all text via `useTerms()` mirrored in both dictionaries, either border OR shadow per card.** | See §5 above. All checks pass. The only inline hex in new code is `#2A2521` (documented §13.1 dark number island). 398 term keys mirrored between `terms_simple.js` and `terms_pro.js` (verified by Node script per Agent 6). |
| 10 | **All load-bearing invariants intact (Dexie table hooks, `markSynced`, `forceRefreshApp`, `lazyWithReload`, ErrorBoundary self-heal, BuildStamp, `.env` with `VITE_GOOGLE_CLIENT_ID`, Dexie schema unchanged at v9).** | See §7 below. All 8 invariants verified. |

---

## 7. Load-bearing invariants verified

| # | Invariant | Verification |
|---|---|---|
| 1 | **No `db.on('changes')` anywhere** (would crash on Google connect; sync is wired via Dexie `table.hook('creating'/'updating'/'deleting')` in CloudSyncContext.jsx). | `rg "db\.on\(['\"]changes" src/` → only 2 comment matches: `InsightsPanel.jsx` line 77 (documentation) + `CloudSyncContext.jsx` line 226 (the explanatory NOTE comment). ZERO actual calls. ✓ |
| 2 | **No `dexie-observable` import.** | `rg "dexie-observable" src/ package.json` → only the same 2 comment matches. ZERO imports. ✓ |
| 3 | **`markSynced` exists in CloudSyncContext.jsx.** | `rg "markSynced" src/context/CloudSyncContext.jsx` → matches at lines 58, 129, 177, 184, 307 (definition + 4 call sites + 3 useCallback dependency arrays). ✓ |
| 4 | **`forceRefreshApp` exists in pwaUpdate.js with signature `(reload = true)`.** | `rg "forceRefreshApp" src/utils/pwaUpdate.js` → `export async function forceRefreshApp(reload = true)` ✓ |
| 5 | **`lazyWithReload` used in main.jsx / App.jsx.** | `rg "lazyWithReload" src/App.jsx` → definition (line ~25) + 10 usages wrapping every lazy route including the new `OverviewPage`. ✓ |
| 6 | **ErrorBoundary self-healing intact (auto-recovers once for `ChunkLoadError` via `forceRefreshApp(true)`).** | `rg "forceRefreshApp\|AUTO_HEAL\|recovering" src/components/common/ErrorBoundary.jsx` → imports `forceRefreshApp`, defines `AUTO_HEAL_KEY = 'eb_auto_heal_attempt'`, `this.state.recovering`, calls `forceRefreshApp(true)` in auto-heal path + manual reset button. ✓ |
| 7 | **BuildStamp still in home header.** | `rg "BuildStamp" src/components/layout/PageHeader.jsx` → imports `BuildStamp` + renders `{variant === 'home' && <BuildStamp />}` (untouched). `rg "BuildStamp" src/pages/HomePage.jsx` → not directly imported (rendered via PageHeader). ✓ |
| 8 | **`.env` tracked and contains `VITE_GOOGLE_CLIENT_ID`.** | `cat .env | rg VITE_GOOGLE_CLIENT_ID` → `VITE_GOOGLE_CLIENT_ID=449266089615-bbjgn7uqj912vlnct16mf46f429arhhr.apps.googleusercontent.com` ✓. `git ls-files .env` → `.env` (tracked, not gitignored). ✓ |
| 9 | **Dexie schema NOT bumped (still v9).** | `rg "version\(" src/db/index.js` → `this.version(1)` through `this.version(9)` — no v10 added. ✓ |

---

## 8. Known issues / follow-ups (from Agent 6's audit)

| # | Issue | Status | Reason |
|---|---|---|---|
| 1 | **OnboardingPage Step 1 hardcoded Arabic strings** (lines 119, 121–122, 138–139, 156–157, 167: "ما نوع نشاطك؟", "هل تبيع الأشياء جاهزة أم تصنعها؟", "منتجات جاهزة", etc.) | Left as-is | PRE-EXISTING in baseline; Agent 2 only changed the onClick handler on Step 1's buttons. Out of strict audit scope. **Follow-up:** migrate to `useTerms()` keys for simple/pro parity. |
| 2 | **SettingsPage hardcoded Arabic labels** in the layer switcher + language mode section (lines 565, 576–577, 588, 597, 606, 611–614). | Left as-is | PRE-EXISTING; Agent 2 only added the reassurance block (lines 616–620, which correctly uses `t.layer_switch_safe`). **Follow-up:** migrate to `useTerms()` keys. |
| 3 | **OnboardingPage Step 1 buttons use `border-2 + shadow-card`** — when selected, border becomes visible terracotta + shadow (SOP §1 either/or violation when selected). | Left as-is | PRE-EXISTING pattern in baseline Step 1; Agent 2 only changed the onClick handler. **Follow-up:** pick one (border OR shadow) for the selected state. |
| 4 | **InvestorDashboard.jsx is dead code with a `<header>` element** (SOP §6.1 violation if rendered). | Left as-is | File is not routed (Agent 3 removed the investor wildcard), not imported anywhere (verified via `git status`). The SOP §6.1 violation is theoretical. **Follow-up:** delete `src/pages/InvestorDashboard.jsx` and remove the dead comment in `src/App.jsx` lines 57–60 that references it as the "migration source". |
| 5 | **OverviewPage HeroMetricCard uses `text-[34px]` arbitrary value** (line 479). | Left as-is (documented §13.5 exception) | SOP §5 prohibits arbitrary `text-[NNpx]` values, BUT §13.5 explicitly specifies "أرقام البطل 34–40/700" (hero numbers 34-40/700). The Tailwind config's named scale tops out at `text-title` (28px) — there's no 34-40px token. So `text-[34px]` is the only way to satisfy §13.5. |
| 6 | **OverviewPage BalanceRow value cell uses `text-left` in RTL** (line 766). | Left as-is (intentional) | Places the formatted number adjacent to its proportional bar. The `unicode-bidi: isolate` style handles LTR digit display correctly within RTL flow. Not an RTL leak. |
| 7 | **StrategicInputSheets loan-type toggle** (lines 239, 246) uses `bg-expense-500` (payable) / `bg-income-500` (receivable) instead of terracotta `bg-primary`. | Left as-is (intentional) | SOP §7.3 chip rule covers FILTER chips (أزرار الفلاتر), not semantic binary toggles. Colors are SEMANTIC: red = payable (obligation), green = receivable (asset). Matches the cool semantic palette per SOP §1. The primary save buttons below correctly use `btn-primary` (terracotta). |
| 8 | **Pre-existing esbuild warning** about `>` character inside Arabic text in `InventoryPage.jsx` line 215 ("التكلفة > ١٥ د.أ"). | Left as-is | File unchanged from baseline (verified: `git diff HEAD -- src/pages/InventoryPage.jsx` → empty). Pre-existing issue, out of refactor scope. |

---

## 9. Build output

| Metric | Value |
|---|---|
| **Timestamp (UTC)** | 2026-07-20 11:17:00 UTC |
| **Command** | `npm run build` (`vite build`) |
| **Duration** | 5.56s |
| **Errors** | 0 |
| **Warnings (new)** | 0 |
| **Warnings (pre-existing, acceptable)** | 1 Vite chunking hint about `src/db/index.js` being both statically and dynamically imported (ignored per RECON_REPORT §F); 1 esbuild warning about `>` in InventoryPage.jsx line 215 (pre-existing, file unchanged from baseline). |
| **PWA precache** | 40 entries (1412.68 KiB) |
| **`dist/sw.js`** | Generated ✓ |
| **`dist/workbox-835c8c05.js`** | Generated ✓ |
| **OverviewPage chunk** | `dist/assets/OverviewPage-Cx89Rz1s.js` — 36.56 kB (gzip 9.08 kB) |
| **Largest chunks** | `jspdf.es.min-a_0nVoD8.js` 390.51 kB (gzip 128.81 kB, lazy-loaded only on PDF export); `html2canvas.esm-CBrSDip1.js` 201.42 kB (gzip 48.03 kB, lazy-loaded only on PDF export); `react-vendor-CBbugYxW.js` 163.92 kB (gzip 53.50 kB). |
| **CSS** | `dist/assets/index-DS5h2o6o.css` — 33.66 kB (gzip 6.68 kB) |
| **index.html** | 1.88 kB (gzip 0.81 kB) |
| **manifest.webmanifest** | 0.48 kB |

---

**End of report.**
