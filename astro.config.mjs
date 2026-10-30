import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { satteri } from "@astrojs/markdown-satteri";
import alerts from "./src/plugins/alerts.js";
import studio from "./src/studio/integration.js";

export default defineConfig({
  output: "static",
  integrations: [mdx(), studio()],
  markdown: { processor: satteri({ hastPlugins: [alerts] }) },
  vite: {
    plugins: [tailwindcss()],
    build: { target: "es2022" }, // keyboard.js awaits at the top level
  },
});
