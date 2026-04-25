import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#fff7ed',
          100: '#ffedd5',
          500: '#FF6B35',
          600: '#ea580c',
          700: '#c2410c',
          900: '#7c2d12',
        },
      },
    },
  },
  plugins: [],
}

export default config
