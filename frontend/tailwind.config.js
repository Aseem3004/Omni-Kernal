/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        "window-focus": "0 28px 90px rgba(0, 0, 0, 0.45)",
        "window-idle": "0 18px 60px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};
