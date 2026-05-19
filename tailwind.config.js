import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,svelte,ts,js}'],
  theme: {
    extend: {
      colors: {
        bg: '#0c0c0c',
        surface: '#161616',
        surface2: '#1e1e1e',
        surface3: '#252525',
        border: '#2a2a2a',
        border2: '#333',
        text: '#f0f0f0',
        text2: '#a0a0a0',
        text3: '#606060',
        teal: { DEFAULT: '#1D9E75', bg: '#0a2b1f' },
        coral: { DEFAULT: '#D85A30', bg: '#2b150a' },
        amber: { DEFAULT: '#BA7517', bg: '#2b1e0a' },
        violet: { DEFAULT: '#7B5BD9', bg: '#150f2b' },
        red: { DEFAULT: '#e24b4a', bg: '#2b0a0a' }
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'
        ]
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
        xl: '18px'
      }
    }
  },
  plugins: [forms]
};
