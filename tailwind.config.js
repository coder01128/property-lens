/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#c8a96e',
          light:   '#dfc28e',
          dark:    '#a8893e',
          muted:   'rgba(200,169,110,0.2)',
        },
        surface: {
          DEFAULT: '#0a0a0f',
          raised:  '#13131a',
          card:    '#16161f',
          border:  '#1e1e2e',
          overlay: '#1a1a28',
        },
        condition: {
          excellent: '#22c55e',
          good:      '#06D6A0', // PRD §4.3.3 teal-green
          fair:      '#FFD166', // PRD §4.3.3 amber
          poor:      '#F97316', // PRD §4.3.3 orange
          damaged:   '#EF476F', // PRD §4.3.3 red-pink
          na:        '#636E72', // PRD §4.3.3 grey
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
      },
      borderRadius: {
        card:   '12px',
        sheet:  '20px',
      },
      boxShadow: {
        card:      '0 1px 4px rgba(0,0,0,0.5)',
        'card-gold': '0 0 0 1px rgba(200,169,110,0.3)',
        sheet:     '0 -4px 24px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
