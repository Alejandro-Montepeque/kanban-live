/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          card: '#13131a',
          surface: '#1a1a24',
          border: '#2a2a35',
          subtle: 'rgba(255,255,255,0.04)',
        },
        ink: {
          DEFAULT: '#e8e8ed',
          muted: '#9a9aab',
          subtle: '#6a6a7a',
        },
        accent: {
          DEFAULT: '#7c3aed',
          glow: '#a78bfa',
          deep: '#5b21b6',
        },
        cyan: {
          glow: '#22d3ee',
        },
        magenta: {
          glow: '#ec4899',
        },
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'grid-fine':
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        'aurora-1':
          'radial-gradient(60% 50% at 20% 30%, rgba(124,58,237,0.45), transparent 70%)',
        'aurora-2':
          'radial-gradient(50% 50% at 80% 20%, rgba(34,211,238,0.32), transparent 70%)',
        'aurora-3':
          'radial-gradient(55% 55% at 60% 90%, rgba(236,72,153,0.30), transparent 70%)',
      },
      backgroundSize: {
        'grid-fine': '44px 44px',
      },
      boxShadow: {
        glow: '0 0 24px rgba(124,58,237,0.45), 0 0 60px rgba(124,58,237,0.20)',
        'glow-cyan': '0 0 24px rgba(34,211,238,0.35)',
        card: '0 1px 0 rgba(255,255,255,0.04), 0 12px 32px rgba(0,0,0,0.35)',
      },
      keyframes: {
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%, -3%, 0) scale(1.08)' },
        },
        'aurora-drift-slow': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(-3%, 2%, 0) scale(1.05)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.9' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'aurora-1': 'aurora-drift 18s ease-in-out infinite',
        'aurora-2': 'aurora-drift-slow 22s ease-in-out infinite',
        'aurora-3': 'aurora-drift 26s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
