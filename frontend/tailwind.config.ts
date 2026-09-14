import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#009F3C',
          'green-dark': '#007A2F',
          blue: '#36398E',
          'blue-dark': '#2A2D6E',
          yellow: '#F5A623',
          red: '#C8102E',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        site: '1200px',
      },
    },
  },
  plugins: [],
} satisfies Config;
