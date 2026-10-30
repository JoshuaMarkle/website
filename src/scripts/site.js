import "./ascii-art.js";
import { onLeave, arrivedAtTop } from "./handoff.js";

// ---- order: name glitches in → nav glitches in + planet fades in → projects glitch/fade in

// glitch (same as navbars)
const START_DELAY = 250; // pause before the name comes in
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
const SIDE_OFFSET = 0.15; // the side projects take focus once the mosaic's top is this fraction of the screen height below the dock line

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

// the name at the top glitches in line by line (as on blog), unless we came from a page left
// at the top: then it and the nav are already where they were, so they just appear
const quiet = arrivedAtTop();
const nameLines = [...document.querySelectorAll("h1 span")];
for (const l of nameLines) chars(l, l.textContent);
if (quiet)
  for (const l of nameLines)
    for (const c of l.querySelectorAll(".ch")) c.className = "ch";

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
  a.href =
    { ABOUT: "/about/", BLOG: "/blog/", LIBRARY: "/library/", RESUME: "/JoshuaMarkleResume.pdf" }[
      s.textContent
    ] ?? "#";
  if (s.textContent === "RESUME") a.target = "_blank";
  chars(a, s.textContent);
  document.body.appendChild(a);
  return a;
});

// the glyph points at PROJECTS beside the boxes and the mosaic
const projectsSlot = slots.findIndex((s) => s.textContent === "PROJECTS");
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

  // a box spreads past the content on each side, further once focused, leaving
  // --side clear for the names and nav (mirrors .box in the css)
  const content = main.clientWidth - 2 * gutter;
  const out = px("--box-out");
  const grow = px("--box-grow");
  const room = Math.max(0, (innerWidth - content) / 2 - px("--side"));
  const wideShort = Math.max(0, Math.min(out, room - grow));
  const wideTall = Math.min(out + grow, room);

  // end: stacked just right of the focused box, its top level with the first
  // project's top (see render); pulled back in if the window is too narrow
  const m = main.getBoundingClientRect();
  const contentRight =
    m.right - parseFloat(getComputedStyle(main).paddingRight);
  const widest = Math.max(...flies.map((f) => f.offsetWidth));
  const x = Math.min(
    contentRight + wideTall + pad,
    innerWidth - gutter - widest,
  );
  ends = slots.map((s, i) => ({
    x,
    y: i * (s.offsetHeight + gap), // offset from the top of the stack
  }));

  // project names: right edge sits the same pad off the focused box's left edge
  const boxLeft =
    m.left + parseFloat(getComputedStyle(main).paddingLeft) - wideTall;
  names.forEach((n) => {
    n.style.left = Math.max(gutter, boxLeft - pad - n.offsetWidth) + "px";
  });
  // paragraphs: right edge level with their name's
  blurbs.forEach((b, i) => {
    const right = Math.max(gutter + names[i].offsetWidth, boxLeft - pad);
    const w = Math.min(BLURB_W, right - gutter);
    b.hidden = w < BLURB_MIN_W;
    b.style.width = w + "px";
    b.style.left = right - w + "px";
  });
  measureSpans();
  rest = {
    top: spans[0].top,
    short: ((content + 2 * wideShort) * 9) / 32,
    tall: ((content + 2 * wideTall) * 9) / 16,
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
  if (focus !== focused) {
    focused = focus;
    boxes.forEach((b, i) => b.classList.toggle("focus", i === focus));
    playFocused(focus);
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

  // work is active from when the first name sticks until the last one leaves,
  // side projects while the mosaic spans a line just below the dock (inSide); the glyph keeps its item while hidden
  const first = spans[0];
  const last = spans[spans.length - 1];
  const work =
    scrollY >= first.top - sideStop && scrollY < last.bottom - sideStop;
  const side = inSide();
  marker.classList.toggle("on", work || side);
  const at = pos[projectsSlot];
  marker.style.transform = `translate(${at.x - marker.offsetWidth - MARKER_GAP}px, ${at.y}px)`;
}

// the side projects hold focus while the mosaic spans a line a little below the dock
function inSide() {
  const m = mosaic.getBoundingClientRect();
  const line = sideStop + innerHeight * SIDE_OFFSET;
  return m.top <= line && m.bottom > line;
}

// ---------------------------------------------------------------- paragraphs

// only the focused box's promo plays; the others hold where they stopped
const videos = boxes.map((b) => b.querySelector("video"));
function playFocused(i) {
  videos.forEach((v, k) => {
    if (!v) return;
    if (k === i && !reduceMotion) v.play().catch(() => {});
    else v.pause();
  });
}

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
const CHARGE_MS = 900; // first press: the button shrinking before it bursts
const CHARGE_SCALE = 0.6; // how small it gets
const RATTLE_MS = 900; // then it shakes, growing more violent
const RATTLE_PX = 8; // the shake's final strength
const RATTLE_STEPS = 30; // jolts over the whole shake
const POP_MS = 450; // the burst: past full size and back
const POP_SCALE = 1.3;
const STREAK_EVERY = [500, 1200]; // ms between lines swooping into the button (min, max)
const STREAK_CHARGE_EVERY = [30, 90]; // ...and from the press until it bursts
const STREAK_CHARGE_STOP = 1000; // no new ones this long before the burst
const STREAK_MS = [550, 850]; // how long each one takes to get there
const STREAK_LEN = 0.25; // each line's length, as a fraction of its path
const STREAK_SWIRL = [0.05, 0.3]; // how far it curls round the button on the way, radians
const STREAK_REACH = [450, 850]; // how far out a line starts, px (less if the canvas ends first)
const STREAK_BURST = 12; // lines flung out when the button bursts
const STREAK_BURST_REACH = [200, 400]; // how far they fly, px
const BURST_MS = 700; // each tile's fly back out
const BURST_STAGGER = 20;
const SHAKE_MS = 450; // screenshake as they burst out
const SHAKE_PX = 14; // its starting strength, dying away quadratically
const expoIn = (p) => (p <= 0 ? 0 : 2 ** (10 * (p - 1)));
const expoOut = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
const SPREAD = 0.92; // scattered tiles land across this much of the window width
const SCATTER_JITTER = 1.4; // how far a tile wanders in its cell of the spread (0 = centred, 1 = anywhere in it, more = into its neighbours)
const SCATTER_TILT = 5; // they land tilted up to this many degrees either way, and set down at a new random tilt
const TILE_SIZE = 1.35; // scattered tiles are this much bigger than their grid cells
const LIFT_SCALE = 0.06; // how much a tile grows while picked up
const LIFT_RATE = 18; // how fast it grows and shrinks (per second, eased)
const TILT = 0.012; // degrees of tilt per px/s of sideways speed
const TILT_MAX = 12; // degrees
const SWING_K = 300; // spring pulling the tilt toward where the speed puts it
const SWING_DAMP = 13; // low enough to wobble a little when it stops
const CLICK_PX = 5; // moved less than this and it's a click, not a drag
const spot = new Map(); // tile → { x, y } from the mosaic's top left
const origin = new Map(); // tile → where it's laid out before its transform
const pose = new Map(
  tiles.map((t) => [
    t,
    { held: false, run: false, lift: 0, rot: 0, rest: 0, spin: 0, vx: 0 },
  ]),
); // tile → how it's being held: lift 0..1, tilt (deg), the tilt it settles to when let go, its spin, sideways speed
let busy = false;
let revealed = false; // tiles hidden until the first press bursts them out
let zTop = 1; // the last dragged tile stays on top
let looseWidth = 0; // window width when the tiles were lifted out

function place(t, x, y, s = 1) {
  const o = origin.get(t);
  const { lift, rot } = pose.get(t);
  t.style.transform = `translate(${x - o.x}px, ${y - o.y}px) rotate(${rot}deg) scale(${s * (1 + LIFT_SCALE * lift)})`;
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
    t.style.width = r.width * TILE_SIZE + "px";
    t.style.height = r.height * TILE_SIZE + "px";
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
    Object.assign(pose.get(t), { rot: 0, rest: 0 });
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

// the button winds up: slowly shrinks over ms, then rattles harder and harder
async function charge(ms) {
  setTimeout(() => (charging = false), ms + RATTLE_MS - STREAK_CHARGE_STOP);
  if (reduceMotion) return;
  for (const a of press.getAnimations()) a.cancel();
  await press.animate([{ scale: 1 }, { scale: CHARGE_SCALE }], {
    duration: ms,
    easing: "ease-in-out",
    fill: "forwards",
  }).finished;
  const frames = [];
  for (let k = 1; k <= RATTLE_STEPS; k++) {
    const a = (RATTLE_PX * k) / RATTLE_STEPS;
    const x = (Math.random() * 2 - 1) * a;
    const y = (Math.random() * 2 - 1) * a;
    frames.push({ scale: CHARGE_SCALE, translate: `${x}px ${y}px` });
  }
  await press.animate(frames, { duration: RATTLE_MS, fill: "forwards" })
    .finished;
}

// ...and bursts: overshoots full size and settles back
function pop() {
  ambient = false;
  if (reduceMotion) return;
  for (const a of press.getAnimations()) a.cancel();
  press.animate(
    [{ scale: CHARGE_SCALE }, { scale: POP_SCALE, offset: 0.3 }, { scale: 1 }],
    {
      duration: POP_MS,
      easing: "ease-out",
    },
  );
  for (let k = 0; k < STREAK_BURST; k++)
    streak(true, ((k + Math.random() * 0.6) / STREAK_BURST) * 2 * Math.PI);
}

// sparse gray lines that curl in toward the button's centre and vanish behind
// it (or, on a burst, fly out from it), drawn on a canvas behind the tiles
const streakCanvas = document.createElement("canvas");
streakCanvas.className = "streaks";
mosaic.prepend(streakCanvas);
const sctx = streakCanvas.getContext("2d");
const streaks = [];
const between = ([a, b]) => a + Math.random() * (b - a);
let streakColor = "";
let nextStreak = 0;
let streaking = false;
let charging = false; // from the press till STREAK_CHARGE_STOP before the burst: lines pour in
let ambient = true; // the sparse lines, only until the first burst

// the button's centre on the canvas
const streakCentre = () => [
  press.offsetLeft - streakCanvas.offsetLeft,
  press.offsetTop - streakCanvas.offsetTop,
];

function streak(out = false, angle = Math.random() * 2 * Math.PI) {
  const [cx, cy] = streakCentre();
  // no further out along this direction than the canvas's edge
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const edge = Math.min(
    dx > 0
      ? (streakCanvas.clientWidth - cx) / dx
      : dx < 0
        ? -cx / dx
        : Infinity,
    dy > 0
      ? (streakCanvas.clientHeight - cy) / dy
      : dy < 0
        ? -cy / dy
        : Infinity,
  );
  streaks.push({
    out,
    angle,
    reach: Math.min(
      between(out ? STREAK_BURST_REACH : STREAK_REACH),
      edge * 0.95,
    ),
    swirl: between(STREAK_SWIRL) * (Math.random() < 0.5 ? -1 : 1),
    ms: out ? between([500, 800]) : between(STREAK_MS),
    start: performance.now(),
  });
}

function drawStreaks(now) {
  if (!streaking) return;
  requestAnimationFrame(drawStreaks);
  const dpr = devicePixelRatio || 1;
  const w = streakCanvas.clientWidth;
  const h = streakCanvas.clientHeight;
  if (
    streakCanvas.width !== Math.round(w * dpr) ||
    streakCanvas.height !== Math.round(h * dpr)
  ) {
    streakCanvas.width = Math.round(w * dpr);
    streakCanvas.height = Math.round(h * dpr);
  }
  if (
    (charging || (ambient && !busy)) &&
    press.classList.contains("on") &&
    now >= nextStreak
  ) {
    if (nextStreak) streak();
    nextStreak = now + between(charging ? STREAK_CHARGE_EVERY : STREAK_EVERY);
  }
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.clearRect(0, 0, w, h);
  if (!streaks.length) return;
  streakColor ||= getComputedStyle(root).getPropertyValue("--streak").trim();
  sctx.strokeStyle = streakColor;
  sctx.lineWidth = 1;
  sctx.lineCap = "round";
  const [cx, cy] = streakCentre();
  for (let i = streaks.length - 1; i >= 0; i--) {
    const l = streaks[i];
    const t = (now - l.start) / l.ms;
    if (t >= 1) {
      streaks.splice(i, 1);
      continue;
    }
    // the head runs ahead along the path (speeding up going in, slowing going
    // out) and the tail follows STREAK_LEN behind, till both are at the end
    const s = (1 + STREAK_LEN) * (l.out ? 1 - (1 - t) ** 2 : t * t);
    const head = Math.min(1, s);
    const tail = Math.max(0, s - STREAK_LEN);
    if (head <= tail) continue;
    sctx.globalAlpha = Math.min(1, t * 5, (1 - t) * 5);
    sctx.beginPath();
    for (let k = 0; k <= 16; k++) {
      const u = tail + ((head - tail) * k) / 16;
      const r = l.reach * (l.out ? u : 1 - u);
      const a = l.angle + l.swirl * u;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      k ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
    }
    sctx.stroke();
  }
}

// only run while the mosaic is on screen
if (!reduceMotion)
  new IntersectionObserver(([e]) => {
    const was = streaking;
    streaking = e.isIntersecting;
    if (streaking && !was) requestAnimationFrame(drawStreaks);
  }).observe(mosaic);

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
  charging = true;
  nextStreak = performance.now(); // the first one comes in right away
  loosen();
  // aim at the button where it's actually drawn
  const g = mosaic.getBoundingClientRect();
  const b = press.getBoundingClientRect();
  const cx = b.left + b.width / 2 - g.left;
  const cy = b.top + b.height / 2 - g.top;
  if (revealed) {
    // in: slide toward the button's centre and shrink to nothing, while the
    // button shrinks too; it rattles once they're all inside
    const charged = charge(SUCK_MS + SUCK_STAGGER * (tiles.length - 1));
    await animate(SUCK_MS, SUCK_STAGGER, (t, p) => {
      const { x, y } = spot.get(t);
      const e = expoIn(p);
      const tx = cx - t.offsetWidth / 2;
      const ty = cy - t.offsetHeight / 2;
      place(t, x + (tx - x) * e, y + (ty - y) * e, 1 - e);
    });
    await charged;
  } else {
    // first press: they appear already inside the button, no fade
    revealed = true;
    for (const t of tiles) {
      place(t, cx - t.offsetWidth / 2, cy - t.offsetHeight / 2, 0);
      t.style.transition = "none";
      t.classList.add("on");
    }
    await charge(CHARGE_MS);
  }
  // out: from the button to a random spot, full size: across the middle
  // SPREAD of the window's width and the mosaic's height. Each tile gets its
  // own cell of a grid shaped to the area (cells handed out in a random
  // order), jittered within it, so they spread evenly without clumping
  const vw = document.documentElement.clientWidth;
  const left = (vw * (1 - SPREAD)) / 2 - g.left;
  const fw = Math.max(1, vw * SPREAD - tiles[0].offsetWidth);
  const fh = Math.max(1, mosaic.clientHeight - tiles[0].offsetHeight);
  const cols = Math.max(1, Math.round(Math.sqrt((tiles.length * fw) / fh)));
  const rows = Math.ceil(tiles.length / cols);
  const cells = [...Array(cols * rows).keys()];
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const jitter = () => 0.5 + (Math.random() - 0.5) * SCATTER_JITTER;
  tiles.forEach((t, i) => {
    spot.set(t, {
      x: left + clamp(((cells[i] % cols) + jitter()) / cols) * fw,
      y: clamp((Math.floor(cells[i] / cols) + jitter()) / rows) * fh,
    });
    pose.get(t).rest = (Math.random() * 2 - 1) * SCATTER_TILT;
  });
  shake();
  pop();
  await animate(BURST_MS, BURST_STAGGER, (t, p) => {
    const { x, y } = spot.get(t);
    const e = expoOut(p);
    const sx = cx - t.offsetWidth / 2;
    const sy = cy - t.offsetHeight / 2;
    pose.get(t).rot = pose.get(t).rest * e;
    place(t, sx + (x - sx) * e, sy + (y - sy) * e, e);
  });
  busy = false;
});

