import Icon from './Icon.jsx'

/**
 * Empty State — SOP compliant warm, friendly copy
 * Uses line icon + warm Arabic text guiding the user to add their first item.
 */
export default function EmptyState({ icon = 'document', title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="status">
      <div className="w-16 h-16 rounded-16 flex items-center justify-center mb-3"
        style={{ background: '#F4F7F9' }}
        aria-hidden="true"
      >
        <Icon name={icon} className="w-6 h-6" strokeWidth={1.5} />
        <span className="sr-only">{title}</span>
      </div>
      <h3 className="text-[15px] font-semibold text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] max-w-[280px] leading-relaxed" style={{ color: '#647680' }}>{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 btn-primary text-[14px] py-2.5 px-5"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
