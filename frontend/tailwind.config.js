/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy-black background, navy-blue accent.
        ink: {
          950: '#04060f', // deepest bg
          900: '#0a0f1f', // base bg
          800: '#10172a', // card bg
          700: '#192042', // raised card
          600: '#232b58', // border
          500: '#2c3568', // hover border
        },
        brand: {
          50:  '#dee9ff',
          100: '#bdd2ff',
          200: '#87a9ff',
          300: '#5680ff',
          400: '#3868ff',
          500: '#2f6bff',
          600: '#1f54e6',
          700: '#1a45bf',
          800: '#163794',
          900: '#0f1f55',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3)',
        glow: '0 0 0 1px rgba(47,107,255,0.4), 0 8px 28px rgba(47,107,255,0.25)',
      },
      borderRadius: { xl2: '1.25rem' },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Inter', 'sans-serif'],
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0, transform: 'scale(.98)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
      },
      animation: { fadeIn: 'fadeIn .15s ease-out' },
    },
  },
  plugins: [],
};
