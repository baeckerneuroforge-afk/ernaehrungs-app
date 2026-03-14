import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16A34A",
          light: "#22C55E",
          soft: "#4ADE80",
          pale: "#BBF7D0",
          bg: "#DCFCE7",
        },
        accent: {
          warm: "#F59E0B",
          warmLight: "#FBBF24",
          warmPale: "#FEF3C7",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          bg: "#FAFAF5",
          muted: "#F5F5F0",
        },
        warm: {
          dark: "#1C1917",
          text: "#292524",
          muted: "#78716C",
          light: "#A8A29E",
          border: "#E7E5E4",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
