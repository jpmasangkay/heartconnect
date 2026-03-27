import type { Config } from 'tailwindcss'
import animate from 'tw-animate-css'

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B3048',
          light: '#243d5c',
        },
        cream: {
          DEFAULT: '#F5EEE4',
          dark: '#EDE4D5',
        },
        sand: {
          DEFAULT: '#D4C5A5',
          dark: '#C4B292',
          light: '#EDE4D5',
        },
        accent: {
          DEFAULT: '#1B5E88',
          hover: '#155078',
        },
        stone: {
          border: '#DDD6CA',
          muted: '#9A9088',
        },
      },
      fontFamily: {
        sans: ['Geist Variable', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
} satisfies Config