// held tiles: grow and lift (deeper shadow) when picked up, and swing on a
// spring, tilting into sideways speed and wobbling into a new random tilt when it's let go
function swing(t) {
  const p = pose.get(t);
  if (p.run) return;
  p.run = true;
  const s = spot.get(t);
  let last = performance.now();
  let lastX = s.x;
  requestAnimationFrame(function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // a press or a resize takes the tile back: drop it where it is
    if (busy || !t.classList.contains("loose")) {
      Object.assign(p, { held: false, run: false, lift: 0, spin: 0, vx: 0 });
      t.classList.remove("drag");
      t.style.removeProperty("--lift");
      return;
    }
    if (dt > 0) {
      p.vx += ((s.x - lastX) / dt - p.vx) * Math.min(1, dt * 20);
      lastX = s.x;
      const aim = p.held
        ? Math.max(-TILT_MAX, Math.min(TILT_MAX, p.vx * TILT))
        : p.rest;
      p.spin += ((aim - p.rot) * SWING_K - p.spin * SWING_DAMP) * dt;
      p.rot += p.spin * dt;
      p.lift += ((p.held ? 1 : 0) - p.lift) * Math.min(1, dt * LIFT_RATE);
    }
    const still =
      !p.held &&
      p.lift < 0.002 &&
      Math.abs(p.rot - p.rest) < 0.02 &&
      Math.abs(p.spin) < 0.1;
    if (still)
      Object.assign(p, { run: false, lift: 0, rot: p.rest, spin: 0, vx: 0 });
    t.style.setProperty("--lift", p.lift);
    place(t, s.x, s.y);
    if (p.run) requestAnimationFrame(step);
  });
}

