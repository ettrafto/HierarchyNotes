/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./note.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      gridDensity: {
        DEFAULT: "40px",
        fine: "20px",
        coarse: "80px",
      },
    },
  },
  plugins: [],
};

