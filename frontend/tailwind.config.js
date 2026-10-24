/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#090d16',
          900: '#0f172a',
          850: '#131d35',
          800: '#1e293b',
          750: '#26334d',
          700: '#334155',
          600: '#475569',
        },
        subject: {
          accent: 'rgb(var(--subject-accent-rgb, 6 182 212) / <alpha-value>)',
          maths: '#F59E0B',
          physics: '#6366F1',
          chemistry: '#06B6D4',
          biology: '#10B981',
          '0580': '#F59E0B',
          '0625': '#6366F1',
          '0620': '#06B6D4',
          '0610': '#10B981',
        },
        'subject-accent': 'rgb(var(--subject-accent-rgb, 6 182 212) / <alpha-value>)',
        chem: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          purple: '#8b5cf6',
        }
      },
      boxShadow: {
        'subject-glow': '0 0 20px -4px rgb(var(--subject-accent-rgb, 6 182 212) / 0.35)',
        'subject-ring': '0 0 0 1px rgb(var(--subject-accent-rgb, 6 182 212) / 0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
