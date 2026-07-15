import Icon from './Icon.jsx'

/**
 * Empty State - friendly icon + text guiding the user
 */
export default function EmptyState({ icon = 'document', title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center" role="status">
      <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4" aria-hidden="true">
        <Icon name={icon} className="w-10 h-10 text-text-tertiary" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-bold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-xs leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 btn-secondary text-sm py-2.5 px-5"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
