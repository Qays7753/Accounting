import { useState, useEffect, useCallback } from 'react'
import { db } from '../db'
import { formatAmount } from '../utils/format.js'
import EmptyState from '../components/ui/EmptyState.jsx'
import Icon from '../components/ui/Icon.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import AmountInput from '../components/ui/AmountInput.jsx'
import { hapticLight, hapticSuccess, hapticMedium, hapticError } from '../utils/haptics.js'
import { useTerms } from '../context/TermsContext.jsx'

/**
 * Quick POS Page (V4 Phase 2)
 *
 * Fast checkout for rush hours. User taps products to add to cart,
 * then completes the sale with Cash or Debt in 2 taps.
 *
 * Links to finance:
 * - Cash sale: creates income transaction with COGS (Two Jars split)
 * - Credit sale: creates debt_given transaction (customer owes)
 * - COGS calculated from linked BOM components, goes to capital jar
 */
export default function QuickPosPage() {
  const t = useTerms()
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([]) // [{ product, qty }]
  const [loading, setLoading] = useState(true)
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false)
  const [productManageOpen, setProductManageOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [saleResult, setSaleResult] = useState(null)

  const loadProducts = useCallback(async () => {
    try {
      const items = await db.getQuickProducts()
      setProducts(items)
    } catch (e) {
      console.error('Failed to load products:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price || 0) * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  const handleAddToCart = (product) => {
    hapticLight()
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      }
      return [...prev, { product, qty: 1 }]
    })
  }

  const handleRemoveFromCart = (productId) => {
    hapticLight()
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId)
      if (existing && existing.qty > 1) {
        return prev.map(item =>
          item.product.id === productId
            ? { ...item, qty: item.qty - 1 }
            : item
        )
      }
      return prev.filter(item => item.product.id !== productId)
    })
  }

  const handleClearCart = () => {
    hapticMedium()
    setCart([])
  }

  const handleCompleteSale = () => {
    if (cart.length === 0) return
    hapticMedium()
    setPaymentSheetOpen(true)
  }

  const handlePayment = async (paymentType) => {
    hapticSuccess()
    try {
      const result = await db.quickSale(cart, paymentType)
      setSaleResult(result)
      setPaymentSheetOpen(false)
      setCart([]) // Clear cart after sale
    } catch (e) {
      console.error('Quick sale failed:', e)
      hapticError()
    }
  }

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct?.id) {
        await db.updateQuickProduct(editingProduct.id, productData)
      } else {
        await db.addQuickProduct(productData)
      }
      loadProducts()
      setProductManageOpen(false)
      setEditingProduct(null)
      hapticSuccess()
    } catch (e) {
      console.error('Save product failed:', e)
      hapticError()
    }
  }

  const handleDeleteProduct = async (id) => {
    hapticMedium()
    await db.deleteQuickProduct(id)
    loadProducts()
  }

  return (
    <div className="min-h-screen pb-40">
      {/* Header */}
      <header className="px-4 pt-8 pb-3 safe-area-top sticky top-0 bg-background z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.pos_title}</h1>
          <button
            type="button"
            onClick={() => { hapticLight(); setEditingProduct(null); setProductManageOpen(true) }}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-fab active:scale-95 transition-transform"
            aria-label={t.pos_add_product}
          >
            <Icon name="plus" className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Products Grid */}
      <div className="px-4 mb-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 shadow-card">
                <div className="h-16 bg-divider rounded-xl animate-pulse mb-2" />
                <div className="h-4 w-2/3 bg-divider rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon="tag"
            title={t.empty_no_products}
            description={t.show_quick_pos_desc}
            actionLabel={t.pos_add_product}
            onAction={() => { setEditingProduct(null); setProductManageOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(product => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleAddToCart(product)}
                onDoubleClick={() => handleDeleteProduct(product.id)}
                className="bg-surface rounded-2xl p-4 shadow-card active:scale-95 transition-transform text-right"
              >
                <div className="w-full h-16 rounded-xl bg-primary-50 flex items-center justify-center mb-2">
                  <Icon name="tag" className="w-8 h-8 text-primary-600" strokeWidth={1.8} />
                </div>
                <p className="font-bold text-text-primary text-sm truncate">{product.name}</p>
                <p className="text-lg font-bold text-primary-600 tabular-nums mt-1">
                  {formatAmount(product.price)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mini Cart (Fixed at bottom) */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 max-w-lg mx-auto px-4 z-30">
          <div className="bg-surface rounded-2xl shadow-xl p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-600 tabular-nums">{cartCount}</span>
                </div>
                <p className="font-bold text-text-primary text-sm">{t.pos_cart}</p>
              </div>
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-expense-600 font-semibold active:scale-95"
              >
                {t.pos_clear}
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto hide-scrollbar">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.product.id)}
                      className="w-6 h-6 rounded-full bg-expense-50 flex items-center justify-center active:scale-95 flex-shrink-0"
                    >
                      <span className="text-expense-600 text-xs font-bold">−</span>
                    </button>
                    <span className="text-text-primary truncate">{item.product.name}</span>
                    <span className="text-text-tertiary text-xs">×{item.qty}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-text-primary flex-shrink-0">
                    {formatAmount(item.product.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total + Complete */}
            <div className="flex items-center justify-between pt-2 border-t border-divider">
              <div>
                <p className="text-xs text-text-tertiary">{t.pos_total}</p>
                <p className="text-xl font-bold text-primary-600 tabular-nums">{formatAmount(cartTotal)}</p>
              </div>
              <button
                type="button"
                onClick={handleCompleteSale}
                className="bg-income-500 text-white font-bold rounded-2xl px-6 py-3 active:scale-95 transition-transform flex items-center gap-2"
              >
                <Icon name="checkCircle" className="w-5 h-5" />
                {t.pos_complete_sale}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Sheet */}
      <BottomSheet open={paymentSheetOpen} onClose={() => setPaymentSheetOpen(false)} title={t.pos_complete_sale}>
        <div className="space-y-4 pb-4">
          <div className="bg-background rounded-2xl p-4 text-center">
            <p className="text-sm text-text-secondary mb-1">{t.pos_total}</p>
            <p className="text-3xl font-bold tabular-nums text-text-primary">{formatAmount(cartTotal)}</p>
          </div>
          <p className="text-sm text-text-secondary text-center">{t.pos_payment_method}</p>
          <button
            type="button"
            onClick={() => handlePayment('cash')}
            className="w-full bg-income-500 text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Icon name="wallet" className="w-5 h-5" />
            {t.pos_cash}
          </button>
          <button
            type="button"
            onClick={() => handlePayment('credit')}
            className="w-full bg-withdrawal-500 text-white font-bold rounded-2xl py-4 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Icon name="userMinus" className="w-5 h-5" />
            {t.pos_credit}
          </button>
        </div>
      </BottomSheet>

      {/* Sale Result Sheet */}
      <BottomSheet open={!!saleResult} onClose={() => setSaleResult(null)} title={t.pos_sale_success}>
        <div className="space-y-4 pb-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-income-50 flex items-center justify-center">
              <Icon name="checkCircle" className="w-8 h-8 text-income-600" strokeWidth={2} />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-bold text-text-primary">{t.pos_sale_recorded}</p>
            <p className="text-2xl font-bold tabular-nums text-primary-600">{formatAmount(saleResult?.totalAmount || 0)}</p>
            <p className="text-sm text-text-secondary">
              {saleResult?.paymentType === 'cash' ? t.pos_cash : t.pos_credit}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSaleResult(null)}
            className="w-full btn-primary"
          >
            {t.save}
          </button>
        </div>
      </BottomSheet>

      {/* Product Management Sheet */}
      <ProductManageSheet
        open={productManageOpen}
        editData={editingProduct}
        onClose={() => { setProductManageOpen(false); setEditingProduct(null) }}
        onSave={handleSaveProduct}
      />
    </div>
  )
}

