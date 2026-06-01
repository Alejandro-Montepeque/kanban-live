/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          card: '#13131a',
          border: '#2a2a35',
        },
        ink: {
          DEFAULT: '#e8e8ed',
          muted: '#9a9aab',
        },
        accent: {
          DEFAULT: '#7c3aed',
          glow: '#a78bfa',
        },
      },
    },
  },
  plugins: [],
}
