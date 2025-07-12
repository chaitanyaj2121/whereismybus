// tailwind.config.js (or tailwind.config.mjs if you rename it for clarity)

/** @type {import('tailwindcss').Config} */
export default {
  // Changed from module.exports = {
  content: [
    "./index.html", // If your root HTML is directly in the project root
    "./src/**/*.{js,jsx,ts,tsx}", // Important for React components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
