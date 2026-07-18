/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ===== Identity: Warm Terracotta (SOP v2) =====
        primary: {
          50: '#FBF3EF', 100: '#F4E4DB', 200: '#E8C9B8', 300: '#DBAE91',
          400: '#CC785C', 500: '#CC785C', 600: '#B4613F', 700: '#964E33',
          800: '#783B28', 900: '#5A2C1D', DEFAULT: '#CC785C',
        },
        // Accent: Teal
        accent: {
          50: '#E3F5F5', 100: '#C0EAEA', 200: '#8FD5D6', 300: '#5EC0C1',
          400: '#2DABAD', 500: '#079FA0', 600: '#057B7C', 700: '#045E5F',
          800: '#034142', 900: '#022425', DEFAULT: '#079FA0',
          text: '#057B7C', light: '#E3F5F5',
        },
        // Semantic: Income (cool green)
        income: {
          50: '#E4F2EA', 100: '#C9E6D5', 200: '#A7D8BE', 300: '#7FC49E',
          400: '#57B07E', 500: '#2E7D57', 600: '#256A48', 700: '#1C5739',
          800: '#13442A', 900: '#0A311B', DEFAULT: '#2E7D57',
          fill: '#A7D8BE', bg: '#E4F2EA',
        },
        // Semantic: Expense (crimson)
        expense: {
          50: '#FBE7E6', 100: '#F5C9C7', 200: '#EEA19E', 300: '#E47975',
          400: '#DB514C', 500: '#DC2E2F', 600: '#B42318', 700: '#911C12',
          800: '#6E150C', 900: '#4B0E06', DEFAULT: '#B42318',
          fill: '#DC2E2F', bg: '#FBE7E6',
        },
        // Semantic: Withdrawal (steel blue)
        withdrawal: {
          50: '#E8EEF3', 100: '#D1DDE6', 200: '#B0C3D2', 300: '#8AA5B8',
          400: '#68899E', 500: '#5B7C99', 600: '#3E5C76', 700: '#2F485B',
          800: '#203340', 900: '#111E25', DEFAULT: '#3E5C76',
          fill: '#5B7C99', bg: '#E8EEF3',
          50: '#E8EEF3', 600: '#3E5C76',
        },
        // Semantic: Returns (gold, rare)
        returns: {
          50: '#F6ECCF', 100: '#EFDAA0', 200: '#E0A200', 300: '#C99100',
          400: '#B08532', 500: '#E0A200', 600: '#B08532', 700: '#8A6927',
          800: '#644D1C', 900: '#3E3112', DEFAULT: '#B08532',
          fill: '#E0A200', bg: '#F6ECCF',
        },
        // ===== Warm Neutrals (Greige) =====
        ink: {
          DEFAULT: '#1F1E1D', strong: '#33322E', secondary: '#6E6A60',
        },
        text: {
          primary: '#1F1E1D', secondary: '#6E6A60', tertiary: '#B7B2A6',
        },
        txt: {
          primary: '#1F1E1D', secondary: '#6E6A60', tertiary: '#B7B2A6',
        },
        background: '#FAF9F5',
        ivory: '#F0EEE6',
        surface: '#FFFFFF',
        mute: '#F0EEE6',
        border: '#EAE6DC',
        divider: '#DAD5C8',
        disabled: '#B7B2A6',
        faint: '#6E6A60',
        placeholder: '#B7B2A6',
        sub: '#6E6A60',
        altRow: '#FAF9F5',
        // Legacy aliases for backward compat
        'primary-tint': '#F4E4DB',
        'primary-pill': '#F4E4DB',
        'income-bg': '#E4F2EA',
        'expense-bg': '#FBE7E6',
        'withdraw-bg': '#E8EEF3',
        'withdrawal-bg': '#E8EEF3',
        amber: '#B08532',
        'amber-bg': '#F6ECCF',
        purple: '#5644d0',
        'purple-bg': '#eeecfb',
        status: { progress: '#E0A200', ready: '#079FA0', closed: '#B7B2A6' },
        closed: '#B7B2A6',
        progress: '#E0A200',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        cairo: ['IBM Plex Sans Arabic', 'sans-serif'],
        ibm: ['IBM Plex Sans Arabic', 'sans-serif'],
      },
      borderRadius: {
        '12': '12px', '16': '16px', '20': '20px',
        card: '16px', sheet: '20px', pill: '9999px',
        xl: '12px', '2xl': '16px', '3xl': '20px',
      },
      boxShadow: {
        'e1': '0 1px 2px rgba(60,50,40,.06), 0 4px 12px rgba(60,50,40,.06)',
        'e2': '0 6px 20px rgba(60,50,40,.10)',
        'e3': '0 16px 40px rgba(60,50,40,.16)',
        'card': '0 1px 2px rgba(60,50,40,.06), 0 4px 12px rgba(60,50,40,.06)',
        'sheet': '0 6px 20px rgba(60,50,40,.10)',
        'header': '0 6px 20px rgba(60,50,40,.10)',
        'fab': '0 16px 40px rgba(60,50,40,.16)',
        'sm': '0 1px 2px rgba(60,50,40,.04)',
        'nav': '0 -2px 12px -8px rgba(60,50,40,.15)',
        'lg': '0 6px 20px rgba(60,50,40,.10)',
        'xl': '0 16px 40px rgba(60,50,40,.16)',
      },
      spacing: {
        '1': '4px', '2': '8px', '3': '12px', '4': '16px',
        '5': '20px', '6': '24px', '7': '32px',
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
