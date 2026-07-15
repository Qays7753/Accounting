/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Samsung One UI inspired palette
        background: '#F9F9F9',
        surface: '#FFFFFF',
        // Primary - V2: uses CSS variables for dynamic theming
        // Default values match Samsung Blue; overridden at runtime by applyTheme()
        primary: {
          50: 'var(--color-primary-50, #E8F1FE)',
          100: 'var(--color-primary-100, #D0E2FD)',
          200: 'var(--color-primary-200, #A3C5FB)',
          300: 'var(--color-primary-300, #76A8F9)',
          400: 'var(--color-primary-400, #498BF7)',
          500: 'var(--color-primary-500, #1F6FE8)',
          600: 'var(--color-primary-600, #0B57D0)',
          700: 'var(--color-primary-700, #0846A3)',
          800: 'var(--color-primary-800, #063577)',
          900: 'var(--color-primary-900, #04244B)',
          DEFAULT: 'var(--color-primary, #1F6FE8)',
        },
        // Income / Profit - Bright Green
        income: {
          50: '#E7F9EE',
          100: '#C8F0D6',
          200: '#91E1AD',
          300: '#5AD284',
          400: '#23C35B',
          500: '#1AA848',
          600: '#148539',
          700: '#0E632A',
          800: '#08421C',
          900: '#03210E',
          DEFAULT: '#23C35B',
        },
        // Expense / Loss - Coral Red
        expense: {
          50: '#FDEAEA',
          100: '#FAC8C8',
          200: '#F59191',
          300: '#F05A5A',
          400: '#EB2323',
          500: '#C51818',
          600: '#9A1313',
          700: '#700E0E',
          800: '#460808',
          900: '#1C0303',
          DEFAULT: '#EB2323',
        },
        // Personal Withdrawal - Neutral amber/brown
        withdrawal: {
          50: '#FFF8EA',
          100: '#FFE8C8',
          200: '#FFD191',
          300: '#FFBA5A',
          400: '#FFA323',
          500: '#E88810',
          600: '#B36A0C',
          700: '#804C08',
          800: '#4D2D05',
          900: '#1A0F01',
          DEFAULT: '#B36A0C',
        },
        // Status colors for orders
        status: {
          progress: '#F5A623', // Yellow - In Progress
          ready: '#1F6FE8',    // Blue - Ready
          closed: '#9E9E9E',   // Gray - Delivered/Closed
        },
        // Text colors — V4.1: darkened tertiary for WCAG AA contrast
        text: {
          primary: '#1F1F1F',
          secondary: '#5A5A5A',
          tertiary: '#6E6E6E',
        },
        // V4.1: alias 'txt' = 'text' so both text-text-* and text-txt-* work
        txt: {
          primary: '#1F1F1F',
          secondary: '#5A5A5A',
          tertiary: '#6E6E6E',
        },
        // Borders & dividers
        divider: '#E5E5E5',
        border: '#E0E0E0',
      },
      fontFamily: {
        sans: ['Cairo', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
        ibm: ['IBM Plex Sans Arabic', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.10)',
        'xl': '0 12px 32px rgba(0, 0, 0, 0.12)',
        'fab': '0 6px 16px rgba(31, 111, 232, 0.35)',
        'sheet': '0 -4px 24px rgba(0, 0, 0, 0.10)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'snackbar-in': 'snackbarIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        snackbarIn: {
          '0%': { transform: 'translateY(100%)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        skeleton: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
