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

