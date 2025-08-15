import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./styles/**/*.css"
  ],
  theme: {
    extend: {
      colors: {
        euco: {
          bg: '#0B1F2A',
          accent: '#0AA8E6',
          accent2: '#27D3A2',
          warn: '#F59E0B',
          danger: '#EF4444',
          muted: '#9FB3C8'
        },
        navy: "#0B1F2A",
        accent: "#1E90FF",
        re9: "#2563EB",
        mex16: "#059669",
        re8: "#EAB308",
        ok: "#16A34A",
        warn: "#F59E0B",
        crit: "#DC2626"
      }
    }
  },
  plugins: []
};

export default config;

