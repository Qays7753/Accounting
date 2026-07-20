import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import AmountInput from '../ui/AmountInput.jsx'
import Icon from '../ui/Icon.jsx'
import { db } from '../../db'
import { useTerms } from '../../context/TermsContext.jsx'
import { useSubmitGuard } from '../../hooks/useSubmitGuard.js'
import { hapticMedium, hapticSuccess, hapticError } from '../../utils/haptics.js'

/**
 * StrategicInputSheets — reusable module for the 4 strategic-input sheets
 * (Add Asset / Add Loan / Inject Capital / Owner Draw) plus the action-menu
 * sheet that opens them.
 *
 * Lifted from `InvestorDashboard.jsx` (lines 344–415) so the same sheets can
 * be triggered from `/overview` (and elsewhere if needed). The parent owns
 * the data refresh — after any successful save, `onSaved()` is called and the
 * parent re-fetches via `gatherReportData(db)`. NO `window.location.reload()`.
 *
 * SOP refs: §13 (executive panel), §1 (cool semantic palette per action),
 *           §8.5 (double-submit guard via useSubmitGuard).
 *
 * Props:
 *   open        : boolean — controls the action-menu sheet (entry point)
 *   onClose     : () => void — closes the action menu (and any open sub-sheet)
 *   onSaved     : () => void — called after a successful save so the parent
 *                              can refresh its data (re-fetch + setState).
 *                              NO reload — keeps the 30s cloud-sync debounce
 *                              window intact.
 */
