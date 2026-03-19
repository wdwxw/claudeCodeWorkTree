/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0D1117',
        'bg-secondary': '#161B22',
        'bg-tertiary': '#1C2128',
        'bg-elevated': '#21262D',
        'accent': '#1A56DB',
        'accent-hover': '#1E63F0',
        'accent-muted': 'rgba(26, 86, 219, 0.15)',
        'accent-subtle': '#182848',
        'accent-surface': '#1B2F52',
        'accent-glow': '#1A3A6B',
        'success': '#3FB950',
        'success-subtle': '#1B3027',
        'warning': '#D29922',
        'warning-subtle': '#2D2714',
        'danger': '#F85149',
        'danger-subtle': '#301416',
        'text-primary': '#E6EDF3',
        'text-secondary': '#8B949E',
        'text-muted': '#484F58',
        'border': '#30363D',
        'border-muted': '#21262D',
        'terminal-bg': '#1e1e1e',
        'terminal-green': '#3FB950',
        'terminal-cyan': '#58D1EB',
        'terminal-yellow': '#D29922'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'Menlo', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-down': { from: { opacity: '0', transform: 'translateY(-4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'toast-in': { from: { opacity: '0', transform: 'translateX(100%)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 100ms ease-in',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-down': 'slide-down 200ms ease-out',
        'scale-in': 'scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toast-in 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
