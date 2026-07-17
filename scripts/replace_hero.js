import { readFileSync, writeFileSync } from 'fs'

const filePath = 'src/pages/HomePage.jsx'
let content = readFileSync(filePath, 'utf8')

const startMarker = '      {/* V5: Two Jars Dashboard'
const endMarker = '      </section>'
const startIndex = content.indexOf(startMarker)
if (startIndex === -1) {
  console.error('Start marker not found')
  process.exit(1)
}
const endIndex = content.indexOf(endMarker, startIndex)
if (endIndex === -1) {
  console.error('End marker not found')
  process.exit(1)
}

const newSection = `      {/* V5 SOP: Two Jars Dashboard */}
      <section className="px-4 mb-3">
        <div
          className="rounded-16 p-4 text-white relative overflow-hidden"
          style={{ background: '#023852', boxShadow: '0 8px 24px -18px rgba(2,56,82,.35)', border: '1px solid #E4EAEE' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium" style={{ color: '#9FDBC5' }}>إجمالي النقد المتاح</span>
            <Icon name="wallet" className="w-5 h-5" strokeWidth={1.5} />
          </div>
          {stats.loading ? (
            <div className="h-8 w-40 bg-white/20 rounded-lg animate-pulse mt-2" />
          ) : (
            <div className="num text-[28px] font-semibold mt-1 leading-none">
              {formatAmount(animatedTotal)}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[34px] h-[34px] rounded-12 grid place-items-center" style={{ background: '#E3F5F5' }}>
                <Icon name="wallet" className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: '#023852' }}>حق المحل</span>
            </div>
            <div className="num text-[24px] font-semibold text-ink leading-none">
              {formatAmount(animatedCapital)}
            </div>
            <div className="text-[12px] mt-1" style={{ color: '#647680' }}>رأس المال</div>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-[34px] h-[34px] rounded-12 grid place-items-center" style={{ background: '#E1F3EB' }}>
                <Icon name="trendingUp" className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: '#0E8A5F' }}>حق التاجر</span>
            </div>
            <div className="num text-[24px] font-semibold leading-none"
              style={{ color: animatedProfit >= 0 ? '#0E8A5F' : '#C0272B' }}
            >
              {formatAmount(animatedProfit)}
            </div>
            <div className="text-[12px] mt-1" style={{ color: '#647680' }}>الأرباح</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 justify-center mt-2">
          <Icon name="info" className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-[12px]" style={{ color: '#647680' }}>لا تسحب من حق المحل إلا لإعادة تعبئة البضاعة</span>
        </div>
      `

content = content.slice(0, startIndex) + newSection + content.slice(endIndex + endMarker.length)
writeFileSync(filePath, content, 'utf8')
console.log('HomePage hero section replaced successfully')
