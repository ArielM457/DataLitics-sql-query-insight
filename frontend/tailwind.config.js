/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: "#D9E1E7",
          mid: "#8FAAB4",
          dark: "#20566D",
          deepest: "#003B52",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #20566D 0%, #003B52 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #D9E1E7 0%, #8FAAB4 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      boxShadow: {
        "brand": "0 4px 24px rgba(0, 59, 82, 0.15)",
        "brand-lg": "0 8px 40px rgba(0, 59, 82, 0.2)",
        "card": "0 2px 12px rgba(0, 59, 82, 0.08)",
        "card-hover": "0 8px 32px rgba(0, 59, 82, 0.14)",
      },
    },
  },
  plugins: [],
};
