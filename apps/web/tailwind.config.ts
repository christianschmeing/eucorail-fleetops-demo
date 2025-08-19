import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        eucorail: {
          primary: '#0066CC',
          secondary: '#00A859',
          danger: '#DC2626',
          warning: '#F59E0B',
          success: '#10B981',
        },
      },
    },
  },
  plugins: [],
};

export default config;
