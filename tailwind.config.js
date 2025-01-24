/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1c0732',
          light: '#2d0b52',
          lighter: '#3d0f6d',
          dark: '#140525',
          darker: '#0c0317',
        },
      },
    },
  },
  plugins: [],
}