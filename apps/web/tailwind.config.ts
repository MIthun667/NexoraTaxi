import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'Segoe UI', 'sans-serif'],
        heading: ['Space Grotesk', 'IBM Plex Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
