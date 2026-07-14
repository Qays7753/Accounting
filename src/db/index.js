import Dexie from 'dexie'

/**
 * AccountingApp Database - Offline-First IndexedDB via Dexie.js
 *
 * Full schema will be defined by Agent 2 (DB Architect).
 * This is the initial setup to get the app running.
 */
class AccountingDatabase extends Dexie {
  constructor() {
    super('AccountingAppDB')

    // Version 1 - initial schema (will be extended by Agent 2)
    this.version(1).stores({
      transactions: '++id, type, date, amount, category, orderId, createdAt',
      orders: '++id, customerName, status, scheduledDate, amount, createdAt',
      customers: '++id, name, phone, createdAt',
      settings: '++id, key',
      meta: '++id, key',
    })

    // Open the database
    this.open()
  }
}

export const db = new AccountingDatabase()

// Helper: get or set a setting by key
export async function getSetting(key, defaultValue = null) {
  const row = await db.settings.where('key').equals(key).first()
  return row ? row.value : defaultValue
}

export async function setSetting(key, value) {
  const existing = await db.settings.where('key').equals(key).first()
  if (existing) {
    await db.settings.update(existing.id, { value, updatedAt: Date.now() })
  } else {
    await db.settings.add({ key, value, updatedAt: Date.now() })
  }
}

// Helper: get or set meta info (first launch flag, last backup date, etc.)
export async function getMeta(key, defaultValue = null) {
  const row = await db.meta.where('key').equals(key).first()
  return row ? row.value : defaultValue
}

export async function setMeta(key, value) {
  const existing = await db.meta.where('key').equals(key).first()
  if (existing) {
    await db.meta.update(existing.id, { value, updatedAt: Date.now() })
  } else {
    await db.meta.add({ key, value, updatedAt: Date.now() })
  }
}
