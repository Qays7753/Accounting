import { db } from '../db'
import { formatArabicDate } from './date.js'

/**
 * WhatsApp sharing utilities
 * Uses user-defined template from settings, with placeholders.
 */

const DEFAULT_TEMPLATE = 'مرحباً [اسم الزبون]، طلبك [نوع الطلب] هو [حالة الطلب]. المبلغ: [المبلغ]'

export async function getWhatsAppTemplate() {
  return await db.getSetting('whatsapp_template', DEFAULT_TEMPLATE)
}

export async function setWhatsAppTemplate(template) {
  await db.setSetting('whatsapp_template', template)
}

const STATUS_LABELS = {
  in_progress: 'قيد التنفيذ',
  ready: 'جاهز',
  closed: 'مغلق',
}

/**
 * Build the WhatsApp message from template + order data.
 * Replaces all placeholders with actual values.
 */
export async function buildOrderMessage(order) {
  const template = await getWhatsAppTemplate()
  const statusLabel = STATUS_LABELS[order.status] || order.status
  const message = template
    .replace(/\[اسم الزبون\]/g, order.customerName || '')
    .replace(/\[نوع الطلب\]/g, order.orderType || '')
    .replace(/\[حالة الطلب\]/g, statusLabel)
    .replace(/\[المبلغ\]/g, (order.amount || 0).toLocaleString('en-US'))
    .replace(/\[التاريخ\]/g, formatArabicDate(order.scheduledDate))
  return message
}

/**
 * Share order via WhatsApp
 * - If customer has phone: open wa.me link directly
 * - Otherwise: use Web Share API to share the message
 */
export async function shareOrderViaWhatsApp(order) {
  try {
    const message = await buildOrderMessage(order)

    // Try to find customer's phone
    let phone = ''
    if (order.customerId) {
      const customer = await db.customers.get(order.customerId)
      if (customer?.phone) phone = customer.phone
    }

    // If phone exists, open WhatsApp directly
    if (phone) {
      // Remove non-numeric chars from phone, add country code if missing
      const cleanPhone = phone.replace(/[^\d]/g, '')
      const phoneWithCode = cleanPhone.startsWith('962') ? cleanPhone : (cleanPhone.startsWith('0') ? '962' + cleanPhone.slice(1) : '962' + cleanPhone)
      const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')
      return
    }

    // Otherwise, use Web Share API
    if (navigator.share) {
      await navigator.share({
        title: 'تفاصيل الطلب',
        text: message,
      })
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(message)
      alert('تم نسخ الرسالة. الصقها في واتساب.')
    }
  } catch (e) {
    console.error('Share failed:', e)
  }
}

/**
 * Get list of available placeholders for the template editor
 */
export const WHATSAPP_PLACEHOLDERS = [
  { token: '[اسم الزبون]', label: 'اسم الزبون' },
  { token: '[نوع الطلب]', label: 'نوع الطلب' },
  { token: '[حالة الطلب]', label: 'حالة الطلب' },
  { token: '[المبلغ]', label: 'المبلغ' },
  { token: '[التاريخ]', label: 'التاريخ' },
]

// ========== V2: WHATSAPP RECEIPT SHARING (Agent 4) ==========

/**
 * Build a simple 3-line receipt text for a transaction.
 * Format:
 *   إيصال قبض
 *
 *   المبلغ: 1,500
 *   الوصف: دفعة من زبون
 *   التاريخ: 15 يوليو 2026
 *
 *   شكراً لتعاملكم معنا
 *
 * @param {Object} transaction - { type, amount, description, date }
 * @param {string} businessName - optional business name for the footer
 * @returns {string} - formatted receipt text
 */
export function buildReceiptText(transaction, businessName = null) {
  const typeLabel = transaction.type === 'income' ? 'إيصال قبض'
    : transaction.type === 'expense' ? 'إيصال صرف'
    : transaction.type === 'withdrawal' ? 'إيصال سحب شخصي'
    : 'إيصال'

  const amount = (transaction.amount || 0).toLocaleString('en-US')
  const date = formatArabicDate(transaction.date)
  const desc = transaction.description || ''

  let text = `${typeLabel}\n\n`
  text += `المبلغ: ${amount}\n`
  if (desc) text += `الوصف: ${desc}\n`
  text += `التاريخ: ${date}\n`
  text += `\n${businessName || 'شكراً لتعاملكم معنا'}`

  return text
}

