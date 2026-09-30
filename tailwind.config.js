/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        blueprint: {
          950: '#0A1B2E',
          900: '#0F2540',
          800: '#153355',
          700: '#1B4D89',
          600: '#2563A8',
          400: '#7FB0E0',
          200: '#CFE3F5',
        },
        paper: '#F2EFE9',
        ink: '#20262B',
        amber: {
          500: '#E8A33D',
          600: '#CC8A26',
        },
        rebar: '#C1440E',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'blueprint-grid':
          'linear-gradient(rgba(127,176,224,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(127,176,224,0.12) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '28px 28px',
      },
    },
  },
  plugins: [],
};
