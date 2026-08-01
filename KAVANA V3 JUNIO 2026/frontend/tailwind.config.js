/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kavana: {
          copper: '#E56B2E',
          carbon: '#111827',
          navy: '#0B1220',
          steel: '#CBD5E1',
          muted: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
