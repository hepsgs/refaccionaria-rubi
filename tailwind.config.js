/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e11d48', // Red
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1e293b', // Slate Dark
          foreground: '#f8fafc',
        },
        background: '#f8fafc',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#1e293b',
        }
      },
      borderRadius: {
        'rubi': '40px',
      },
      boxShadow: {
        'soft': '0 10px 30px -10px rgba(30, 41, 59, 0.1)',
      }
    },
  },
  plugins: [],
}
