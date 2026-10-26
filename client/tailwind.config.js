/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14221b',
        cream: '#f5f2e9',
        moss: '#315d49',
        leaf: '#55a46f',
        sun: '#f0bd55',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(20, 34, 27, 0.10)',
      },
    },
  },
  plugins: [],
};
