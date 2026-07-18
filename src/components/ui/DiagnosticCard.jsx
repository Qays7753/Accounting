import Icon from './Icon.jsx'
import { hapticLight } from '../../utils/haptics.js'

/**
 * DiagnosticCard — SWOT insight card from the diagnostic engine.
 *
 * Displays insight text with severity color + optional action button.
 * SOP compliant: terracotta/ivory tokens, warm shadows, 44px touch.
 *
 * Props:
 *   insight: { id, type, text, severity, action, actionLabel }
 *   onAction: (action) => void
 */
const SEVERITY_CONFIG = {
  green: {
    bg: 'bg-income-50',
    border: 'border-income-200',
    icon: 'checkCircle',
    iconColor: 'text-income-600',
    iconBg: 'bg-income-100',
  },
  red: {
    bg: 'bg-expense-50',
    border: 'border-expense-200',
    icon: 'alertTriangle',
    iconColor: 'text-expense-600',
    iconBg: 'bg-expense-100',
  },
  orange: {
    bg: 'bg-returns-50',
    border: 'border-returns-200',
    icon: 'alertTriangle',
    iconColor: 'text-returns-500',
    iconBg: 'bg-returns-100',
  },
  teal: {
    bg: 'bg-accent-50',
    border: 'border-accent-200',
    icon: 'info',
    iconColor: 'text-accent-600',
    iconBg: 'bg-accent-100',
  },
}

export default function DiagnosticCard({ insight, onAction }) {
  if (!insight) return null

  const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.teal

  // Replace {value} placeholder in text — handled by caller via insight.text
  const displayText = insight.text

  const handleAction = () => {
    hapticLight()
    onAction?.(insight.action)
  }

  return (
    <div className={`${config.bg} ${config.border} border rounded-card p-4 flex items-start gap-3`}>
      <div className={`w-10 h-10 rounded-12 ${config.iconBg} grid place-items-center flex-shrink-0`}>
        <Icon name={config.icon} className={`w-5 h-5 ${config.iconColor}`} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink leading-snug">{displayText}</p>
        {insight.action && insight.actionLabel && (
          <button
            type="button"
            onClick={handleAction}
            className="mt-2 bg-primary text-white text-caption font-semibold px-4 py-2 rounded-12 active:scale-95 transition-transform"
            style={{ minHeight: '36px' }}
          >
            {insight.actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
