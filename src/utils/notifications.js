/**
 * Notification Service - Local notifications via Service Worker
 *
 * Strategy:
 * - On app launch, check for upcoming orders and schedule notifications
 * - Use setTimeout for in-session reminders (works while app is open)
 * - For persistent reminders, use the Notification API directly
 * - Notifications fire at scheduled time if app is open
 * - For background notifications, we rely on PWA install + periodic sync (limited on iOS)
 *
 * Note: True background notifications on mobile PWAs are limited. The most reliable
 * approach is to fire notifications when the app is opened and an order is due soon.
 */

const NOTIFICATION_CHECK_INTERVAL = 60 * 1000 // Check every minute
const ORDER_REMINDER_HOURS_BEFORE = 1 // Remind 1 hour before scheduled time

let checkInterval = null

export function initNotificationService() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported on this device')
    return
  }

  // Start periodic check for due notifications
  startNotificationCheck()

  // Check on app visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkDueNotifications()
    }
  })

  // Initial check after a short delay
  setTimeout(checkDueNotifications, 2000)
}

function startNotificationCheck() {
  if (checkInterval) clearInterval(checkInterval)
  checkInterval = setInterval(checkDueNotifications, NOTIFICATION_CHECK_INTERVAL)
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('الإشعارات غير مدعومة على هذا الجهاز')
    return false
  }
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') {
    alert('تم رفض إذن الإشعارات. يرجى تفعيله من إعدادات المتصفح')
    return false
  }
  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    return true
  }
  return false
}

/**
 * Check for orders that need reminders (scheduled within next hour, not yet notified)
 */
async function checkDueNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  try {
    const { db } = await import('../db')
    const now = Date.now()
    const reminderWindow = now + ORDER_REMINDER_HOURS_BEFORE * 60 * 60 * 1000

    // Get orders scheduled in the next hour that aren't closed
    const upcoming = await db.orders
      .where('scheduledTimestamp')
      .between(now - 60 * 60 * 1000, reminderWindow, true, true)
      .and((o) => o.status !== 'closed')
      .toArray()

    for (const order of upcoming) {
      // Check if we already sent a notification for this order
      const existing = await db.notifications
        .where('orderId')
        .equals(order.id)
        .and((n) => n.sent)
        .first()

      if (!existing) {
        // Schedule notification
        const notifTime = order.scheduledTimestamp - ORDER_REMINDER_HOURS_BEFORE * 60 * 60 * 1000
        const delay = notifTime - now

        if (delay <= 0) {
          // Fire immediately
          await fireOrderNotification(order)
        } else if (delay <= ORDER_REMINDER_HOURS_BEFORE * 60 * 60 * 1000) {
          // Schedule for later (only if within the hour)
          setTimeout(() => fireOrderNotification(order), delay)
        }
      }
    }

    // Also check for very overdue notifications in DB
    const pending = await db.getPendingNotifications()
    for (const notif of pending) {
      if (notif.scheduledTime <= now) {
        await fireNotificationFromDb(notif)
      }
    }
  } catch (e) {
    console.error('Notification check failed:', e)
  }
}

/**
 * Fire a notification for an order
 */
async function fireOrderNotification(order) {
  try {
    const { db } = await import('../db')

    // Check if already sent
    const existing = await db.notifications
      .where('orderId')
      .equals(order.id)
      .and((n) => n.sent)
      .first()

    if (existing) return

    const title = 'تذكير: طلب قادم'
    const body = `${order.customerName || 'زبون'} - ${order.orderType || 'طلب'}`
    const notifId = await db.addNotification({
      orderId: order.id,
      title,
      body,
      scheduledTime: Date.now(),
    })

    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `order-${order.id}`,
    })

    await db.markNotificationSent(notifId)
  } catch (e) {
    console.error('Failed to fire notification:', e)
  }
}

async function fireNotificationFromDb(notif) {
  try {
    new Notification(notif.title, {
      body: notif.body,
      icon: '/icon-192.png',
      tag: `notif-${notif.id}`,
    })
    const { db } = await import('../db')
    await db.markNotificationSent(notif.id)
  } catch (e) {
    console.error('Failed to fire notification:', e)
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(title, body, scheduledTime, orderId = null) {
  if (!('Notification' in window)) return null
  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission()
    if (!granted) return null
  }

  const { db } = await import('../db')
  const id = await db.addNotification({
    orderId,
    title,
    body,
    scheduledTime,
  })

  const delay = scheduledTime - Date.now()
  if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      fireNotificationFromDb({ id, title, body })
    }, delay)
  }

  return id
}

/**
 * Send a test notification
 */
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

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(id) {
  const { db } = await import('../db')
  await db.deleteNotification(id)
}

/**
 * Cancel all notifications for an order
 */
export async function cancelOrderNotifications(orderId) {
  const { db } = await import('../db')
  const notifs = await db.notifications.where('orderId').equals(orderId).toArray()
  for (const n of notifs) {
    await db.deleteNotification(n.id)
  }
}
