// ---- the post editor: pick, start or upload a post, fill in the frontmatter, write, watch the
// preview (the real post page, fed through the site's markdown setup), save.
// images dropped into the text upload right away to public/blog/<slug>/; the cover waits for save

import { api, slugify, freeSlug, today, readAsURL, readAsText, dropzone, drawList, statusLine, onSaveKey } from "./common.js";

const WPM = 230; // reading speed for the minutes guess

const form = document.getElementById("form");
const f = form.elements;
const ul = document.getElementById("entries");
const frame = document.getElementById("preview");
const coverDrop = document.getElementById("cover-drop");
const clearCover = document.getElementById("clear-cover");
const tagPicks = document.getElementById("tag-picks");
const view = document.getElementById("view");
const status = statusLine(document.getElementById("status"));

let posts = [];
let current = null; // { slug, data, body } as saved; slug is null for a new post
let cover = null; // url to show: saved, or a data url waiting for save
let pendingCover = null;
let slugTouched = false; // a new post's slug follows the title until edited by hand
let dirty = false;

const minutesGuess = () => Math.max(1, Math.round(f.body.value.split(/\s+/).filter(Boolean).length / WPM));
const tagList = () =>
  f.tags.value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
const slug = () => f.slug.value || slugify(f.title.value) || "untitled";

function data() {
  return {
    title: f.title.value.trim(),
    date: f.date.value,
    minutes: Number(f.minutes.value) || minutesGuess(),
    tags: tagList(),
    excerpt: f.excerpt.value.trim(),
    cover: cover ?? undefined,
    draft: f.draft.checked,
  };
}

// ---------------------------------------------------------------- preview

let renderTimer;
let ready = false;
function refresh() {
  f.minutes.placeholder = `${minutesGuess()} (from the word count)`;
  clearTimeout(renderTimer);
  renderTimer = setTimeout(async () => {
    if (!ready) return;
    try {
      const { html } = await api("render", { body: f.body.value });
      frame.contentWindow.postMessage({ ...data(), html }, location.origin);
    } catch (e) {
      status.set(e.message, "bad");
    }
  }, 250);
}
// the frame says it's ready, unless it loaded before this script ran
const frameReady = () => {
  ready = true;
  refresh();
};
addEventListener("message", ({ data: m, origin }) => origin === location.origin && m === "ready" && frameReady());
if (frame.contentDocument?.readyState === "complete" && frame.contentWindow.location.href !== "about:blank") frameReady();

// ---------------------------------------------------------------- fields

// every tag used so far, as toggles that edit the tags field
function drawTags() {
  const all = [...new Set([...posts.flatMap((p) => p.data.tags ?? []), ...tagList()])].sort();
  const on = new Set(tagList());
  tagPicks.replaceChildren(
    ...all.map((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t;
      b.setAttribute("aria-pressed", String(on.has(t)));
      b.addEventListener("click", () => {
        on.has(t) ? on.delete(t) : on.add(t);
        f.tags.value = [...on].join(", ");
        changed();
      });
      return b;
    }),
  );
}

function drawCover() {
  coverDrop.classList.toggle("has", Boolean(cover));
  coverDrop.style.backgroundImage = cover ? `url(${cover})` : "";
  clearCover.hidden = !cover;
}

function changed() {
  dirty = true;
  status.set("unsaved", "dirty");
  drawTags();
  drawCover();
  refresh();
}
form.addEventListener("input", (e) => {
  if (e.target === f.slug) slugTouched = true;
  if (e.target === f.title && !current.slug && !slugTouched) f.slug.value = slugify(f.title.value);
  changed();
});

