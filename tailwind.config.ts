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
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
