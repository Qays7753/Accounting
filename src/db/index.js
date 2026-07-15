import Dexie from 'dexie'

/**
 * AccountingApp Database - Offline-First IndexedDB via Dexie.js
 *
 * Schema designed by Agent 2 (DB Architect)
 *
 * Tables:
 * 1. transactions  - All cash flow records (income, expense, withdrawal, opening balance)
 * 2. orders         - Order tracking with status, scheduled date, customer link
 * 3. customers      - Customer directory (name, phone, notes)
 * 4. settings       - App settings as key-value pairs
 * 5. meta           - App metadata (onboarding flag, last backup, etc.)
 *
 * Indexing strategy:
 * - Primary key: auto-incrementing id
 * - Secondary indexes on frequently-queried fields (date, type, status, customer)
 * - Compound queries handled via filtered table scans on indexed fields
 * - Pagination via .offset() + .limit() on indexed date desc
 *
 * Cascading rules:
 * - Deleting a customer does NOT delete their orders (keeps audit trail).
 *   Instead, customer is marked as archived.
 * - Deleting an order offers to delete linked payments or convert to standalone.
 * - Transactions linked to orders carry orderId; deleting order unlinks but keeps transaction.
 */

class AccountingDatabase extends Dexie {
  constructor() {
    super('AccountingAppDB')

    // Version 1 - initial (Agent 1)
    this.version(1).stores({
      transactions: '++id, type, date, amount, category, orderId, createdAt',
      orders: '++id, customerName, status, scheduledDate, amount, createdAt',
      customers: '++id, name, phone, createdAt',
      settings: '++id, key',
      meta: '++id, key',
    })

    // Version 2 - Full schema with optimized indexes (Agent 2)
    this.version(2).stores({
      // Transactions: cash flow entries
      // type: 'income' | 'expense' | 'withdrawal' | 'opening_balance'
      // category: free text (e.g., "مواد خام", "كهرباء", "إيجار")
      // orderId: optional link to an order
      // dateTimestamp: ms epoch for fast date-range queries
      transactions: '++id, type, [type+dateTimestamp], dateTimestamp, category, orderId, amount, createdAt',

      // Orders: tracking with status workflow
      // status: 'in_progress' | 'ready' | 'closed'
      // orderType: free text (e.g., "إصلاح", "شراء", "حجز")
      // scheduledTimestamp: ms epoch
      // customerId: optional link
      orders: '++id, status, [status+scheduledTimestamp], scheduledTimestamp, customerName, customerId, orderType, amount, createdAt',

      // Customers: simple directory
      customers: '++id, name, phone, archived, createdAt',

      // Settings: key-value (whatsapp template, pin, etc.)
      settings: '++id, &key',

      // Meta: app state (onboarded, lastBackupDate, openingBalances, etc.)
      meta: '++id, &key',
    })

    // Version 3 - add notification schedules table (for Agent 5)
    this.version(3).stores({
      transactions: '++id, type, [type+dateTimestamp], dateTimestamp, category, orderId, amount, createdAt',
      orders: '++id, status, [status+scheduledTimestamp], scheduledTimestamp, customerName, customerId, orderType, amount, createdAt',
      customers: '++id, name, phone, archived, createdAt',
      settings: '++id, &key',
      meta: '++id, &key',
      notifications: '++id, orderId, scheduledTime, sent, createdAt',
    })

    this.open()
  }

  // ========== TRANSACTION HELPERS ==========

