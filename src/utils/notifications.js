/**
 * Notification Service - Local notifications via Service Worker
 * Will be fully implemented by Agent 5
 */

export function initNotificationService() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported')
    return
  }
  // Default: don't request permission on load. Only when user enables in settings.
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export async function scheduleLocalNotification(title, body, scheduledTime) {
  // Will be implemented by Agent 5
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const delay = scheduledTime - Date.now()
  if (delay <= 0) return
  setTimeout(() => {
    new Notification(title, { body, icon: '/icon-192.png' })
  }, delay)
}

export async function sendTestNotification() {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission()
    if (!granted) return
  }
  new Notification('الحسابات', {
    body: 'الإشعارات تعمل بشكل صحيح',
    icon: '/icon-192.png',
  })
}
