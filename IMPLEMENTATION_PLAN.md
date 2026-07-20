# IMPLEMENTATION PLAN — Accounting App Refactor (Layers + Overview)

**Author:** Agent 1 — Recon & Plan
**Audience:** Agents 2–7 (each gets one section below)
**Baseline:** commit `2d20b6c` on `main`, build green (see `RECON_REPORT.md` §F).

Each agent MUST:
1. Read `/home/z/my-project/worklog.md` before starting.
2. Read `RECON_REPORT.md` (especially §B defects and §C tokens) before touching code.
3. Read the SOP sections referenced in their slice.
4. Run `npm run build` at the end and confirm 0 errors.
5. Append a worklog section with Task ID / Agent / Task / Work Log / Stage Summary.

---

## Global constraints (load-bearing — DO NOT BREAK)

These apply to EVERY agent. Violating any of them breaks production.

1. **No `db.on('changes')`, no `dexie-observable`.** Auto-sync is wired via Dexie `table.hook('creating'/'updating'/'deleting')` in `src/context/CloudSyncContext.jsx` (lines 233–264). Reintroducing `db.on('changes')` crashes the app on Google connect (see comment there).
2. **Use `markSynced()` for sync-time persistence.** Import `useCloudSync()` from `src/context/CloudSyncContext.jsx` and call `markSynced()` (or `markSynced(ts)`) after any write that should reset the sync clock. Do NOT write `localStorage` directly for sync time.
3. **Keep `forceRefreshApp()` intact** in `src/utils/pwaUpdate.js`. Used by `ErrorBoundary` (self-heal) and `SettingsPage`. Do not rename, do not change its signature `(reload=true)`.
4. **Keep `lazyWithReload`** in `src/App.jsx` (lines 25–45). Wrap ANY new lazy route with it (not bare `lazy()`). This is the stale-chunk recovery mechanism.
5. **Keep the hybrid PWA update** in `src/main.jsx` (foreground banner + background silent apply + 30-min poll + visibilitychange check). Do not change `registerSW` config.
6. **Keep the self-healing `ErrorBoundary`** in `src/components/common/ErrorBoundary.jsx`. It auto-recovers once for `ChunkLoadError` via `forceRefreshApp(true)`. Do not weaken the `isLoadError` check.
7. **BuildStamp in home header stays.** `src/components/common/BuildStamp.jsx` is rendered by `PageHeader` line 165 (`{variant === 'home' && <BuildStamp />}`). Do not remove. Toggle only via `SHOW_BUILD_STAMP` constant inside the file.
8. **`.env` is tracked and contains `VITE_GOOGLE_CLIENT_ID`.** Do not remove, do not gitignore, do not rename. The Google Drive sync depends on it.
9. **Do NOT bump the Dexie schema** unless absolutely necessary. Current is v9 (`src/db/index.js` line 172). If a new field is needed, prefer storing it as a loose property on an existing row (Dexie allows this without a schema bump — only INDEXED fields require a version bump). If a new indexed field is unavoidable, add a v10 that PRESERVES every v9 store definition verbatim and only adds the new index — never rewrite old versions.
10. **No new hex values.** Use only the Tailwind tokens listed in `RECON_REPORT.md` §C. The single documented exception is `#2A2521` (the §13 number island) and `#1E7A4D` (deepened profit) — both scoped to `/overview` and applied inline, never as new global tokens.
11. **No new fonts.** `IBM Plex Sans Arabic` + `IBM Plex Mono` only.
12. **No gradients, no emoji, no glow.** (SOP §0.5, §12.)
13. **All amounts are numbers-only** — no currency symbol. Use `formatAmount(value)` from `src/utils/format.js`.
14. **All dates `DD/MM/YYYY`, time `HH:MM` (24h).** Use `formatArabicDate` / `formatTime` / `formatArabicDateTime` from `src/utils/date.js`.
15. **Min touch target 44×44px.**
16. **RTL throughout. Design width 390px.** Reverse directional icons; align to end (right).
17. **All text rendered via `useTerms()`** so simple/pro language modes are respected. Add any new strings to BOTH `src/utils/terms_simple.js` AND `src/utils/terms_pro.js`.
18. **§13 executive treatment scoped to `/overview` only.** Do not bleed stark-white bg, terracotta-as-surface, or deepened profit color into any other route.
19. **Either a thin border OR a shadow on an element — never both.** (SOP §1 shadow rule.)
20. **No negative `letter-spacing` on Arabic.** (SOP §5 — breaks letter joining.)
21. **No hand-rolled `<header>` in any page.** Use `PageHeader` (SOP §6.1).
22. **Double-submit guard on every financial action.** Use `useSubmitGuard()` from `src/hooks/useSubmitGuard.js`.
23. **No `window.location.reload()` after writes.** It throws away the 30s debounced cloud-sync window. Refresh local state instead (`setState`, `useReducer`, or re-call `gatherReportData(db)`).
24. **Do not touch `tailwind.config.js` token values.** The tokens are 1:1 with the SOP and the two `.dc.html` identity files. Adding a new key (e.g. a scoped `chart-bar` animation) is OK; changing an existing value is NOT.

