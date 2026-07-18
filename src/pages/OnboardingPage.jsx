import { useState } from 'react'
import { db } from '../db'
import Icon from '../components/ui/Icon.jsx'
import { hapticSuccess, hapticLight } from '../utils/haptics.js'
import { useTerms } from '../context/TermsContext.jsx'

/**
 * Smart Onboarding — 3 steps:
 *   0: Welcome + Shop Name (with skip)
 *   1: Business Model (ready-made vs manufactured)
 *   2: Done → redirect to Home
 *
 * V8: Added business model question to tailor the app experience.
 */
export default function OnboardingPage({ onComplete }) {
  const t = useTerms()
  const [step, setStep] = useState(0)
  const [shopName, setShopName] = useState('')
  const [businessModel, setBusinessModel] = useState(null) // 'ready' | 'manufactured'
  const [saving, setSaving] = useState(false)

  const handleStep1Next = () => {
    hapticLight()
    setStep(1)
  }

  const handleComplete = async () => {
    hapticLight()
    setSaving(true)
    try {
      const name = shopName.trim() || 'متجري'
      await db.setBusinessName(name)
      await db.setMeta('onboarded', true)
      await db.setMeta('firstUseDate', Date.now())
      await db.setMeta('opening_balance_prompted', false)
      await db.setMeta('business_model', businessModel || 'ready')

      await db.setSetting('whatsapp_template', 'مرحباً [اسم الزبون]، طلبك [نوع الطلب] هو [حالة الطلب]. المبلغ: [المبلغ]')
      await db.setSetting('report_mode', 'simple')

      hapticSuccess()
      setStep(2)
      setTimeout(() => { onComplete?.() }, 1200)
    } catch (e) {
      console.error('Onboarding failed:', e)
      setSaving(false)
    }
  }

  // Step 0: Welcome + Shop Name
  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-top">
        <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mb-6 shadow-fab animate-scale-in">
          <Icon name="wallet" className="w-12 h-12 text-white" strokeWidth={1.8} />
        </div>
        <h1 className="text-3xl font-bold text-ink text-center mb-2">{t.onboarding_welcome}</h1>
        <p className="text-center text-ink-secondary leading-relaxed max-w-sm mb-8">
          {t.onboarding_subtitle}
        </p>

        <div className="w-full max-w-xs space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-2">{t.onboarding_shop_name}</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder={t.onboarding_shop_name_placeholder}
              className="input-field text-center text-lg"
              dir="rtl"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleStep1Next() }}
            />
          </div>

          <button
            onClick={handleStep1Next}
            disabled={saving}
            className="btn-primary w-full disabled:opacity-50"
          >
            {t.onboarding_start}
          </button>

          <button
            onClick={handleStep1Next}
            className="w-full text-ink-secondary text-sm font-medium active:scale-95 transition-transform"
          >
            {t.onboarding_skip}
          </button>
        </div>
      </div>
    )
  }

  // Step 1: Business Model
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-top">
        <h2 className="text-title text-ink text-center mb-2">ما نوع نشاطك؟</h2>
        <p className="text-center text-ink-secondary leading-relaxed max-w-sm mb-8">
          هل تبيع الأشياء جاهزة أم تصنعها؟ هذا يساعدنا نخصّص تجربتك.
        </p>

        <div className="w-full max-w-sm space-y-3">
          {/* Ready-made products */}
          <button
            type="button"
            onClick={() => { hapticLight(); setBusinessModel('ready'); handleComplete() }}
            disabled={saving}
            className={`w-full bg-surface rounded-card p-5 shadow-card active:scale-95 transition-transform text-right flex items-center gap-4 border-2 ${
              businessModel === 'ready' ? 'border-primary' : 'border-transparent'
            } disabled:opacity-50`}
          >
            <div className="w-14 h-14 rounded-card bg-primary-50 grid place-items-center flex-shrink-0">
              <Icon name="tag" className="w-7 h-7 text-primary-600" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-base">منتجات جاهزة</p>
              <p className="text-sm text-ink-secondary mt-0.5">علبة تونة، قارورة ماء، علبة سجائر</p>
            </div>
          </button>

          {/* Manufactured products */}
          <button
            type="button"
            onClick={() => { hapticLight(); setBusinessModel('manufactured'); handleComplete() }}
            disabled={saving}
            className={`w-full bg-surface rounded-card p-5 shadow-card active:scale-95 transition-transform text-right flex items-center gap-4 border-2 ${
              businessModel === 'manufactured' ? 'border-primary' : 'border-transparent'
            } disabled:opacity-50`}
          >
            <div className="w-14 h-14 rounded-card bg-accent-50 grid place-items-center flex-shrink-0">
              <Icon name="trendingUp" className="w-7 h-7 text-accent-600" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink text-base">منتجات أُصنِعَت</p>
              <p className="text-sm text-ink-secondary mt-0.5">كوب شاي، ساندويش، طبق طعام</p>
            </div>
          </button>

          {/* Skip */}
          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full text-ink-secondary text-sm font-medium active:scale-95 transition-transform pt-2"
          >
            {saving ? '…' : 'تخطّي'}
          </button>
        </div>
      </div>
    )
  }

  // Step 2: Done
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-top">
        <div className="w-20 h-20 rounded-full bg-income-50 flex items-center justify-center mb-4 animate-scale-in">
          <Icon name="check" className="w-10 h-10 text-income-600" strokeWidth={2.5} />
        </div>
        <h1 className="text-xl font-bold text-ink mb-1">{t.onboarding_ready}</h1>
        <p className="text-ink-secondary text-center max-w-xs text-sm">
          {t.onboarding_ready_desc}
        </p>
      </div>
    )
  }

  return null
}
