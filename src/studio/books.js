// ---- the book editor: pick or start a book, fill it in, watch the 3D preview, save.
// new images wait in memory (as data urls) until save, then go to public/library/<slug>/

import { bookFaces, bookStyle } from "../scripts/book.js";
import { api, slugify, freeSlug, readAsURL, dropzone, drawList, readForm, fillForm, statusLine, onSaveKey } from "./common.js";
import { palette, suggest } from "./palette.js";

const form = document.getElementById("form");
const ul = document.getElementById("entries");
const bookEl = document.getElementById("book");
const coverDrop = document.getElementById("cover-drop");
const spineDrop = document.getElementById("spine-drop");
const clearSpine = document.getElementById("clear-spine");
const paletteEl = document.getElementById("palette");
const view = document.getElementById("view");
const status = statusLine(document.getElementById("status"));

let books = [];
let current = null; // { slug, data, body } as saved; slug is null for a new book
let colors = []; // the cover's palette
let cover = null; // the cover url to show (saved url, or a data url waiting to be saved)
let spineImage = null;
let pending = {}; // { cover, spine }: data urls not yet uploaded
let dirty = false;

// ---------------------------------------------------------------- preview

let rx = -8;
let ry = -38;
function turn(ease) {
  bookEl.classList.toggle("ease", ease);
  bookEl.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
}

function data() {
  const d = readForm(form);
  d.cover = cover ?? undefined;
  d.palette = colors;
  d.spine = { ...d.spine, image: spineImage ?? undefined };
  return d;
}

function draw() {
  const d = data();
  if (!d.title) d.title = "Untitled";
  bookEl.setAttribute("style", `${bookStyle(d)};transform:${bookEl.style.transform}`);
  bookEl.innerHTML = bookFaces(d);
  coverDrop.classList.toggle("has", Boolean(cover));
  coverDrop.style.backgroundImage = cover ? `url(${cover})` : "";
  spineDrop.classList.toggle("has", Boolean(spineImage));
  spineDrop.style.backgroundImage = spineImage ? `url(${spineImage})` : "";
  clearSpine.hidden = !spineImage;
  drawSwatches();
}

// the palette, plus a row under each spine color to pick from it
function drawSwatches() {
  const chips = (pick, selected) =>
    colors.map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.style.background = c;
      b.title = c;
      b.setAttribute("aria-pressed", String(c === selected));
      b.addEventListener("click", () => pick(c));
      return b;
    });
  paletteEl.replaceChildren(...chips(() => {}, null));
  for (const row of form.querySelectorAll(".swatches[data-for]")) {
    const input = form.elements[row.dataset.for];
    row.replaceChildren(
      ...chips((c) => {
        input.value = c;
        changed();
      }, input.value),
    );
  }
}

// drag to turn
const viewport = document.getElementById("viewport");
viewport.addEventListener("pointerdown", (e) => {
  viewport.setPointerCapture(e.pointerId);
  const start = { x: e.clientX, y: e.clientY, rx, ry };
  const move = (m) => {
    ry = start.ry + (m.clientX - start.x) * 0.5;
    rx = Math.max(-60, Math.min(60, start.rx - (m.clientY - start.y) * 0.3));
    turn(false);
  };
  viewport.addEventListener("pointermove", move);
  viewport.addEventListener("pointerup", () => viewport.removeEventListener("pointermove", move), { once: true });
});
for (const b of document.querySelectorAll("[data-view]"))
  b.addEventListener("click", () => {
    [rx, ry] = b.dataset.view.split(",").map(Number);
    turn(true);
  });

// ---------------------------------------------------------------- images

async function setCover(url) {
  cover = url;
  colors = await palette(url).catch(() => []);
  const img = new Image();
  img.src = url;
  await img.decode();
  form.elements.aspect.value = (img.naturalWidth / img.naturalHeight).toFixed(2);
  changed();
}

dropzone(coverDrop, "image/*", async (file) => {
  pending.cover = await readAsURL(file);
  await setCover(pending.cover);
  applySpine(suggest(colors)); // a fresh cover: start the spine from it too
});
dropzone(spineDrop, "image/*", async (file) => {
  pending.spine = spineImage = await readAsURL(file);
  changed();
});
clearSpine.addEventListener("click", () => {
  spineImage = null;
  delete pending.spine;
  changed();
});

function applySpine({ color, ink }) {
  form.elements["spine.color"].value = color;
  form.elements["spine.ink"].value = ink;
  changed();
}
document.getElementById("suggest").addEventListener("click", () => {
  if (colors.length) applySpine(suggest(colors));
});

// ---------------------------------------------------------------- entries

function changed() {
  dirty = true;
  status.set("unsaved", "dirty");
  draw();
}
form.addEventListener("input", changed);

function open(book) {
  if (dirty && !confirm("Drop unsaved changes?")) return;
  current = book;
  pending = {};
  fillForm(form, book.data);
  form.elements.body.value = book.body ?? "";
  cover = book.data.cover ?? null;
  spineImage = book.data.spine?.image ?? null;
  colors = book.data.palette ?? [];
  dirty = false;
  status.set(book.slug ? `src/content/books/${book.slug}.md` : "new book");
  view.hidden = !book.slug;
  view.href = "/library/";
  list();
  draw();
  // an old book with a cover but no saved palette: work it out
  if (cover && !colors.length) palette(cover).then((c) => ((colors = c), draw()));
}

function list() {
  drawList(ul, books, current?.slug, (b) => [b.data.title, `${b.data.author} · ${b.data.status}`], open);
}

async function load() {
  books = await api("books");
  books.sort((a, b) => a.data.title.localeCompare(b.data.title));
}

async function save() {
  if (!form.reportValidity()) return;
  status.set("saving…");
  try {
    const slug = current.slug ?? freeSlug(slugify(form.elements.title.value), books);
    const dir = `library/${slug}`;
    if (pending.cover) cover = (await api("upload", { dir, name: "cover", file: pending.cover })).url;
    if (pending.spine) spineImage = (await api("upload", { dir, name: "spine", file: pending.spine })).url;
    pending = {};
    const d = data();
    if (!d.spine.image) delete d.spine.image;
    if (!d.palette.length) delete d.palette;
    await api(`books/${slug}`, { data: d, body: form.elements.body.value });
    await load();
    dirty = false;
    open(books.find((b) => b.slug === slug));
    status.set(`saved src/content/books/${slug}.md`);
  } catch (e) {
    status.set(e.message, "bad");
  }
}
form.addEventListener("submit", (e) => {
  e.preventDefault();
  save();
});
onSaveKey(save);

document.getElementById("new").addEventListener("click", () => open({ slug: null, data: {}, body: "" }));
addEventListener("beforeunload", (e) => dirty && e.preventDefault());

await load();
turn(false);
open(books[0] ?? { slug: null, data: {}, body: "" });