---

## Agent 2 — Routing & Layout (fix defects B1, B2)

**Goal:** Make `/overview` a real route visible in every layer, and stop investor mode from amputating the app.

**Files to touch:**
- `src/App.jsx` — register `/overview` route; remove the investor amputation branch.
- `src/components/layout/AppLayout.jsx` — remove the investor branch; single layout for all layers.

**Files to NOT touch (load-bearing):**
- `src/context/TermsContext.jsx` — healthy, leave alone.
- `src/main.jsx`, `src/components/common/ErrorBoundary.jsx`, `src/utils/pwaUpdate.js`, `src/context/CloudSyncContext.jsx` — load-bearing.
- `src/db/index.js` — no schema change needed for routing.

**Specific changes:**

1. **`src/App.jsx`:**
   - Add a new lazy route at the top with the other `lazyWithReload` imports:
     ```jsx
     const OverviewPage = lazyWithReload(() => import('./pages/OverviewPage.jsx'))
     ```
     (Agent 5 creates the file; Agent 2 just registers the route. If the file does not exist yet at Agent 2's turn, create a tiny placeholder `src/pages/OverviewPage.jsx` that renders `<div className="p-6">Overview placeholder</div>` so the build stays green. Agent 5 will replace it.)
   - In `AppRoutes`, **delete the entire `if (isInvestor) { … }` block** (lines 98–107). The investor amputation is gone.
   - In the "Daily / Manager Mode" `<Routes>` block, add `<Route path="/overview" element={<OverviewPage />} />` alongside the others.
   - Keep the Helper Mode branch (lines 86–96) untouched — it's a separate access-restriction mode for employees, not a layer.

2. **`src/components/layout/AppLayout.jsx`:**
   - **Delete the entire `if (isInvestor) { … }` branch** (lines 11–20).
   - The remaining single layout (lines 23–31) handles all layers: `bg-background` + `BottomNav` + `pb-28` + `UpdatePrompt`.
   - Remove the now-unused `useIsInvestorMode` import.
   - Keep `useSettings2` for `showQuickPos` (still needed by BottomNav).

3. **`src/components/layout/BottomNav.jsx`:**
   - **Decision point for the orchestrator:** two valid options —
     - **Option A (recommended):** Keep BottomNav tabs unchanged (Home / Finance / Orders + POS / Inventory / Settings). The Overview entry is a chip in the home header (Agent 4's job). This keeps nav ≤5 tabs and matches SOP §4 "3–5 main destinations".
     - **Option B:** Add a 6th tab "نظرة" (Overview) pointing to `/overview`. This pushes nav to 6 tabs when POS+Inventory are both enabled — at the upper edge of SOP §4's range.
   - **Agent 2 default: Option A** (no BottomNav change). If the orchestrator overrides, Agent 2 adds a tab between Orders and Inventory with a new `chartBar` icon (Agent 4 adds the glyph to `Icon.jsx`).
   - Either way, BottomNav stays visible in ALL layers (including Layer 3).

4. **Do NOT delete `src/pages/InvestorDashboard.jsx`** in this slice — Agent 5 repurposes it into `OverviewPage.jsx`. Leave the file in place so the build stays green.

**Build verification:**
- `npm run build` → 0 errors.
- Manually verify (or grep) that `useIsInvestorMode` is no longer imported in `App.jsx` or `AppLayout.jsx`.
- The placeholder `OverviewPage.jsx` must exist and render without crashing.

**Acceptance check for this slice:**
- `npm run build` green.
- Layer 3 user (set `active_layer=3` in Dexie) sees the BottomNav and can navigate to `/`, `/finance`, `/orders`, `/overview`, `/settings` — NOT stuck in InvestorDashboard.
- `/overview` route resolves (placeholder is fine for now).
- `AppLayout` has a single return path (no investor branch).
- Helper Mode still works (POS + Orders only).

---

## Agent 3 — Layer-awareness wiring (fix defect B6 partial, B5 partial)

**Goal:** Make the layer state actually do something at the home level, and lay the groundwork for Layer 2 manager features and Layer 3 overview entry.

**Files to touch:**
- `src/pages/HomePage.jsx` — add `useActiveLayer()`; render an Overview entry chip/card in the header area for ALL layers (the chip navigates to `/overview`).
- `src/pages/SettingsPage.jsx` — keep the tri-mode switcher as-is, but ensure switching to Layer 3 no longer kicks the user out (since Agent 2 removed the amputation). Add a one-line confirmation toast after switch.

**Files to NOT touch:**
- `src/context/TermsContext.jsx` — healthy.
- `src/App.jsx`, `src/components/layout/AppLayout.jsx` — Agent 2 owns these.
- `src/db/index.js`.

**Specific changes:**

1. **`src/pages/HomePage.jsx`:**
   - Import `useActiveLayer` from `../context/TermsContext.jsx`.
   - Import `useNavigate` (already imported line 25).
   - Read `const [activeLayer] = useActiveLayer()` and `const navigate = useNavigate()`.
   - In the `PageHeader` call (line 292 `<PageHeader variant="home" />`), pass a `subheader` prop containing a tappable Overview entry card. The card shows today's net cash (or today's net profit if available) + a teal `chartBar` icon + a chevron, and navigates to `/overview` on click. Style: `bg-surface rounded-card p-4 shadow-card flex items-center justify-between`, icon container `bg-accent-50 text-accent-600`. Use `formatAmount` for the number.
   - The chip/card is visible in ALL layers (1, 2, 3). Clicking navigates to `/overview`.
   - **Do NOT** add layer-conditional content beyond this chip in this slice — Layer 2 manager features are out of scope unless the orchestrator explicitly asks.

2. **`src/pages/SettingsPage.jsx`:**
   - The tri-mode switcher (lines 533–618) is correct in structure. After `setActiveLayer(N)`, add a `hapticSuccess()` and a brief toast/inline confirmation (e.g. a 1.5s fading caption under the buttons: "تم التبديل إلى وضع المستثمر" / "المدير" / "اليومي"). Use the existing `t.*` terms where possible; add new strings to both `terms_simple.js` and `terms_pro.js`.
   - Do NOT navigate away after switch — the user stays on Settings. The layer change takes effect on next route render.

3. **Terms files:**
   - Add to BOTH `src/utils/terms_simple.js` and `src/utils/terms_pro.js`:
     - `overview_chip_label`: "نظرة سريعة" (simple) / "نظرة مالية" (pro)
     - `overview_today_net`: "صافي اليوم" (both)
     - `layer_switch_toast_1`, `_2`, `_3`: "تم التبديل إلى الوضع اليومي" / "… المدير" / "… المستثمر"

**Build verification:**
- `npm run build` → 0 errors.
- Home page renders the Overview chip in all three layers.
- Clicking the chip navigates to `/overview` (placeholder is fine).

**Acceptance check for this slice:**
- HomePage imports `useActiveLayer` and reads the value.
- The Overview entry chip is visible in Layer 1, 2, and 3.
- SettingsPage layer switch no longer kicks the user out (because Agent 2 removed the amputation).
- New terms exist in both simple and pro dictionaries.
- `npm run build` green.

---

## Agent 4 — Shared UI primitives for Overview (fix defect B7)

**Goal:** Add the one missing icon glyph and any shared Overview sub-components, so Agent 5 can build the page cleanly.

**Files to touch:**
- `src/components/ui/Icon.jsx` — add ONE new path: `chartBar` (3-bar chart outline, 24×24 viewBox, stroke-based, `strokeLinecap="round" strokeLinejoin="round"`, matches existing style).
- Create `src/components/overview/OverviewKpiCard.jsx` — a single KPI card primitive matching SOP §13.2 (number + label + optional delta arrow). Props: `{ label, value, unit?, delta?, variant: 'hero' | 'mid' | 'bottom' }`. Hero variant = terracotta surface + ivory text; mid/bottom = white surface + ink text. Use `formatAmount` for amounts, plain string for ratios/days.
- Create `src/components/overview/OverviewWaterfallRow.jsx` — the income-statement waterfall row (label right, Mono number left, proportional bar). Lift the existing `WaterfallRow` from `InvestorDashboard.jsx` (lines 421–434) into this file, generalize it (accept `max`, `color`, `textColor`, `prefix`, `bold`).
- Create `src/components/overview/OverviewBalanceRow.jsx` — same for the balance-sheet composite bar. Lift from `InvestorDashboard.jsx` lines 437–447.
- Create `src/components/overview/OverviewDateRangeControl.jsx` — wraps `SegmentedControl` (pill variant) with three segments: `{ id: 'today', label: 'اليوم' }, { id: 'week', label: 'الأسبوع' }, { id: 'month', label: 'الشهر' }`. Pure presentational; state owned by parent.

**Files to NOT touch:**
- `tailwind.config.js` — no new tokens. Use existing `primary`, `accent`, `income`, `expense`, `withdrawal`, `returns`, `ink`, `surface`, `background`, `divider`, `border` tokens.
- `src/components/ui/SegmentedControl.jsx`, `src/components/ui/BottomSheet.jsx`, `src/components/ui/AmountInput.jsx` — reuse, do not modify.

**Specific changes:**

1. **`src/components/ui/Icon.jsx`** — add to the `icons` object (alphabetical or at the end):
   ```jsx
   // Chart bar (overview / analytics)
   chartBar: (
     <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2v8H3v-8zm6-6h2v14H9V7zm6 4h2v10h-2V11zm6-7h2v17h-2V4z" />
   ),
   ```
   (Or any equivalent 3-bar outline. Keep stroke-based, no fill, to match the existing icon style.)

2. **`OverviewKpiCard.jsx`** — render:
   - Hero variant: `<div className="bg-primary rounded-card p-5 shadow-card">` + label `text-caption text-white/80 font-medium` + value `num text-[34px] font-bold text-white` with `tabular-nums`.
   - Mid variant: `<div className="bg-surface rounded-card p-4 shadow-card border border-divider">` + label `text-caption text-ink-secondary` + value `num text-title font-bold text-ink`.
   - Bottom variant: same as mid but `p-3` + value `text-card-title text-ink-secondary`.
   - Optional delta: small `text-caption` below value with `▲`/`▼` + percentage, colored by `income-600` / `expense-600`. (No emoji — these are unicode geometric shapes, allowed.)

3. **`OverviewWaterfallRow.jsx`** — same as the existing `WaterfallRow` but in its own file and exported. Inline the `formatAmount` import.

4. **`OverviewBalanceRow.jsx`** — same.

5. **`OverviewDateRangeControl.jsx`**:
   ```jsx
   import SegmentedControl from '../ui/SegmentedControl.jsx'
   const SEGMENTS = [
     { id: 'today', label: 'اليوم' },
     { id: 'week', label: 'الأسبوع' },
     { id: 'month', label: 'الشهر' },
   ]
   export default function OverviewDateRangeControl({ value, onChange }) {
     return <SegmentedControl segments={SEGMENTS} value={value} onChange={onChange} variant="pill" />
   }
   ```

**Build verification:**
- `npm run build` → 0 errors.
- The new components import cleanly (no circular deps).
- `Icon name="chartBar"` renders without crashing.

**Acceptance check for this slice:**
- `Icon.jsx` has a `chartBar` glyph.
- Four new files exist under `src/components/overview/`.
- All new components use only existing Tailwind tokens (grep for `#` in the new files — only the documented `#2A2521` / `#1E7A4D` inline exceptions are allowed, and only if used; otherwise none).
- `npm run build` green.

---

## Agent 5 — Overview page (fix defects B3, B4, B9; deliver §13)

**Goal:** Build `/overview` as the §13 executive panel — KPI pyramid + income-statement waterfall + balance-sheet cards + strategic-input FAB + PDF export. Replace the placeholder from Agent 2.

**Files to touch:**
- `src/pages/OverviewPage.jsx` — REPLACE the placeholder with the full page. Migrate all the rendering logic from `InvestorDashboard.jsx` but route it through `PageHeader` and the new shared components from Agent 4.
- `src/components/sheets/StrategicActionSheets.jsx` — NEW file. Lift the 4 strategic-input sheets (asset/loan/capital/draw) out of `InvestorDashboard.jsx` into a reusable module. Replace `window.location.reload()` with a callback prop `onSaved` that the parent uses to re-fetch data.
- `src/pages/InvestorDashboard.jsx` — **DELETE this file** (or leave a one-line re-export `export { default } from './OverviewPage.jsx'` for one release cycle, then delete). The orchestrator should decide; default is to delete since Agent 2 already removed the route.

**Files to NOT touch:**
- `src/db/index.js` — `addFixedAsset`, `addLoan`, `injectCapital`, `ownerDraw` all stay. No schema change.
- `src/utils/financialReports.js` — pure compute, reuse as-is.
- `src/components/layout/PageHeader.jsx` — use it as-is (Agent 5 calls it; does not modify it).
- `src/components/ui/BottomSheet.jsx`, `src/components/ui/AmountInput.jsx`, `src/components/ui/SegmentedControl.jsx` — reuse.
- `src/utils/pwaUpdate.js`, `src/context/CloudSyncContext.jsx`, `src/components/common/ErrorBoundary.jsx` — load-bearing.

**Specific changes:**

1. **`src/pages/OverviewPage.jsx`:**
   - Use `PageHeader` with `title="نظرة مالية"` (or `t.overview_title`), NO `variant="home"`. Pass `subheader={<OverviewDateRangeControl value={range} onChange={setRange} />}`.
   - Apply the §13 stark-white treatment INSIDE the page (not at layout level): wrap the page body in `<div className="min-h-screen bg-white">`. The `AppLayout` keeps `bg-background` outside; the page overrides locally. (This is the §13 scope boundary.)
   - Render the three sections from `InvestorDashboard.jsx`:
     - **KPI pyramid** (lines 226–275 of the old file): hero row of 2 (`runway`, `netProfitMargin`) using `OverviewKpiCard variant="hero"`; mid 2×2 (`grossMargin`, `roi`, `opexRatio`, `avgTicket`) using `variant="mid"`; bottom 2×2 (`inventoryTurnover`, `dso`, `cashTurnover`, `currentRatio`) using `variant="bottom"`. Keep the DSO WhatsApp-reminder button.
     - **Income statement waterfall** (lines 278–302): use `OverviewWaterfallRow`. The Net Profit hero card uses `bg-ink` style — replace with `#2A2521` inline (`style={{ background: '#2A2521' }}`) per SOP §13.1. This is the ONE documented number island.
     - **Balance sheet** (lines 305–340): three stacked cards. The Equity card uses `bg-primary` (terracotta surface with ivory text) — this is the §13 hero exception, keep it.
   - Add the **FAB** for strategic inputs (lines 344–352): `<Fab>` or a custom FAB styled per SOP §4 (56×56, `bg-primary`, `shadow-fab`, bottom-left in RTL). On click opens `StrategicActionSheets`.
   - Add the **PDF export** action as a header action via `PageHeader`'s `actions` prop: `actions=[{ icon: 'document', label: 'تصدير PDF', onClick: handleExportPDF }]`. Lift the PDF logic from `InvestorDashboard.jsx` lines 84–175 unchanged (it's already lazy-loaded `jspdf`).
   - Wire `onSaved` callback: after any strategic-input save, re-call `gatherReportData(db)` and `setData`. Use `useSubmitGuard` on each save button. Call `markSynced()` is NOT needed — the CloudSyncContext auto-debounces on Dexie writes.
   - Respect `prefers-reduced-motion`: the §13.6 400–500ms entry transition (ivory → stark white + terracotta blocks stagger) should reduce to a simple fade. Implement with a CSS class + a `useEffect` that checks `window.matchMedia('(prefers-reduced-motion: reduce)')`.
   - Optionally update `<meta name="theme-color">` on mount/unmount to `#FFFFFF` and restore on unmount. (Keep this scoped — use a `useEffect` cleanup.)

