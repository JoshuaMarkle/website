// ---- the studio's file api, a vite middleware that only exists under `astro dev`.
// everything is under /__studio/ and reads or writes files in this repo:
//   GET  /__studio/books, /__studio/posts       every entry as { slug, data, body }
//   POST /__studio/books/<slug>, /posts/<slug>  { data, body } → writes the .md
//   POST /__studio/upload                       { dir, name, file (data url) } → public/<dir>/<name>.webp
//   POST /__studio/parse                        { text } → { data, body } (an uploaded .md)
//   POST /__studio/render                       { body } → { html }, with the site's markdown setup

import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import sharp from "sharp";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import alerts from "../plugins/alerts.js";

const ROOT = process.cwd();
const DIRS = { books: "src/content/books", posts: "src/content/blog" };
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const MAX_WIDTH = { cover: 800, spine: 200 }; // uploads by name are shrunk to this; anything else to 1600

// frontmatter in the order the schema lists it, written like the hand-made files
const ORDER = {
  books: ["title", "author", "status", "rating", "finished", "pages", "cover", "aspect", "palette", "spine", "draft"],
  posts: ["title", "date", "minutes", "tags", "excerpt", "cover", "draft"],
};
const RAW = new Set(["date", "finished"]); // dates stay unquoted
const PROSE = new Set(["title", "author", "excerpt"]); // always quoted
const bare = (s) => (/^[a-z][\w-]*$/i.test(s) && !/^(true|false|null|yes|no)$/i.test(s) ? s : JSON.stringify(s));

const sep = (v) => (typeof v === "object" && !Array.isArray(v) ? "" : " "); // nested maps start on the next line
function value(key, v, indent) {
  if (Array.isArray(v)) return `[${v.map(bare).join(", ")}]`;
  if (typeof v === "object")
    return (
      "\n" +
      Object.entries(v)
        .filter(([, x]) => x !== undefined && x !== "")
        .map(([k, x]) => `${indent}  ${k}:${sep(x)}${value(k, x, indent + "  ")}`)
        .join("\n")
    );
  if (typeof v === "string" && !RAW.has(key)) return PROSE.has(key) ? JSON.stringify(v) : bare(v);
  return String(v);
}

function stringify(kind, data, body) {
  const keys = [...ORDER[kind], ...Object.keys(data).filter((k) => !ORDER[kind].includes(k))];
  const lines = keys
    .filter((k) => data[k] !== undefined && data[k] !== "" && data[k] !== null)
    .filter((k) => !(k === "draft" && data[k] === false))
    .map((k) => `${k}:${sep(data[k])}${value(k, data[k], "")}`);
  const text = body.trim();
  return `---\n${lines.join("\n")}\n---\n${text ? `\n${text}\n` : ""}`;
}

function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  return { data: YAML.parse(m[1]) ?? {}, body: m[2].replace(/^\r?\n/, "") };
}

async function list(kind) {
  const dir = path.join(ROOT, DIRS[kind]);
  const files = (await fs.readdir(dir)).filter((f) => /\.mdx?$/.test(f)).sort();
  return Promise.all(
    files.map(async (f) => ({
      slug: f.replace(/\.mdx?$/, ""),
      ...parse(await fs.readFile(path.join(dir, f), "utf8")),
    })),
  );
}

async function save(kind, slug, { data, body = "" }) {
  if (!SLUG.test(slug)) throw new Error(`bad slug: ${slug}`);
  await fs.writeFile(path.join(ROOT, DIRS[kind], `${slug}.md`), stringify(kind, data, body));
  return { slug };
}

// images land in public/<dir>/ as webp, so a cover is /library/<slug>/cover.webp
async function upload({ dir, name, file }) {
  if (!dir.split("/").every((p) => SLUG.test(p)) || !SLUG.test(name)) throw new Error("bad path");
  const bytes = Buffer.from(file.slice(file.indexOf(",") + 1), "base64");
  const out = path.join(ROOT, "public", dir, `${name}.webp`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await sharp(bytes)
    .resize({ width: MAX_WIDTH[name] ?? 1600, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(out);
  const { width, height } = await sharp(out).metadata();
  return { url: `/${dir}/${name}.webp`, width, height };
}

let processor;
async function render({ body }) {
  processor ??= await createSatteriMarkdownProcessor({ hastPlugins: [alerts] });
  const { code } = await processor.render(body ?? "");
  return { html: code };
}

const readJSON = async (req) => {
  let s = "";
  for await (const chunk of req) s += chunk;
  return s ? JSON.parse(s) : {};
};

export default function studioApi() {
  return {
    name: "studio-api",
    configureServer(server) {
      server.middlewares.use("/__studio", async (req, res) => {
        try {
          const [kind, slug] = req.url.split("?")[0].split("/").filter(Boolean);
          const body = req.method === "POST" ? await readJSON(req) : null;
          let out;
          if (kind in DIRS && !slug && req.method === "GET") out = await list(kind);
          else if (kind in DIRS && slug && body) out = await save(kind, slug, body);
          else if (kind === "upload" && body) out = await upload(body);
          else if (kind === "parse" && body) out = parse(body.text ?? "");
          else if (kind === "render" && body) out = await render(body);
          else {
            res.statusCode = 404;
            return res.end("{}");
          }
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(out));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}