document.getElementById("first-para").addEventListener("click", () => {
  const para = f.body.value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|>|!\[|```|[-*] |\d+\. )/.test(p));
  if (!para) return;
  f.excerpt.value = para
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ");
  changed();
});

dropzone(coverDrop, "image/*", async (file) => {
  pendingCover = cover = await readAsURL(file);
  changed();
});
clearCover.addEventListener("click", () => {
  cover = pendingCover = null;
  changed();
});

// ---------------------------------------------------------------- images in the text

function insertAtCursor(text) {
  const { selectionStart: a, selectionEnd: b, value } = f.body;
  f.body.value = value.slice(0, a) + text + value.slice(b);
  f.body.selectionStart = f.body.selectionEnd = a + text.length;
  f.body.focus();
  changed();
}
async function addImage(file) {
  const stem = file.name.replace(/\.[^.]+$/, "");
  status.set(`uploading ${file.name}…`);
  try {
    const { url } = await api("upload", {
      dir: `blog/${slug()}`,
      name: slugify(stem) || "image",
      file: await readAsURL(file),
    });
    insertAtCursor(`![${stem}](${url})\n`);
  } catch (e) {
    status.set(e.message, "bad");
  }
}
const picker = Object.assign(document.createElement("input"), { type: "file", accept: "image/*", hidden: true });
document.body.append(picker);
document.getElementById("add-image").addEventListener("click", () => picker.click());
picker.addEventListener("change", () => picker.files[0] && addImage(picker.files[0]));
f.body.addEventListener("dragover", (e) => e.preventDefault());
f.body.addEventListener("drop", (e) => {
  const file = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
  if (!file) return;
  e.preventDefault();
  addImage(file);
});
f.body.addEventListener("paste", (e) => {
  const file = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
  if (!file) return;
  e.preventDefault();
  addImage(file);
});

// ---------------------------------------------------------------- entries

function open(post) {
  if (dirty && !confirm("Drop unsaved changes?")) return;
  current = post;
  const d = post.data;
  f.title.value = d.title ?? "";
  f.slug.value = post.slug ?? post.suggestedSlug ?? slugify(d.title ?? "");
  f.slug.readOnly = Boolean(post.slug); // renaming a saved post would leave the old file behind
  f.date.value = String(d.date ?? today()).slice(0, 10);
  f.minutes.value = d.minutes ?? "";
  f.tags.value = (d.tags ?? []).join(", ");
  f.excerpt.value = d.excerpt ?? "";
  f.draft.checked = Boolean(d.draft);
  f.body.value = post.body ?? "";
  cover = d.cover ?? null;
  pendingCover = null;
  slugTouched = Boolean(post.suggestedSlug);
  dirty = false;
  status.set(post.slug ? `src/content/blog/${post.slug}.md` : "new post");
  view.hidden = !post.slug;
  view.href = `/blog/${post.slug}/`;
  list();
  drawTags();
  drawCover();
  refresh();
}

function list() {
  drawList(ul, posts, current?.slug, (p) => [p.data.title, `${String(p.data.date).slice(0, 10)}${p.data.draft ? " · draft" : ""}`], open);
}

async function load() {
  posts = await api("posts");
  posts.sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)));
}

async function save() {
  if (!form.reportValidity()) return;
  status.set("saving…");
  try {
    const s = current.slug ?? freeSlug(f.slug.value, posts);
    if (pendingCover) cover = (await api("upload", { dir: `blog/${s}`, name: "cover", file: pendingCover })).url;
    pendingCover = null;
    await api(`posts/${s}`, { data: data(), body: f.body.value });
    await load();
    dirty = false;
    open(posts.find((p) => p.slug === s));
    status.set(`saved src/content/blog/${s}.md`);
  } catch (e) {
    status.set(e.message, "bad");
  }
}
form.addEventListener("submit", (e) => {
  e.preventDefault();
  save();
});
onSaveKey(save);

// an .md from elsewhere becomes a new, unsaved post
const mdPicker = Object.assign(document.createElement("input"), { type: "file", accept: ".md,.mdx,text/markdown", hidden: true });
document.body.append(mdPicker);
document.getElementById("upload-md").addEventListener("click", () => mdPicker.click());
mdPicker.addEventListener("change", async () => {
  const file = mdPicker.files[0];
  if (!file) return;
  const { data: d, body } = await api("parse", { text: await readAsText(file) });
  open({ slug: null, suggestedSlug: slugify(file.name.replace(/\.mdx?$/, "")), data: d, body });
  if (!d.title) {
    // no frontmatter title: take the first # heading, and drop it from the body
    const h = body.match(/^#\s+(.+)\n+/);
    if (h) {
      f.title.value = h[1].trim();
      f.body.value = body.slice(h[0].length);
    }
  }
  mdPicker.value = "";
  changed();
});

document.getElementById("new").addEventListener("click", () => open({ slug: null, data: {}, body: "" }));
addEventListener("beforeunload", (e) => dirty && e.preventDefault());

await load();
open(posts[0] ?? { slug: null, data: {}, body: "" });