2. **`src/components/sheets/StrategicActionSheets.jsx`:**
   - Export a single component that takes `{ open, onClose, onSaved }` and renders the action-menu sheet + the 4 form sheets (asset/loan/capital/draw). Lift the JSX and state from `InvestorDashboard.jsx` lines 354–415.
   - Replace every `window.location.reload()` with `onSaved?.()` then close the sheet. The parent re-fetches.
   - Use `useSubmitGuard()` on each save button to prevent double-submit.
   - The owner-draw button uses `bg-withdrawal-500` (steel blue) — keep this, it's correct per SOP §1.

3. **`src/pages/InvestorDashboard.jsx`:**
   - Delete the file (or leave a re-export). The route is gone (Agent 2 removed it). No other file imports it.

**Build verification:**
- `npm run build` → 0 errors.
- `/overview` renders the full §13 panel.
- Strategic inputs (asset/loan/capital/draw) save correctly and the page refreshes its data WITHOUT a full reload.
- PDF export still works.
- `prefers-reduced-motion` users see a fade, not the stagger.

**Acceptance check for this slice:**
- `/overview` uses `PageHeader` (no hand-rolled `<header>`).
- The page background is `#FFFFFF` inside the page, NOT at the layout level.
- The Net Profit number island uses `#2A2521` inline (one island only).
- The Equity hero card uses `bg-primary` with ivory text (the documented terracotta-surface exception).
- No `window.location.reload()` anywhere in the new files.
- `StrategicActionSheets` is a reusable module.
- `npm run build` green.

