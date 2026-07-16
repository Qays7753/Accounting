# AGENT_SPEC — "الحسابات" UI Redesign (One UI)

> **This file is the single, binding source of truth for redesigning the UI of the "الحسابات" (Accounting) app.**
> Any implementing agent/developer MUST follow it exactly. Do not invent colors, fonts, radii, or components outside this file.
>
> **Companion file:** [`prototype.html`](./prototype.html) — an interactive visual ground-truth. **Open it in a browser and match it pixel-for-pixel.** This spec defines the rules; the prototype shows the result.
>
> **Product:** Offline-first PWA for Jordanian micro-businesses (plumber, electrician, small shop, service provider). Priorities: simplicity, speed, trust, one-handed use.
> **Design language:** Samsung One UI (Reachability + Clarity), tuned for this low-literacy, on-the-go audience.
> **Scope of this task:** VISUAL redesign only. Do NOT change accounting logic, the Dexie/IndexedDB layer, routing, or the offline-first architecture. Restyle the existing components/pages in place.

---

## 0) Golden rules (read first)

1. **Mobile only.** Design reference width = 390px. Do not spend effort on desktop.
2. **Arabic, 100% RTL.** `dir="rtl"` at the root; every layout mirrored; text right-aligned.
3. **No currency symbol, ever.** Amounts are digits with thousands separators only: `1,500`, `12,450`. No «د.أ», «ر.س», or any symbol.
4. **Latin (English) digits:** `1,250`, not `١,٢٥٠`.
5. **Single-page principle.** Short screens (Home, Settings) must fit within the phone height with little/no scroll. Scrolling is allowed **only** for long lists (Finance ledger, Orders list).
6. **One-handed use.** Never place primary interactive elements in the top 25% of the screen. Actions live in the lower two-thirds.
7. **Font: Cairo** for all text (Arabic, Latin, numbers). Weights 400/500/600/700/800.
8. **The Home hero = "the two jars"** (حق المحل / حق التاجر). This is the core of the product and must never be demoted.

---

## 1) Design tokens — colors

Use these values only. Light mode is the base.

### Base & surfaces
| Role | Token | HEX |
|---|---|---|
| App background | `background` | `#f7f9fc` |
| Card surface | `surface` | `#ffffff` |
| Muted surface (chips / filled fields) | `mute` | `#eceef1` |
| Divider | `divider` | `#f0f2f5` (rows) / `#e6e8eb` (splits) |

### Text
| Role | HEX |
|---|---|
| Primary text | `#191c1e` |
| Secondary text | `#414755` |
| Hint / faint | `#717786` |
| Placeholder / faintest | `#a3aab8` |

### Brand & semantic
| Role | Text HEX | BG HEX | Use |
|---|---|---|---|
| Primary (Samsung blue) | `#0058be` | tint `#e7f0ff`, pill `#d8e2ff` | actions, active state, **حق المحل** |
| Income / قبض (green) | `#067647` | `#e7f8ee` | money in, profit, safe-to-spend, **حق التاجر** |
| Expense / صرف (red) | `#c1272d` | `#fdecec` | money out, alerts |
| Personal withdrawal (amber) | `#9a5b06` | `#fbf1e2` | سحب شخصي only (kept separate from expense) |
| Secondary (purple) | `#5644d0` | `#eeecfb` | categories / helper items |

### Hero gradient
`linear-gradient(135deg, #0058be 0%, #0a6bd6 60%, #1478e8 100%)`

### Order-status colors
| Status | Text | BG | Accent bar |
|---|---|---|---|
| قيد التنفيذ (in progress) | `#c98a10` | `#fff5e2` | `#f5a623` |
| جاهز (ready) | `#0058be` | `#e7f0ff` | `#0058be` |
| مغلق (closed) | `#717786` | `#eceef1` | `#b0b6c3` |

> **Semantic color rule:** green = money in, red = money out, amber = personal withdrawal. Never mix them.

