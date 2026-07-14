import { db } from '../db'

/**
 * Backup & Restore utilities
 * - Export: JSON file via Web Share API (or download fallback)
 * - Import: File Picker to select JSON
 * - Weekly backup reminder
 */

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000

/**
 * Export all data as JSON and trigger native Share Sheet
 */
export async function exportBackup() {
  const data = await db.exportAllData()
  const json = JSON.stringify(data, null, 2)
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `accounting-backup-${dateStr}.json`

  // Try Web Share API with file
  if (navigator.canShare && navigator.canShare({ files: [new File([json], filename, { type: 'application/json' })] })) {
    const file = new File([json], filename, { type: 'application/json' })
    await navigator.share({
      files: [file],
      title: 'نسخة احتياطية - الحسابات',
      text: `نسخة احتياطية بتاريخ ${dateStr}`,
    })
    return true
  }

  // Fallback: download file
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return true
}

/**
 * Import backup from file picker
 */
export async function importBackup() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) {
        resolve(null)
        return
      }
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.data || !data.data.transactions) {
          reject(new Error('ملف غير صالح'))
          return
        }
        // Confirm before overwriting
        const confirmed = confirm('سيتم استبدال جميع بياناتك الحالية بالبيانات من الملف. هل أنت متأكد؟')
        if (!confirmed) {
          resolve(null)
          return
        }
        await db.restoreFromBackup(data)
        resolve(data)
      } catch (err) {
        reject(new Error('فشل قراءة الملف: ' + err.message))
      }
    }
    input.click()
  })
}

/**
 * Check if backup is overdue (7+ days since last backup)
 * Returns a reminder object or null
 */
export async function checkBackupReminder() {
  const lastBackup = await db.getMeta('lastBackupDate', null)
  const onboarded = await db.getMeta('onboarded', false)

  if (!onboarded) return null

  if (!lastBackup) {
    // Never backed up - check if app has been used for at least 7 days
    const firstUse = await db.getMeta('firstUseDate', null)
    if (!firstUse) {
      await db.setMeta('firstUseDate', Date.now())
      return null
    }
    if (Date.now() - firstUse > ONE_WEEK) {
      return {
        message: 'لم تقم بنسخ احتياطي بعد. بياناتك مهمة، قم بالنسخ الآن.',
        daysSinceBackup: null,
      }
    }
    return null
  }

  const elapsed = Date.now() - lastBackup
  if (elapsed > ONE_WEEK) {
    const days = Math.floor(elapsed / (24 * 60 * 60 * 1000))
    return {
      message: `مرت ${days} أيام منذ آخر نسخة احتياطية. بياناتك مهمة، قم بالنسخ الآن.`,
      daysSinceBackup: days,
    }
  }

  return null
}

/**
 * Mark backup as done (called after successful export)
 */
export async function markBackupDone() {
  await db.setMeta('lastBackupDate', Date.now())
}
