/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
