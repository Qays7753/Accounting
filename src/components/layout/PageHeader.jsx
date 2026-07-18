import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import Icon from '../ui/Icon.jsx'
import { hapticLight } from '../../utils/haptics.js'
import { useSettings2 } from '../../context/SettingsContext.jsx'
import { useTerms } from '../../context/TermsContext.jsx'
import { getGreeting, formatArabicDate } from '../../utils/date.js'

/**
 * PageHeader — shared sticky top bar for all 7 screens.
 *
 * Solves P1–P9 from HEADER_AUDIT.md:
 *   P1  Single shared component (no hand-rolled <header> per page)
 *   P2  Uniform px-4 + safe-area-top padding
 *   P3  Title from named token (text-title 28/700, collapses to text-title-sm)
 *   P4  Sticky in EVERY page (was: 5 sticky, 2 not)
 *   P5  .sticky-header behavior (blur + ivory translucent) baked in here
 *   P6  Scroll shadow: flat at top, shadow-header when content scrolls under
 *   P7  Search as icon-expand (frees ~64px vertical space)
 *   P8  Only the 56px top bar is sticky; subheader scrolls with content
 *   P9  Home/Settings use the same component (variant="home" for logo+greeting)
 *
 * SOP refs: §4.1 (56px compact top bar), §6 (screen structure),
 *           §7.1 (actions), §8.2 (blur, 150-300ms motion)
 *
 * Props:
 *   title     : string          — page title (ignored if variant="home")
 *   variant   : 'default' | 'home'  — 'home' shows logo + greeting + date
 *   actions   : [{icon, onClick, label}]  — max 2 action buttons (right side)
 *   search    : { value, onChange, placeholder }  — enables icon-expand search
 *   subheader : ReactNode       — secondary row that scrolls with content
 *                                  (segmented control, net-summary card, etc.)
 */
export default function PageHeader({
  title,
  variant = 'default',
  actions = [],
  search,
  subheader,
}) {
  const t = useTerms()
  const { logo, businessName } = useSettings2()
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef(null)
  const sentinelRef = useRef(null)

  // Scroll shadow: observe a sentinel at the top of the page.
  // When it scrolls out of view, add shadow-header to the sticky bar.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // Auto-focus search input when it expands; auto-collapse when emptied + blurred
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  const handleSearchIconClick = () => {
    hapticLight()
    setSearchOpen(true)
  }

  const handleSearchBlur = () => {
    // Collapse back to icon if search is empty
    if (!search?.value) setSearchOpen(false)
  }

  const handleSearchClear = () => {
    hapticLight()
    search?.onChange('')
    searchInputRef.current?.focus()
  }

  return (
    <>
      {/* Sentinel for scroll-shadow detection (zero-height, at very top) */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      {/* Sticky 56px top bar — same in every page */}
      <header
        className={`sticky top-0 z-20 safe-area-top transition-shadow duration-200 ${
          scrolled ? 'shadow-header' : ''
        }`}
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(250,249,245,0.88)',
        }}
      >
        <div className="px-4 pt-2 pb-2 flex items-center justify-between gap-3">
          {/* Left: title (or logo+greeting for home variant) */}
          <div className={`flex items-center gap-3 min-w-0 flex-1 ${searchOpen ? 'hidden' : ''}`}>
            {variant === 'home' ? (
              <>
                {logo ? (
                  <img src={logo} alt="شعار" className="w-11 h-11 rounded-full object-cover flex-none" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary-pill grid place-items-center flex-none">
                    <Icon name="storefront" className="w-6 h-6 text-primary" strokeWidth={2} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-caption text-faint font-medium leading-tight">{getGreeting()}</p>
                  <h1 className="text-title-sm text-ink leading-tight truncate">{businessName || t.onboarding_welcome}</h1>
                  <p className="text-[11px] text-faint mt-0.5 leading-tight num">{formatArabicDate(new Date())}</p>
                </div>
              </>
            ) : (
              <h1 className="text-title text-ink truncate">{title}</h1>
            )}
          </div>

          {/* Expanded search input (replaces title row when open) */}
          {search && searchOpen && (
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Icon name="search" className="w-5 h-5 text-faint" />
                </div>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  onBlur={handleSearchBlur}
                  placeholder={search.placeholder}
                  className="w-full bg-surface rounded-12 pr-10 pl-9 py-2.5 text-sm text-ink outline-none border border-divider focus:border-accent transition-colors"
                  dir="rtl"
                />
                {search.value && (
                  <button
                    type="button"
                    onClick={handleSearchClear}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full grid place-items-center active:scale-95"
                    aria-label="مسح"
                  >
                    <Icon name="close" className="w-4 h-4 text-faint" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { hapticLight(); setSearchOpen(false); search.onChange('') }}
                className="text-sm text-faint font-semibold px-2 py-2 active:scale-95"
              >
                إلغاء
              </button>
            </div>
          )}

          {/* Right: actions (search icon + custom actions) */}
          {!searchOpen && (
            <div className="flex items-center gap-2 flex-none">
              {search && (
                <button
                  type="button"
                  onClick={handleSearchIconClick}
                  className="press w-11 h-11 rounded-full bg-mute grid place-items-center"
                  aria-label={search.placeholder || 'بحث'}
                >
                  <Icon name="search" className="w-5 h-5 text-sub" />
                </button>
              )}
              {actions.slice(0, 2).map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { hapticLight(); action.onClick?.() }}
                  className="press w-11 h-11 rounded-full bg-primary grid place-items-center shadow-sm"
                  aria-label={action.label}
                >
                  <Icon name={action.icon} className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Subheader — scrolls with content (NOT sticky). Used for segmented
          controls, net-summary cards, secondary filters. */}
      {subheader && (
        <div className="px-4 pt-3 pb-3">
          {subheader}
        </div>
      )}
    </>
  )
}
