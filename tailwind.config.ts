import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        border: "var(--border)",
        navy: "var(--navy)",
      },
      fontFamily: {
        sans: ['"Malgun Gothic"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
