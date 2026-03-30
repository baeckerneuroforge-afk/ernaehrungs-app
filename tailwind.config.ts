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
          DEFAULT: "#2D6A4F",
          light: "#40916C",
          soft: "#52B788",
          pale: "#B7D7C8",
          bg: "#E8F0EC",
        },
        sage: {
          DEFAULT: "#A8C99B",
          light: "#C5DFB8",
          pale: "#E2F0DB",
          faint: "#F0F7EC",
        },
        accent: {
          warm: "#D4A574",
          warmLight: "#E0BC96",
          warmPale: "#F5EDE4",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          bg: "#FAFAF8",
          muted: "#F3F2EE",
        },
        warm: {
          dark: "#1A1A1A",
          text: "#2C2C2C",
          muted: "#6B7280",
          light: "#9CA3AF",
          border: "#E8E5E0",
        },
      },
      fontFamily: {
        sans: ["'DM Sans'", "Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["'Lora'", "Georgia", "'Times New Roman'", "serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "rotate-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        "rotate-slow": "rotate-slow 20s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
