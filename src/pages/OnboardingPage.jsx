import { useState } from 'react'
import { db } from '../db'
import Icon from '../components/ui/Icon.jsx'
import { hapticSuccess, hapticLight } from '../utils/haptics.js'
import { useTerms } from '../context/TermsContext.jsx'

/**
 * Onboarding Page (V4 Phase 3) - Frictionless Fast Onboarding
 *
 * Goal: User logs their first sale in 60 seconds.
 *
 * Screen 1: Welcome + Shop Name (only required field, can skip with default "متجري")
 * Screen 2: Done → redirect to Home Dashboard
 *
 * Opening Balances are NO LONGER part of onboarding.
 * They move to a dismissible card on the Home Dashboard.
 *
 * V6: Wires useTerms() so welcome copy adapts to mode (simple vs pro).
 */
export default function OnboardingPage({ onComplete }) {
  const t = useTerms()
  const [step, setStep] = useState(0) // 0=welcome+name, 1=done
  const [shopName, setShopName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleComplete = async () => {
    hapticLight()
    setSaving(true)
    try {
      // Save shop name (or default)
      const name = shopName.trim() || 'متجري'
      await db.setBusinessName(name)

      // Mark as onboarded (NO opening balance required!)
      await db.setMeta('onboarded', true)
      await db.setMeta('firstUseDate', Date.now())
      await db.setMeta('opening_balance_prompted', false) // Will show card on dashboard

      // Set default WhatsApp template
      await db.setSetting('whatsapp_template', 'مرحباً [اسم الزبون]، طلبك [نوع الطلب] هو [حالة الطلب]. المبلغ: [المبلغ]')

      // Set default report mode to simple
      await db.setSetting('report_mode', 'simple')

      hapticSuccess()
      setStep(1)
      setTimeout(() => {
        onComplete?.()
      }, 1200)
    } catch (e) {
      console.error('Onboarding failed:', e)
      setSaving(false)
    }
  }

  // Screen 1: Welcome + Shop Name
  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-top">
        <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mb-6 shadow-fab animate-scale-in">
          <Icon name="wallet" className="w-12 h-12 text-white" strokeWidth={1.8} />
        </div>
        <h1 className="text-3xl font-bold text-text-primary text-center mb-2">{t.onboarding_welcome}</h1>
        <p className="text-center text-text-secondary leading-relaxed max-w-sm mb-8">
          {t.onboarding_subtitle}
        </p>

        <div className="w-full max-w-xs space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">{t.onboarding_shop_name}</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder={t.onboarding_shop_name_placeholder}
              className="input-field text-center text-lg"
              dir="rtl"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleComplete() }}
            />
          </div>

          <button
            onClick={handleComplete}
            disabled={saving}
            className="btn-primary w-full disabled:opacity-50"
          >
            {saving ? '…' : t.onboarding_start}
          </button>

          <button
            onClick={handleComplete}
            className="w-full text-text-tertiary text-sm font-medium active:scale-95 transition-transform"
          >
            {t.onboarding_skip}
          </button>
        </div>
      </div>
    )
  }

  // Screen 2: Done (quick flash, then redirect)
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-top">
        <div className="w-20 h-20 rounded-full bg-income-50 flex items-center justify-center mb-4 animate-scale-in">
          <Icon name="check" className="w-10 h-10 text-income-600" strokeWidth={2.5} />
        </div>
        <h1 className="text-xl font-bold mb-1">{t.onboarding_ready}</h1>
        <p className="text-text-secondary text-center max-w-xs text-sm">
          {t.onboarding_ready_desc}
        </p>
      </div>
    )
  }

  return null
}