---

## 2) Typography — Cairo

Import Cairo from Google Fonts.

| Role | Size / line | Weight | Use |
|---|---|---|---|
| Screen title (Display) | 30px / 1.1 | 800 | top-of-screen title (Finance, Orders, Settings) |
| Hero number | 40px | 800 | total cash on Home |
| Headline | 18–23px | 700–800 | card titles, jar numbers |
| Body large | 15–16px | 600–700 | customer names, item titles |
| Body | 13–14px | 400–500 | descriptions, categories |
| Label | 11–12px | 500–700 | hints, dates, badges |

- All monetary numbers: `font-variant-numeric: tabular-nums`.
- High contrast: `#191c1e` primary vs `#717786` secondary.

---

## 3) Shape & elevation

**Radii**
- Hero / large cards: **28–30px**
- Standard cards: **20–24px**
- Icon tiles inside cards: **11–14px**
- Buttons / fields: **18px** or **pill** (fully rounded)
- Bottom sheet: **32px** top corners only
- Badges / chips: pill (`9999px`)

**Elevation** — One UI avoids heavy shadows.
- Define edges with color contrast (`#f7f9fc` bg vs `#ffffff` card).
- Soft diffused shadow only: `box-shadow: 0 8px 22px -16px rgba(20,30,55,.35)`.
- Blue hero card: `0 18px 34px -14px rgba(0,88,190,.55)`.
- **No borders around cards.** A colored right-side bar (`border-right: 4px`) is allowed only to indicate order status.

**Interaction** — pressed state = slight `scale(0.97)`, not a shadow change. Fire a light `haptic` (vibration) on every press/save/delete.

---

## 4) Layout & navigation

### Page grid
- Side margin: **20px**.
- Gap between stacked cards: **10–12px**.
- Compact header — do NOT use the giant 35vh One UI header (it wastes space and breaks the single-page rule). Header = title + one action button.

### Bottom navigation — **4 tabs only**
Quick Sale (POS) is merged into Home as an action, leaving 4 tabs:

| # | Tab | Icon | Destination |
|---|---|---|---|
| 1 | الرئيسية | `home` | jars dashboard + today + quick sale |
| 2 | المالية | `receipt_long` | income/expense/withdrawal ledger |
| 3 | الطلبات | `list_alt` | list + calendar |
| 4 | الإعدادات | `settings` | business, backup, security |

- Active state: **pill with `#d8e2ff` background** behind the icon + icon & label in `#0058be` + filled icon (FILL 1).
- Inactive: outline icon, `#717786`.
- Bar: white background, `padding-bottom` respects safe-area.

### FAB
- Rounded-square (22px radius), 60×60, blue `#0058be`, white `add` icon.
- Fixed bottom-left (in RTL) above the nav, blue shadow.
- On press: opens the **Add sheet** (قبض / صرف / سحب شخصي / طلب جديد).

---

## 5) Standard components

- **Card:** `background:#fff; border-radius:24px; padding:16–20px; soft shadow; no border`.
- **Primary button:** solid blue, white text, pill/18px radius, `scale(.97)` on press.
- **Secondary button:** `#e7f0ff` or `#eceef1` bg, blue/gray text, no border.
- **Input field:** `#eceef1` bg, 18px radius, no border; 2px blue border on focus. Amount fields: `inputmode="decimal"` + live formatting while typing (`1500` → `1,500`).
- **Bottom sheet (draggable & expandable):** slides up, gray 44×5 drag handle on top, 32px top corners, `rgba(15,20,35,.42)` scrim, `cubic-bezier(.16,1,.3,1)` motion. **Two snap points:** collapsed (content height, capped ~84%) and full-screen (~94%). Dragging the handle **up expands to full screen**, dragging **down collapses, then closes**. Body scrolls when expanded. Show a subtle "اسحب للأعلى للتوسّع" hint while collapsed. Use it for rich content (order details, forms).
- **Segmented control (type filter — Finance):** a single connected `#eceef1` track with an animated **sliding blue thumb** (`#0058be`) behind the active label; active text white/bold, inactive `#414755`. NOT detached pills.
- **Underline tabs (status filter — Orders):** a text-tab row on a bottom divider with an **animated sliding underline** (`#0058be`, 3px) under the active tab; each tab carries a small round count badge colored by its status (blue/amber/gray). Active label `#191c1e` bold, inactive `#717786`.
- **Chip / badge:** pill, status colors above (use for status labels on cards, not for primary filters).
- **Empty state:** icon + title + short action-oriented description.
- **Undo snackbar:** appears 5s after delete with an "تراجع" (undo) button.

