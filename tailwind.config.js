/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === One UI Design Tokens (V5 Redesign) ===
        // Base & surfaces
        background: '#f7f9fc',
        surface: '#ffffff',
        mute: '#eceef1',
        divider: '#f0f2f5',
        // Text
        ink: '#191c1e',
        sub: '#414755',
        faint: '#717786',
        placeholder: '#a3aab8',
        // Legacy text aliases (for backward compat with existing code)
        text: {
          primary: '#191c1e',
          secondary: '#414755',
          tertiary: '#717786',
        },
        txt: {
          primary: '#191c1e',
          secondary: '#414755',
          tertiary: '#717786',
        },
        // Brand & semantic
        primary: {
          DEFAULT: '#0058be',
          50: '#e7f0ff',
          100: '#d8e2ff',
          600: '#0058be',
          700: '#004ca3',
        },
        'primary-tint': '#e7f0ff',
        'primary-pill': '#d8e2ff',
        income: {
          DEFAULT: '#067647',
          50: '#e7f8ee',
          600: '#067647',
        },
        'income-bg': '#e7f8ee',
        expense: {
          DEFAULT: '#c1272d',
          50: '#fdecec',
          600: '#c1272d',
        },
        'expense-bg': '#fdecec',
        withdrawal: {
          DEFAULT: '#9a5b06',
          50: '#fbf1e2',
          600: '#9a5b06',
        },
        'withdraw-bg': '#fbf1e2',
        // Status colors
        amber: '#c98a10',
        'amber-bg': '#fff5e2',
        purple: '#5644d0',
        'purple-bg': '#eeecfb',
        status: {
          progress: '#f5a623',
          ready: '#0058be',
          closed: '#b0b6c3',
        },
        // Legacy status (backward compat)
        progress: '#f5a623',
        closed: '#b0b6c3',
      },
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
      },
      borderRadius: {
        'card': '24px',
        'hero': '30px',
        'sheet': '32px',
        'pill': '9999px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 8px 22px -16px rgba(20,30,55,.35)',
        'hero': '0 18px 34px -14px rgba(0,88,190,.55)',
        'fab': '0 14px 28px -8px rgba(0,88,190,.6)',
        'nav': '0 -6px 24px -14px rgba(20,30,55,.3)',
        'sm': '0 2px 8px rgba(0,0,0,0.04)',
        'md': '0 4px 12px rgba(0,0,0,0.06)',
        'lg': '0 8px 24px rgba(0,0,0,0.08)',
        'xl': '0 12px 32px rgba(0,0,0,0.10)',
        'sheet': '0 -20px 50px -20px rgba(15,20,35,.4)',
      },
      animation: {
        'slide-up': 'slideUp 0.34s cubic-bezier(0.16,1,0.3,1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16,1,0.3,1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
        'snackbar-in': 'snackbarIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        slideDown: { '0%': { transform: 'translateY(0)' }, '100%': { transform: 'translateY(100%)' } },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        scaleIn: { '0%': { transform: 'scale(0.95)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        snackbarIn: { '0%': { transform: 'translateY(100%)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        skeleton: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
      },
    },
  },
  plugins: [],
}
