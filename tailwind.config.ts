import type { Config } from 'tailwindcss'

const config: Config = {
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
        ink: '#1B2559',
        body: '#4B5563',
        muted: '#A3AED0',
        line: '#E0E5F2',
        page: '#F0F3FC',
        field: '#F4F7FE',
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
