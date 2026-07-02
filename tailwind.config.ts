import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          600: '#4F46E5',
          700: '#4338CA',
        },
        // Semantic tokens are CSS-variable driven so they flip in dark mode.
        // Channels are "R G B" so Tailwind's /opacity modifiers keep working.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        body: 'rgb(var(--body) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        page: 'rgb(var(--page) / <alpha-value>)',
        field: 'rgb(var(--field) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        success: '#05CD99',
        warning: '#FFB547',
        danger: '#EE5D50',
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(79,70,229,0.06)',
        pop: '0 8px 32px rgba(27,37,89,0.12)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
