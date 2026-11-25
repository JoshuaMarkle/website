import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    minutes: z.number(),
    tags: z.array(z.string()),
    excerpt: z.string(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// one file a project. Its mark is src/logos/<id>.svg. `main` ones get a turn as the big piece of glass,
// in order; the rest go on the wall after them.
const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(),
    line: z.string(),
    order: z.number(),
    main: z.boolean().default(false),
    num: z.string().optional(),       // lit behind the glass
    numTall: z.string().optional(),   // the same, for a tall window
    media: z.string(),                // the view box: .mp4, with a .webp of the same name for its poster, or a .webp
    slides: z.number().default(1),    // how many stills: name-1.webp, name-2.webp...
    shot: z.string().optional(),      // what the panel shows instead
    tall: z.boolean().default(false), // a phone
    light: z.boolean().default(false),// a white picture, held down a little
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  }),
});

export const collections = { blog, projects };
