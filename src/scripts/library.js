// ---- the shelves: hovering (or tabbing to) a book pulls it out to show its cover, the books
// either side slide over to make room, and the caption under the shelf names it

const PULLED = 0.88; // how much of the cover shows once pulled out (sin of its turn, in library.css)
const GAP = 10; // px of air between a pulled-out book and its neighbours

const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

for (const row of document.querySelectorAll(".shelf .row")) {
  const caption = row.parentElement.querySelector(".caption");
  const idle = caption.innerHTML;
  const books = [...row.querySelectorAll(".book")];

  function pull(book) {
    for (const b of books) b.classList.toggle("out", b === book);
    if (!book) {
      caption.innerHTML = idle;
      return;
    }
    // the turned book is about cover × PULLED wide where its spine was d, so split the difference
    const box = book.querySelector(".book3d");
    const w = parseFloat(box.style.getPropertyValue("--w"));
    const d = parseFloat(box.style.getPropertyValue("--d"));
    row.style.setProperty("--push", `${Math.max(0, (w * PULLED - d * 0.5) / 2) + GAP}px`);

    const { title, author, rating, finished } = book.dataset;
    const bits = [`<b>${esc(title.toUpperCase())}</b>`, esc(author.toUpperCase())];
    if (rating) bits.push(stars(Number(rating)));
    if (finished) bits.push(finished);
    if ("review" in book.dataset) bits.push("REVIEW →");
    caption.innerHTML = bits.join(" · ");
  }

  for (const b of books) {
    b.addEventListener("pointerenter", () => pull(b));
    b.addEventListener("focus", () => pull(b));
  }
  row.addEventListener("pointerleave", () => pull(null));
  row.addEventListener("focusout", (e) => {
    if (!row.contains(e.relatedTarget)) pull(null);
  });
}
