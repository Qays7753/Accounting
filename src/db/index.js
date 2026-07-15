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

    // Version 4 - V2 features: recurring, debts, settlements, theming
    // New transaction fields: isRecurring, frequency, recurringParentId, debtStatus, debtAmountPaid, linkedDebtId, edited
    // New transaction types: 'debt_given' (receivable), 'debt_taken' (payable)
    // New table: settlements (tracks debt settlement payments)
    this.version(4).stores({
      // Add recurringParentId and debtStatus indexes for fast queries
      transactions: '++id, type, [type+dateTimestamp], dateTimestamp, category, orderId, amount, createdAt, isRecurring, recurringParentId, debtStatus, linkedDebtId, edited',
      orders: '++id, status, [status+scheduledTimestamp], scheduledTimestamp, customerName, customerId, orderType, amount, createdAt',
      customers: '++id, name, phone, archived, createdAt',
      settings: '++id, &key',
      meta: '++id, &key',
      notifications: '++id, orderId, scheduledTime, sent, createdAt',
      // New: settlements table - links a debt to its payment transaction
      settlements: '++id, debtTransactionId, paymentTransactionId, amount, createdAt',
    })

    // Version 5 - V3: Professional Business Suite
    // New table: materials (BOM components - analytical/advisory ONLY, does NOT affect finance)
    // Orders: add is_paid, payment_transaction_id, phone indexes for CRM
    // Customers: already exists, now actively used for CRM
    this.version(5).stores({
      transactions: '++id, type, [type+dateTimestamp], dateTimestamp, category, orderId, amount, createdAt, isRecurring, recurringParentId, debtStatus, linkedDebtId, edited',
      // V3: add is_paid and paymentTransactionId indexes for order payment tracking
      orders: '++id, status, [status+scheduledTimestamp], scheduledTimestamp, customerName, customerId, phone, orderType, amount, is_paid, paymentTransactionId, createdAt',
      customers: '++id, name, phone, archived, createdAt',
      // V3: new materials table for BOM costing (analytical only)
      materials: '++id, name, unit_type, unit_cost, createdAt',
      settings: '++id, &key',
      meta: '++id, &key',
      notifications: '++id, orderId, scheduledTime, sent, createdAt',
      settlements: '++id, debtTransactionId, paymentTransactionId, amount, createdAt',
    })

    // Version 6 - V4 Phase 1: Financial Clarity & Debt Automation
    // New transaction field: cost_of_goods (COGS for Two Jars calculation)
    //   - When income is recorded with cost_of_goods > 0:
    //     * cost_of_goods goes to "حق المحل" (Capital/COGS jar)
    //     * (amount - cost_of_goods) goes to "حق التاجر" (Profit jar)
    //   - When cost_of_goods is 0 or not provided: 100% goes to "حق المحل" (conservative)
    // Debt types already exist: 'debt_given' (receivable / لهم عندي) and 'debt_taken' (payable / عندي لهم)
    this.version(6).stores({
      // Add cost_of_goods index for Two Jars calculation
      transactions: '++id, type, [type+dateTimestamp], dateTimestamp, category, orderId, amount, createdAt, isRecurring, recurringParentId, debtStatus, linkedDebtId, edited, cost_of_goods',
      orders: '++id, status, [status+scheduledTimestamp], scheduledTimestamp, customerName, customerId, phone, orderType, amount, is_paid, paymentTransactionId, createdAt',
      customers: '++id, name, phone, archived, createdAt',
      materials: '++id, name, unit_type, unit_cost, createdAt',
      settings: '++id, &key',
      meta: '++id, &key',
      notifications: '++id, orderId, scheduledTime, sent, createdAt',
      settlements: '++id, debtTransactionId, paymentTransactionId, amount, createdAt',
    })

    // Version 7 - V4 Phase 2: Operations, Security & Control
    // New tables: quick_products (POS), daily_closures (Z-Report)
    // New settings keys: helper_pin, show_quick_pos, closing_time, last_backup_reminder
    this.version(7).stores({
      transactions: '++id, type, [type+dateTimestamp], dateTimestamp, category, orderId, amount, createdAt, isRecurring, recurringParentId, debtStatus, linkedDebtId, edited, cost_of_goods',
      orders: '++id, status, [status+scheduledTimestamp], scheduledTimestamp, customerName, customerId, phone, orderType, amount, is_paid, paymentTransactionId, createdAt',
      customers: '++id, name, phone, archived, createdAt',
      materials: '++id, name, unit_type, unit_cost, createdAt',
      // V4 Phase 2: Quick POS products (id, name, price, linked_components_array)
      quick_products: '++id, name, price, createdAt',
      settings: '++id, &key',
      meta: '++id, &key',
      notifications: '++id, orderId, scheduledTime, sent, createdAt',
      settlements: '++id, debtTransactionId, paymentTransactionId, amount, createdAt',
      // V4 Phase 2: Daily Z-Report closures
      // Fields: date, expected_cash, counted_cash, variance, variance_type ('shortage'|'surplus'|'balanced'), timestamp
      daily_closures: '++id, date, timestamp, createdAt',
    })

    this.open()
  }

  // ========== TRANSACTION HELPERS ==========

  /**
   * Add a new transaction (V2: recurring + debt; V4: cost_of_goods for Two Jars)
   * @param {Object} data - { type, amount, description, category, date, orderId,
   *   isRecurring, frequency, recurringParentId, debtStatus, debtAmountPaid, linkedDebtId, edited,
   *   cost_of_goods (V4: COGS amount for Two Jars split) }
   */
  async addTransaction(data) {
    const now = Date.now()
    const dateObj = data.date ? new Date(data.date) : new Date()
    const transaction = {
      type: data.type, // 'income' | 'expense' | 'withdrawal' | 'opening_balance' | 'debt_given' | 'debt_taken'
      amount: Number(data.amount) || 0,
      description: data.description || '',
      category: data.category || '',
      date: dateObj.toISOString(),
      dateTimestamp: dateObj.getTime(),
      orderId: data.orderId || null,
      createdAt: now,
      updatedAt: now,
      // V2: recurring support
      isRecurring: data.isRecurring || false,
      frequency: data.frequency || null, // 'daily' | 'weekly' | 'monthly'
      recurringParentId: data.recurringParentId || null, // original recurring tx id
      // V2: debt support
      debtStatus: data.debtStatus || null, // 'unpaid' | 'partial' | 'settled' (for debt_given/debt_taken)
      debtAmountPaid: data.debtAmountPaid || 0,
      linkedDebtId: data.linkedDebtId || null, // settlement payment links back to original debt
      // V2: edit tracking
      edited: data.edited || false,
      // V4 Phase 1: Cost of Goods Sold (for Two Jars split)
      // When income has cost_of_goods > 0: COGS → حق المحل, (amount - COGS) → حق التاجر
      // When cost_of_goods is 0/null: 100% → حق المحل (conservative, protect capital)
      cost_of_goods: Number(data.cost_of_goods) || 0,
    }
    const id = await this.transactions.add(transaction)
    return { ...transaction, id }
  }

  /**
   * Update an existing transaction.
   * V2: Automatically marks the transaction as `edited: true` to track changes.
   * Settlement transactions (linkedDebtId set) are excluded from the edit flag.
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
    // Mark as edited (unless this is a settlement status update)
    if (!updates.linkedDebtId && updates.edited === undefined) {
      updateData.edited = true
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

  // ========== V4 Phase 1: TWO JARS FINANCIAL SYSTEM ==========

  /**
   * Calculate the "Two Jars" split: حق المحل (Capital) and حق التاجر (Profit).
   *
   * CRITICAL BUSINESS RULES:
   * - Income with cost_of_goods > 0:
   *   * cost_of_goods → حق المحل (must be preserved to restock)
   *   * (amount - cost_of_goods) → حق التاجر (safe to spend)
   * - Income with cost_of_goods = 0 or null:
   *   * 100% → حق المحل (CONSERVATIVE: protect capital when COGS unknown)
   * - Expense: deducts from حق التاجر (Profit)
   * - Personal Withdrawal: deducts from حق التاجر (Profit)
   * - Opening Balance (Cash): 100% → حق المحل (initial capital)
   * - Debt settlements (income from debt repayment): 100% → حق التاجر (already earned)
   * - Debts (debt_given/debt_taken): NOT counted in either jar (separate tracking)
   *
   * @returns {Object} { capitalJar, profitJar, totalCash }
   */
  async getTwoJars() {
    let capitalJar = 0 // حق المحل - Capital/COGS to preserve
    let profitJar = 0  // حق التاجر - Net profit, safe to spend

    await this.transactions.each((t) => {
      if (t.type === 'income') {
        // Check if this is a debt settlement (linkedDebtId set)
        if (t.linkedDebtId) {
          // Debt repayment = already earned money, goes to profit
          profitJar += t.amount
        } else if (t.cost_of_goods && t.cost_of_goods > 0) {
          // Income with known COGS: split into two jars
          capitalJar += t.cost_of_goods
          profitJar += (t.amount - t.cost_of_goods)
        } else {
          // Income without COGS: conservative — all goes to capital
          capitalJar += t.amount
        }
      } else if (t.type === 'expense') {
        // Expenses deduct from profit (operational costs)
        profitJar -= t.amount
      } else if (t.type === 'withdrawal') {
        // Personal withdrawals deduct from profit
        profitJar -= t.amount
      } else if (t.type === 'opening_balance') {
        // Only cash opening balance (not debt records)
        if (t.category === 'رصيد افتتاحي') {
          capitalJar += t.amount
        }
      }
      // debt_given, debt_taken: NOT counted in jars (tracked separately)
    })

    // Profit jar can go negative if expenses exceed profit
    // Capital jar should never go negative (it's protected)
    const totalCash = capitalJar + profitJar

    return { capitalJar, profitJar, totalCash }
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
   * Add a new order (V3: supports CRM + BOM + payment tracking)
   * @param {Object} data - { customerName, customerId, phone, orderType, scheduledDate,
   *   amount, status, notes, components_used (array of {materialId, name, unit_type, qty, unit_cost, total_cost}) }
   */
  async addOrder(data) {
    const now = Date.now()
    const scheduledObj = data.scheduledDate ? new Date(data.scheduledDate) : new Date()
    const order = {
      customerName: data.customerName || '',
      customerId: data.customerId || null,
      phone: data.phone || '', // V3: CRM phone number
      orderType: data.orderType || '',
      scheduledDate: scheduledObj.toISOString(),
      scheduledTimestamp: scheduledObj.getTime(),
      amount: Number(data.amount) || 0,
      status: data.status || 'in_progress', // 'in_progress' | 'ready' | 'closed'
      notes: data.notes || '',
      // V3: BOM components (analytical/advisory ONLY - does NOT affect finance)
      components_used: data.components_used || [],
      total_cost: data.total_cost || 0, // calculated BOM total (analytical)
      // V3: Payment tracking
      is_paid: data.is_paid || false, // true when order is sold and paid
      paymentTransactionId: data.paymentTransactionId || null, // link to income/debt transaction
      paymentType: data.paymentType || null, // 'cash' | 'credit' | null
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

  // ========== V2: RECURRING TRANSACTIONS ==========

  /**
   * Get all active recurring templates (transactions where isRecurring=true).
   * These are the "parent" records that spawn child transactions on schedule.
   */
  async getRecurringTemplates() {
    return await this.transactions
      .where('isRecurring').equals(1) // Dexie stores boolean true as 1
      .toArray()
      .then(arr => arr.filter(t => t.isRecurring))
  }

  /**
   * Check for due recurring templates and auto-generate child transactions.
   * Called on app launch. Returns the number of transactions generated.
   *
   * Strategy: For each recurring template, check if there's a child transaction
   * for the current period. If not, create one.
   */
  async processDueRecurringTransactions() {
    const templates = await this.getRecurringTemplates()
    let generated = 0

    for (const tmpl of templates) {
      // Find the most recent child of this template
      const children = await this.transactions
        .where('recurringParentId').equals(tmpl.id)
        .toArray()
      const lastChild = children.sort((a, b) => b.dateTimestamp - a.dateTimestamp)[0]

      // Determine the next due date
      let nextDate
      if (lastChild) {
        nextDate = this._advanceDate(new Date(lastChild.dateTimestamp), tmpl.frequency)
      } else {
        // No children yet — first occurrence is based on template date
        nextDate = new Date(tmpl.dateTimestamp)
        // If template date is in the past, advance to current period
        const now = new Date()
        while (nextDate < now) {
          nextDate = this._advanceDate(nextDate, tmpl.frequency)
        }
      }

      // Generate transactions for all missed periods (up to current date)
      const now = new Date()
      while (nextDate <= now) {
        await this.addTransaction({
          type: tmpl.type,
          amount: tmpl.amount,
          description: tmpl.description,
          category: tmpl.category,
          date: nextDate,
          recurringParentId: tmpl.id,
          // Child is NOT a template itself
          isRecurring: false,
          frequency: null,
        })
        generated++
        nextDate = this._advanceDate(nextDate, tmpl.frequency)
      }
    }

    return generated
  }

  /**
   * Advance a date by the given frequency.
   * @param {Date} date - starting date
   * @param {string} frequency - 'daily' | 'weekly' | 'monthly'
   * @returns {Date} - the next occurrence date
   */
  _advanceDate(date, frequency) {
    const d = new Date(date)
    switch (frequency) {
      case 'daily':
        d.setDate(d.getDate() + 1)
        break
      case 'weekly':
        d.setDate(d.getDate() + 7)
        break
      case 'monthly':
        d.setMonth(d.getMonth() + 1)
        break
      default:
        d.setMonth(d.getMonth() + 1) // default to monthly
    }
    return d
  }

  // ========== V2: DEBT TRACKING ==========

  /**
   * Get all active receivables (money owed TO the user).
   * These are 'debt_given' transactions that are not fully settled.
   */
  async getReceivables() {
    return await this.transactions
      .where('type').equals('debt_given')
      .and(t => t.debtStatus !== 'settled')
      .toArray()
  }

  /**
   * Get all active payables (money the user owes).
   * These are 'debt_taken' transactions that are not fully settled.
   */
  async getPayables() {
    return await this.transactions
      .where('type').equals('debt_taken')
      .and(t => t.debtStatus !== 'settled')
      .toArray()
  }

  /**
   * Get total receivable amount (outstanding balance).
   */
  async getReceivableTotal() {
    const receivables = await this.getReceivables()
    return receivables.reduce((sum, d) => sum + (d.amount - (d.debtAmountPaid || 0)), 0)
  }

  /**
   * Get total payable amount (outstanding balance).
   */
  async getPayableTotal() {
    const payables = await this.getPayables()
    return payables.reduce((sum, d) => sum + (d.amount - (d.debtAmountPaid || 0)), 0)
  }

  /**
   * Settle (partially or fully) a debt.
   * Creates a balancing income/expense transaction AND updates the debt's paid amount.
   *
   * @param {number} debtTransactionId - the original debt_given/debt_taken transaction ID
   * @param {number} paymentAmount - how much is being paid now
   * @returns {Object} - { paymentTransaction, updatedDebt, isFullySettled }
   */
  async settleDebt(debtTransactionId, paymentAmount) {
    const debt = await this.transactions.get(debtTransactionId)
    if (!debt) throw new Error('Debt transaction not found')
    if (debt.type !== 'debt_given' && debt.type !== 'debt_taken') {
      throw new Error('Transaction is not a debt')
    }

    const newPaidAmount = (debt.debtAmountPaid || 0) + Number(paymentAmount)
    const isFullySettled = newPaidAmount >= debt.amount

    // Create a balancing transaction:
    // - If debt_given (receivable): settlement is income (customer pays us)
    // - If debt_taken (payable): settlement is expense (we pay supplier)
    const paymentTransaction = await this.addTransaction({
      type: debt.type === 'debt_given' ? 'income' : 'expense',
      amount: Number(paymentAmount),
      description: `تسديد دين: ${debt.description || ''}`,
      category: 'تسديد دين',
      date: new Date(),
      linkedDebtId: debt.id,
    })

    // Record the settlement link
    await this.settlements.add({
      debtTransactionId: debt.id,
      paymentTransactionId: paymentTransaction.id,
      amount: Number(paymentAmount),
      createdAt: Date.now(),
    })

    // Update the debt's paid amount and status
    const updateData = {
      debtAmountPaid: newPaidAmount,
      debtStatus: isFullySettled ? 'settled' : 'partial',
      updatedAt: Date.now(),
    }
    await this.transactions.update(debt.id, updateData)

    return {
      paymentTransaction,
      updatedDebt: { ...debt, ...updateData },
      isFullySettled,
    }
  }

  /**
   * Get all settlements for a specific debt (payment history).
   */
  async getDebtSettlements(debtTransactionId) {
    const settlements = await this.settlements
      .where('debtTransactionId').equals(debtTransactionId)
      .toArray()
    // Sort by most recent first
    settlements.sort((a, b) => b.createdAt - a.createdAt)
    return settlements
  }

  // ========== V2: THEME & BRANDING ==========

  /**
   * Get the current theme color (hex string). Default: Samsung Blue.
   */
  async getThemeColor() {
    return await this.getSetting('theme_color', '#1F6FE8')
  }

  /**
   * Set the theme color.
   */
  async setThemeColor(hex) {
    await this.setSetting('theme_color', hex)
  }

  /**
   * Get the uploaded logo (base64 string). Returns null if no logo.
   */
  async getLogo() {
    return await this.getSetting('logo_base64', null)
  }

  /**
   * Set the logo (base64 string).
   */
  async setLogo(base64) {
    await this.setSetting('logo_base64', base64)
  }

  /**
   * Get the business name. Returns null if not set.
   */
  async getBusinessName() {
    return await this.getSetting('business_name', null)
  }

  /**
   * Set the business name.
   */
  async setBusinessName(name) {
    await this.setSetting('business_name', name)
  }

  // ========== V3: MATERIALS (BOM - Analytical Only) ==========

  /**
   * Add a new material (for BOM costing).
   * @param {Object} data - { name, unit_type, unit_cost }
   * unit_type: 'piece' | 'gram' | 'ml' | 'meter' | 'liter' | 'kg'
   */
  async addMaterial(data) {
    const now = Date.now()
    const material = {
      name: data.name || '',
      unit_type: data.unit_type || 'piece',
      unit_cost: Number(data.unit_cost) || 0,
      createdAt: now,
      updatedAt: now,
    }
    const id = await this.materials.add(material)
    return { ...material, id }
  }

  /**
   * Update a material.
   */
  async updateMaterial(id, updates) {
    const updateData = { ...updates, updatedAt: Date.now() }
    if (updates.unit_cost !== undefined) {
      updateData.unit_cost = Number(updates.unit_cost) || 0
    }
    await this.materials.update(id, updateData)
  }

  /**
   * Delete a material.
   */
  async deleteMaterial(id) {
    await this.materials.delete(id)
  }

  /**
   * Get all materials.
   */
  async getMaterials() {
    const items = await this.materials.toArray()
    items.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    return items
  }

  /**
   * Calculate the total BOM cost for a set of components.
   * PURELY ANALYTICAL — does NOT create transactions or affect cash flow.
   * @param {Array} components - [{ materialId, name, unit_type, qty, unit_cost }]
   * @returns {number} total cost
   */
  calculateBOMCost(components) {
    if (!components || !Array.isArray(components)) return 0
    return components.reduce((sum, c) => {
      return sum + (Number(c.qty) || 0) * (Number(c.unit_cost) || 0)
    }, 0)
  }

  // ========== V3: CUSTOMERS (CRM) ==========

  /**
   * Add a new customer (or find existing by phone).
   */
  async addCustomer(data) {
    const now = Date.now()
    // Check if customer with this phone already exists
    if (data.phone) {
      const existing = await this.customers
        .where('phone').equals(data.phone)
        .and(c => !c.archived)
        .first()
      if (existing) return existing
    }
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

  /**
   * Get all active (non-archived) customers.
   */
  async getAllCustomers(search = '') {
    let items = await this.customers.toArray()
    items = items.filter(c => !c.archived)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      )
    }
    items.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    return items
  }

  /**
   * Get orders for a specific customer.
   */
  async getOrdersByCustomer(customerName) {
    return await this.orders
      .where('customerName').equals(customerName)
      .toArray()
  }

  // ========== V3: ORDER COMPLETION & PAYMENT ==========

  /**
   * Complete & Sell an order with 3 scenarios:
   * - 'cash': Creates an income transaction, marks order as paid
   * - 'credit': Creates a debt_given transaction, marks order as unpaid (credit sale)
   * - 'done': Just marks status as closed, NO financial transaction
   *
   * CRITICAL BUSINESS RULE: BOM cost is NEVER deducted from finance.
   * Only the sale amount (order.amount) is recorded as income or debt.
   *
   * @param {number} orderId - the order to complete
   * @param {string} paymentType - 'cash' | 'credit' | 'done'
   * @returns {Object} - { transaction, updatedOrder }
   */
  async completeOrder(orderId, paymentType) {
    const order = await this.orders.get(orderId)
    if (!order) throw new Error('Order not found')

    let transaction = null
    const updates = {
      status: 'closed',
      updatedAt: Date.now(),
    }

    if (paymentType === 'cash') {
      // Create income transaction for the sale amount
      // V4: Include cost_of_goods (BOM) so the Two Jars split works correctly
      transaction = await this.addTransaction({
        type: 'income',
        amount: order.amount,
        description: `بيع: ${order.customerName || 'زبون'} - ${order.orderType || 'طلب'}`,
        category: 'مبيعات',
        date: new Date(),
        orderId: order.id,
        cost_of_goods: order.total_cost || 0, // V4: BOM cost → capital jar
      })
      updates.is_paid = true
      updates.paymentTransactionId = transaction.id
      updates.paymentType = 'cash'
    } else if (paymentType === 'credit') {
      // Create debt_given transaction (customer owes us)
      transaction = await this.addTransaction({
        type: 'debt_given',
        amount: order.amount,
        description: `بيع بالأجل: ${order.customerName || 'زبون'} - ${order.orderType || 'طلب'}`,
        category: 'دين مستحقة لي',
        date: new Date(),
        orderId: order.id,
        debtStatus: 'unpaid',
        debtAmountPaid: 0,
      })
      updates.is_paid = false
      updates.paymentTransactionId = transaction.id
      updates.paymentType = 'credit'
    } else if (paymentType === 'done') {
      // Just mark as done, NO financial impact
      updates.is_paid = false
      updates.paymentType = 'done'
    }

    await this.orders.update(order.id, updates)
    return {
      transaction,
      updatedOrder: { ...order, ...updates },
    }
  }

  // ========== V3: REPORTING & ANALYTICS ==========

  /**
   * Get comprehensive report for a date range.
   *
   * CRITICAL: Distinguishes between:
   * - Real Cash Profit: income - expense (actual money received and spent)
   * - Theoretical Profit: order revenue - BOM cost (what profit SHOULD be based on materials)
   *
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Object} report data
   */
  async getReport(startDate, endDate) {
    const startTs = new Date(startDate).getTime()
    const endTs = new Date(endDate).getTime()

    // Get all transactions in range
    const transactions = await this.transactions
      .where('dateTimestamp')
      .between(startTs, endTs, true, true)
      .toArray()

    // Real cash flow (from actual transactions)
    let cashReceived = 0 // income
    let cashSpent = 0 // expense
    let withdrawal = 0 // personal
    for (const t of transactions) {
      if (t.type === 'income') cashReceived += t.amount
      else if (t.type === 'expense') cashSpent += t.amount
      else if (t.type === 'withdrawal') withdrawal += t.amount
    }

    // Get all orders completed in this range
    const orders = await this.orders
      .where('scheduledTimestamp')
      .between(startTs, endTs, true, true)
      .toArray()

    // Theoretical profit from BOM (analytical)
    let theoreticalRevenue = 0
    let theoreticalCost = 0
    let completedOrders = 0
    for (const o of orders) {
      if (o.status === 'closed') {
        completedOrders++
        theoreticalRevenue += o.amount || 0
        theoreticalCost += o.total_cost || 0
      }
    }

    const realCashProfit = cashReceived - cashSpent
    const theoreticalProfit = theoreticalRevenue - theoreticalCost

    return {
      period: { start: new Date(startDate), end: new Date(endDate) },
      // Real cash flow
      cashReceived,
      cashSpent,
      withdrawal,
      netCash: cashReceived - cashSpent - withdrawal,
      realCashProfit,
      // Theoretical (BOM-based)
      theoreticalRevenue,
      theoreticalCost,
      theoreticalProfit,
      // Order stats
      totalOrders: orders.length,
      completedOrders,
      // Variance: difference between theoretical and real
      // Positive = collected less than theoretical (credit sales outstanding)
      // Negative = collected more than theoretical (prepayments)
      variance: realCashProfit - theoreticalProfit,
    }
  }

  // ========== V4 PHASE 2: QUICK POS ==========

  /**
   * Add a quick POS product.
   * @param {Object} data - { name, price, linked_components (array of materialId) }
   */
  async addQuickProduct(data) {
    const now = Date.now()
    const product = {
      name: data.name || '',
      price: Number(data.price) || 0,
      // Optional: linked BOM components for COGS calculation on sale
      linked_components: data.linked_components || [],
      createdAt: now,
      updatedAt: now,
    }
    const id = await this.quick_products.add(product)
    return { ...product, id }
  }

  /**
   * Update a quick product.
   */
  async updateQuickProduct(id, updates) {
    const updateData = { ...updates, updatedAt: Date.now() }
    if (updates.price !== undefined) {
      updateData.price = Number(updates.price) || 0
    }
    await this.quick_products.update(id, updateData)
  }

  /**
   * Delete a quick product.
   */
  async deleteQuickProduct(id) {
    await this.quick_products.delete(id)
  }

  /**
   * Get all quick products.
   */
  async getQuickProducts() {
    const items = await this.quick_products.toArray()
    items.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    return items
  }

  /**
   * Quick POS Sale: Complete a sale with multiple products in one tap.
   * Creates an income transaction with COGS from linked BOM components.
   *
   * @param {Array} cart - [{ product, qty }]
   * @param {string} paymentType - 'cash' | 'credit'
   * @returns {Object} - { transaction, totalAmount, totalCOGS }
   *
   * CRITICAL: BOM cost (COGS) is calculated from linked_components but
   * ONLY the sale amount is recorded as income. COGS goes to capital jar
   * via the Two Jars system, NOT as a separate expense.
   */
  async quickSale(cart, paymentType = 'cash') {
    let totalAmount = 0
    let totalCOGS = 0
    const itemsSummary = []

    for (const item of cart) {
      const lineTotal = (item.product.price || 0) * (item.qty || 1)
      totalAmount += lineTotal

      // Calculate COGS from linked components (if any)
      let lineCOGS = 0
      if (item.product.linked_components && item.product.linked_components.length > 0) {
        for (const comp of item.product.linked_components) {
          // comp = { materialId, qty }
          if (comp.materialId) {
            const material = await this.materials.get(comp.materialId)
            if (material) {
              lineCOGS += (material.unit_cost || 0) * (comp.qty || 0) * (item.qty || 1)
            }
          }
        }
      }
      totalCOGS += lineCOGS
      itemsSummary.push(`${item.product.name} ×${item.qty}`)
    }

    if (paymentType === 'cash') {
      // Cash sale: income with COGS for Two Jars split
      const transaction = await this.addTransaction({
        type: 'income',
        amount: totalAmount,
        description: `بيع سريع: ${itemsSummary.join('، ')}`,
        category: 'مبيعات سريعة',
        date: new Date(),
        cost_of_goods: totalCOGS, // V4: enables Two Jars split
      })
      return { transaction, totalAmount, totalCOGS, paymentType: 'cash' }
    } else {
      // Credit sale: debt_given (customer owes us)
      const transaction = await this.addTransaction({
        type: 'debt_given',
        amount: totalAmount,
        description: `بيع سريع بالأجل: ${itemsSummary.join('، ')}`,
        category: 'دين مستحقة لي',
        date: new Date(),
        debtStatus: 'unpaid',
        debtAmountPaid: 0,
      })
      return { transaction, totalAmount, totalCOGS, paymentType: 'credit' }
    }
  }

  // ========== V4 PHASE 2: DAILY Z-REPORT ==========

  /**
   * Get today's expected cash (from app records).
   * = Opening cash + income - expenses - withdrawals
   * This is what SHOULD be in the cash box.
   */
  async getExpectedCash() {
    return await this.getCashBalance()
  }

  /**
   * Save a daily Z-Report closure.
   * @param {Object} data - { expected_cash, counted_cash }
   * @returns {Object} - the saved closure record
   */
  async saveDailyClosure(data) {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const expected = Number(data.expected_cash) || 0
    const counted = Number(data.counted_cash) || 0
    const variance = counted - expected

    const closure = {
      date: today,
      expected_cash: expected,
      counted_cash: counted,
      variance: variance,
      variance_type: variance > 0 ? 'surplus' : variance < 0 ? 'shortage' : 'balanced',
      timestamp: now.getTime(),
      createdAt: Date.now(),
    }

    const id = await this.daily_closures.add(closure)
    return { ...closure, id }
  }

  /**
   * Check if today's closure already exists.
   */
  async hasTodayClosure() {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const existing = await this.daily_closures.where('date').equals(today).first()
    return !!existing
  }

  /**
   * Get the closing time setting (default: 20:00 / 8:00 PM).
   */
  async getClosingTime() {
    return await this.getSetting('closing_time', '20:00')
  }

  /**
   * Check if it's time to show the Z-Report reminder.
   * Returns true if current time >= closing time AND no closure exists today.
   */
  async shouldShowZReportReminder() {
    const closingTime = await this.getClosingTime()
    const now = new Date()
    const [closeHour, closeMin] = closingTime.split(':').map(Number)
    const closingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), closeHour, closeMin, 0, 0)

    if (now < closingDate) return false // Not yet closing time

    const alreadyClosed = await this.hasTodayClosure()
    return !alreadyClosed
  }

  // ========== V4 PHASE 2: AUTO-BACKUP & WEEKLY REMINDER ==========

  /**
   * Check if weekly backup reminder should be shown.
   * Returns true if 7+ days since last reminder.
   */
  async shouldShowBackupReminder() {
    const lastReminder = await this.getMeta('last_backup_reminder', null)
    if (!lastReminder) return true
    const elapsed = Date.now() - lastReminder
    return elapsed >= 7 * 24 * 60 * 60 * 1000 // 7 days
  }

  /**
   * Mark that the backup reminder was shown (prevent re-showing for 7 days).
   */
  async markBackupReminderShown() {
    await this.setMeta('last_backup_reminder', Date.now())
  }

  // ========== V4 PHASE 2: HELPER MODE (SECURITY) ==========

  /**
   * Get the helper mode PIN (4-digit string). Returns null if not set.
   */
  async getHelperPin() {
    return await this.getSetting('helper_pin', null)
  }

  /**
   * Set the helper mode PIN.
   */
  async setHelperPin(pin) {
    await this.setSetting('helper_pin', pin)
  }

  /**
   * Check if helper mode is enabled (PIN is set).
   */
  async isHelperModeEnabled() {
    const pin = await this.getHelperPin()
    return !!pin
  }

  /**
   * Get the "show_quick_pos" setting (default: true).
   */
  async getShowQuickPos() {
    return await this.getSetting('show_quick_pos', true)
  }

  /**
   * Set the "show_quick_pos" setting.
   */
  async setShowQuickPos(show) {
    await this.setSetting('show_quick_pos', show)
  }
}

export const db = new AccountingDatabase()
