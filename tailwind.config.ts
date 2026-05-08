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
        kr: ['agchoijeongho-screen', 'kozuka-mincho-pr6n', 'serif'],
        en: ['optique-display', 'kozuka-mincho-pr6n', 'serif'],
        body: ['kozuka-mincho-pr6n', 'optique-display', 'serif'],
      },
      screens: {
        sm: '768px',
      },
    },
  },
  plugins: [],
};

export default config;