// drag scattered tiles; a press that barely moves is a click and follows the link
const dragged = new Set(); // tiles whose last press moved them, so their click is swallowed
for (const t of tiles) {
  t.addEventListener("pointerdown", (e) => {
    if (busy || !t.classList.contains("loose") || e.button !== 0) return;
    e.preventDefault();
    t.setPointerCapture(e.pointerId);
    t.classList.add("drag");
    t.style.zIndex = ++zTop;
    dragged.delete(t);
    const s = spot.get(t);
    const ox = e.clientX - s.x;
    const oy = e.clientY - s.y;
    const p = pose.get(t);
    if (!reduceMotion) {
      p.held = true;
      swing(t);
    }
    const move = (m) => {
      if (Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) >= CLICK_PX)
        dragged.add(t);
      s.x = m.clientX - ox;
      s.y = m.clientY - oy;
      if (reduceMotion) place(t, s.x, s.y);
    };
    const up = () => {
      p.held = false;
      p.rest = (Math.random() * 2 - 1) * SCATTER_TILT;
      if (reduceMotion) {
        p.rot = p.rest;
        place(t, s.x, s.y);
      }
      t.classList.remove("drag");
      t.removeEventListener("pointermove", move);
      t.removeEventListener("pointerup", up);
      t.removeEventListener("pointercancel", up);
    };
    t.addEventListener("pointermove", move);
    t.addEventListener("pointerup", up);
    t.addEventListener("pointercancel", up);
  });
  t.addEventListener("click", (e) => {
    if (busy || dragged.has(t)) e.preventDefault();
  });
}

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
  for (const el of [...nameLines, ...flies, ...names])
    for (const c of el.querySelectorAll(".ch")) c.className = "ch";
  for (const b of [...boxes, marquee, press]) b.classList.add("on");
}

