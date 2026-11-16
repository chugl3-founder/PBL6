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
        },
        // "Court" identity (match pages): the green of a BWF mat, white lines, scoreboard type.
        mat: '#0F4A31', // the court mat under broadcast lights: landing hero and closing band
        ground: '#EEF1EE', // page background: cool pale grey-green, not cream
        sheet: '#FFFFFF',  // reading surfaces
        ink: '#16201B',    // text: green-black
        pitch: {
          DEFAULT: '#2E7D5B', // primary: court mat green
          deep: '#1F5E43',
          soft: '#DCEBE2',
        },
        pa: '#2B59C3',   // player on the upper side of the court
        pb: '#C9701F',   // player on the lower side of the court
        loss: '#C2413A', // only for lost points
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        vn: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        score: ['"Barlow Condensed"', '"Be Vietnam Pro"', 'sans-serif'],
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
      },
      // Used by alerts and tab panels; was referenced without being defined.
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // The one entrance on the home page: the rally bars grow out of the centre line.
        'ribbon-grow': {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'ribbon-grow': 'ribbon-grow 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
}