---

## Agent 6 — Onboarding layer capture (fix defect B6)

**Goal:** Capture the user's intended layer at first-run, so an investor-intent user lands in Layer 3 (with `/overview` available) without having to dig into Settings.

**Files to touch:**
- `src/pages/OnboardingPage.jsx` — add a new step (or extend Step 1) asking "كيف ستستخدم التطبيق؟" with three options (يومي / مدير / مستثمر). Write `active_layer` directly via `db.setSetting('active_layer', N)`.
- `src/utils/terms_simple.js` and `src/utils/terms_pro.js` — add new strings for the layer question and the three options.

**Files to NOT touch:**
- `src/context/TermsContext.jsx` — it already loads `active_layer` from Dexie on mount. As long as OnboardingPage writes the setting BEFORE `onComplete` is called, the TermsProvider's initial `useEffect` will pick it up on next mount. (The TermsProvider loads once at app boot; if onboarding runs in the same session, you may need to also call `setActiveLayer` from the TermsContext directly. Simplest: after `db.setSetting`, call `window.location.reload()` ONCE at end of onboarding — this is the ONE allowed reload, since it's a one-time first-run flow, not a per-write pattern. Alternatively, lift `setActiveLayer` through props.)
- `src/db/index.js`.

**Specific changes:**

1. **`src/pages/OnboardingPage.jsx`:**
   - Insert a new step between the current Step 1 (business model) and Step 2 (done). Call it Step 1.5 or renumber to Step 2 (done becomes Step 3).
   - The new step asks: "كيف ستستخدم التطبيق؟" with three cards:
     - **اليومي** (Layer 1) — `tag` icon, terracotta tint. Description: "مبيعات سريعة + مخزون يدوي + تقارير بسيطة".
     - **المدير** (Layer 2) — `trendingUp` icon, teal tint. Description: "مخزون تنبؤي + خصم تلقائي + رادار الهامش".
     - **المستثمر** (Layer 3) — `chartBar` icon (the one Agent 4 added), terracotta solid. Description: "لوحة تنفيذية + أصول/قروض + تصدير PDF".
   - On select: `hapticLight()`, then `await db.setSetting('active_layer', N)`, then proceed to the done step.
   - Keep the existing business_model question (Step 1) — it's still useful for tailoring POS/inventory features.
   - **Drop the legacy `await db.setSetting('report_mode', 'simple')` write** (line 39) — TermsContext migration handles old installs, and new installs should write `language_mode` + `active_layer` directly. Write `await db.setSetting('language_mode', 'simple')` and `await db.setSetting('active_layer', N)` instead.
   - At the end of `handleComplete`, after `setStep(done)` and the 1200ms timeout, call `onComplete?.()`. The orchestrator's `App.jsx` will re-render; TermsProvider's `useEffect` will load the new `active_layer` from Dexie. If it does NOT pick it up (because TermsProvider already loaded once), reload once: `window.location.reload()` inside the `setTimeout`. This is the ONE allowed reload — it's a first-run one-time flow.

