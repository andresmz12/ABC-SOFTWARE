/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F5F7FA",
        surface:    "#FFFFFF",
        surface2:   "#EEF2F6",
        line:       "#DDE3EC",
        primary:    "#00B4D8",
        accent:     "#00B4D8",
        accent2:    "#0077B6",
        secondary:  "#00B4D8",
        success:    "#06D6A0",
        danger:     "#EF476F",
        warning:    "#F59E0B",
        "text-primary":   "#0D1B2A",
        "text-secondary": "#5A6A7A",
        "text-muted":     "#9AAAB8",
        // legacy aliases kept so old code doesn't break
        "text-main": "#0D1B2A",
      },
      fontFamily: {
        heading:       ["Inter_700Bold"],
        subheading:    ["Inter_600SemiBold"],
        body:          ["Inter_400Regular"],
        "body-medium": ["Inter_500Medium"],
        "body-bold":   ["Inter_600SemiBold"],
        mono:          ["Inter_400Regular"],
      },
    },
  },
  plugins: [],
};
