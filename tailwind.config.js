/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        equifax: '#e31837',
        experian: '#003a76',
        transunion: '#00a878',
      },
    },
  },
  plugins: [],
}