/**
 * Share a transaction receipt via WhatsApp.
 * Uses Web Share API with text, or copies to clipboard as fallback.
 *
 * @param {Object} transaction - the transaction to share
 * @param {string} businessName - optional business name
 */
export async function shareReceipt(transaction, businessName = null) {
  try {
    // Try to get business name from settings if not provided
    if (!businessName) {
      businessName = await db.getBusinessName()
    }

    const text = buildReceiptText(transaction, businessName)

    if (navigator.share) {
      await navigator.share({
        title: 'إيصال',
        text,
      })
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text)
      alert('تم نسخ الإيصال. الصقه في واتساب.')
    }
  } catch (e) {
    // User may have cancelled the share — don't show error in that case
    if (e.name !== 'AbortError' && !e.message?.includes('Abort')) {
      console.error('Share receipt failed:', e)
    }
  }
}

// ========== V4 Phase 1: WHATSAPP DEBT REMINDER ==========

/**
 * Default debt reminder template (used if user hasn't customized the order template
 * or if a separate debt template isn't set).
 * This is a polite reminder asking for money owed.
 */
const DEFAULT_DEBT_TEMPLATE = 'مرحباً [اسم الزبون]، نذكرك بوجود مبلغ [المبلغ] مستحق علينا. نكون شاكرين لو تمكنتم من السداد. شكراً لتفهمكم.'

/**
 * Build a polite debt reminder message using the settings template.
 * Replaces placeholders: [اسم الزبون], [المبلغ], [التاريخ]
 *
 * @param {Object} debt - { description (person name), amount, date }
 * @returns {string} - formatted reminder message
 */
export async function buildDebtReminderMessage(debt) {
  // Try to get a dedicated debt template, fall back to default
  let template = await db.getSetting('whatsapp_debt_template', null)
  if (!template) {
    template = DEFAULT_DEBT_TEMPLATE
  }

  const personName = debt.description || 'الزبون'
  const amount = (debt.amount || 0).toLocaleString('en-US')
  const date = formatArabicDate(debt.date)

  return template
    .replace(/\[اسم الزبون\]/g, personName)
    .replace(/\[المبلغ\]/g, amount)
    .replace(/\[التاريخ\]/g, date)
}

/**
 * Send a polite WhatsApp debt reminder to a debtor.
 * Uses the template from Settings (fetches dynamically, NOT hardcoded).
 *
 * Flow:
 * 1. Fetch template from Settings (or default)
 * 2. Replace placeholders with debt data
 * 3. If debtor has phone: open wa.me link directly
 * 4. Otherwise: use Web Share API
 *
 * @param {Object} debt - the debt_given transaction { description, amount, date, phone? }
 */
export async function sendDebtReminder(debt) {
  try {
    const message = await buildDebtReminderMessage(debt)

    // Get phone: check debt.phone, or look up customer by name
    let phone = debt.phone || ''
    if (!phone && debt.description) {
      // Try to find customer by name
      const customers = await db.getAllCustomers(debt.description)
      if (customers.length > 0) {
        phone = customers[0].phone || ''
      }
    }

    if (phone) {
      // Clean phone and add Jordan country code
      const cleanPhone = phone.replace(/[^\d]/g, '')
      const phoneWithCode = cleanPhone.startsWith('962')
        ? cleanPhone
        : (cleanPhone.startsWith('0') ? '962' + cleanPhone.slice(1) : '962' + cleanPhone)
      const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')
      return
    }

    // No phone — use Web Share API
    if (navigator.share) {
      await navigator.share({
        title: 'تذكير بمبلغ مستحق',
        text: message,
      })
    } else {
      await navigator.clipboard.writeText(message)
      alert('تم نسخ الرسالة. الصقها في واتساب.')
    }
  } catch (e) {
    if (e.name !== 'AbortError' && !e.message?.includes('Abort')) {
      console.error('Send debt reminder failed:', e)
    }
  }
}
