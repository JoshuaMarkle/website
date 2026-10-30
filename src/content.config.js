import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    minutes: z.number(),
    tags: z.array(z.string()),
    excerpt: z.string(),
    // main image: right of the entry in the list, under the title on the post.
    // until the file exists it's just a gray box
    cover: z.string().optional(),
    // drafts show in `npm run dev` only, so the studio can save a post before it's done
    draft: z.boolean().default(false),
  }),
});

// the big boxes on the homepage; `order` sets their place, `title` is the side name,
// `video` plays in the box when it's focused, `poster` shows otherwise (or alone)
const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    summary: z.string(),
    video: z.string().optional(),
    poster: z.string(),
  }),
});

// the library shelf; the body, if any, is the review and gets its own page.
// `pages` sets the spine's thickness, `aspect` (cover width / height) its depth;
// with no `spine.image` the spine is drawn from `spine.color` / `spine.ink`.
// edit these in the studio (`npm run dev`, then /studio/books/)
const books = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/books" }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    status: z.enum(["reading", "read", "queued"]),
    rating: z.number().min(1).max(5).optional(),
    finished: z.coerce.date().optional(),
    pages: z.number().default(300),
    cover: z.string().optional(),
    aspect: z.number().default(0.66),
    palette: z.array(z.string()).default([]),
    spine: z
      .object({
        color: z.string().default("#2a2a2a"),
        ink: z.string().default("#e8e8e8"),
        font: z.enum(["sans", "serif", "mono"]).default("sans"),
        bands: z.boolean().default(false),
        image: z.string().optional(),
      })
      .prefault({}), // prefault, not default: so the fields above still fill in
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, projects, books };
