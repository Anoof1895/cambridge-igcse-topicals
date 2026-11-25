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
          950: '#0B1120',
          900: '#111827',
          850: '#162033',
          800: '#1E293B',
          750: '#243146',
          700: '#334155',
          600: '#475569',
        },
        subject: {
          accent: 'rgb(var(--subject-accent-rgb, 194, 65, 12) / <alpha-value>)',
          maths: '#7E22CE',
          physics: '#1D4ED8',
          chemistry: '#C2410C',
          biology: '#15803D',
          '0580': '#7E22CE',
          '0625': '#1D4ED8',
          '0620': '#C2410C',
          '0610': '#15803D',
        },
        'subject-accent': 'rgb(var(--subject-accent-rgb, 194, 65, 12) / <alpha-value>)',
        chem: {
          blue: '#1D4ED8',
          cyan: '#C2410C',
          emerald: '#15803D',
          amber: '#B45309',
          rose: '#BE123C',
          purple: '#7E22CE',
        }
      },
      fontFamily: {
        editorial: ['"Source Serif 4"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['"Geist"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
