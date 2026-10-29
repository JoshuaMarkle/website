import "./ascii-art.js";

// ---- order: name grows in + flies up → nav glitches in + planet fades in → projects glitch/fade in

// name (same as name-reveal)
const NAME_INTRO = true; // false: skip the grow-in + fly, the name just starts settled at the top
const FINAL_GAP_EM = 0.1; // wide tracking for the final name (also in the h1 css)
const FINAL_LINE_HEIGHT = 1; // JOSHUA to MARKLE spacing in the final name, in font sizes
const BIG_SCALE = 0.75; // size of the bold grow-in words, relative to the largest that fits
const BIG_LINE_HEIGHT = 0.95; // JOSHUA to MARKLE spacing while growing in, in font sizes
const START_DELAY = 250; // pause before the first word appears
const ENTER_STAGGER = 65; // gap between letters growing in (both words)
const HOLD_MS = 1000; // pause after a letter lands before it flies
const FLY_MS = 550; // each letter flying to the top
const FLY_STAGGER = 100;
const FLY_REVERSE = true; // letters fly out in the opposite order they came in
const CURVE = 0.18; // how far the flight path bows sideways
const MARKLE_DELAY = 400; // MARKLE starts growing in this long after JOSHUA does

// glitch (same as navbars)
const NAV_DELAY = 400; // pause after the name settles before the nav comes in
const STAGGER = 160; // gap between items coming in (nav, then projects)
const GLITCH_MS = 450; // how long each item scrambles before it settles
const GLITCH_FRAME = 100; // ms between glyph swaps
const GLYPHS = "█▓▒░▚▞▙▟▛▜■□▪◆◇◊¤§¶#%&@∆Ø╳╱╲┼╬▲▼◐◑⌘∑";

// dock (same as nav-dock)
const DOCK_MS = 900; // the whole flight, once triggered
const DOCK_AT = 60; // scrolling down past this px sends the nav to the dock
const UNDOCK_AT = 30; // scrolling back up above this px sends it home
const DOCK_STAGGER = 0.09; // per-item delay, as a fraction of the flight
const MARKER_GAP = 10; // px between the glyph and the item it points at

// focus
const FOCUS_LINE = 0.5; // where the focus sits, as a fraction of the screen height from the top
const FOCUS_RANGE = 0.3; // a box's center must be within this fraction of the screen height of the line

// project paragraphs
const BLURB_DWELL = 500; // a box has to hold focus this long before its paragraph comes in
const BLURB_WORD_STAGGER = 22; // paragraph glitch: gap between words coming in, so it types out (as paragraphs/)
const BLURB_JUSTIFY_DELAY = 1000; // pause after the glitch settles before justifying
const BLURB_JUSTIFY_MS = 600; // words sliding out to the justified box
const BLURB_W = 260; // paragraph width, px (narrower if there's less room)
const BLURB_MIN_W = 140; // less room than this beside the content and paragraphs don't show
const BLURB_GAP = 10; // px between a name and its paragraph

// stars around the planet
const STARS = 14;
const STAR_GLYPHS = "+*";
const STAR_SPREAD = 1.6; // how far out stars reach sideways, in planet widths
const STAR_SPREAD_Y = 1.2; // how far out stars reach up and down, in planet heights
const STAR_CLEAR = 12; // px kept clear around the planet's oval

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

// split text into per-char spans that can be glitched in ("\n" breaks the line)
function chars(el, text) {
  el.textContent = "";
  el.setAttribute("aria-label", text.replace("\n", " "));
  for (const c of text) {
    if (c === "\n") {
      el.appendChild(document.createElement("br"));
      continue;
    }
    const s = document.createElement("span");
    s.className = "ch hidden";
    s.textContent = c;
    el.appendChild(s);
  }
}

// Every char scrambles, then they lock in left to right over GLITCH_MS
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

// ---------------------------------------------------------------- name

// Words grow in stacked around the screen centre (JOSHUA above, MARKLE below)
// flyEach: each letter takes off as soon as it lands, instead of waiting for the whole word
// flyLead: letters take off this many ms before they finish growing in
// delay: when the word starts growing in, measured from JOSHUA's start
const words = [
  { text: "JOSHUA", reverse: false, enterMs: 800, flyEach: true }, // J leads
  {
    text: "MARKLE",
    reverse: true,
    enterMs: 800,
    delay: MARKLE_DELAY,
    flyLead: 250,
  }, // E leads
];
const h1 = document.querySelector("h1");
const stage = document.getElementById("stage");
const meter = document.getElementById("meter");
let small;
let nameDone = false;

for (const w of words) {
  const line = document.createElement("span");
  h1.appendChild(line);
  w.slots = [...w.text].map((ch) => {
    const s = document.createElement("span");
    s.textContent = ch;
    line.appendChild(s);
    return s;
  });
  w.spans = [...w.text].map((ch) => {
    const s = document.createElement("span");
    s.className = "letter";
    s.textContent = ch;
    stage.appendChild(s);
    return s;
  });
  w.order = w.spans.map((_, j) => j);
  if (w.reverse) w.order.reverse();
}

