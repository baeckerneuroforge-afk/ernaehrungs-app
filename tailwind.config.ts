import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // -----------------------------------------------------------------
        // Brand — Sage Green
        // Source of truth: Landing page design system
        // -----------------------------------------------------------------
        primary: {
          DEFAULT: "#2D6A4F",   // CTAs, active states, brand accent
          hover: "#1F5038",      // CTA hover (darken)
          light: "#40916C",      // mid green (existing — hover lighten on CTAs)
          soft: "#52B788",       // accent (existing)
          pale: "#E2F0DB",       // badges, subtle backgrounds
          faint: "#F0F7EC",      // app section backgrounds
          bg: "#E8F0EC",         // kept for backwards compatibility
        },
        sage: {
          DEFAULT: "#A8C99B",    // badge/hover tint
          light: "#C5DFB8",
          pale: "#E2F0DB",
          faint: "#F0F7EC",
        },
        accent: {
          warm: "#D4A574",
          warmLight: "#E0BC96",
          warmPale: "#F5EDE4",
        },
        // -----------------------------------------------------------------
        // Surfaces
        // -----------------------------------------------------------------
        surface: {
          DEFAULT: "#FFFFFF",    // cards, modals
          bg: "#FAFAF5",         // warm off-white app background
          muted: "#F3F2EE",
        },
        // -----------------------------------------------------------------
        // Ink — semantic text tokens
        // -----------------------------------------------------------------
        ink: {
          DEFAULT: "#1C1917",    // body text primary
          muted: "#57534E",      // secondary
          faint: "#A8A29E",      // tertiary / timestamps / hints
        },
        // -----------------------------------------------------------------
        // Legacy warm-* tokens (kept — many components still reference them)
        // -----------------------------------------------------------------
        warm: {
          dark: "#1C1917",
          text: "#1C1917",
          muted: "#57534E",
          light: "#A8A29E",
          border: "#E7E5E4",
        },
        border: {
          DEFAULT: "#E7E5E4",
          soft: "#F0EFED",
        },
      },
      fontFamily: {
        sans: ["'DM Sans'", "Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["'Lora'", "Georgia", "'Times New Roman'", "serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(28, 25, 23, 0.04), 0 1px 2px rgba(28, 25, 23, 0.03)",
        "card-hover":
          "0 6px 20px rgba(28, 25, 23, 0.06), 0 2px 6px rgba(28, 25, 23, 0.04)",
        pop: "0 20px 60px rgba(28, 25, 23, 0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-in-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "typing-dot": {
          "0%, 60%, 100%": { opacity: "0.25", transform: "translateY(0)" },
          "30%": { opacity: "1", transform: "translateY(-2px)" },
        },
        "rotate-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.25s ease-out forwards",
        "slide-in-right": "slide-in-right 0.25s ease-out forwards",
        "slide-in-up": "slide-in-up 0.2s ease-out forwards",
        "typing-dot": "typing-dot 1.2s ease-in-out infinite",
        "rotate-slow": "rotate-slow 20s linear infinite",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};
export default config;