---

## 6) Screen specs

### 6.1 Home (top priority) — `src/pages/HomePage.jsx`
Order top → bottom (hero + jars must be visible without scrolling):
1. **Compact header:** business avatar/logo + greeting ("صباح الخير") + business name + notifications button.
2. **Hero card (jars total):** blue gradient — "إجمالي النقد المتاح" + big number `12,450` + monthly-change indicator.
3. **Two jars (2-col grid):**
   - **حق المحل** (blue, `inventory_2`): capital — "للتعبئة".
   - **حق التاجر** (green, `savings`): profit — "آمن للصرف".
   - Helper line below: "لا تسحب من حق المحل إلا لإعادة تعبئة البضاعة".
4. **Quick actions (4 tiles):** بيع سريع (prominent blue) · قبض · صرف · سحب شخصي.
5. **Today (2 cols):** قبض اليوم (green) · صرف اليوم (red).
6. **Upcoming orders:** title + "عرض الكل" + first 2 orders with status badges.
7. *(optional, secondary)* backup / day-close reminder as a dismissible card.

### 6.2 Finance — `src/pages/FinancePage.jsx`
- Title "المالية" + filter button.
- "صافي هذا الشهر" card (+9,250) split into قبض/صرف.
- Search field.
- Segmented control (sliding blue thumb): الكل / قبض / صرف / سحب (see §5). **Do not use detached pill chips.**
- **Ledger grouped by day** (اليوم, أمس…) with each day's net; each row: semantic-colored icon + title + category/time + signed colored amount (`+` green, `−` red, withdrawal amber). **This list scrolls.**

### 6.3 Orders — `src/pages/OrdersPage.jsx`
- Title "الطلبات" + search.
- Toggle: قائمة / تقويم.
- **List:** underline tabs with sliding indicator + status-colored count badges (الكل / قيد التنفيذ / جاهز / مغلق) — **not detached pill chips**. Then order cards with a status-colored right bar: customer + status badge + order type + scheduled time + amount. Tapping a card opens the **expandable order-details sheet**.
- **Calendar:** monthly One UI calendar, status-colored dots under days, selected day as a blue pill, today's orders below.

### 6.4 Settings — `src/pages/SettingsPage.jsx`
- Title "الإعدادات".
- Business card (logo + business name + owner).
- One UI grouped lists with small blue group headers:
  - **النشاط والأمان:** business info; security PIN & helper mode.
  - **البيانات والتفضيلات:** WhatsApp backup (show "آخر نسخة قبل N يوم" in red if overdue); WhatsApp message template; notifications.
  - Logout (red) + version number.

### 6.5 Sheets & secondary (keep existing behavior)
- **Add sheet (FAB):** 4 large options: قبض / صرف / سحب شخصي / طلب جديد.
- **Order details sheet (tap an order card):** draggable & expandable to full screen — header (customer + status badge), order value / paid, info rows (schedule / phone / address / notes), a horizontal **status stepper** (استلام → قيد التنفيذ → جاهز → مغلق), an **activity timeline**, and actions (update status = primary; WhatsApp share = green; edit; delete = red text).
- **Quick Sale (POS):** fast amount entry (numeric keypad) + save — merged into Home as an action.
- **Z-Report (إقفال اليومية):** expected vs counted cash + variance (surplus green / shortage red).
- **Debts (لي / عليّ):** two lists, semantic-colored amounts.
- **Reports:** doughnut chart in category colors + detail list with percentages + export button.

