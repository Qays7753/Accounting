/**
 * Arabic date/time utilities
 */

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

const ARABIC_DAYS = [
  'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
]

export function formatArabicDate(date) {
  const d = new Date(date)
  const day = d.getDate()
  const month = ARABIC_MONTHS[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

export function formatArabicDateTime(date) {
  const d = new Date(date)
  const day = d.getDate()
  const month = ARABIC_MONTHS[d.getMonth()]
  const year = d.getFullYear()
  let hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const period = hours >= 12 ? 'م' : 'ص'
  hours = hours % 12 || 12
  return `${day} ${month} ${year} - ${hours}:${minutes} ${period}`
}

export function formatTime(date) {
  const d = new Date(date)
  let hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const period = hours >= 12 ? 'م' : 'ص'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${period}`
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'صباح الخير'
  if (hour < 17) return 'مساء الخير'
  if (hour < 21) return 'مساء الخير'
  return 'مساء الخير'
}

export function getDayName(date) {
  const d = new Date(date)
  return ARABIC_DAYS[d.getDay()]
}

export function isToday(date) {
  const d = new Date(date)
  const today = new Date()
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
}

export function isThisWeek(date) {
  const d = new Date(date)
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  return d >= startOfWeek
}

export function isThisMonth(date) {
  const d = new Date(date)
  const today = new Date()
  return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function getRelativeTime(date) {
  const d = new Date(date)
  const now = new Date()
  const diff = (now - d) / 1000 // seconds

  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return formatArabicDate(d)
}

export { ARABIC_MONTHS, ARABIC_DAYS }
