/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.{pug,html,js}", "./app/controllers/**/*.js", "./public/**/*.{js,html}"],
  safelist: ['bg-gray-800', 'text-white', 'p-4', 'position-fixed', 'bottom-0', 'w-full', 'text-center'],
  theme: {
    extend: {},
  },
  plugins: [],
}