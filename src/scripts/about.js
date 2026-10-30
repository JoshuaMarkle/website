// ---- order: name glitches in → nav glitches in (as on blog, but the nav just sits in its bar) → paragraph fades in

import { onLeave, arrivedAtTop } from "./handoff.js";

// glitch (same as site)
const START_DELAY = 250; // pause before the name comes in
const STAGGER = 120; // gap between items coming in
const GLITCH_MS = 450; // how long each item scrambles before it settles
const GLITCH_FRAME = 100; // ms between glyph swaps
const AT_TOP = 60; // scrolled less than this counts as at the top (same as DOCK_AT on home and blog)
const GLYPHS = "█▓▒░▚▞▙▟▛▜■□▪◆◇◊¤§¶#%&@∆Ø╳╱╲┼╬▲▼◐◑⌘∑";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

// split text into per-char spans that can be glitched in
function chars(el, text) {
  el.textContent = "";
  el.setAttribute("aria-label", text);
  for (const c of text) {
    const s = document.createElement("span");
    s.className = "ch hidden";
    s.textContent = c;
    el.appendChild(s);
  }
}

// every char scrambles, then they lock in left to right over GLITCH_MS
function glitch(el, ms = GLITCH_MS) {
  const cs = [...el.querySelectorAll(".ch")];
  const t0 = performance.now();
  const tick = () => {
    const t = performance.now() - t0;
    cs.forEach((s, k) => {
      const settleAt = ms * (0.4 + (0.6 * (k + 1)) / cs.length);
      if (t >= settleAt) {
        s.className = "ch";
      } else {
        s.className = "ch scramble";
        s.dataset.g = rand();
      }
    });
    if (t < ms) setTimeout(tick, GLITCH_FRAME);
  };
  tick();
}

const nameLines = [...document.querySelectorAll("h1 span")];
const navItems = [...document.querySelectorAll("nav a")];
const main = document.querySelector("main");
for (const el of [...nameLines, ...navItems]) chars(el, el.textContent);

// came from a page left at the top: the name and nav are already where they were, so they just appear
const quiet = arrivedAtTop();
if (quiet) for (const c of document.querySelectorAll(".ch")) c.className = "ch";
onLeave(() => scrollY < AT_TOP);

async function intro() {
  if (reduceMotion) {
    for (const c of document.querySelectorAll(".ch")) c.className = "ch";
    main.classList.add("on");
    return;
  }
  if (!quiet) {
    await wait(START_DELAY);
    nameLines.forEach((l, i) => setTimeout(() => glitch(l), i * STAGGER));
    await wait(nameLines.length * STAGGER);
    navItems.forEach((a, i) => setTimeout(() => glitch(a), i * STAGGER * 0.5));
    await wait(navItems.length * STAGGER * 0.5 + GLITCH_MS * 0.5);
  }
  main.classList.add("on");
}

// wait for the font so the glitch starts with the real letters (fall back after 2s if offline)
Promise.race([
  document.fonts.load('500 14px "Inter Tight"').then(() => document.fonts.ready),
  wait(2000),
]).then(intro);