2. **Terms files:**
   - Add to BOTH dictionaries:
     - `onboarding_layer_question`: "كيف ستستخدم التطبيق؟"
     - `onboarding_layer_daily`: "اليومي"
     - `onboarding_layer_manager`: "المدير"
     - `onboarding_layer_investor`: "المستثمر"
     - `onboarding_layer_daily_desc`: "مبيعات سريعة + مخزون يدوي + تقارير بسيطة"
     - `onboarding_layer_manager_desc`: "مخزون تنبؤي + خصم تلقائي + رادار الهامش"
     - `onboarding_layer_investor_desc`: "لوحة تنفيذية + أصول/قروض + تصدير PDF"

**Build verification:**
- `npm run build` → 0 errors.
- Fresh install (clear Dexie) → onboarding asks the layer question → user picks "مستثمر" → lands in Layer 3 with `/overview` accessible from home chip and BottomNav visible.

**Acceptance check for this slice:**
- Onboarding has a layer-intent step.
- `active_layer` is written to Dexie before `onComplete`.
- The legacy `report_mode` write is gone.
- New terms exist in both simple and pro dictionaries.
- `npm run build` green.

---

## Agent 7 — QA, polish, regression sweep

**Goal:** End-to-end verification of the refactor. Catch regressions, verify SOP compliance, verify all load-bearing mechanisms still work.