export default function StrategicInputSheets({ open, onClose, onSaved }) {
  const t = useTerms()
  const [submitting, guard] = useSubmitGuard()

  // Sub-sheet visibility
  const [assetSheetOpen, setAssetSheetOpen] = useState(false)
  const [loanSheetOpen, setLoanSheetOpen] = useState(false)
  const [capitalSheetOpen, setCapitalSheetOpen] = useState(false)
  const [drawSheetOpen, setDrawSheetOpen] = useState(false)

  // Form state
  const [newAsset, setNewAsset] = useState({ name: '', value: 0, lifespan_years: 5 })
  const [newLoan, setNewLoan] = useState({ name: '', amount: 0, type: 'payable' })
  const [capitalAmount, setCapitalAmount] = useState(0)
  const [drawAmount, setDrawAmount] = useState(0)

  const openSubSheet = (setter) => {
    hapticMedium()
    onClose?.() // close the action menu first
    setter(true)
  }

  // ===== Add Asset =====
  const handleSaveAsset = guard(async () => {
    if (!newAsset.name || !newAsset.value) {
      hapticError()
      return
    }
    hapticSuccess()
    await db.addFixedAsset(newAsset)
    setAssetSheetOpen(false)
    setNewAsset({ name: '', value: 0, lifespan_years: 5 })
    onSaved?.() // local state refresh in parent — NO reload
  })

  // ===== Add Loan =====
  const handleSaveLoan = guard(async () => {
    if (!newLoan.name || !newLoan.amount) {
      hapticError()
      return
    }
    hapticSuccess()
    await db.addLoan(newLoan)
    setLoanSheetOpen(false)
    setNewLoan({ name: '', amount: 0, type: 'payable' })
    onSaved?.()
  })

  // ===== Inject Capital =====
  const handleSaveCapital = guard(async () => {
    if (!capitalAmount) {
      hapticError()
      return
    }
    hapticSuccess()
    await db.injectCapital(capitalAmount)
    setCapitalSheetOpen(false)
    setCapitalAmount(0)
    onSaved?.()
  })

  // ===== Owner Draw =====
  const handleSaveDraw = guard(async () => {
    if (!drawAmount) {
      hapticError()
      return
    }
    hapticSuccess()
    await db.ownerDraw(drawAmount)
    setDrawSheetOpen(false)
    setDrawAmount(0)
    onSaved?.()
  })

  return (
    <>
      {/* Action Menu Sheet — entry point */}
      <BottomSheet open={open} onClose={onClose} title={t.overview_strategic_menu_title}>
        <div className="grid grid-cols-2 gap-3 pb-4">
          <button
            type="button"
            onClick={() => openSubSheet(setAssetSheetOpen)}
            className="press flex flex-col items-start gap-3 rounded-card p-4 text-right bg-primary-50"
          >
            <div className="w-12 h-12 rounded-card bg-primary-100 grid place-items-center">
              <Icon name="wallet" className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">{t.overview_add_asset}</div>
              <div className="text-caption text-ink-secondary">{t.overview_strategic_add_asset_desc}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openSubSheet(setLoanSheetOpen)}
            className="press flex flex-col items-start gap-3 rounded-card p-4 text-right bg-expense-50"
          >
            <div className="w-12 h-12 rounded-card bg-expense-100 grid place-items-center">
              <Icon name="bank" className="w-6 h-6 text-expense-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">{t.overview_add_loan}</div>
              <div className="text-caption text-ink-secondary">{t.overview_strategic_add_loan_desc}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openSubSheet(setCapitalSheetOpen)}
            className="press flex flex-col items-start gap-3 rounded-card p-4 text-right bg-income-50"
          >
            <div className="w-12 h-12 rounded-card bg-income-100 grid place-items-center">
              <Icon name="arrowDown" className="w-6 h-6 text-income-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">{t.overview_inject_capital}</div>
              <div className="text-caption text-ink-secondary">{t.overview_strategic_inject_capital_desc}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openSubSheet(setDrawSheetOpen)}
            className="press flex flex-col items-start gap-3 rounded-card p-4 text-right bg-withdrawal-50"
          >
            <div className="w-12 h-12 rounded-card bg-withdrawal-100 grid place-items-center">
              <Icon name="userMinus" className="w-6 h-6 text-withdrawal-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">{t.overview_owner_draw}</div>
              <div className="text-caption text-ink-secondary">{t.overview_strategic_owner_draw_desc}</div>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* Add Asset Sheet */}
      <BottomSheet open={assetSheetOpen} onClose={() => setAssetSheetOpen(false)} title={t.overview_add_asset}>
        <div className="space-y-4 pb-4">
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-2">
              {t.overview_asset_name_label}
            </label>
            <input
              type="text"
              value={newAsset.name}
              onChange={(e) => setNewAsset(p => ({ ...p, name: e.target.value }))}
              placeholder="مثال: آلة قهوة، ثلاجة"
              className="input-field"
              dir="rtl"
              autoFocus
            />
          </div>
          <AmountInput
            value={newAsset.value}
            onChange={(v) => setNewAsset(p => ({ ...p, value: v }))}
            label={t.overview_asset_value_label}
          />
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-2">
              {t.overview_asset_lifespan_label}
            </label>
            <input
              type="number"
              value={newAsset.lifespan_years}
              onChange={(e) => setNewAsset(p => ({ ...p, lifespan_years: Number(e.target.value) || 5 }))}
              className="input-field num"
              dir="ltr"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveAsset}
            disabled={!newAsset.name || !newAsset.value || submitting}
            className="w-full btn-primary disabled:opacity-50"
          >
            {t.overview_asset_save}
          </button>
        </div>
      </BottomSheet>

      {/* Add Loan Sheet */}
      <BottomSheet open={loanSheetOpen} onClose={() => setLoanSheetOpen(false)} title={t.overview_add_loan}>
        <div className="space-y-4 pb-4">
          <div>
            <label className="block text-sm font-semibold text-ink-secondary mb-2">
              {t.overview_loan_name_label}
            </label>
            <input
              type="text"
              value={newLoan.name}
              onChange={(e) => setNewLoan(p => ({ ...p, name: e.target.value }))}
              placeholder="مثال: قرض بنك الإسكان"
              className="input-field"
              dir="rtl"
              autoFocus
            />
          </div>
          <AmountInput
            value={newLoan.amount}
            onChange={(v) => setNewLoan(p => ({ ...p, amount: v }))}
            label={t.overview_loan_amount_label}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNewLoan(p => ({ ...p, type: 'payable' }))}
              className={`py-3 rounded-12 text-sm font-semibold ${newLoan.type === 'payable' ? 'bg-expense-500 text-white' : 'bg-background text-ink-secondary border border-divider'}`}
            >
              {t.overview_loan_type_payable}
            </button>
            <button
              type="button"
              onClick={() => setNewLoan(p => ({ ...p, type: 'receivable' }))}
              className={`py-3 rounded-12 text-sm font-semibold ${newLoan.type === 'receivable' ? 'bg-income-500 text-white' : 'bg-background text-ink-secondary border border-divider'}`}
            >
              {t.overview_loan_type_receivable}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSaveLoan}
            disabled={!newLoan.name || !newLoan.amount || submitting}
            className="w-full btn-primary disabled:opacity-50"
          >
            {t.overview_loan_save}
          </button>
        </div>
      </BottomSheet>

      {/* Inject Capital Sheet */}
      <BottomSheet open={capitalSheetOpen} onClose={() => setCapitalSheetOpen(false)} title={t.overview_inject_capital}>
        <div className="space-y-4 pb-4">
          <p className="text-sm text-ink-secondary">{t.overview_capital_hint}</p>
          <AmountInput value={capitalAmount} onChange={setCapitalAmount} label={t.overview_loan_amount_label} autoFocus />
          <button
            type="button"
            onClick={handleSaveCapital}
            disabled={!capitalAmount || submitting}
            className="w-full btn-primary disabled:opacity-50"
          >
            {t.overview_capital_save}
          </button>
        </div>
      </BottomSheet>

      {/* Owner Draw Sheet */}
      <BottomSheet open={drawSheetOpen} onClose={() => setDrawSheetOpen(false)} title={t.overview_owner_draw}>
        <div className="space-y-4 pb-4">
          <p className="text-sm text-ink-secondary">{t.overview_draw_hint}</p>
          <AmountInput value={drawAmount} onChange={setDrawAmount} label={t.overview_loan_amount_label} autoFocus />
          <button
            type="button"
            onClick={handleSaveDraw}
            disabled={!drawAmount || submitting}
            className="w-full bg-withdrawal-500 text-white font-bold rounded-12 py-4 active:scale-95 transition-transform disabled:opacity-50"
          >
            {t.overview_draw_save}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
