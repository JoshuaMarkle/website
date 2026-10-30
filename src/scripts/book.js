// ---- one 3D book: the faces as an html string, so the library (at build) and the studio
// (live, in the browser) draw the same thing. styles in src/styles/book.css

const HEIGHT = 230; // px, the tallest a book stands
const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// small steady size wobble from the title, so the shelf isn't a row of clones
function wobble(text) {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

// height, cover width, and thickness (from the page count), in px
export function bookSize({ title = "", pages = 300, aspect = 0.66 }) {
  const h = Math.round(HEIGHT * (0.86 + 0.14 * wobble(title)));
  const w = Math.round(h * aspect);
  const d = Math.round(Math.min(64, Math.max(16, pages / 11)));
  return { h, w, d };
}

// the css vars a .book3d reads
export function bookStyle(b) {
  const { h, w, d } = bookSize(b);
  const s = b.spine ?? {};
  return [
    `--h:${h}px`,
    `--w:${w}px`,
    `--d:${d}px`,
    `--spine:${s.color ?? "#2a2a2a"}`,
    `--ink:${s.ink ?? "#e8e8e8"}`,
  ].join(";");
}

// the faces: spine toward you, the front cover on the right as on a real shelf
export function bookFaces(b) {
  const s = b.spine ?? {};
  const surname = esc((b.author ?? "").split(" ").at(-1));
  const spine = s.image
    ? `<div class="face spine" style="background-image:url(${esc(s.image)})"></div>`
    : `<div class="face spine font-${s.font ?? "sans"}${s.bands ? " bands" : ""}">` +
      `<span class="spine-title">${esc(b.title)}</span><span class="spine-author">${surname}</span></div>`;
  const front = b.cover
    ? `<div class="face front" style="background-image:url(${esc(b.cover)})"></div>`
    : `<div class="face front plain font-${s.font ?? "sans"}">` +
      `<span class="front-title">${esc(b.title)}</span><span class="front-author">${esc(b.author)}</span></div>`;
  return (
    spine +
    front +
    `<div class="face back"></div><div class="face fore"></div><div class="face top"></div><div class="face bottom"></div>`
  );
}
