import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import { formatAmount } from '../utils/format.js'
import { formatArabicDate } from '../utils/date.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import AmountInput from '../components/ui/AmountInput.jsx'
import { hapticLight, hapticSuccess, hapticMedium, hapticError } from '../utils/haptics.js'
import { useTerms } from '../context/TermsContext.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import { useSubmitGuard } from '../hooks/useSubmitGuard.js'

/**
 * Inventory Page (V9) — Smart inventory with predictive + exact tracking.
 *
 * Exact items: show current count, deduct on sale.
 * Predictive items: show "عادتك تطلبه كل X يوم" + order now button.
 */
export default function InventoryPage() {
  const t = useTerms()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [purchaseSheetItem, setPurchaseSheetItem] = useState(null)
  const [newItem, setNewItem] = useState({ name: '', qty: 0, unit_cost: 0 })

  const loadItems = useCallback(async () => {
    try {
      const data = await db.getItems()
      // Sort: low-stock first, then by name
      data.sort((a, b) => {
        const aLow = isLowStock(a)
        const bLow = isLowStock(b)
        if (aLow && !bLow) return -1
        if (!aLow && bLow) return 1
        return (a.name || '').localeCompare(b.name || '')
      })
      setItems(data)
    } catch (e) {
      console.error('Failed to load items:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  function isLowStock(item) {
    if (item.tracking_mode === 'exact') return (item.current_stock || 0) <= 2
    if (!item.reorder_day || item.purchase_history?.length === 0) return false
    const lastPurchase = new Date(item.purchase_history[item.purchase_history.length - 1].date)
    const daysSince = (Date.now() - lastPurchase.getTime()) / (24 * 60 * 60 * 1000)
    return daysSince >= item.reorder_day
  }

  const [addItemSaving, guardAddItem] = useSubmitGuard()
  const handleAddItem = guardAddItem(async () => {
    if (!newItem.name.trim()) { hapticError(); return }
    hapticSuccess()
    await db.addItem({
      name: newItem.name.trim(),
      qty: Number(newItem.qty) || 0,
      unit_cost: Number(newItem.unit_cost) || 0,
    })
    setNewItem({ name: '', qty: 0, unit_cost: 0 })
    setAddSheetOpen(false)
    loadItems()
  })

  const [purchaseSaving, guardPurchase] = useSubmitGuard()
  const handleRecordPurchase = guardPurchase(async () => {
    if (!purchaseSheetItem || !newItem.qty || newItem.qty <= 0) { hapticError(); return }
    hapticSuccess()
    await db.recordPurchase(purchaseSheetItem.id, {
      qty: Number(newItem.qty),
      unit_cost: Number(newItem.unit_cost) || 0,
    })
    setPurchaseSheetItem(null)
    setNewItem({ name: '', qty: 0, unit_cost: 0 })
    loadItems()
  })

  const handleDeleteItem = async (id) => {
    hapticMedium()
    await db.deleteItem(id)
    loadItems()
  }

  const openPurchaseSheet = (item) => {
    hapticLight()
    setPurchaseSheetItem(item)
    setNewItem({ name: '', qty: 0, unit_cost: 0 })
  }

  return (
    <div className="min-h-screen pb-32">
      <PageHeader
        title="المخزون"
        actions={[{ icon: 'plus', onClick: () => { hapticLight(); setAddSheetOpen(true) }, label: 'إضافة صنف' }]}
      />

      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-card p-4 shadow-card">
                <div className="h-5 w-1/3 bg-divider rounded animate-pulse mb-2" />
                <div className="h-4 w-1/4 bg-mute rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="tag"
            title="لا يوجد مخزون بعد"
            description="أضف أصنافك لتتبّعها ذكياً — بعضها بالعدد، وبعضها بالعادة"
            actionLabel="إضافة صنف"
            onAction={() => setAddSheetOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const lowStock = isLowStock(item)
              const lastPurchase = item.purchase_history?.[item.purchase_history.length - 1]
              const daysSince = lastPurchase
                ? Math.floor((Date.now() - new Date(lastPurchase.date).getTime()) / (24 * 60 * 60 * 1000))
                : null

              return (
                <div
                  key={item.id}
                  className={`bg-surface rounded-card p-4 shadow-card ${lowStock ? 'border-r-4 border-expense-500' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-ink text-sm truncate">{item.name}</p>
                        {item.tracking_mode === 'exact' ? (
                          <span className="text-caption font-semibold px-2 py-0.5 rounded-pill bg-primary-50 text-primary-600 flex-shrink-0">بالعدد</span>
                        ) : (
                          <span className="text-caption font-semibold px-2 py-0.5 rounded-pill bg-accent-50 text-accent-600 flex-shrink-0">بالعادة</span>
                        )}
                      </div>
                      {item.tracking_mode === 'exact' ? (
                        <p className="text-sm text-ink-secondary mt-1">
                          المتوفر: <span className="num font-bold text-ink">{item.current_stock || 0}</span> {item.unit}
                        </p>
                      ) : item.reorder_day ? (
                        <p className="text-sm text-ink-secondary mt-1">
                          عادتك تطلبه كل <span className="num font-bold text-ink">{item.reorder_day}</span> يوم
                          {daysSince !== null && (
                            <span className={lowStock ? ' text-expense-600 font-semibold' : ''}>
                              {' '}(مرّ {daysSince} يوم)
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-sm text-ink-secondary mt-1">سجّل شراءين لنحسب لك موعد الطلب</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-divider">
                    <button
                      type="button"
                      onClick={() => openPurchaseSheet(item)}
                      className="flex-1 bg-primary text-white text-caption font-semibold py-2.5 rounded-12 active:scale-95 transition-transform"
                      style={{ minHeight: '40px' }}
                    >
                      {item.tracking_mode === 'predictive' && lowStock ? 'اطلب الآن' : 'تسجيل شراء'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="w-10 h-10 rounded-12 bg-expense-50 grid place-items-center active:scale-95 transition-transform flex-shrink-0"
                      aria-label="حذف"
                    >
                      <Icon name="trash" className="w-4 h-4 text-expense-600" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Item Sheet */}
      <BottomSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} title="إضافة صنف جديد">
        <div className="space-y-5 pb-4">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">اسم الصنف</label>
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              placeholder="مثال: علبة تونة، كوب شاي..."
              className="input-field"
              dir="rtl"
              autoFocus
            />
          </div>
          <AmountInput
            value={newItem.qty}
            onChange={(v) => setNewItem(prev => ({ ...prev, qty: v }))}
            label="الكمية المشتراة"
          />
          <AmountInput
            value={newItem.unit_cost}
            onChange={(v) => setNewItem(prev => ({ ...prev, unit_cost: v }))}
            label="تكلفة الوحدة"
          />
          <p className="text-caption text-text-tertiary">
            سيتم تصنيف الصنف تلقائياً: إذا كانت الكمية ≤ ٥ والتكلفة > ١٥ د.أ، سيُتتبَّع بالعدد. وإلا، بالعادة.
          </p>
          <button
            type="button"
            onClick={handleAddItem}
            disabled={addItemSaving || !newItem.name.trim()}
            className="w-full btn-primary disabled:opacity-50"
          >
            {addItemSaving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : 'إضافة'}
          </button>
        </div>
      </BottomSheet>

      {/* Record Purchase Sheet */}
      <BottomSheet
        open={!!purchaseSheetItem}
        onClose={() => setPurchaseSheetItem(null)}
        title={`تسجيل شراء: ${purchaseSheetItem?.name || ''}`}
      >
        <div className="space-y-5 pb-4">
          <AmountInput
            value={newItem.qty}
            onChange={(v) => setNewItem(prev => ({ ...prev, qty: v }))}
            label="الكمية"
            autoFocus
          />
          <AmountInput
            value={newItem.unit_cost}
            onChange={(v) => setNewItem(prev => ({ ...prev, unit_cost: v }))}
            label="تكلفة الوحدة"
          />
          <button
            type="button"
            onClick={handleRecordPurchase}
            disabled={purchaseSaving || !newItem.qty}
            className="w-full btn-primary disabled:opacity-50"
          >
            {purchaseSaving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : 'تسجيل'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