**Files to touch:**
- None by default. Agent 7 only edits files if it finds a regression. Any edit must follow the Global constraints.

**Files to NOT touch (load-bearing — verify, do not edit):**
- `src/main.jsx`, `src/components/common/ErrorBoundary.jsx`, `src/utils/pwaUpdate.js`, `src/context/CloudSyncContext.jsx`, `src/context/TermsContext.jsx`, `src/db/index.js` schema, `tailwind.config.js` token values, `.env`.

**Specific checks:**

1. **Build:** `npm run build` → 0 errors. Note any new warnings (the pre-existing `db/index.js` dynamic-import hint is fine).

2. **Layer matrix:** For each layer (1, 2, 3), verify:
   - BottomNav is visible.
   - Home renders the Overview chip (Agent 3).
   - `/overview` is reachable and renders the §13 panel (Agent 5).
   - SettingsPage layer switcher works and shows the toast (Agent 3).
   - Switching layers does NOT reload the page or kick the user out of their current route.

3. **Onboarding:** Clear Dexie (`indexedDB.deleteDatabase('AccountingAppDB')` in DevTools). Reload. Verify the layer-intent step appears (Agent 6). Pick each option and confirm the app boots into the right layer.

4. **Overview page (§13 compliance):**
   - Background is stark white INSIDE the page; layout chrome stays `bg-background`.
   - Only ONE dark number island (Net Profit, `#2A2521`).
   - Equity card is the only terracotta-surface hero (besides the 2 KPI hero cards).
   - No sparklines except on hero KPIs (currently none — that's fine).
   - `prefers-reduced-motion` users see a fade (verify by toggling DevTools → Rendering → Emulate prefers-reduced-motion).
   - `theme-color` meta updates on mount if Agent 5 implemented it.

5. **Strategic inputs:** Trigger each of the 4 (asset/loan/capital/draw) from `/overview`. Verify:
   - The sheet opens, focus is trapped, back button closes it.
   - Save works, the sheet closes, the page data refreshes WITHOUT `window.location.reload()`.
   - The 30s debounced cloud sync fires (check CloudSync logs in console).
   - Double-tapping the save button does NOT create duplicate entries (`useSubmitGuard`).

6. **PDF export:** Click the PDF action in `/overview` header. Verify the PDF downloads with the business name + date + income statement + balance sheet + KPIs.

7. **SOP compliance sweep (grep checks):**
   - `rg "window\.location\.reload" src/` — should ONLY appear in: `src/utils/pwaUpdate.js` (the `forceRefreshApp` implementation), `src/components/common/ErrorBoundary.jsx` (via `forceRefreshApp`), `src/pages/OnboardingPage.jsx` (the one allowed first-run reload), and `src/pages/SettingsPage.jsx` (if it has a "force refresh" button — verify it's user-initiated, not per-write). NO occurrences in `OverviewPage.jsx` or `StrategicActionSheets.jsx`.
   - `rg "db\.on\('changes'\)|dexie-observable" src/` — should return ZERO matches.
   - `rg "<header" src/pages/` — should return ZERO matches (all pages use `PageHeader`).
   - `rg "tracking.*-|letter-spacing.*-" src/` on `.jsx` files — should return ZERO matches on Arabic text (Latin small labels only).
   - `rg "#[0-9A-Fa-f]{6}" src/pages/OverviewPage.jsx src/components/overview/ src/components/sheets/StrategicActionSheets.jsx` — should ONLY match `#2A2521` and `#1E7A4D` (the documented §13 exceptions). No other hex literals.
   - `rg "emoji|gradient|glow" src/` — should return ZERO matches in new code.

8. **Token discipline:** Verify no new tokens were added to `tailwind.config.js`. The `colors` block should be identical to the baseline (compare with `git diff 2d20b6c -- tailwind.config.js`).

9. **BuildStamp:** Verify the home header still shows the build stamp (toggle `SHOW_BUILD_STAMP = true` in `src/components/common/BuildStamp.jsx` if it was turned off).

10. **PWA update:** Verify `dist/sw.js` is generated. Verify `registerSW` config in `src/main.jsx` is unchanged (foreground banner + background silent apply + 30-min poll + visibilitychange).

11. **Self-heal:** Simulate a stale chunk by renaming a built asset file in `dist/` and loading the app — verify `ErrorBoundary` auto-recovers once via `forceRefreshApp(true)`.

12. **Cloud sync:** Connect Google Drive in Settings. Add a transaction. Wait 30s. Verify the upload fires (console log `[CloudSync] Upload complete`). Verify `markSynced` persisted the timestamp (check `localStorage` for the sync key).

**Build verification:**
- `npm run build` → 0 errors, 0 NEW warnings vs baseline.

**Acceptance check for this slice:**
- All 12 checks pass.
- `npm run build` green.
- Worklog entry appended with the final stage summary.
- Hand-off note for the orchestrator: the refactor is complete, baseline is green, no load-bearing mechanism was broken.

---

## Dependency graph (who blocks whom)

```
Agent 2 (routing) ──┬──> Agent 3 (home chip) ──> Agent 4 (UI primitives) ──> Agent 5 (overview page)
                    │                                                        │
                    └──> Agent 5 needs /overview route registered <──────────┘
                                                                             │
                                                    Agent 6 (onboarding) <───┘ (independent, but needs chartBar from Agent 4)
                                                                             │
                                                    Agent 7 (QA) <───────────┘ (runs last)
```

**Critical path:** Agent 2 → Agent 4 → Agent 5 → Agent 7.
**Parallelizable:** Agent 3 and Agent 6 can run in parallel with Agent 4 (they don't depend on Agent 4's output except for the `chartBar` glyph, which Agent 3 uses in the home chip and Agent 6 uses in the onboarding card — both can stub the icon name and Agent 4 fills it in).

**If Agent 2 finds the route registration blocks on Agent 5's file not existing:** Agent 2 creates a placeholder `src/pages/OverviewPage.jsx` (one-line render) so the build stays green. Agent 5 replaces it.

**If any agent discovers a defect not listed in RECON_REPORT.md §B:** append it to the worklog under "Key findings" and flag it for the orchestrator. Do NOT silently expand scope.
