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
          pale: "#95D5B2",
          bg: "#D8F3DC",
        },
        accent: {
          warm: "#E76F51",
          warmLight: "#F4A261",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          bg: "#FAFBFC",
          muted: "#F3F4F6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
