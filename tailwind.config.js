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
        primary: "#1B3A6B",
        secondary: "#C9A84C",
        accent: "#E8F0FE",
        success: "#2D7A4F",
        danger: "#C0392B",
        background: "#F7F9FC",
        "text-main": "#1A1A2E",
        "text-muted": "#6B7280",
      },
      fontFamily: {
        heading: ["PlayfairDisplay_700Bold"],
        "heading-regular": ["PlayfairDisplay_400Regular"],
        body: ["DMSans_400Regular"],
        "body-medium": ["DMSans_500Medium"],
        "body-bold": ["DMSans_700Bold"],
        mono: ["JetBrainsMono_400Regular"],
      },
    },
  },
  plugins: [],
};