  /**
   * Add a new transaction
   * @param {Object} data - { type, amount, description, category, date, orderId }
   */
  async addTransaction(data) {
    const now = Date.now()
    const dateObj = data.date ? new Date(data.date) : new Date()
    const transaction = {
      type: data.type, // 'income' | 'expense' | 'withdrawal' | 'opening_balance'
      amount: Number(data.amount) || 0,
      description: data.description || '',
      category: data.category || '',
      date: dateObj.toISOString(),
      dateTimestamp: dateObj.getTime(),
      orderId: data.orderId || null,
      createdAt: now,
      updatedAt: now,
    }
    const id = await this.transactions.add(transaction)
    return { ...transaction, id }
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(id, updates) {
    const updateData = { ...updates, updatedAt: Date.now() }
    if (updates.date) {
      const dateObj = new Date(updates.date)
      updateData.date = dateObj.toISOString()
      updateData.dateTimestamp = dateObj.getTime()
    }
    if (updates.amount !== undefined) {
      updateData.amount = Number(updates.amount) || 0
    }
    await this.transactions.update(id, updateData)
  }

  /**
   * Delete a transaction by id
   */
  async deleteTransaction(id) {
    await this.transactions.delete(id)
  }

  /**
   * Get transactions with pagination (20 per page) and optional filters.
   *
   * Performance strategy:
   * - Uses the indexed `dateTimestamp` for range queries via Dexie's where().between()
   * - Sorts via the index (reverse() on dateTimestamp) — no JS sort needed
   * - Applies type filter via Dexie's collection.filter() (lazy, runs in DB)
   * - For search: since we need substring matching on description/category,
   *   we load the filtered+sorted result and apply search in JS.
   *   This is acceptable because the date-range + type filter already narrows the set.
   * - Pagination via offset() + limit() — only the page size is materialized.
   *
   * @param {Object} opts - { page, pageSize, type, startDate, endDate, search }
   */
  async getTransactions(opts = {}) {
    const {
      page = 1,
      pageSize = 20,
      type = null,
      startDate = null,
      endDate = null,
      search = '',
    } = opts

    // Build base collection using index
    let collection
    if (startDate !== null && endDate !== null) {
      const startTs = new Date(startDate).getTime()
      const endTs = new Date(endDate).getTime()
      collection = this.transactions
        .where('dateTimestamp')
        .between(startTs, endTs, true, true)
    } else if (startDate !== null) {
      const startTs = new Date(startDate).getTime()
      collection = this.transactions.where('dateTimestamp').aboveOrEqual(startTs)
    } else {
      collection = this.transactions.toCollection()
    }

    // Apply type filter lazily (in DB, not in JS)
    if (type && type !== 'all') {
      collection = collection.filter((t) => t.type === type)
    }

    // If there's a search term, we need to materialize the filtered set to apply substring matching.
    // Otherwise we can paginate directly using the index.
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      let items = await collection.toArray()
      items = items.filter(
        (t) =>
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      )
      // Sort by date desc
      items.sort((a, b) => b.dateTimestamp - a.dateTimestamp)
      const total = items.length
      const offset = (page - 1) * pageSize
      const paged = items.slice(offset, offset + pageSize)
      return { items: paged, total, hasMore: offset + pageSize < total, page, pageSize }
    }

    // No search: use index-based pagination (fast, even for 10,000+ records)
    // Dexie's .reverse() + .sortBy() uses the index
    const total = await collection.count()
    const offset = (page - 1) * pageSize
    // Use .orderBy('dateTimestamp').reverse() for desc sort via index
    // Then offset + limit for pagination
    let pagedCollection = this.transactions.orderBy('dateTimestamp').reverse()
    // Re-apply the same filters on the ordered collection
    if (startDate !== null && endDate !== null) {
      const startTs = new Date(startDate).getTime()
      const endTs = new Date(endDate).getTime()
      pagedCollection = pagedCollection.and((t) => t.dateTimestamp >= startTs && t.dateTimestamp <= endTs)
    } else if (startDate !== null) {
      const startTs = new Date(startDate).getTime()
      pagedCollection = pagedCollection.and((t) => t.dateTimestamp >= startTs)
    }
    if (type && type !== 'all') {
      pagedCollection = pagedCollection.and((t) => t.type === type)
    }
    const items = await pagedCollection.offset(offset).limit(pageSize).toArray()
    return { items, total, hasMore: offset + pageSize < total, page, pageSize }
  }

  /**
   * Get all transactions for a date range (no pagination, for stats)
   */
  async getTransactionsByDateRange(startDate, endDate) {
    const startTs = new Date(startDate).getTime()
    const endTs = new Date(endDate).getTime()
    return await this.transactions
      .where('dateTimestamp')
      .between(startTs, endTs, true, true)
      .toArray()
  }

