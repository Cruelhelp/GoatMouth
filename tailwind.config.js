/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/*.html",
    "./public/**/*.html",
    "./public/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'goat-teal': '#00CB97',
        'goat-teal-hover': '#0f3a23',
        'goat-purple': '#631BDD',
        'goat-yellow': '#FFC107',
        'admin-bg': '#1E1E1E',
        'admin-bg2': '#252526',
        'admin-bg3': '#2D2D2D',
        'admin-fg': '#D4D4D4',
        'admin-border': '#2D2D2D',
        'admin-accent': '#1a4d2e',
        'admin-accent-hover': '#0f3a23',
      },
      boxShadow: {
        'goat-glow': '0 4px 12px rgba(0, 203, 151, 0.3)',
        'goat-glow-lg': '0 8px 24px rgba(0, 203, 151, 0.4)',
        'admin-card': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'admin-card-hover': '0 8px 24px rgba(0, 0, 0, 0.4)',
      },
      fontFamily: {
        'inter': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
