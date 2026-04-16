/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./styleguide.html",
    "./case/**/*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark':              'var(--color-bg-dark)',
        'bg-light':             'var(--color-bg-light)',
        'surface':              'var(--color-surface)',
        'surface-hover':        'var(--color-surface-hover)',
        'accent':               'var(--color-accent)',
        'accent-hover':         'var(--color-accent-hover)',
        'accent-muted':         'var(--color-accent-muted)',
        'success':              'var(--color-success)',
        'success-bg':           'var(--color-success-bg)',
        'warning':              'var(--color-warning)',
        'warning-bg':           'var(--color-warning-bg)',
        'error':                'var(--color-error)',
        'error-bg':             'var(--color-error-bg)',
        'info':                 'var(--color-info)',
        'info-bg':              'var(--color-info-bg)',
        'text-primary-dark':   'var(--color-text-primary-dark)',
        'text-muted-dark':     'var(--color-text-muted-dark)',
        'text-primary-light':  'var(--color-text-primary-light)',
        'text-muted-light':    'var(--color-text-muted-light)',
      },
      fontFamily: {
        'serif': ['Playfair Display', 'Georgia', 'serif'],
        'sans':  ['Inter', 'system-ui', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: 'var(--color-border)',
        'white/08': 'rgba(255,255,255,0.08)',
        'black/06': 'rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
