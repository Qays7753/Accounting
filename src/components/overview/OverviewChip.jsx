import { useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import { useTerms } from '../../context/TermsContext.jsx'
import { hapticLight } from '../../utils/haptics.js'

/**
 * OverviewChip — teal entry chip rendered on the home header (visual LEFT in
 * RTL). Tapping navigates to `/overview`. Uses the `accent` (teal) token per
 * SOP §1 — NOT terracotta (terracotta is reserved for primary actions).
 *
 * Mounted via `<PageHeader variant="home" homeChip={<OverviewChip />} />`.
 *
 * SOP refs: §1 (accent token), §4.4 (44×44 min touch target),
 *           §13 (overview entry — terracotta in both states).
 *
 * Visible in ALL layers (Daily / Manager / Investor) — every layer can reach
 * the executive panel.
 */
export default function OverviewChip() {
  const t = useTerms()
  const navigate = useNavigate()

  const handleClick = () => {
    hapticLight()
    navigate('/overview')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t.overview_chip_label}
      className="flex-none flex items-center gap-1.5 h-11 px-3 rounded-pill bg-accent-50 text-accent-600 active:scale-95 transition-transform"
      style={{ minHeight: '44px' }}
    >
      <Icon name="chartBar" className="w-4 h-4 text-accent-600" strokeWidth={2} />
      <span className="text-caption font-bold leading-none whitespace-nowrap">
        {t.overview_chip_label}
      </span>
    </button>
  )
}