---

## 7) Content & copy rules

- Simple language for non-accountants: "قبض" (not إيراد), "صرف" (not مصروف), "حق المحل / حق التاجر".
- No complex accounting jargon.
- Arabic dates: "اليوم 9:30 ص", "أمس", "غداً 10:00 ص"; Arabic month names; 12-hour with ص/م.
- Personal withdrawal is **excluded** from net profit (net profit = income − expense only).

---

## 8) Anti-patterns (do NOT)

- ✗ Any currency symbol.  ✗ Arabic-Indic digits.
- ✗ Giant 35vh header pushing content down.
- ✗ Scrolling on short screens (Home/Settings should nearly fit).
- ✗ Heavy shadows or borders around cards.
- ✗ Fonts other than Cairo, or colors outside the token table.
- ✗ Emoji (unless part of the business's own identity).
- ✗ Mixing semantic colors (green=in, red=out, amber=withdrawal).
- ✗ Primary interactive elements in the top of the screen.

---

## 9) Ready-to-send command block

> Paste this to the implementing agent/developer:

```
Redesign the UI of the "الحسابات" app strictly per AGENT_SPEC.md and match prototype.html pixel-for-pixel. Do NOT change any app logic, database (Dexie/IndexedDB), routing, or the offline-first architecture — restyle the existing components/pages in place only.

Requirements:
1. Cairo font for all text. RTL. Latin digits with thousands separators, NO currency symbol anywhere.
2. Use the One UI token palette from the spec (primary #0058be; income green #067647; expense red #c1272d; withdrawal amber #9a5b06; background #f7f9fc; surface #ffffff). Update src/styles/index.css and tailwind.config.js accordingly.
3. Cards 20–30px radius, no borders, soft shadow only. Buttons/fields 18px radius or pill.
4. Bottom nav = 4 tabs: الرئيسية / المالية / الطلبات / الإعدادات, with a #d8e2ff pill behind the active icon (filled icon). Merge "بيع سريع" as an action inside Home. Rounded-square FAB opens the Add sheet (قبض/صرف/سحب/طلب).
5. Home hero = the "two jars" (حق المحل blue / حق التاجر green) under the blue total-cash card, then quick actions, then today, then upcoming orders — so hero + jars are visible without scrolling.
6. Single-page principle: no scroll on short screens; scroll only on Finance and Orders lists.
7. Keep the existing routes/components (HomePage, FinancePage, OrdersPage, SettingsPage, BottomNav, Fab, BottomSheet…) and apply the design inside them only.

Follow each screen spec in section 6 and the anti-patterns in section 8. When unsure about a visual detail, open prototype.html and copy it.
```

---

## 10) Mapping to the current codebase

| Existing file | What to apply |
|---|---|
| `src/styles/index.css` + `tailwind.config.js` | Update tokens (colors / radii / Cairo) per sections 1–3 |
| `src/components/layout/BottomNav.jsx` | Reduce to 4 tabs + active pill |
| `src/components/sheets/Fab.jsx` | Rounded-square FAB + 4-option sheet |
| `src/pages/HomePage.jsx` | Section 6.1 order (jars hero + quick sale) |
| `src/pages/FinancePage.jsx` | Section 6.2 (segmented + day-grouped ledger) |
| `src/pages/OrdersPage.jsx` | Section 6.3 (status chips + calendar dots) |
| `src/pages/SettingsPage.jsx` | Section 6.4 (One UI grouped lists) |

> This file governs **appearance only**. It does not change accounting logic, the database, or offline-first behavior.
