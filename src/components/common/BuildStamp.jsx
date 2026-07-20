/**
 * BuildStamp — TEMPORARY development indicator.
 *
 * Shows the date/time of the currently-running build. The value is baked at
 * build time via __BUILD_TIME__ (see vite.config.js `define`), so every new
 * Cloudflare deploy automatically shows a fresh timestamp — which lets you
 * confirm at a glance that the latest version actually reached the device.
 *
 * ── TO REMOVE AFTER DEVELOPMENT ──────────────────────────────────────────
 * Easiest: set SHOW_BUILD_STAMP = false below.
 * Full removal: delete this file, the <BuildStamp /> line in PageHeader.jsx,
 * and the `define` block in vite.config.js.
 * ─────────────────────────────────────────────────────────────────────────
 */
const SHOW_BUILD_STAMP = true

// eslint-disable-next-line no-undef
const BUILD_ISO = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString()

function formatBuild(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function BuildStamp() {
  if (!SHOW_BUILD_STAMP) return null
  return (
    <div className="flex flex-col items-start leading-none flex-none" aria-label="تاريخ آخر تحديث">
      <span className="text-[9px] text-faint font-medium">آخر تحديث</span>
      <span className="text-[10px] text-sub num mt-0.5">{formatBuild(BUILD_ISO)}</span>
    </div>
  )
}
