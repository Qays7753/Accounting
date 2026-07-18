import { useState, useCallback, useRef } from 'react'

/**
 * useSubmitGuard — prevents double-submit on async actions (financial safety).
 *
 * Returns [submitting, guard] where:
 *   - `submitting` is a boolean state for disabling buttons + showing spinner
 *   - `guard(fn)` wraps an async function so it can only run once at a time
 *
 * Usage:
 *   const [submitting, guard] = useSubmitGuard()
 *   const handleSave = guard(async () => { await db.addTransaction(...) })
 *   <button disabled={submitting} onClick={handleSave}>
 *     {submitting ? <Spinner /> : 'حفظ'}
 *   </button>
 */
export function useSubmitGuard() {
  const [submitting, setSubmitting] = useState(false)
  const runningRef = useRef(false)

  const guard = useCallback((fn) => {
    return async (...args) => {
      if (runningRef.current) return // Block re-entry
      runningRef.current = true
      setSubmitting(true)
      try {
        return await fn(...args)
      } finally {
        runningRef.current = false
        setSubmitting(false)
      }
    }
  }, [])

  return [submitting, guard]
}
