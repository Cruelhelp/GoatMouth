/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./pages/**/*.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'goat-teal': '#00CB97',
        'goat-purple': '#631BDD',
        'goat-yellow': '#FFC107',
      },
    },
  },
  plugins: [],
}
