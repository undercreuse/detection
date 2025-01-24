/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a3238',
          light: '#234148',
          lighter: '#76cfc1',
          dark: '#0f2025',
          darker: '#0a1318',
        },
      },
    },
  },
  plugins: [],
}