// ---- the studio: local pages for adding and editing books and posts. only under `astro dev`;
// a build never sees these routes or the file api behind them
const PAGES = {
  "/studio": "./Index.astro",
  "/studio/books": "./Books.astro",
  "/studio/posts": "./Posts.astro",
  "/studio/preview": "./Preview.astro", // the post preview, inside the posts page
};

export default function studio() {
  return {
    name: "studio",
    hooks: {
      "astro:config:setup": async ({ command, injectRoute, updateConfig }) => {
        if (command !== "dev") return;
        const { default: studioApi } = await import("./api.js"); // sharp etc. only load in dev
        for (const [pattern, file] of Object.entries(PAGES))
          injectRoute({ pattern, entrypoint: new URL(file, import.meta.url) });
        updateConfig({ vite: { plugins: [studioApi()] } });
      },
    },
  };
}
