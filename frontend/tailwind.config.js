/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        kavana: {
          dark: '#030712',
          panel: '#0B1329',
          orange: '#E17A47',
          'orange-light': '#F4A261',
          steel: '#4B5563',
          surface: '#1F2937',
        },
      },
      minHeight: {
        'touch-target': '64px',
      },
      minWidth: {
        'touch-target': '64px',
      },
      boxShadow: {
        'kavana-glow': '0 24px 80px rgba(225, 122, 71, 0.18)',
      },
    },
  },
  plugins: [],
};