async function intro() {
  if (reduceMotion) {
    showAll();
    planet.classList.add("on");
    return;
  }
  if (quiet) {
    for (const a of flies)
      for (const c of a.querySelectorAll(".ch")) c.className = "ch";
    planet.classList.add("on");
  } else {
    await wait(START_DELAY);
    nameLines.forEach((l, i) => setTimeout(() => glitch(l), i * STAGGER));
    await wait(nameLines.length * STAGGER);

    planet.classList.add("on");
    flies.forEach((a, i) => setTimeout(() => glitch(a), i * STAGGER));
    await wait((flies.length - 1) * STAGGER + GLITCH_MS);
  }

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

// PROJECTS scrolls to the boxes, landing where the names / nav stack stick
const mosaicGoal = () => mosaic.getBoundingClientRect().top + scrollY - sideStop;
const scrollGoal = {
  [slots[projectsSlot].textContent]: () => rest.top - sideStop,
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

// j / k step through the views like vim: home, each project centred on the
// focus line (so scroll picks it as the focus), then the side projects
function views() {
  const max = root.scrollHeight - innerHeight;
  const tops = [
    0,
    ...boxes.map(
      (_, i) =>
        rest.top +
        i * (rest.short + rest.gap) +
        rest.tall / 2 -
        innerHeight * FOCUS_LINE,
    ),
    mosaicGoal(),
  ];
  return tops.map((t) => Math.min(max, Math.max(0, t)));
}
let aim = null; // where the last j / k is headed, so repeats while it scrolls keep stepping
addEventListener("scrollend", () => (aim = null));
addEventListener("keydown", (e) => {
  if (e.key !== "j" && e.key !== "k") return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest?.("input, textarea, [contenteditable]")) return;
  e.preventDefault();
  const from = aim ?? scrollY;
  const tops = views();
  const next =
    e.key === "j"
      ? tops.find((t) => t > from + 2)
      : tops.findLast((t) => t < from - 2);
  if (next === undefined) return;
  aim = next;
  scrollTo({ top: next, behavior: reduceMotion ? "auto" : "smooth" });
});
// enter opens the focused project, or presses PRESS ME while the side projects
// hold the dock line; a tabbed-to link or button keeps its own enter
addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.repeat) return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (e.target.closest?.("a, button, input, textarea, [contenteditable]"))
    return;
  if (inSide()) press.click();
  else if (focused >= 0) boxes[focused].click();
  else return;
  e.preventDefault();
});
addEventListener("scroll", onScroll, { passive: true });
onLeave(() => !docked);
addEventListener("resize", () => {
  // loose tiles are sized in px, so a width change drops them back into the grid
  if (!busy && innerWidth !== looseWidth) tighten();
  refresh();
});

// Wait for the font so measurements are right (fall back after 2s if offline)
Promise.race([
  document.fonts.load('500 14px "Inter Tight"').then(() => document.fonts.ready),
  wait(2000),
]).then(() => {
  refresh();
  intro();
});