  /**
   * Get transactions linked to a specific order
   */
  async getTransactionsByOrder(orderId) {
    return await this.transactions.where('orderId').equals(orderId).toArray()
  }

  /**
   * Calculate cash balance: actual cash on hand.
   *
   * Business rules:
   * - income: +cash
   * - expense: -cash
   * - withdrawal: -cash (personal, but still reduces cash)
   * - opening_balance: only the CASH opening balance counts (category = 'رصيد افتتاحي')
   *   Debts owed to me (category='ديون مستحقة لي') and debts I owe (category='ديون مستحقة علي')
   *   are NOT cash — they're receivables/liabilities tracked separately via getNetWorth().
   *
   * Performance: Uses Dexie's collection.each() cursor instead of toArray() to avoid
   * loading all transactions into memory at once.
   */
  async getCashBalance() {
    let balance = 0
    await this.transactions.each((t) => {
      if (t.type === 'income') {
        balance += t.amount
      } else if (t.type === 'expense' || t.type === 'withdrawal') {
        balance -= t.amount
      } else if (t.type === 'opening_balance') {
        // Only count the actual cash opening balance, not debt records
        if (t.category === 'رصيد افتتاحي') {
          balance += t.amount
        }
        // Debts owed to me (positive) and debts I owe (negative) are excluded from cash
      }
    })
    return balance
  }

