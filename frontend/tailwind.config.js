/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#03070a',
        foreground: '#f8fafc',
        card: {
          DEFAULT: '#0c121e',
          foreground: '#f8fafc',
        },
        surface: {
          DEFAULT: '#0b101b',
          elevated: '#0f172a',
          line: 'rgba(255, 255, 255, 0.08)',
          muted: 'rgba(255, 255, 255, 0.04)',
        },
        // BadPro+ Brand Blue
        brand: {
          DEFAULT: '#007aff',
          hover: '#2482ff',
          deep: '#1877ca',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#007aff',
          600: '#0062cc',
          700: '#1877ca',
        },
        court: {
          blue: '#007aff',
          light: '#38bdf8',
        }
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'fig-sm': '4px',
        'fig-md': '6px',
        'fig-lg': '8px',
        'fig-xl': '12px',
      },
      boxShadow: {
        'glow-blue': '0 0 25px -4px rgba(0, 122, 255, 0.35)',
        'glow-subtle': '0 10px 30px -10px rgba(0, 122, 255, 0.2)',
      }
    },
  },
  plugins: [],
}
