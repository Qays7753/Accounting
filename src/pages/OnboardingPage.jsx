export default function OnboardingPage({ onComplete }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-text-secondary">سيتم تطوير شاشة الأرصدة الافتتاحية من قبل الوكلاء اللاحقين</p>
        <button onClick={onComplete} className="btn-primary mt-6">تخطي</button>
      </div>
    </div>
  )
}
