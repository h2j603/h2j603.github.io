import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        fg: 'var(--color-text)',
        border: 'var(--color-border)',
        'category-active-bg': 'var(--color-category-active-bg)',
        'category-active-text': 'var(--color-category-active-text)',
        hover: 'var(--color-hover)',
      },
      fontFamily: {
        kr: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        en: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        body: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
      },
      screens: {
        sm: '768px',
      },
    },
  },
  plugins: [],
};

export default config;