/**
 * Product Management Sheet - add/edit quick products
 */
function ProductManageSheet({ open, editData, onClose, onSave }) {
  const t = useTerms()
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  // V4 Phase 3: Cost price for profit hint
  const [costPrice, setCostPrice] = useState(0)

  useEffect(() => {
    if (open) {
      if (editData) {
        setName(editData.name || '')
        setPrice(editData.price || 0)
        setCostPrice(0) // Reset cost price on edit
      } else {
        setName('')
        setPrice(0)
        setCostPrice(0)
      }
    }
  }, [open, editData])

  const handleSave = () => {
    if (!name.trim() || !price) return
    onSave({ name: name.trim(), price: Number(price) })
  }

  // V4 Phase 3: Profit hint calculation
  const profit = Number(price) - Number(costPrice)
  const showHint = Number(costPrice) > 0 && Number(price) > 0

  return (
    <BottomSheet open={open} onClose={onClose} title={editData ? t.pos_edit_product : t.pos_add_product}>
      <div className="space-y-5 pb-4">
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">{t.pos_product_name}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.pos_product_name}
            className="input-field"
            dir="rtl"
          />
        </div>
        <AmountInput value={price} onChange={setPrice} label={t.pos_selling_price} autoFocus />
        {/* V4 Phase 3: Cost Price for profit hint */}
        <AmountInput value={costPrice} onChange={setCostPrice} label={t.pos_cost_price} />
        {/* V4 Phase 3: Profit Hint */}
        {showHint && (
          profit >= 0 ? (
            <div className="bg-income-50 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-income-700">
                {t.profit_hint} {profit.toLocaleString('en-US')} {t.per_piece}
              </p>
            </div>
          ) : (
            <div className="bg-expense-50 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-expense-700">
                {t.loss_warning}
              </p>
              <p className="text-xs text-expense-600 mt-0.5">
                {t.loss_amount} {Math.abs(profit).toLocaleString('en-US')} {t.per_piece}
              </p>
            </div>
          )
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || !price}
          className="w-full btn-primary disabled:opacity-50"
        >
          {t.save}
        </button>
      </div>
    </BottomSheet>
  )
}
