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
        background: "#0A0A0A",
        surface:    "#141414",
        surface2:   "#1C1C1C",
        line:       "#2A2A2A",
        primary:    "#FFFFFF",
        accent:     "#C9A84C",
        accent2:    "#1B3A6B",
        secondary:  "#C9A84C",
        success:    "#22C55E",
        danger:     "#EF4444",
        warning:    "#F59E0B",
        "text-primary":   "#FFFFFF",
        "text-secondary": "#A3A3A3",
        "text-muted":     "#525252",
        // legacy aliases kept so old code doesn't break
        "text-main": "#FFFFFF",
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
