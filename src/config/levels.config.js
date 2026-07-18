/**
 * Display Modes Configuration — Config-Driven UI Foundation
 *
 * Maps display modes to their terms objects.
 * The actual terms live in:
 *   src/utils/terms_simple.js — street language (Jordanian business slang)
 *   src/utils/terms_pro.js   — formal accounting terminology
 *
 * The useTerms() hook (from TermsContext) reads the user's display mode
 * from Dexie (settings.report_mode) and returns the correct terms object.
 * Toggling the mode in Settings instantly re-renders all components.
 *
 * Simple Mode examples:
 *   shop_equity:    'حق المحل'
 *   merchant_equity: 'حق التاجر'
 *   total_income:   'كم قبضت'
 *
 * Pro Mode examples:
 *   shop_equity:    'رأس المال المستثمر'
 *   merchant_equity: 'الأرباح المحتجزة'
 *   net_this_month: 'صافي التدفق النقدي للشهر'
 */

export const DISPLAY_MODES = {
  simple: {
    name: 'بسيطة',
    termsFile: 'src/utils/terms_simple.js',
    description: 'لغة الشارع الأردنية — بطاقات محادثة',
  },
  pro: {
    name: 'احترافية',
    termsFile: 'src/utils/terms_pro.js',
    description: 'مصطلحات محاسبية رسمية — جداول بيانات',
  },
}

export const DEFAULT_MODE = 'simple'
