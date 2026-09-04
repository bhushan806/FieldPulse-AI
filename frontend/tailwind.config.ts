import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Blueprint Light brand (teal)
        brand: {
          50:  "#F0FDFA",
          100: "#CCFBF1",
          500: "#0D9488",
          600: "#0F766E",
          700: "#115E59",
        },
        // App backgrounds
        "bg-app":     "#F7F8FA",
        "bg-surface": "#FFFFFF",
        "bg-muted":   "#F1F3F7",
        // Text scale
        "text-primary":   "#0F172A",
        "text-secondary": "#475569",
        "text-muted":     "#94A3B8",
        // Status
        success: {
          DEFAULT: "#059669",
          bg:      "#ECFDF5",
        },
        warning: {
          DEFAULT: "#D97706",
          bg:      "#FFFBEB",
        },
        danger: {
          DEFAULT: "#DC2626",
          bg:      "#FEF2F2",
        },
        info: {
          DEFAULT: "#2563EB",
          bg:      "#EFF6FF",
        },
        // Legacy compat
        primary: {
          DEFAULT: "#0D9488",
          dark:    "#0F766E",
          light:   "#0D9488",
        },
        accent: {
          DEFAULT: "#0D9488",
          hover:   "#0F766E",
        },
        background: "#F7F8FA",
        surface:    "#FFFFFF",
        text: {
          DEFAULT:   "#0F172A",
          secondary: "#475569",
          muted:     "#94A3B8",
        },
        border: "#E2E8F0",
      },
      boxShadow: {
        sm:    "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        md:    "0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)",
        lg:    "0 10px 30px rgba(15,23,42,0.10), 0 4px 8px rgba(15,23,42,0.04)",
        float: "0 20px 40px rgba(15,23,42,0.14), 0 8px 16px rgba(15,23,42,0.06)",
      },
      borderRadius: {
        card:   "16px",
        "card-sm": "12px",
        btn:    "10px",
      },
      animation: {
        "in":                 "fadeInUp 0.2s ease-out",
        "slide-in-from-right":"slideInRight 0.25s ease-out",
        shimmer:              "shimmer 1.4s ease-in-out infinite",
        "spin-slow":          "spin 1.5s linear infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%":   { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
