/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zinc: {
          950: "#0b0b0c",
        },
      },
    },
  },
  plugins: [],
}
