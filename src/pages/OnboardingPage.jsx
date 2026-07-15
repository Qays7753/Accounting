import { useState } from 'react'
import { db } from '../db'
import AmountInput from '../components/ui/AmountInput.jsx'
import Icon from '../components/ui/Icon.jsx'
import { hapticSuccess, hapticLight, hapticMedium } from '../utils/haptics.js'

/**
 * Onboarding Page - Opening Balances (First Launch Only)
 *
 * Screen says: "To start, you don't need past records. Just enter what you have now."
 * Inputs: Cash available, Debts owed to me, Debts I owe.
 *
 * On completion, creates opening_balance transactions and sets meta.onboarded = true.
 */
export default function OnboardingPage({ onComplete }) {
  const [step, setStep] = useState(0) // 0=welcome, 1=cash, 2=debts, 3=done
  const [cashAvailable, setCashAvailable] = useState(0)
  const [debtsOwedToMe, setDebtsOwedToMe] = useState(0)
  const [debtsIOwe, setDebtsIOwe] = useState(0)
  const [saving, setSaving] = useState(false)

  const handleNext = () => {
    hapticLight()
    setStep((s) => s + 1)
  }

  const handleBack = () => {
    hapticLight()
    setStep((s) => Math.max(0, s - 1))
  }

  const handleComplete = async () => {
    hapticMedium()
    setSaving(true)
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

      // Create opening_balance transactions
      // - Cash available: positive opening balance
      // - Debts owed to me: tracked as a separate record (not in cash balance, but in net worth)
      // - Debts I owe: tracked as a separate record (reduces net worth)

      if (cashAvailable > 0) {
        await db.addTransaction({
          type: 'opening_balance',
          amount: cashAvailable,
          description: 'الرصيد الافتتاحي - النقد المتاح',
          category: 'رصيد افتتاحي',
          date: todayStart,
        })
      }

      if (debtsOwedToMe > 0) {
        await db.addTransaction({
          type: 'opening_balance',
          amount: debtsOwedToMe,
          description: 'ديون لي على الآخرين',
          category: 'ديون مستحقة لي',
          date: todayStart,
        })
      }

      if (debtsIOwe > 0) {
        await db.addTransaction({
          type: 'opening_balance',
          amount: -debtsIOwe, // Negative to indicate owed
          description: 'ديون علي للآخرين',
          category: 'ديون مستحقة علي',
          date: todayStart,
        })
      }

      // Mark as onboarded
      await db.setMeta('onboarded', true)
      await db.setMeta('firstUseDate', Date.now())
      await db.setSetting('whatsapp_template', 'مرحباً [اسم الزبون]، طلبك [نوع الطلب] هو [حالة الطلب]. المبلغ: [المبلغ]')

      hapticSuccess()
      setStep(3)
      setTimeout(() => {
        onComplete?.()
      }, 2000)
    } catch (e) {
      console.error('Onboarding failed:', e)
      setSaving(false)
    }
  }

  // Welcome screen
  if (step === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-top">
        <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mb-6 shadow-fab">
          <Icon name="wallet" className="w-12 h-12 text-white" strokeWidth={1.8} />
        </div>
        <h1 className="text-3xl font-bold text-text-primary text-center mb-3">أهلاً بك في الحسابات</h1>
        <p className="text-center text-text-secondary leading-relaxed max-w-sm mb-2">
          تطبيق بسيط لإدارة محاسبتك وطلباتك، يعمل بدون إنترنت.
        </p>
        <p className="text-center text-text-tertiary text-sm leading-relaxed max-w-sm mb-8">
          للبدء، لا تحتاج لسجلات سابقة. فقط أدخل ما تملكه الآن.
        </p>
        <button onClick={handleNext} className="btn-primary w-full max-w-xs">
          لنبدأ
        </button>
      </div>
    )
  }

  // Cash available
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6 safe-area-top">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="w-16 h-16 rounded-2xl bg-income-50 flex items-center justify-center mb-5">
            <Icon name="wallet" className="w-8 h-8 text-income-600" strokeWidth={1.8} />
          </div>
          <h2 className="text-2xl font-bold mb-3">كم تملك من النقد الآن؟</h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-8">
            أدخل المبلغ الذي تملكه حالياً نقداً (في الصندوق أو البنك). سيكون هذا هو رصيدك الافتتاحي.
          </p>

          <div className="mb-8">
            <AmountInput
              value={cashAvailable}
              onChange={setCashAvailable}
              autoFocus
              label="النقد المتاح"
            />
          </div>
        </div>

        <div className="flex gap-3 max-w-md mx-auto w-full">
          <button onClick={handleBack} className="btn-secondary flex-1">
            رجوع
          </button>
          <button onClick={handleNext} className="btn-primary flex-[2]">
            التالي
          </button>
        </div>
      </div>
    )
  }

  // Debts
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6 safe-area-top">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
            <Icon name="receipt" className="w-8 h-8 text-primary-600" strokeWidth={1.8} />
          </div>
          <h2 className="text-2xl font-bold mb-3">الديون (اختياري)</h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-8">
            هل لديك ديون على الآخرين أو للآخرين؟ أدخلها لتتبعها. يمكنك تخطي هذه الخطوة إذا لم تكن لديك.
          </p>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-2">
                ديون لي على الآخرين (يطلبون مني)
              </label>
              <AmountInput
                value={debtsOwedToMe}
                onChange={setDebtsOwedToMe}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-2">
                ديون علي للآخرين (أطلب منهم)
              </label>
              <AmountInput
                value={debtsIOwe}
                onChange={setDebtsIOwe}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 max-w-md mx-auto w-full">
          <button onClick={handleBack} className="btn-secondary flex-1">
            رجوع
          </button>
          <button onClick={handleComplete} disabled={saving} className="btn-primary flex-[2] disabled:opacity-50">
            {saving ? 'جار الحفظ...' : 'إكمال الإعداد'}
          </button>
        </div>
      </div>
    )
  }

  // Done
  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-area-top">
        <div className="w-24 h-24 rounded-full bg-income-50 flex items-center justify-center mb-6">
          <Icon name="check" className="w-12 h-12 text-income-600" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold mb-2">تم الإعداد بنجاح!</h1>
        <p className="text-text-secondary text-center max-w-xs">
          أنت جاهز لبدء إدارة محاسبتك. سيتم تحويلك للصفحة الرئيسية...
        </p>
      </div>
    )
  }

  return null
}
