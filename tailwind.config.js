/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Fraunces', 'serif'],
      },
      colors: {
        ink: {
          50: '#f5f4f2',
          100: '#e8e5e0',
          200: '#d0cbc2',
          300: '#b3aa9d',
          400: '#948878',
          500: '#7d6f5e',
          600: '#6a5c4e',
          700: '#574b40',
          800: '#493f36',
          900: '#3d342c',
          950: '#211c18',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        azure: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        }
      }
    }
  },
  plugins: []
}
