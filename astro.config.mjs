import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
    build: { target: "es2022" }, // keyboard.js awaits at the top level
  },
});
