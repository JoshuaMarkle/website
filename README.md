# joshuamarkle

Personal site. Astro (static output, plain JS), Tailwind CSS v4 via `@tailwindcss/vite`, Markdown/MDX content in git, three.js from npm (keyboard page only), self-hosted fonts (`@fontsource-variable/inter-tight`), hosted on Cloudflare Pages.

## Layout

- `src/pages/`: `/` (home), `/blog/` and `/blog/<slug>/`, `/projects/<slug>/`, `/keyboard/`
- `src/content/blog/*.md`: posts with `title`, `date`, `minutes`, `tags`, `excerpt`
- `src/content/projects/*.mdx`: the homepage boxes, with `title` (side name), `order`, `summary` (the paragraph beside a focused box)
- `src/scripts/`: the animation scripts (`site.js`, `blog.js`, `keyboard.js`) and the `<ascii-art>` element
- `src/vendor/ascii/`: the planet piece from ascii.rest (MIT), copied in so nothing loads from a CDN
- `src/styles/`: `global.css` (Tailwind + font) and one stylesheet per page

## Commands

`npm run dev`, `npm run build` (output in `dist/`), `npm run preview`

## Deploy (Cloudflare Pages, from the GitHub repo)

Build command `npm run build`, output directory `dist`, Node 22 (`.node-version`).