const T = (x, y, s) =>
  `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
const center = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

// Lay the word out in the hidden meter and return each letter's center
function measureWord(text, size, gap, weight, top) {
  meter.textContent = "";
  for (const ch of text) {
    const s = document.createElement("span");
    s.textContent = ch;
    meter.appendChild(s);
  }
  Object.assign(meter.style, {
    fontSize: size + "px",
    gap: gap + "px",
    fontWeight: weight,
    top: top + "px",
  });
  const width = meter.getBoundingClientRect().width;
  const pts = [...meter.children].map(center);
  return { width, pts };
}

// size the settled name (same rule as name-reveal), which the rest of the layout hangs off
function sizeName() {
  const vw = innerWidth,
    vh = innerHeight;
  const finalRatio = Math.max(
    ...words.map(
      (w) => measureWord(w.text, 100, 100 * FINAL_GAP_EM, 700, 0).width / 100,
    ),
  );
  small = Math.min((vw * 0.6) / finalRatio, vh * 0.065, 64);
  root.style.setProperty("--name", small + "px");
}

// big grow-in positions, plus each letter's settled spot in the h1
function nameLayout() {
  const vw = innerWidth,
    vh = innerHeight;
  for (const w of words)
    w.big =
      BIG_SCALE *
      Math.min(
        (vw * 0.94) / (measureWord(w.text, 100, 0, 900, 0).width / 100),
        (vh / words.length) * 1.1,
      );
  const bigStep = Math.min(
    vh / words.length,
    Math.max(...words.map((w) => w.big)) * BIG_LINE_HEIGHT,
  );
  words.forEach((w, i) => {
    w.from = measureWord(
      w.text,
      w.big,
      0,
      900,
      vh / 2 + (i - (words.length - 1) / 2) * bigStep,
    ).pts;
    w.to = w.slots.map(center);
  });
}

// A flying letter has landed: hand over to the real one in the h1
function land(w, j) {
  for (const a of w.spans[j].getAnimations()) a.cancel();
  w.spans[j].style.display = "none";
  w.slots[j].classList.add("on");
}

function finishName() {
  nameDone = true;
  for (const w of words) w.spans.forEach((_, j) => land(w, j));
  root.classList.remove("locked");
}

function enter(w) {
  return Promise.all(
    w.order.map((j, k) => {
      const s = w.spans[j],
        p = w.from[j];
      s.style.fontSize = w.big + "px";
      return s.animate(
        [
          { transform: T(p.x, p.y, 0), opacity: 0, fontWeight: 100 },
          {
            transform: T(p.x, p.y, 1.15),
            opacity: 1,
            fontWeight: 600,
            offset: 0.55,
          },
          { transform: T(p.x, p.y, 1), opacity: 1, fontWeight: 900 },
        ],
        {
          duration: w.enterMs,
          delay: k * ENTER_STAGGER,
          easing: "cubic-bezier(.2,.8,.25,1)",
          fill: "both",
        },
      ).finished;
    }),
  );
}

// When the word's first letter takes off, measured from the start of its entry
function flyStart(w) {
  const landed =
    w.flyEach && !FLY_REVERSE
      ? w.enterMs
      : w.enterMs + (w.text.length - 1) * ENTER_STAGGER;
  return landed + HOLD_MS - (w.flyLead || 0);
}

// Each letter flies on its own curved (quadratic bezier) path to its slot in the h1
function fly(w) {
  const end = small / w.big;
  const start = flyStart(w);
  return Promise.all(
    w.order.map((j, k) => {
      const r = FLY_REVERSE ? w.order.length - 1 - k : k; // place in the fly-out order
      const a = w.from[j],
        b = w.to[j];
      const c = {
        x: (a.x + b.x) / 2 - (b.y - a.y) * CURVE,
        y: (a.y + b.y) / 2 + (b.x - a.x) * CURVE,
      };
      const frames = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20,
          u = 1 - t;
        const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
        const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
        frames.push({
          transform: T(x, y, 1 + (end - 1) * t),
          opacity: 1,
          fontWeight: 900 + (700 - 900) * t,
        });
      }
      const anim = w.spans[j].animate(frames, {
        duration: FLY_MS,
        delay: Math.max(
          start + r * FLY_STAGGER,
          w.enterMs + k * ENTER_STAGGER + HOLD_MS - (w.flyLead || 0),
        ),
        easing: "cubic-bezier(.65,0,.25,1)",
        fill: "forwards",
      });
      return anim.finished.then(
        () => land(w, j),
        () => {},
      );
    }),
  );
}

// resolves once the name has settled (or was skipped by a resize)
let skipName = () => {};
function playName() {
  return new Promise(async (resolve) => {
    skipName = () => {
      finishName();
      resolve();
    };
    nameLayout();
    await wait(START_DELAY);
    if (nameDone) return;
    // Words run independently, so MARKLE doesn't wait for JOSHUA to finish
    await Promise.all(
      words.map(async (w) => {
        await wait(w.delay || 0);
        if (nameDone) return;
        enter(w).catch(() => {}); // cancelled by a skip
        await fly(w);
      }),
    );
    if (!nameDone) skipName();
  });
}

// ---------------------------------------------------------------- dock

const main = document.querySelector("main");
const planet = document.querySelector(".planet");
const boxes = [...document.querySelectorAll(".box")];
const names = boxes.map((b) => {
  const h = document.createElement("h2");
  h.className = "side-title";
  chars(h, b.dataset.title);
  document.body.appendChild(h);
  return h;
});
const blurbs = boxes.map(() => {
  const p = document.createElement("p");
  p.className = "blurb";
  document.body.appendChild(p);
  return p;
});
const mosaic = document.querySelector(".mosaic");
const tiles = [...mosaic.querySelectorAll(".tile")];
const slots = [...document.querySelectorAll("nav a")];
const flies = slots.map((s) => {
  const a = document.createElement("a");
  a.className = "fly";
  a.href = { ABOUT: "/about/", BLOG: "/blog/" }[s.textContent] ?? "#";
  chars(a, s.textContent);
  document.body.appendChild(a);
  return a;
});

// the glyph points at WORK beside the boxes, PROJECTS beside the mosaic
const workSlot = slots.findIndex((s) => s.textContent === "WORK");
const sideSlot = slots.findIndex((s) => s.textContent === "PROJECTS");
let target = workSlot;
const marker = document.createElement("div");
marker.className = "marker";
marker.innerHTML = "<span>→</span>";
document.body.appendChild(marker);

let starts = [];
let ends = [];
let pos = []; // where each nav item was drawn this frame
let spans = []; // each box's top and bottom, in page coordinates
let sideStop = 0; // y where the nav stack (and the project names) stick
let rest = {}; // box layout at rest (first top, short and tall heights, gap), for picking focus
let focused = -1;
let hovered = -1; // a hovered box takes the focus over from scroll
let focusMs = 0;
let docked = false; // toggled by scroll; the flight follows it
let dockP = 0; // flight progress, 0 at the bar to 1 at the dock
let dockRun = 0;
let dockLast = 0;
let settle = 0; // keep rendering every frame until boxes finish resizing

function measure() {
  const css = getComputedStyle(root);
  const px = (name) => parseFloat(css.getPropertyValue(name));
  const gutter = px("--gutter");
  const pad = px("--pad");
  const top = px("--dock-top");
  const gap = px("--dock-gap");

  // start: the item's place in the static bar, in page coordinates
  starts = slots.map((s) => {
    const r = s.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY };
  });

  // end: stacked just right of the content, its top level with the first
  // project's top (see render); pulled back in if the window is too narrow
  const m = main.getBoundingClientRect();
  const contentRight =
    m.right - parseFloat(getComputedStyle(main).paddingRight);
  const widest = Math.max(...flies.map((f) => f.offsetWidth));
  const x = Math.min(contentRight + pad, innerWidth - gutter - widest);
  ends = slots.map((s, i) => ({
    x,
    y: i * (s.offsetHeight + gap), // offset from the top of the stack
  }));

  // project names: right edge sits the same pad off the content's left edge
  const contentLeft = m.left + parseFloat(getComputedStyle(main).paddingLeft);
  names.forEach((n) => {
    n.style.left = Math.max(gutter, contentLeft - pad - n.offsetWidth) + "px";
  });
  // paragraphs: right edge level with their name's
  blurbs.forEach((b, i) => {
    const right = Math.max(gutter + names[i].offsetWidth, contentLeft - pad);
    const w = Math.min(BLURB_W, right - gutter);
    b.hidden = w < BLURB_MIN_W;
    b.style.width = w + "px";
    b.style.left = right - w + "px";
  });
  measureSpans();
  const w = boxes[0].offsetWidth;
  rest = {
    top: spans[0].top,
    short: (w * 5) / 16,
    tall: (w * 10) / 16,
    gap: parseFloat(getComputedStyle(boxes[0]).marginBottom),
  };
  focusMs = parseFloat(css.getPropertyValue("--focus-ms"));
  sideStop = top;
}

// boxes resize with focus, so their spans are re-read every render
function measureSpans() {
  spans = boxes.map((b) => {
    const r = b.getBoundingClientRect();
    return { top: r.top + scrollY, bottom: r.bottom + scrollY };
  });
}

const clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function render() {
  // focus the box whose center is nearest the focus line, if it's close enough;
  // judged by where each box would sit once focused, so the pick doesn't
  // flicker while boxes resize
  const line = scrollY + innerHeight * FOCUS_LINE;
  let focus = -1;
  let best = innerHeight * FOCUS_RANGE;
  boxes.forEach((_, i) => {
    const center = rest.top + i * (rest.short + rest.gap) + rest.tall / 2;
    const d = Math.abs(center - line);
    if (d < best) {
      best = d;
      focus = i;
    }
  });
  if (hovered >= 0 && !root.classList.contains("locked")) focus = hovered;
  if (focus !== focused) {
    focused = focus;
    boxes.forEach((b, i) => b.classList.toggle("focus", i === focus));
    names.forEach((n, i) => n.classList.toggle("focus", i === focus));
    dwellOn(focus);
    const start = settle < performance.now();
    settle = performance.now() + focusMs + 50;
    if (start) requestAnimationFrame(settling);
  }
  measureSpans();

  const p = dockP;
  const span = 1 - DOCK_STAGGER * (flies.length - 1);
  // the stack rides with the top of the first project, then sticks at --dock-top
  const stackTop = Math.max(sideStop, spans[0].top - scrollY);

  flies.forEach((el, i) => {
    const t = ease(clamp((p - i * DOCK_STAGGER) / span));
    // start rides up with the page; end rides with the stack
    const s = { x: starts[i].x, y: starts[i].y - scrollY };
    const e = { x: ends[i].x, y: stackTop + ends[i].y };
    // control point pulls the path into a curve: out right first, then down
    const c = { x: s.x + (e.x - s.x) * 0.85, y: s.y - 24 };
    const u = 1 - t;
    const x = u * u * s.x + 2 * u * t * c.x + t * t * e.x;
    const y = u * u * s.y + 2 * u * t * c.y + t * t * e.y;
    el.style.transform = `translate(${x}px, ${y}px)`;
    pos[i] = { x, y };
  });

  // each name starts level with its box, sticks level with docked ABOUT,
  // and is carried off by the bottom of its box
  // (with its paragraph under it while that's showing)
  names.forEach((n, i) => {
    const { top, bottom } = spans[i];
    const b = blurbs[i];
    const below = b.classList.contains("on") ? BLURB_GAP + b.offsetHeight : 0;
    const y = Math.min(
      Math.max(sideStop, top - scrollY),
      bottom - scrollY - n.offsetHeight - below,
    );
    n.style.transform = `translateY(${y}px)`;
    b.style.transform = `translateY(${y + n.offsetHeight + BLURB_GAP}px)`;
  });

  const m = mosaic.getBoundingClientRect();

  // work is active from when the first name sticks until the last one leaves,
  // side projects while the mosaic spans the dock line; the glyph keeps its item while hidden
  const first = spans[0];
  const last = spans[spans.length - 1];
  const work =
    scrollY >= first.top - sideStop && scrollY < last.bottom - sideStop;
  const side = m.top <= sideStop && m.bottom > sideStop;
  if (work) target = workSlot;
  else if (side) target = sideSlot;
  marker.classList.toggle("on", work || side);
  const at = pos[target];
  marker.style.transform = `translate(${at.x - marker.offsetWidth - MARKER_GAP}px, ${at.y}px)`;
}

// ---------------------------------------------------------------- paragraphs

// a box that holds focus for BLURB_DWELL gets its paragraph; losing focus fades it out
let dwell = 0;
const blurbRun = blurbs.map(() => 0); // bumped to cancel a paragraph's pending steps
function dwellOn(i) {
  clearTimeout(dwell);
  blurbs.forEach((b, k) => k !== i && hideBlurb(k));
  if (i >= 0) dwell = setTimeout(() => showBlurb(i), BLURB_DWELL);
}

// words wrapped so they never break inside, chars split for the glitch
function fillBlurb(i) {
  const b = blurbs[i];
  b.textContent = "";
  b.classList.remove("box-shape");
  boxes[i].dataset.blurb.split(" ").forEach((word, k) => {
    if (k) b.append(" ");
    const w = document.createElement("span");
    w.className = "word";
    chars(w, word);
    w.removeAttribute("aria-label");
    b.append(w);
  });
}

// paragraphs/' glyph glitch: words appear one after another (typed out), each
// scrambling then locking in left to right over GLITCH_MS; resolves once all settle
function glitchWords(b, live) {
  const plan = [];
  [...b.querySelectorAll(".word")].forEach((w, i) => {
    const cs = [...w.children];
    const start = i * BLURB_WORD_STAGGER;
    cs.forEach((c, k) =>
      plan.push({
        c,
        start,
        settle: start + GLITCH_MS * (0.4 + (0.6 * (k + 1)) / cs.length),
        last: -1e9,
      }),
    );
  });
  return new Promise((done) => {
    const t0 = performance.now();
    (function tick(now) {
      if (!live()) return done();
      const t = now - t0;
      let busy = false;
      for (const q of plan) {
        if (t < q.start) busy = true;
        else if (t >= q.settle) q.c.className = "ch";
        else {
          busy = true;
          q.c.className = "ch scramble";
          if (now - q.last >= GLITCH_FRAME) {
            q.c.dataset.g = rand();
            q.last = now;
          }
        }
      }
      if (busy) requestAnimationFrame(tick);
      else done();
    })(t0);
  });
}

async function showBlurb(i) {
  const b = blurbs[i];
  if (b.hidden || !boxes[i].classList.contains("on")) return;
  const run = ++blurbRun[i];
  fillBlurb(i);
  b.classList.add("on");
  render(); // its name may need to ride higher to fit it
  if (reduceMotion) {
    for (const c of b.querySelectorAll(".ch")) c.className = "ch";
    b.classList.add("box-shape");
    return;
  }
  await glitchWords(b, () => run === blurbRun[i]);
  await wait(BLURB_JUSTIFY_DELAY);
  if (run !== blurbRun[i]) return;
  // justify, then slide each word from where it was (same lines, so only x moves)
  const words = [...b.querySelectorAll(".word")];
  const was = words.map((w) => w.getBoundingClientRect().left);
  b.classList.add("box-shape");
  words.forEach((w, k) => {
    const dx = was[k] - w.getBoundingClientRect().left;
    if (dx)
      w.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], {
        duration: BLURB_JUSTIFY_MS,
        easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      });
  });
}

function hideBlurb(i) {
  const b = blurbs[i];
  if (!b.classList.contains("on")) return;
  const run = ++blurbRun[i];
  b.classList.remove("on");
  setTimeout(() => {
    if (run === blurbRun[i]) b.textContent = ""; // cleared once faded
  }, 250);
}

// ---------------------------------------------------------------- mosaic

// PRESS ME: the tiles start hidden, so the first press just bursts them out of
// the button. After that every press shrinks them and sucks them into the
// button, speeding up exponentially; a beat later they burst back out to full
// size at random spots across the mosaic, and they can be dragged around.
const press = mosaic.querySelector(".press");
const SUCK_MS = 650; // each tile's pull-in
const SUCK_STAGGER = 35; // gap between tiles starting to get pulled in
const SUCKED_MS = 1000; // pause with everything inside the button
const BURST_MS = 700; // each tile's fly back out
const BURST_STAGGER = 20;
const SHAKE_MS = 450; // screenshake as they burst out
const SHAKE_PX = 14; // its starting strength, dying away quadratically
const expoIn = (p) => (p <= 0 ? 0 : 2 ** (10 * (p - 1)));
const expoOut = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
const SPREAD = 0.8; // scattered tiles land across this much of the window width
const spot = new Map(); // tile → { x, y } from the mosaic's top left
const origin = new Map(); // tile → where it's laid out before its transform
let busy = false;
let revealed = false; // tiles hidden until the first press bursts them out
let zTop = 1; // the last dragged tile stays on top
let looseWidth = 0; // window width when the tiles were lifted out

function place(t, x, y, s = 1) {
  const o = origin.get(t);
  t.style.transform = `translate(${x - o.x}px, ${y - o.y}px) scale(${s})`;
}

// lift the tiles out of the grid where they're drawn; the mosaic keeps its height
function loosen() {
  if (tiles[0].classList.contains("loose")) return;
  looseWidth = innerWidth;
  const g = mosaic.getBoundingClientRect();
  const rects = tiles.map((t) => t.getBoundingClientRect());
  mosaic.style.height = g.height + "px";
  tiles.forEach((t, i) => {
    const r = rects[i];
    t.style.width = r.width + "px";
    t.style.height = r.height + "px";
    t.classList.add("loose");
    t.style.transform = "none";
    const o = t.getBoundingClientRect(); // measured, not assumed to be the mosaic's corner
    origin.set(t, { x: o.left - g.left, y: o.top - g.top });
    spot.set(t, { x: r.left - g.left, y: r.top - g.top });
    place(t, r.left - g.left, r.top - g.top);
  });
}

// back into the grid (on resize, since loose sizes are in px)
function tighten() {
  mosaic.style.height = "";
  for (const t of tiles) {
    t.classList.remove("loose");
    t.style.width = t.style.height = t.style.transform = t.style.zIndex = "";
  }
}

// jolt the whole page by a random offset each frame, fading out
function shake() {
  if (reduceMotion) return;
  const s = document.body.style;
  const start = performance.now();
  (function tick(now) {
    const p = (now - start) / SHAKE_MS;
    if (p >= 1) {
      s.removeProperty("--shake-x");
      s.removeProperty("--shake-y");
      return;
    }
    const a = SHAKE_PX * (1 - p) ** 2;
    s.setProperty("--shake-x", (Math.random() * 2 - 1) * a + "px");
    s.setProperty("--shake-y", (Math.random() * 2 - 1) * a + "px");
    requestAnimationFrame(tick);
  })(start);
}

// run frame(tile, progress 0..1) for every tile, staggered in a random order
function animate(ms, stagger, frame) {
  if (reduceMotion) {
    for (const t of tiles) frame(t, 1);
    return Promise.resolve();
  }
  const order = tiles.map(() => Math.random());
  const rank = new Map(
    tiles
      .map((t, i) => [t, order[i]])
      .sort((a, b) => a[1] - b[1])
      .map(([t], k) => [t, k]),
  );
  const total = ms + stagger * (tiles.length - 1);
  return new Promise((done) => {
    const start = performance.now();
    (function tick(now) {
      const e = now - start;
      for (const t of tiles)
        frame(t, Math.min(1, Math.max(0, (e - rank.get(t) * stagger) / ms)));
      if (e < total) requestAnimationFrame(tick);
      else done();
    })(start);
  });
}

press.addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  loosen();
  // aim at the button where it's actually drawn
  const g = mosaic.getBoundingClientRect();
  const b = press.getBoundingClientRect();
  const cx = b.left + b.width / 2 - g.left;
  const cy = b.top + b.height / 2 - g.top;
  if (revealed) {
    // in: slide toward the button's centre and shrink to nothing
    await animate(SUCK_MS, SUCK_STAGGER, (t, p) => {
      const { x, y } = spot.get(t);
      const e = expoIn(p);
      const tx = cx - t.offsetWidth / 2;
      const ty = cy - t.offsetHeight / 2;
      place(t, x + (tx - x) * e, y + (ty - y) * e, 1 - e);
    });
    await wait(SUCKED_MS);
  } else {
    // first press: they appear already inside the button, no fade
    revealed = true;
    for (const t of tiles) {
      place(t, cx - t.offsetWidth / 2, cy - t.offsetHeight / 2, 0);
      t.style.transition = "none";
      t.classList.add("on");
    }
  }
  // out: from the button to a random spot, full size: across the middle
  // SPREAD of the window's width and the mosaic's height
  const vw = document.documentElement.clientWidth;
  const left = (vw * (1 - SPREAD)) / 2 - g.left;
  for (const t of tiles)
    spot.set(t, {
      x: left + Math.random() * Math.max(0, vw * SPREAD - t.offsetWidth),
      y: Math.random() * (mosaic.clientHeight - t.offsetHeight),
    });
  shake();
  await animate(BURST_MS, BURST_STAGGER, (t, p) => {
    const { x, y } = spot.get(t);
    const e = expoOut(p);
    const sx = cx - t.offsetWidth / 2;
    const sy = cy - t.offsetHeight / 2;
    place(t, sx + (x - sx) * e, sy + (y - sy) * e, e);
  });
  busy = false;
});

// drag scattered tiles
for (const t of tiles)
  t.addEventListener("pointerdown", (e) => {
    if (busy || !t.classList.contains("loose")) return;
    e.preventDefault();
    t.setPointerCapture(e.pointerId);
    t.classList.add("drag");
    t.style.zIndex = ++zTop;
    const s = spot.get(t);
    const ox = e.clientX - s.x;
    const oy = e.clientY - s.y;
    const move = (m) => {
      s.x = m.clientX - ox;
      s.y = m.clientY - oy;
      place(t, s.x, s.y);
    };
    const up = () => {
      t.classList.remove("drag");
      t.removeEventListener("pointermove", move);
      t.removeEventListener("pointerup", up);
      t.removeEventListener("pointercancel", up);
    };
    t.addEventListener("pointermove", move);
    t.addEventListener("pointerup", up);
    t.addEventListener("pointercancel", up);
  });

// names and the dock follow the boxes while they grow and shrink
function settling() {
  render();
  if (performance.now() < settle) requestAnimationFrame(settling);
}

let queued = false;
function onScroll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    // the nav is a toggle: past a threshold it flies the whole way, whatever the scroll does after
    const goal = docked ? scrollY >= UNDOCK_AT : scrollY > DOCK_AT;
    if (goal !== docked) {
      docked = goal;
      if (reduceMotion) dockP = docked ? 1 : 0;
      else if (!dockRun) {
        dockLast = performance.now();
        dockRun = requestAnimationFrame(dockStep);
      }
    }
    render();
  });
}

// eases the flight toward wherever the toggle points, reversing smoothly from mid-flight
function dockStep(now) {
  const dir = docked ? 1 : -1;
  dockP = clamp(dockP + (dir * Math.max(0, now - dockLast)) / DOCK_MS);
  dockLast = now;
  render();
  dockRun = dockP === (docked ? 1 : 0) ? 0 : requestAnimationFrame(dockStep);
}

function refresh() {
  buildMarquee();
  sizeName();
  measure();
  render();
}

// ---------------------------------------------------------------- intro

// ---------------------------------------------------------------- marquee
// letters ride a sine wave that runs a little past both screen edges (so they enter and leave out
// of sight); each is placed by arc length and turned to the slope; sliding back one phrase loops seamlessly

const MARQUEE_TEXT = "SIDE PROJECTS \u00a0·\u00a0 ";
const MARQUEE_SPEED = 50; // px per second along the wave
const MARQUEE_WAVES = () => (innerWidth < 768 ? 1 : 2); // full waves across the screen
const MARQUEE_AMP = 0.3; // wave height, as a fraction of the marquee height
const marquee = document.querySelector(".marquee");
let letters = []; // { el, at: center along one run of text, w }
let phrase = 0; // length of one MARQUEE_TEXT
let waveLen = 0; // arc length of the whole wave
let arcX = new Float32Array(0); // x at every 1px of arc length
let marqueeOffset = 0;
let marqueeSize = ""; // font size the letters were measured at
let marqueeWidths = []; // width of each letter in one phrase
let marqueeY = (x) => 0;

function buildMarquee() {
  const w = marquee.clientWidth;
  const h = marquee.clientHeight;
  const k = (2 * Math.PI * MARQUEE_WAVES()) / w;
  const amp = h * MARQUEE_AMP;
  marqueeY = (x) => h / 2 - amp * Math.sin(k * x);
  const slope = (x) => -amp * k * Math.cos(k * x);

  // one phrase laid out flat gives each letter's width (same for every copy);
  // only re-measured when the font size changes, so resizing never rebuilds the letters
  const size = getComputedStyle(marquee).fontSize;
  if (size !== marqueeSize || !phrase) {
    for (const l of letters) l.el.remove();
    letters = [];
    const probe = [...MARQUEE_TEXT].map((c) => {
      const el = document.createElement("span");
      el.textContent = c;
      marquee.append(el);
      const w = el.getBoundingClientRect().width;
      el.remove();
      return w;
    });
    const was = phrase;
    phrase = probe.reduce((a, b) => a + b, 0);
    if (!phrase) return;
    if (was) marqueeOffset *= phrase / was; // keep the same spot in the phrase
    marqueeSize = size;
    marqueeWidths = probe;
  }
  const probe = marqueeWidths;

  // walk the wave in small x steps, then resample to x at every 1px of arc length
  const pad = Math.max(...probe) * 2;
  const xs = [];
  let len = 0;
  let x = -pad;
  let next = 0;
  const step = 0.25;
  while (x < w + pad) {
    while (next <= len) xs[next++] = x;
    const m = slope(x + step / 2);
    len += step * Math.sqrt(1 + m * m);
    x += step;
  }
  arcX = Float32Array.from(xs);
  waveLen = arcX.length - 1;
  marqueeSlope = slope;

  // enough copies to cover the wave plus the one phrase it slides by; add or drop whole copies
  const copies = Math.ceil(waveLen / phrase) + 1;
  const per = MARQUEE_TEXT.length;
  while (letters.length > copies * per) letters.pop().el.remove();
  while (letters.length < copies * per) {
    const j = letters.length % per;
    const el = document.createElement("span");
    el.textContent = MARQUEE_TEXT[j];
    el.setAttribute("aria-hidden", "true");
    marquee.append(el);
    const at =
      Math.floor(letters.length / per) * phrase +
      probe.slice(0, j).reduce((a, b) => a + b, 0);
    letters.push({ el, at: at + probe[j] / 2, w: probe[j] });
  }
  placeMarquee();
}

let marqueeSlope = (x) => 0;
function placeMarquee() {
  for (const l of letters) {
    const s = l.at + marqueeOffset;
    if (s < 0 || s >= waveLen) {
      l.el.style.visibility = "hidden";
      continue;
    }
    const i = Math.floor(s);
    const x = arcX[i] + (arcX[i + 1] - arcX[i]) * (s - i);
    const a = Math.atan(marqueeSlope(x));
    l.el.style.visibility = "";
    l.el.style.transform = `translate(${x}px, ${marqueeY(x)}px) rotate(${a}rad) translate(${-l.w / 2}px, -50%)`;
  }
}

let marqueeLast = 0;
let marqueeRaf = 0;
function marqueeFrame(t) {
  const dt = marqueeLast ? Math.min(t - marqueeLast, 100) / 1000 : 0;
  marqueeLast = t;
  if (phrase) {
    marqueeOffset = (marqueeOffset - MARQUEE_SPEED * dt) % phrase;
    placeMarquee();
  }
  marqueeRaf = requestAnimationFrame(marqueeFrame);
}
// only animate while it's on screen
if (!reduceMotion)
  new IntersectionObserver(([e]) => {
    cancelAnimationFrame(marqueeRaf);
    marqueeLast = 0;
    if (e.isIntersecting) marqueeRaf = requestAnimationFrame(marqueeFrame);
  }).observe(marquee);

function showAll() {
  finishName();
  for (const el of [...flies, ...names])
    for (const c of el.querySelectorAll(".ch")) c.className = "ch";
  for (const b of [...boxes, marquee, press]) b.classList.add("on");
}

async function intro() {
  if (reduceMotion) {
    showAll();
    planet.classList.add("on");
    return;
  }
  if (NAME_INTRO) {
    root.classList.add("locked");
    await playName();
    await wait(NAV_DELAY);
  } else finishName();

  planet.classList.add("on");
  flies.forEach((a, i) => setTimeout(() => glitch(a), i * STAGGER));
  await wait((flies.length - 1) * STAGGER + GLITCH_MS);

  names.forEach((n, i) =>
    setTimeout(() => {
      glitch(n);
      boxes[i].classList.add("on");
    }, i * STAGGER),
  );
  setTimeout(() => {
    press.classList.add("on");
    marquee.classList.add("on");
  }, names.length * STAGGER);
}

// scatter stars around the planet (outside the oval it fills, so its empty corners get some); redone whenever it changes size
function placeStars() {
  planet.querySelectorAll(".star").forEach((s) => s.remove());
  const art = planet.querySelector("ascii-art");
  const box = planet.getBoundingClientRect();
  const a = art.getBoundingClientRect();
  if (!a.width) return; // not loaded yet
  const cx = a.left + a.width / 2 - box.left;
  const half = Math.min(box.width / 2, (a.width * STAR_SPREAD) / 2);
  const cy = a.top + a.height / 2 - box.top;
  const halfY = (a.height * STAR_SPREAD_Y) / 2;
  const t = planet.querySelector(".about").getBoundingClientRect(); // keep stars off the about line
  for (let n = 0, tries = 0; n < STARS && tries < STARS * 20; tries++) {
    const x = cx + (Math.random() * 2 - 1) * half;
    const y = cy + (Math.random() * 2 - 1) * halfY;
    const ox = (x - cx) / (a.width / 2 + STAR_CLEAR);
    const oy = (y - cy) / (a.height / 2 + STAR_CLEAR);
    if (ox * ox + oy * oy < 1) continue;
    if (
      x > t.left - box.left - STAR_CLEAR &&
      x < t.right - box.left + STAR_CLEAR &&
      y > t.top - box.top - STAR_CLEAR &&
      y < t.bottom - box.top + STAR_CLEAR
    )
      continue;
    const s = document.createElement("span");
    s.className = "star";
    s.textContent = STAR_GLYPHS[(Math.random() * STAR_GLYPHS.length) | 0];
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.fontSize = `${12 + Math.random() * 10}px`;
    s.style.setProperty("--t", `${2 + Math.random() * 3}s`);
    s.style.setProperty("--d", `${-Math.random() * 5}s`);
    planet.append(s);
    n++;
  }
}
const starsRO = new ResizeObserver(placeStars);
starsRO.observe(planet);
starsRO.observe(planet.querySelector("ascii-art"));

// always start the intro at the top
history.scrollRestoration = "manual";
scrollTo(0, 0);

// WORK and PROJECTS scroll to their section, landing where the names / nav stack stick
const scrollGoal = {
  [slots[workSlot].textContent]: () => rest.top - sideStop,
  [slots[sideSlot].textContent]: () =>
    mosaic.getBoundingClientRect().top + scrollY - sideStop,
};
for (const f of flies) {
  const goal = scrollGoal[f.textContent];
  if (f.getAttribute("href") === "#")
    f.addEventListener("click", (e) => {
      e.preventDefault();
      if (goal)
        scrollTo({
          top: goal(),
          behavior: reduceMotion ? "auto" : "smooth",
        });
    });
}
addEventListener("scroll", onScroll, { passive: true });
// hover is only re-picked when the mouse moves, so boxes sliding under a
// still cursor as they resize don't steal the focus back and forth
function hover(i) {
  if (i === hovered) return;
  hovered = i;
  render();
}
addEventListener("mousemove", (e) => {
  hover(boxes.indexOf(e.target.closest?.(".box")));
});
document.addEventListener("mouseleave", () => {
  hover(-1);
});
addEventListener("resize", () => {
  // loose tiles are sized in px, so a width change drops them back into the grid
  if (!busy && innerWidth !== looseWidth) tighten();
  if (!nameDone) skipName(); // a mid-flight resize just lands the name
  refresh();
});

// Wait for the variable font so measurements are right (fall back after 2s if offline)
Promise.race([
  Promise.all([
    document.fonts.load('100 100px "Inter Tight"'),
    document.fonts.load('900 100px "Inter Tight"'),
  ]).then(() => document.fonts.ready),
  wait(2000),
]).then(() => {
  refresh();
  intro();
});
