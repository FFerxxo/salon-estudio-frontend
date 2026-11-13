/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        univalle: {
          crimson: '#d92d20',
          deep: '#990000',
          rose: '#e11d48',
        },
        cosmic: {
          void: '#0b0714',
          surface: '#120c18',
        },
        warm: {
          mist: '#faf6f0',
          paper: '#fffcf9',
        },
      },
      keyframes: {
        'ken-burns': {
          '0%, 100%': { transform: 'scale(1.03) translate3d(0, 0, 0)' },
          '50%': { transform: 'scale(1.08) translate3d(-0.6%, -0.4%, 0)' },
        },
      },
      animation: {
        'ken-burns': 'ken-burns 28s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
