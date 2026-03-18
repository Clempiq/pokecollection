/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pokemon: {
          red: '#CC0000',
          yellow: '#FFCB05',
          blue: '#003A70',
          lightblue: '#3B82F6',
        },
        // CSS-variable-based semantic tokens
        surface:         'var(--bg-surface)',
        'surface-raised':'var(--bg-surface-raised)',
        subtle:          'var(--bg-subtle)',
        'page':          'var(--bg-page)',
        accent:          'var(--accent)',
        'accent-subtle': 'var(--accent-subtle)',
      }
    },
  },
  plugins: [],
}
