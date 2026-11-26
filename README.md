# joshuamarkle

My personal site: a home page of projects in glass, an About page and a blog. Astro (static output), plain JavaScript, three.js and Markdown content. There is no CSS framework and no backend.

What is still open before and after release is in [CONCERNS.md](CONCERNS.md). How projects are shown, and how to add one, is in [PROJECTS.md](PROJECTS.md).

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install |
| `npm run dev` | Dev server on http://localhost:4321 |
| `npm run build` | Build to `dist/` |
| `npm run preview` | Serve the build |

Node 22 (`.node-version` and `engines`).

## Pages

| Page | File | What is on it |
|---|---|---|
| `/` | `src/pages/index.astro` | The name, four main projects melting from one to the next, then a wall of the rest |
| `/about/` | `src/pages/about.astro` | Who I am, resume, and a glass Corne you can type on |
| `/blog/` | `src/pages/blog/index.astro` | Posts, with search and a filter |
| `/blog/<slug>/` | `src/pages/blog/[slug].astro` | A post |
| 404 | `src/pages/404.astro` | Page not found |

Projects open in a panel on the home page and have no pages of their own.

## Content

**Posts** are `src/content/blog/*.md` with `title`, `date`, `minutes`, `tags`, `excerpt`, and optionally `cover` and `draft`. Drafts show in dev only. The file name is the URL. Topics in the blog filter are listed in `src/scripts/blog.js`.

**Projects** are `src/content/projects/*.md`. See [PROJECTS.md](PROJECTS.md).

Both schemas are in `src/content.config.js`. The resume is `public/JoshuaMarkleResume.pdf`.

## How it is put together

One WebGL canvas sits behind every page and stays there as pages change (Astro's `ClientRouter`). The HTML holds the text, links and focus; the canvas draws the glass, the lit type and the models to match.

| Folder | What is in it |
|---|---|
| `src/scripts/boot.js` | Starts the stage and mounts each page |
| `src/scripts/stage.js` | The renderer: frame loop, resolution, what is on screen |
| `src/scripts/` | One file a feature: `work` (projects), `peek` (the hover view box), `about`, `board` (the keyboard), `blog`, `post`, `footer`, `scheme` (colours) |
| `src/gl/` | Shaders and models: `logo` (project glass), `corne-glass` and `keyboard`, `halo`, `plate`, `type` and `wave` (lit type), `glass` (interface), `fluid`, `post`, `env`, `gpu` |
| `src/ui/` | Glass interface kit, panels and icons |
| `src/plugins/alerts.js` | GitHub-style callouts in posts |
| `src/logos/` | Project marks the site uses |
| `logos/` | `build.py` draws the project marks; `icon.mjs` renders the site icon (JM in the lit type) from a running build |
| `public/share.jpg` | The picture shown when a page is shared: the home page hero at 1200 by 630 |
| `public/work/` | Project clips and stills |
| `media/raw/` | Original recordings and screenshots. Not in git, so back it up separately |

Fallbacks and settings:

- **No WebGL 2 or float textures:** the same page drawn with CSS. Add `?plain` to any URL to see it.
- **Reduced motion:** `prefers-reduced-motion`, or `?calm`.
- **Slow machines:** resolution steps down on its own and is remembered in local storage (`jm-rung`).
- **Colours:** the footer sliders are kept in local storage (`jm-scheme`).

## Deploying

The repo is https://github.com/JoshuaMarkle/website. Vercel builds it on every push, and a push to `main` goes live on https://joshuamarkle.com. `vercel.json` sets the Astro preset, `astro build` and `dist`.

Earlier sites are in the history. The last one before this (library, papers, project pages, studio) is at `6e6b3c4`, and the Next.js one is at tag `pre-redesign-backup`.