  /**
   * Calculate totals for a date range.
   *
   * Business rules:
   * - `income`: only type='income' (excludes opening_balance, which is a one-time setup entry)
   * - `expense`: only type='expense'
   * - `withdrawal`: only type='withdrawal' (personal, doesn't affect net profit)
   * - `netProfit` = income - expense (business profit, excludes personal withdrawals)
   * - `netCash` = income - expense - withdrawal (actual cash change for the period)
   *
   * Note: opening_balance is excluded from period totals because it represents
   * the initial setup, not recurring business activity. It IS included in the
   * overall cash balance via getCashBalance().
   */
  async getTotalsForRange(startDate, endDate) {
    const items = await this.getTransactionsByDateRange(startDate, endDate)
    let income = 0
    let expense = 0
    let withdrawal = 0
    for (const t of items) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
      else if (t.type === 'withdrawal') withdrawal += t.amount
      // opening_balance excluded from period totals
    }
    return {
      income,
      expense,
      withdrawal,
      netProfit: income - expense,
      netCash: income - expense - withdrawal,
    }
  }

  // ========== ORDER HELPERS ==========

  /**
   * Add a new order
   * @param {Object} data - { customerName, customerId, orderType, scheduledDate, amount, status, notes }
   */
  async addOrder(data) {
    const now = Date.now()
    const scheduledObj = data.scheduledDate ? new Date(data.scheduledDate) : new Date()
    const order = {
      customerName: data.customerName || '',
      customerId: data.customerId || null,
      orderType: data.orderType || '',
      scheduledDate: scheduledObj.toISOString(),
      scheduledTimestamp: scheduledObj.getTime(),
      amount: Number(data.amount) || 0,
      status: data.status || 'in_progress', // 'in_progress' | 'ready' | 'closed'
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
    }
    const id = await this.orders.add(order)
    return { ...order, id }
  }

  async updateOrder(id, updates) {
    const updateData = { ...updates, updatedAt: Date.now() }
    if (updates.scheduledDate) {
      const dateObj = new Date(updates.scheduledDate)
      updateData.scheduledDate = dateObj.toISOString()
      updateData.scheduledTimestamp = dateObj.getTime()
    }
    if (updates.amount !== undefined) {
      updateData.amount = Number(updates.amount) || 0
    }
    await this.orders.update(id, updateData)
  }

  async deleteOrder(id) {
    // Unlink any transactions tied to this order (keep transactions, remove link)
    const linked = await this.transactions.where('orderId').equals(id).toArray()
    for (const t of linked) {
      await this.transactions.update(t.id, { orderId: null, updatedAt: Date.now() })
    }
    // Delete scheduled notifications for this order
    await this.notifications.where('orderId').equals(id).delete()
    await this.orders.delete(id)
  }

  /**
   * Get orders with pagination.
   *
   * Performance strategy:
   * - Uses indexed `scheduledTimestamp` for range queries
   * - Uses `orderBy('scheduledTimestamp')` for index-based sorting
   * - Applies status filter via .and() (lazy, in DB)
   * - For search: materializes filtered set (acceptable since search narrows results)
   * - Pagination via offset() + limit()
   *
   * @param {Object} opts - { page, pageSize, status, search, startDate, endDate }
   */
  async getOrders(opts = {}) {
    const {
      page = 1,
      pageSize = 20,
      status = null,
      search = '',
      startDate = null,
      endDate = null,
    } = opts

    // For closed orders: sort desc (most recent first). For active: sort asc (upcoming first).
    const sortDesc = status === 'closed'

    // Build collection with filters
    let baseCollection = this.orders.toCollection()
    if (status && status !== 'all') {
      baseCollection = baseCollection.filter((o) => o.status === status)
    }
    const total = await baseCollection.count()

    // If search is needed, materialize and filter in JS
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      let items = await baseCollection.toArray()
      items = items.filter(
        (o) =>
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.orderType && o.orderType.toLowerCase().includes(q)) ||
          (o.notes && o.notes.toLowerCase().includes(q))
      )
      if (sortDesc) {
        items.sort((a, b) => b.scheduledTimestamp - a.scheduledTimestamp)
      } else {
        items.sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp)
      }
      const offset = (page - 1) * pageSize
      const paged = items.slice(offset, offset + pageSize)
      return { items: paged, total: items.length, hasMore: offset + pageSize < items.length, page, pageSize }
    }

    // No search: use index-based pagination
    let pagedCollection = sortDesc
      ? this.orders.orderBy('scheduledTimestamp').reverse()
      : this.orders.orderBy('scheduledTimestamp')

    // Re-apply status filter on ordered collection
    if (status && status !== 'all') {
      pagedCollection = pagedCollection.and((o) => o.status === status)
    }
    // Apply date range if provided
    if (startDate && endDate) {
      const startTs = new Date(startDate).getTime()
      const endTs = new Date(endDate).getTime()
      pagedCollection = pagedCollection.and((o) => o.scheduledTimestamp >= startTs && o.scheduledTimestamp <= endTs)
    }

    const offset = (page - 1) * pageSize
    const items = await pagedCollection.offset(offset).limit(pageSize).toArray()
    return { items, total, hasMore: offset + pageSize < total, page, pageSize }
  }

  /**
   * Get orders for a specific day
   */
  async getOrdersForDay(year, month, day) {
    const start = new Date(year, month, day, 0, 0, 0, 0).getTime()
    const end = new Date(year, month, day, 23, 59, 59, 999).getTime()
    return await this.orders
      .where('scheduledTimestamp')
      .between(start, end, true, true)
      .toArray()
  }

  /**
   * Get orders for a month (for calendar dots)
   */
  async getOrdersForMonth(year, month) {
    const start = new Date(year, month, 1, 0, 0, 0, 0).getTime()
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
    return await this.orders
      .where('scheduledTimestamp')
      .between(start, end, true, true)
      .toArray()
  }

  /**
   * Get upcoming orders (next N days)
   */
  async getUpcomingOrders(days = 7) {
    const now = Date.now()
    const future = now + days * 24 * 60 * 60 * 1000
    return await this.orders
      .where('scheduledTimestamp')
      .between(now, future, true, true)
      .and((o) => o.status !== 'closed')
      .toArray()
  }

  // ========== CUSTOMER HELPERS ==========

  async addCustomer(data) {
    const now = Date.now()
    const customer = {
      name: data.name || '',
      phone: data.phone || '',
      notes: data.notes || '',
      archived: false,
      createdAt: now,
      updatedAt: now,
    }
    const id = await this.customers.add(customer)
    return { ...customer, id }
  }

  async updateCustomer(id, updates) {
    await this.customers.update(id, { ...updates, updatedAt: Date.now() })
  }

  async archiveCustomer(id) {
    await this.customers.update(id, { archived: true, updatedAt: Date.now() })
  }

  async getCustomers(search = '') {
    let collection = this.customers.where('archived').equals(0)
    if (typeof collection === 'undefined' || !collection) {
      // Fallback: use toCollection
      collection = this.customers.toCollection()
    }
    let items = await collection.toArray()
    // Filter out archived (since Dexie 4 boolean index workaround)
    items = items.filter((c) => !c.archived)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      )
    }
    items.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    return items
  }

  // ========== SETTINGS & META ==========

  async getSetting(key, defaultValue = null) {
    const row = await this.settings.where('key').equals(key).first()
    return row ? row.value : defaultValue
  }

  async setSetting(key, value) {
    const existing = await this.settings.where('key').equals(key).first()
    if (existing) {
      await this.settings.update(existing.id, { value, updatedAt: Date.now() })
    } else {
      await this.settings.add({ key, value, updatedAt: Date.now() })
    }
  }

  async getAllSettings() {
    const rows = await this.settings.toArray()
    const obj = {}
    for (const r of rows) obj[r.key] = r.value
    return obj
  }

  async getMeta(key, defaultValue = null) {
    const row = await this.meta.where('key').equals(key).first()
    return row ? row.value : defaultValue
  }

  async setMeta(key, value) {
    const existing = await this.meta.where('key').equals(key).first()
    if (existing) {
      await this.meta.update(existing.id, { value, updatedAt: Date.now() })
    } else {
      await this.meta.add({ key, value, updatedAt: Date.now() })
    }
  }

  // ========== BACKUP & RESTORE ==========

  /**
   * Export all data as a JSON object
   */
  async exportAllData() {
    const [transactions, orders, customers, settings, meta] = await Promise.all([
      this.transactions.toArray(),
      this.orders.toArray(),
      this.customers.toArray(),
      this.settings.toArray(),
      this.meta.toArray(),
    ])
    return {
      version: 3,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      data: {
        transactions,
        orders,
        customers,
        settings,
        meta,
      },
    }
  }

  /**
   * Restore data from a JSON object (clears existing data first)
   */
  async restoreFromBackup(backup) {
    if (!backup || !backup.data) throw new Error('ملف النسخة الاحتياطية غير صالح')
    const { transactions, orders, customers, settings, meta } = backup.data

    await this.transaction('rw', this.transactions, this.orders, this.customers, this.settings, this.meta, async () => {
      // Clear all tables
      await Promise.all([
        this.transactions.clear(),
        this.orders.clear(),
        this.customers.clear(),
        this.settings.clear(),
        this.meta.clear(),
      ])
      // Bulk insert
      if (transactions && transactions.length) await this.transactions.bulkAdd(transactions)
      if (orders && orders.length) await this.orders.bulkAdd(orders)
      if (customers && customers.length) await this.customers.bulkAdd(customers)
      if (settings && settings.length) await this.settings.bulkAdd(settings)
      if (meta && meta.length) await this.meta.bulkAdd(meta)
    })
  }

  /**
   * Clear all data (factory reset)
   */
  async clearAllData() {
    await Promise.all([
      this.transactions.clear(),
      this.orders.clear(),
      this.customers.clear(),
      this.settings.clear(),
      this.meta.clear(),
      this.notifications.clear(),
    ])
  }

  // ========== NOTIFICATIONS ==========

  async addNotification(data) {
    const now = Date.now()
    const notif = {
      orderId: data.orderId || null,
      title: data.title || '',
      body: data.body || '',
      scheduledTime: data.scheduledTime || now,
      sent: false,
      createdAt: now,
    }
    const id = await this.notifications.add(notif)
    return { ...notif, id }
  }

  async getPendingNotifications() {
    return await this.notifications.where('sent').equals(0).toArray().then(arr => arr.filter(n => !n.sent))
  }

  async markNotificationSent(id) {
    await this.notifications.update(id, { sent: true, sentAt: Date.now() })
  }

  async deleteNotification(id) {
    await this.notifications.delete(id)
  }
}

export const db = new AccountingDatabase()
