import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./apps/web/src/**/*.{js,ts,jsx,tsx,mdx}'],
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
