/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./popup.tsx",
    "./content.tsx",
    "./components/**/*.tsx"
  ],
  theme: {
    extend: {
      colors: {
        background: "oklch(12.9% 0.042 264.695)",
        foreground: "oklch(98.4% 0.003 247.858)",
        primary: {
          DEFAULT: "oklch(20.8% 0.042 265.755)",
          light: "oklch(92.9% 0.013 255.508)",
        },
        card: "oklch(27.9% 0.041 260.031)",
        border: "oklch(37.2% 0.044 257.287)",
        compulsory: "#ea580c",
        optional: "#94a3b8",
        destructive: "oklch(70.4% 0.191 22.216)",
        success: "oklch(75.2% 0.182 145.23)",
        "info-cyan": "oklch(76.5% 0.165 200.43)",
      },
      fontFamily: {
        display: ["ClashDisplay", "sans-serif"],
        body: ["Geist", "Inter", "sans-serif"],
        mono: ["Geist Mono", "DM Mono", "monospace"],
      }
    },
  },
  plugins: [],
}
