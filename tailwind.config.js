/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === SOP Design Tokens ===
        // Identity
        primary: { DEFAULT: '#023852', dark: '#012A3E' },
        accent: { DEFAULT: '#079FA0', text: '#057B7C', light: '#E3F5F5' },
        // Semantic
        income: { DEFAULT: '#0E8A5F', fill: '#9FDBC5', bg: '#E1F3EB' },
        returns: { DEFAULT: '#B07E00', fill: '#E0A200', bg: '#FBF1CF' },
        withdraw: { DEFAULT: '#C96A00', fill: '#FE8801', bg: '#FFF0DD' },
        expense: { DEFAULT: '#C0272B', fill: '#DC2E2F', bg: '#FBE7E7' },
        // Neutrals (blue-gray)
        surface: '#FFFFFF',
        altRow: '#FBFCFD',
        background: '#F4F7F9',
        border: '#E4EAEE',
        divider: '#CBD5DB',
        disabled: '#93A4AE',
        // Text
        ink: { DEFAULT: '#023852', strong: '#2C3E47', secondary: '#647680' },
        // Legacy aliases for backward compat
        text: {
          primary: '#023852',
          secondary: '#647680',
          tertiary: '#93A4AE',
        },
        txt: {
          primary: '#023852',
          secondary: '#647680',
          tertiary: '#93A4AE',
        },
        faint: '#647680',
        mute: '#F4F7F9',
        placeholder: '#93A4AE',
        // Status (legacy compat)
        status: {
          progress: '#E0A200',
          ready: '#079FA0',
          closed: '#93A4AE',
        },
        amber: '#B07E00',
        'amber-bg': '#FBF1CF',
        purple: '#5644d0',
        'purple-bg': '#eeecfb',
        'primary-tint': '#E3F5F5',
        'primary-pill': '#E3F5F5',
        'income-bg': '#E1F3EB',
        'expense-bg': '#FBE7E7',
        'withdraw-bg': '#FFF0DD',
        withdrawal: { DEFAULT: '#C96A00', 50: '#FFF0DD', 600: '#C96A00' },
        income_legacy: { DEFAULT: '#0E8A5F', 50: '#E1F3EB', 600: '#0E8A5F' },
        closed: '#93A4AE',
        progress: '#E0A200',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        cairo: ['IBM Plex Sans Arabic', 'sans-serif'],
        ibm: ['IBM Plex Sans Arabic', 'sans-serif'],
      },
      borderRadius: {
        '12': '12px',
        '16': '16px',
        '20': '20px',
        'card': '16px',
        'sheet': '20px',
        'pill': '9999px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'card': '0 8px 24px -18px rgba(2,56,82,.35)',
        'sheet': '0 16px 40px -24px rgba(2,56,82,.45)',
        'nav': '0 -2px 12px -8px rgba(2,56,82,.2)',
        'sm': '0 2px 8px -4px rgba(2,56,82,.15)',
        'md': '0 4px 12px -6px rgba(2,56,82,.2)',
        'lg': '0 8px 24px -12px rgba(2,56,82,.3)',
        'fab': '0 8px 20px -8px rgba(2,56,82,.4)',
        'hero': '0 8px 24px -18px rgba(2,56,82,.35)',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '32px',
      },
      animation: {
        'slide-up': 'slideUp 0.34s cubic-bezier(0.16,1,0.3,1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16,1,0.3,1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
        'snackbar-in': 'snackbarIn 0.3s cubic-bezier(0.16,1,0.3,1)',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'ghost-out': 'ghostOut 0.3s ease-out forwards',
      },
      keyframes: {
        slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        slideDown: { '0%': { transform: 'translateY(0)' }, '100%': { transform: 'translateY(100%)' } },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        scaleIn: { '0%': { transform: 'scale(0.95)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        snackbarIn: { '0%': { transform: 'translateY(100%)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        skeleton: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        ghostOut: { '0%': { opacity: 1, height: 'auto' }, '100%': { opacity: 0, height: 0, padding: 0, margin: 0 } },
      },
    },
  },
  plugins: [],
}
