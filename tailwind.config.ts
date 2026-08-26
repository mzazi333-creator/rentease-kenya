import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f0",
          100: "#d7ecdc",
          200: "#b0d9bc",
          300: "#82c096",
          400: "#53a671",
          500: "#2e8b57",
          600: "#237044",
          700: "#1c5937",
          800: "#15442b",
          900: "#0f301e",
        },
        accent: {
          50: "#fdf6ee",
          100: "#fbead5",
          200: "#f6d3a8",
          300: "#f0b873",
          400: "#ea9d42",
          500: "#e2862b",
          600: "#c96c1e",
          700: "#a7531a",
          800: "#86431b",
          900: "#6d3818",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
