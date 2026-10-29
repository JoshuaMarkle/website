// Corne (crkbd 3x6+3), both halves, built from primitives and drawn as line art.
// Each half is baked into one mesh (parts keep their own id per vertex, legends and
// printed faces share one atlas texture) and rendered twice: once flat white and once
// into a float target as view-space normal, depth and part id. A full-screen pass
// inks pixels where the id changes (outlines), depth bends (silhouettes within a
// part) or the normal turns sharply (creases). Frames are only drawn when something
// moves, and not at all while the canvas is off screen.
// Units are millimetres; layout positions are in u (19.05 mm), y toward the typist.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Build nothing until the canvas is near the viewport (matters when embedded in a page).
await new Promise(go => {
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '300px' });
  io.observe(document.getElementById('view'));
});
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

const U = 19.05;
const P = 0.12;                                // case margin around the keys (u)
const STAGGER = [0.3, 0.3, 0.1, 0, 0.1, 0.2];  // column offsets toward the typist (u)
// Layer heights (mm): bottom plate, PCB, switch plate, keycap bottom.
const Y = { bot0: 0, bot1: 2, pcb0: 5, pcb1: 6.6, plate0: 11.6, plate1: 13.1, cap: 18.4 };
const CAP_H = 8, DISH = 0.9;
const INK = 0x111111;

// ---------- layout (u, centres, rot in degrees clockwise seen from above) ----------
// Built as the left half; the right half is its mirror image.

// Thumb icons, stroked about the legend centre (canvas px).
const ICON = {
  super: g => { g.moveTo(0, -34); g.lineTo(34, 0); g.lineTo(0, 34); g.lineTo(-34, 0); g.closePath(); },
  lower: g => { g.moveTo(-34, -22); g.lineTo(34, -22); g.lineTo(0, 30); g.closePath(); },
  space: g => { g.moveTo(-44, -10); g.lineTo(-44, 14); g.lineTo(44, 14); g.lineTo(44, -10); },
  raise: g => { g.moveTo(-34, 22); g.lineTo(34, 22); g.lineTo(0, -30); g.closePath(); },
  enter: g => { g.moveTo(30, -28); g.lineTo(30, 12); g.lineTo(-30, 12); g.moveTo(-14, -4); g.lineTo(-30, 12); g.lineTo(-14, 28); },
};
// Thumbs from the outside in.
const THUMBS = [
  { x: 4.5, y: 4.2, h: 1, rot: 0 },
  { x: 5.55, y: 4.3, h: 1, rot: 0 },
  { x: 6.95, y: 4.3, h: 1.5, rot: 25 },
];
// Legends in left-half order (outer column first, thumbs outside in), so the right
// half's rows read backwards here.
const HALVES = [
  {
    mirror: false,
    rows: [['Esc', 'Q', 'W', 'E', 'R', 'T'], ['Ctrl', 'A', 'S', 'D', 'F', 'G'], ['Shift', 'Z', 'X', 'C', 'V', 'B']],
    thumbs: [ICON.super, ICON.lower, ICON.space],
  },
  {
    mirror: true,
    rows: [['Bksp', 'P', 'O', 'I', 'U', 'Y'], ['Del', ';', 'L', 'K', 'J', 'H'], ['Tab', '/', '.', ',', 'M', 'N']],
    thumbs: ['Alt', ICON.enter, ICON.raise],
  },
];
const HOMING = ['F', 'J'];
const GAP = 60;                                // between the halves' inner edges (mm)

const turn = (x, y, deg) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
};
// Corner of the big thumb key, padded by the case margin.
const T3 = THUMBS[2];
const t3 = (sx, sy) => {
  const [x, y] = turn(sx * (0.5 + P), sy * (0.75 + P), T3.rot);
  return [T3.x + x, T3.y + y];
};
const tl = t3(-1, -1), tr = t3(1, -1), br = t3(1, 1), bl = t3(-1, 1);
const onTop = x => tl[1] + (x - tl[0]) / (tr[0] - tl[0]) * (tr[1] - tl[1]);
const EDGE = 7.2;                              // inner (right) edge, past the nice!nano

// Case outline, clockwise from the top-left: stepped top following the stagger, the
// microcontroller column, then the rotated big thumb and back along the bottom.
const bottomRun = [
  tr, br, bl, [bl[0], 4.92], [5.05, 4.92], [5.05, 4.82], [4 - P, 4.82], [4 - P, 3.48],
  [2.6, 3.48], [2.45, 3.22], [2, 3.22], [2, 3.42], [-P, 3.42],
];
const topRun = [
  [-P, 0.3 - P], [2, 0.3 - P], [2, 0.1 - P], [3, 0.1 - P], [3, -P], [4, -P],
  [4, 0.1 - P], [5, 0.1 - P], [5, 0.2 - P],
];
const OUTLINE = [...topRun, [EDGE, 0.2 - P], [EDGE, onTop(EDGE)], ...bottomRun];
// The switch plate leaves a pocket over the nice!nano, jack and reset button.
const POCKET = { x0: 6.1, y1: 3.3 };
const PLATE = [...topRun, [POCKET.x0, 0.2 - P], [POCKET.x0, POCKET.y1], [EDGE, POCKET.y1], [EDGE, onTop(EDGE)], ...bottomRun];

const xs = OUTLINE.map(p => p[0]), ys = OUTLINE.map(p => p[1]);
const CX = (Math.min(...xs) + Math.max(...xs)) / 2, CY = (Math.min(...ys) + Math.max(...ys)) / 2;
const X = ux => (ux - CX) * U;                 // layout u → scene mm
const Z = uy => (uy - CY) * U;

// ---------- geometry ----------

// Parts are placeholders carrying a geometry and a skin (or one per geometry group);
// bake() flattens them into one mesh per half. A skin is white, ink, or a canvas.
const WHITE = {};
const BLACK = { ink: true };
const scene = new THREE.Scene();
let board;                                     // the half being built; add() parents to it

function add(geo, mat, x, y, z, parent = board) {
  const m = new THREE.Object3D();
  m.userData = { geo, mat };
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
// Faceted look for low-poly primitives (hex standoffs, frustums).
function flat(g) {
  const f = g.toNonIndexed();
  f.computeVertexNormals();
  return f;
}

// Outline polygon (u) with filleted corners, extruded upward from y0 to y1.
function slab(points, y0, y1, r = 1.2) {
  const pts = points.map(([x, y]) => new THREE.Vector2(X(x), -Z(y)));
  const n = pts.length, shape = new THREE.Shape();
  const cuts = pts.map((p, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const k = Math.min(r, p.distanceTo(a) / 2, p.distanceTo(b) / 2);
    return [p.clone().add(a.clone().sub(p).setLength(k)), p.clone().add(b.clone().sub(p).setLength(k))];
  });
  shape.moveTo(cuts[0][1].x, cuts[0][1].y);
  for (let i = 1; i <= n; i++) {
    const [c1, c2] = cuts[i % n], p = pts[i % n];
    shape.lineTo(c1.x, c1.y);
    shape.quadraticCurveTo(p.x, p.y, c2.x, c2.y);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 2 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

// Rounded rectangle in the xz plane, angle running from +x toward +z.
function roundRect(w, d, r, n = 2) {
  const hw = w / 2 - r, hd = d / 2 - r, out = [];
  [[hw, hd], [-hw, hd], [-hw, -hd], [hw, -hd]].forEach(([cx, cz], q) => {
    for (let i = 0; i <= n; i++) {
      const a = (q + i / n) * Math.PI / 2;
      out.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  });
  return out;
}

// Keycap: rounded base lofted to a smaller top, with a cylindrical dish. Group 0 is
// the walls and bottom, group 1 the dished top (UVs span it, for the legend).
const caps = new Map();
function capGeo(w, d) {
  const id = `${w}x${d}`;
  if (caps.has(id)) return caps.get(id);
  const tw = w - 5.4, td = d - 3.8, off = -0.6, K = 2;
  const base = roundRect(w, d, 1), top = roundRect(tw, td, 2.2);
  const dish = x => DISH * (1 - (2 * x / tw) ** 2);
  const pos = [], uv = [], idx = [], M = base.length;
  const v = (x, y, z, u = 0, t = 0) => { pos.push(x, y, z); uv.push(u, t); return pos.length / 3 - 1; };

  const b0 = pos.length / 3; base.forEach(([x, z]) => v(x, 0, z));
  const t0 = pos.length / 3; top.forEach(([x, z]) => v(x, CAP_H - dish(x), z + off));
  for (let i = 0; i < M; i++) {
    const j = (i + 1) % M;
    idx.push(b0 + i, t0 + i, t0 + j, b0 + i, t0 + j, b0 + j);
  }
  const c = v(0, 0, 0), bb = pos.length / 3;
  base.forEach(([x, z]) => v(x, 0, z));
  for (let i = 0; i < M; i++) idx.push(c, bb + i, bb + (i + 1) % M);

  const topStart = idx.length, rings = [];
  for (let k = 0; k <= K; k++) {
    const f = 1 - k / K;
    rings.push(pos.length / 3);
    top.forEach(([x, z]) => v(x * f, CAP_H - dish(x * f), z * f + off, 0.5 + x * f / tw, 0.5 - z * f / td));
  }
  for (let k = 0; k < K; k++) {
    const o = rings[k], n = rings[k + 1];
    for (let i = 0; i < M; i++) {
      const j = (i + 1) % M;
      idx.push(o + i, n + i, o + j, o + j, n + i, n + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.addGroup(0, topStart, 0);
  g.addGroup(topStart, idx.length - topStart, 1);
  const f = flat(g);
  f.userData = { tw, td, off };
  caps.set(id, f);
  return f;
}

function legendMat(text, tw, td) {
  if (!text) return WHITE;
  const c = document.createElement('canvas');
  c.width = 256; c.height = Math.round(256 * td / tw);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#111';
  if (typeof text === 'function') {
    g.translate(c.width / 2, c.height * 0.42);
    g.strokeStyle = '#111'; g.lineWidth = 9; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); text(g); g.stroke();
  } else {
    const size = text.length === 1 ? 110 : text.length <= 3 ? 84 : 66;
    g.font = `500 ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height * 0.42);
  }
  return { canvas: c };
}

// nice!nano pins (Pro Micro footprint), far (USB) end first; mm from that end.
const PIN_X = 7.62, pinZ = i => 2.77 + i * 2.54;

// Top face texture for a w×l mm box (canvas top = far end), drawn at 20 px/mm.
function faceMat(w, l, bg, draw) {
  const c = document.createElement('canvas');
  c.width = w * 20; c.height = l * 20;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.scale(20, 20);
  g.translate(w / 2, 0);
  draw(g);
  return { canvas: c };
}
const topOnly = (m, side = WHITE) => [side, side, m, side, side, side];

// Silkscreen: pad rings and the logo.
const silk = (w, l) => faceMat(w, l, '#fff', g => {
  g.strokeStyle = g.fillStyle = '#111';
  g.lineWidth = 0.18;
  g.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) for (const s of [-1, 1]) {
    g.beginPath(); g.arc(s * PIN_X, pinZ(i), 0.85, 0, Math.PI * 2); g.stroke();
  }
  g.textAlign = 'center';
  g.font = 'bold 1.3px "Helvetica Neue", Helvetica, Arial, sans-serif';
  g.fillText('nice!nano', 0, 27.6);
  g.font = '0.7px ui-monospace, Menlo, monospace';
  g.fillText('v2.0', 0, 28.9);
  g.strokeRect(-2, 29.6, 4, 1.8);              // antenna keep-out
});
// Ink-filled IC top with a pin-1 dot and part marking.
const chipTop = (w, d, mark) => faceMat(w, d, '#111', g => {
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(-w / 2 + 0.8, 0.8, 0.35, 0, Math.PI * 2); g.fill();
  if (!mark) return;
  g.font = `${w / 7}px ui-monospace, Menlo, monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  mark.forEach((s, i) => g.fillText(s, 0, d / 2 + (i - (mark.length - 1) / 2) * w / 6));
});

function buildHalf({ rows, thumbs }) {
  board = new THREE.Group();

  // --- case stack ---
  add(slab(OUTLINE, Y.bot0, Y.bot1), WHITE, 0, 0, 0);
  add(slab(OUTLINE, Y.pcb0, Y.pcb1, 0.8), WHITE, 0, 0, 0);
  add(slab(PLATE, Y.plate0, Y.plate1), WHITE, 0, 0, 0);

  // --- switches and keycaps ---
  const housingTop = flat(new THREE.CylinderGeometry(11 / Math.SQRT2, 15.6 / Math.SQRT2, 5.8, 4, 1).rotateY(Math.PI / 4));
  const housingBot = new THREE.BoxGeometry(14, Y.plate0 - Y.pcb1, 14);
  const homing = flat(new THREE.CapsuleGeometry(0.45, 4, 1, 6)).rotateZ(Math.PI / 2);
  const keys = [
    ...rows.flatMap((row, r) => row.map((legend, c) => ({ x: c + 0.5, y: STAGGER[c] + r + 0.5, h: 1, rot: 0, legend }))),
    ...THUMBS.map((t, i) => ({ ...t, legend: thumbs[i] })),
  ];
  for (const k of keys) {
    const key = new THREE.Group();
    key.position.set(X(k.x), 0, Z(k.y));
    key.rotation.y = -k.rot * Math.PI / 180;
    board.add(key);
    add(housingBot, WHITE, 0, (Y.pcb1 + Y.plate0) / 2, 0, key);
    add(housingTop, WHITE, 0, Y.plate1 + 2.9, 0, key);
    const g = capGeo(18, k.h * U - 1.05);
    const { tw, td, off } = g.userData;
    add(g, [WHITE, legendMat(k.legend, tw, td)], 0, Y.cap, 0, key);
    if (HOMING.includes(k.legend)) add(homing, WHITE, 0, Y.cap + CAP_H - DISH + 0.2, off + td * 0.32, key);
  }

  // --- standoffs: hex posts from the bottom plate up through the switch plate ---
  const POST_TOP = Y.plate1 + 1.3;
  const hex = flat(new THREE.CylinderGeometry(2, 2, POST_TOP - Y.bot1, 6));
  const POSTS = [[1, 1.3], [4, 1.05], [1, 2.3], [4, 2.1], [3.45, 3.3], [5.05, 3.45]];
  for (const [ux, uy] of POSTS) add(hex, WHITE, X(ux), (Y.bot1 + POST_TOP) / 2, Z(uy));

  // --- nice!nano on socket headers ---
  const MCX = X(6.62), N0 = Z(0.3);              // column centre, far (USB) end of the nano
  const NANO = { w: 18, l: 33, t: 1.6, y: Y.pcb1 + 3 };
  const NT = NANO.y + NANO.t;                    // nano top surface
  const at = (x, h, z, w, d, mat = WHITE) => add(new THREE.BoxGeometry(w, h, d), mat, MCX + x, NT + h / 2, N0 + z);

  add(new THREE.BoxGeometry(NANO.w, NANO.t, NANO.l), topOnly(silk(NANO.w, NANO.l)), MCX, NANO.y + NANO.t / 2, N0 + NANO.l / 2);
  // One socket strip per row; each pin a box with a square solder pad around it.
  const socket = new THREE.BoxGeometry(2.5, NANO.y - Y.pcb1, 12 * 2.54);
  const pin = new THREE.BoxGeometry(0.64, NT + 1.4 - Y.pcb1, 0.64);
  const solder = new THREE.BoxGeometry(1.3, 0.5, 1.3);
  for (const s of [-1, 1]) {
    const x = MCX + s * PIN_X;
    add(socket, WHITE, x, (Y.pcb1 + NANO.y) / 2, N0 + (pinZ(0) + pinZ(11)) / 2);
    for (let i = 0; i < 12; i++) {
      add(pin, WHITE, x, (Y.pcb1 + NT + 1.4) / 2, N0 + pinZ(i));
      add(solder, WHITE, x, NT + 0.25, N0 + pinZ(i));
    }
  }

  // nRF52840, its crystals, regulator, charger, passives, LEDs, chip antenna.
  at(0, 0.85, 12, 7, 7, topOnly(chipTop(7, 7, ['N52840', 'QIAAD0', '2142AB']), BLACK));
  at(-2, 0.6, 17.2, 2, 1.6);
  at(2, 0.8, 17.2, 3.2, 1.5);
  at(1.8, 0.8, 21, 3, 3, topOnly(chipTop(3, 3), BLACK));
  at(-1.8, 1.1, 21, 1.6, 2.9);
  for (const [s, dz] of [[-1, -0.95], [-1, 0], [-1, 0.95], [1, -0.95], [1, 0.95]]) at(-1.8 + s * 1.05, 0.3, 21 + dz, 0.5, 0.4);
  for (const [x, z] of [[-2, 8.4], [-0.7, 8.4], [0.7, 8.4], [2, 8.4], [-2.6, 15.8], [-1.2, 15.8], [1.2, 15.8], [-2.5, 23.6], [-1, 23.6], [0.6, 23.6], [2.2, 23.6]]) {
    at(x, 0.5, z, 1, 0.5);
  }
  for (const s of [-1, 1]) {
    at(s * 2.5, 0.45, 25.4, 0.8, 1.6);
    at(s * 2.5, 0.25, 25.4, 0.5, 0.9).position.y += 0.45;
  }
  at(0, 1.1, 30.5, 3.2, 1.6);

  // USB-C receptacle: a hollow shell with its tongue and legs, overhanging the far edge.
  const usb = new THREE.Shape(), port = new THREE.Path();
  const pill = (sh, w, h) => {
    const r = h / 2;
    sh.moveTo(-w / 2 + r, -r);
    sh.lineTo(w / 2 - r, -r); sh.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
    sh.lineTo(-w / 2 + r, r); sh.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5);
  };
  pill(usb, 8.94, 3.26);
  pill(port, 8.34, 2.66);
  usb.holes.push(port);
  const UY = NT + 1.63;
  add(new THREE.ExtrudeGeometry(usb, { depth: 7.3, bevelEnabled: false, curveSegments: 2 }), WHITE, MCX, UY, N0 - 1);
  add(new THREE.BoxGeometry(8.3, 2.6, 0.3), WHITE, MCX, UY, N0 + 6);
  add(new THREE.BoxGeometry(6.6, 0.6, 5.2), WHITE, MCX, UY, N0 + 3.4);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.5, 1.2, 1.2), WHITE, MCX + s * 4.7, NT + 0.6, N0 + 4.6);

  // --- TRRS jack on the inner edge, reset button ---
  const JZ = Z(3.0), JX = X(EDGE) - 6.5;
  add(new THREE.BoxGeometry(12, 5, 6), WHITE, JX, Y.pcb1 + 2.5, JZ);
  add(flat(new THREE.CylinderGeometry(2.6, 2.6, 2, 8)).rotateZ(Math.PI / 2), WHITE, JX + 7, Y.pcb1 + 2.6, JZ);
  add(new THREE.BoxGeometry(6, 3.5, 6), WHITE, X(6.4), Y.pcb1 + 1.75, Z(2.62));
  add(flat(new THREE.CylinderGeometry(1.7, 1.7, 1.2, 8)), WHITE, X(6.4), Y.pcb1 + 4.1, Z(2.62));

  return board;
}

// ---------- baking ----------
// Every canvas skin is packed into one atlas (shelf packing, tallest first). Cells get
// a smeared border so mipmaps don't bleed neighbours in; untextured faces sample `blank`.
const cells = new Map();                       // canvas → { x, y, w, h } in atlas px
const ATLAS_W = 2048, PAD = 8;
const blank = Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
function packAtlas(boards) {
  const list = new Set([blank]);
  for (const b of boards) b.traverse(o => [o.userData.mat ?? []].flat().forEach(m => m.canvas && list.add(m.canvas)));
  let x = PAD, y = PAD, shelf = 0;
  for (const c of [...list].sort((a, b) => b.height - a.height)) {
    if (x + c.width + PAD > ATLAS_W) { x = PAD; y += shelf + 2 * PAD; shelf = 0; }
    cells.set(c, { x, y, w: c.width, h: c.height });
    x += c.width + 2 * PAD;
    shelf = Math.max(shelf, c.height);
  }
  const a = Object.assign(document.createElement('canvas'), { width: ATLAS_W, height: y + shelf + PAD });
  const g = a.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, a.width, a.height);
  for (const [c, { x, y, w, h }] of cells) {
    g.drawImage(c, x - PAD, y - PAD, w + 2 * PAD, h + 2 * PAD);
    g.drawImage(c, x, y);
  }
  const t = new THREE.CanvasTexture(a);
  t.anisotropy = 8;
  return t;
}

// Flattens a built half into one non-indexed geometry: each part moved into place,
// tagged with its own id (pid) for the outline pass, coloured white or ink, and its
// UVs mapped into the atlas (mirrored in u for the right half so text still reads).
const INK_RGB = new THREE.Color(INK);
const unindexed = new Map();
let parts = 0;
function bake(board, mirror, atlas) {
  board.updateMatrixWorld(true);
  const W = atlas.image.width, H = atlas.image.height, b = cells.get(blank);
  const blankUV = [(b.x + b.w / 2) / W, 1 - (b.y + b.h / 2) / H];
  const pos = [], nrm = [], uv = [], col = [], pid = [];
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  board.traverse(o => {
    const { geo, mat } = o.userData;
    if (!geo) return;
    if (!unindexed.has(geo)) unindexed.set(geo, geo.index ? geo.toNonIndexed() : geo);
    const g = unindexed.get(geo), P = g.attributes.position, N = g.attributes.normal, T = g.attributes.uv;
    const id = ++parts;
    nm.getNormalMatrix(o.matrixWorld);
    const groups = g.groups.length ? g.groups : [{ start: 0, count: P.count, materialIndex: 0 }];
    for (const { start, count, materialIndex } of groups) {
      const m = Array.isArray(mat) ? mat[materialIndex] : mat, c = m.canvas && cells.get(m.canvas);
      const rgb = m.ink ? INK_RGB : { r: 1, g: 1, b: 1 };
      for (let i = start; i < Math.min(start + count, P.count); i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld);
        pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        nrm.push(v.x, v.y, v.z);
        col.push(rgb.r, rgb.g, rgb.b);
        pid.push(id);
        if (!c) { uv.push(...blankUV); continue; }
        const u = mirror ? 1 - T.getX(i) : T.getX(i);
        uv.push((c.x + u * c.w) / W, 1 - (c.y + (1 - T.getY(i)) * c.h) / H);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('pid', new THREE.Float32BufferAttribute(pid, 1));
  return g;
}

const boards = HALVES.map(buildHalf);
const atlas = packAtlas(boards);
// Fills sit slightly behind their own edges so the wireframe overlay wins the depth test.
const COLOR = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

// Each half hangs in its own holder, centred so it turns about its middle; the
// holders sit in a stage that moves the pair as a whole. The right half is the left
// scaled by −1 in x (its atlas UVs were mirrored back when baked).
const stage = new THREE.Group();
scene.add(stage);
const holders = {};
for (const [i, h] of HALVES.entries()) {
  const half = new THREE.Mesh(bake(boards[i], h.mirror, atlas), COLOR);
  half.position.y = -(Y.cap + CAP_H) / 2;
  if (h.mirror) half.scale.x = -1;
  const holder = new THREE.Group();
  holder.rotation.order = 'ZXY';                 // spin on the desk, tilt toward you, then bank
  holder.add(half);
  stage.add(holder);
  holders[h.mirror ? 'right' : 'left'] = holder;
}
stage.rotation.order = 'ZXY';

// ---------- line-art renderer ----------

const canvas = document.getElementById('view');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
} catch (e) {
  document.querySelector('.hint').innerHTML = '<b>CORNE</b><br>NEEDS WEBGL 2';
  throw e;
}
const camera = new THREE.PerspectiveCamera(30, 1, 10, 4000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = !still;
controls.dampingFactor = 0.08;
controls.minDistance = 120;
controls.maxDistance = 1600;

// ---------- pose ----------
// A pose places each half and the stage (mm, degrees) and frames the camera.
// spin turns about the vertical, tilt raises the far edge toward you, bank rolls.
const SEP = X(EDGE) + GAP / 2;                   // half centre → middle, flat on the desk
const flatHalf = x => ({ x, y: 0, z: 0, spin: 0, tilt: 0, bank: 0 });
const PRESETS = {
  desk: {
    left: flatHalf(-SEP), right: flatHalf(SEP), all: flatHalf(0),
    cam: { pos: [-40, 310, 370], target: [0, 0, 0] },
  },
  float: {
    left: { x: -98, y: 22, z: -10, spin: 14, tilt: 58, bank: 9 },
    right: { x: 100, y: -18, z: 18, spin: -16, tilt: 50, bank: -11 },
    all: flatHalf(0),
    cam: { pos: [0, 60, 460], target: [0, 0, 0] },
  },
  crash: {
    left: { x: -84, y: 14, z: -6, spin: 26, tilt: 46, bank: 38 },
    right: { x: 84, y: -12, z: 16, spin: -30, tilt: 58, bank: -42 },
    all: { ...flatHalf(0), bank: -6 },
    cam: { pos: [20, 110, 500], target: [0, -28, 0] },
  },
  cascade: {
    left: { x: -58, y: 52, z: -70, spin: -28, tilt: 52, bank: 0 },
    right: { x: 58, y: -46, z: 60, spin: -28, tilt: 52, bank: 0 },
    all: flatHalf(0),
    cam: { pos: [0, 40, 520], target: [0, -14, 0] },
  },
};
const PARTS = ['left', 'right', 'all'];
const FIELDS = [
  ['x', -300, 300], ['y', -300, 300], ['z', -300, 300],
  ['spin', -180, 180], ['tilt', -180, 180], ['bank', -180, 180],
];
const DEG = Math.PI / 180;
const clone = p => JSON.parse(JSON.stringify(p));
let pose = clone(PRESETS.desk);
let drift = false, tween = null;
let dirty = true;                              // something changed that needs a frame
const redraw = () => { dirty = true; };

function place(o, p, t = 0, phase = 0) {
  const bob = drift ? Math.sin(t * 0.9 + phase) : 0;
  o.position.set(p.x, p.y + bob * 4, p.z);
  o.rotation.set((p.tilt + bob * 1.5) * DEG, (p.spin + bob) * DEG, (p.bank - bob) * DEG);
}
function applyPose(t) {
  place(holders.left, pose.left, t, 0);
  place(holders.right, pose.right, t, 2.1);
  place(stage, pose.all);
}
function setCamera(cam) {
  camera.position.fromArray(cam.pos);
  controls.target.fromArray(cam.target);
}

// Presets tween from wherever things are (camera included) to the target pose.
const ease = t => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
function goTo(name, animate = true) {
  const to = clone(PRESETS[name]);
  history.replaceState(null, '', '#' + name);
  presetBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.name === name));
  if (!animate || still) { pose = to; setCamera(to.cam); syncPanel(); redraw(); return; }
  const from = clone(pose);
  from.cam = { pos: camera.position.toArray(), target: controls.target.toArray() };
  tween = { from, to, start: performance.now(), ms: 1100 };
}
function stepTween(now) {
  if (!tween) return false;
  const k = ease(Math.min(1, (now - tween.start) / tween.ms));
  const mix = (a, b) => a + (b - a) * k;
  for (const part of PARTS) for (const [f] of FIELDS) pose[part][f] = mix(tween.from[part][f], tween.to[part][f]);
  setCamera({
    pos: tween.from.cam.pos.map((v, i) => mix(v, tween.to.cam.pos[i])),
    target: tween.from.cam.target.map((v, i) => mix(v, tween.to.cam.target[i])),
  });
  syncPanel();
  if (k === 1) tween = null;
  return true;
}

// Preset buttons along the bottom.
const presetNav = document.getElementById('presets');
const presetBtns = Object.keys(PRESETS).map(name => {
  const b = document.createElement('button');
  b.textContent = name.toUpperCase();
  b.dataset.name = name;
  b.addEventListener('click', () => goTo(name));
  presetNav.append(b);
  return b;
});

// Adjust panel: a slider per field per part, plus drift and copy.
const panel = document.getElementById('panel');
const adjustBtn = document.getElementById('adjust');
adjustBtn.addEventListener('click', () => {
  panel.hidden = !panel.hidden;
  adjustBtn.setAttribute('aria-pressed', !panel.hidden);
});
const sliders = [];
for (const part of PARTS) {
  const h = document.createElement('h2');
  h.textContent = part === 'all' ? 'BOTH' : part.toUpperCase();
  panel.append(h);
  for (const [f, min, max] of FIELDS) {
    const row = document.createElement('label');
    row.className = 'row';
    row.innerHTML = `<span>${f.toUpperCase()}</span><input type="range" min="${min}" max="${max}" step="1"><output></output>`;
    const input = row.querySelector('input'), out = row.querySelector('output');
    input.addEventListener('input', () => {
      tween = null;
      pose[part][f] = +input.value;
      out.textContent = input.value;
      presetBtns.forEach(b => b.setAttribute('aria-pressed', false));
      redraw();
    });
    sliders.push({ part, f, input, out });
    panel.append(row);
  }
}
function syncPanel() {
  for (const { part, f, input, out } of sliders) {
    const v = Math.round(pose[part][f]);
    input.value = v;
    out.textContent = v;
  }
}
const actions = document.createElement('div');
actions.className = 'actions';
actions.innerHTML = '<button id="drift" aria-pressed="false">DRIFT</button><button id="copy">COPY POSE</button>';
panel.append(actions);
const driftBtn = actions.querySelector('#drift');
driftBtn.addEventListener('click', () => {
  drift = !drift;
  driftBtn.setAttribute('aria-pressed', drift);
  redraw();
});
// Copies the current pose (camera included) as a preset entry to paste into PRESETS.
const copyBtn = actions.querySelector('#copy');
copyBtn.addEventListener('click', async () => {
  const r = v => Math.round(v);
  const out = { ...clone(pose), cam: { pos: camera.position.toArray().map(r), target: controls.target.toArray().map(r) } };
  for (const part of PARTS) for (const [f] of FIELDS) out[part][f] = r(out[part][f]);
  const text = JSON.stringify(out).replace(/"(\w+)":/g, '$1: ');
  console.log(text);
  try { await navigator.clipboard.writeText(text); copyBtn.textContent = 'COPIED'; } catch { copyBtn.textContent = 'SEE CONSOLE'; }
  setTimeout(() => { copyBtn.textContent = 'COPY POSE'; }, 1200);
});

const start = location.hash.slice(1);
goTo(start in PRESETS ? start : 'float', false);

// Data pass: one material for everything, the part id comes in per vertex.
const DATA = new THREE.ShaderMaterial({
  vertexShader: /* glsl */`
    attribute float pid;
    varying vec3 vN;
    varying float vDepth, vId;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vDepth = -mv.z;
      vId = pid;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vN;
    varying float vDepth, vId;
    void main() {
      vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
      gl_FragColor = vec4(n.xy, vDepth, vId);
    }`,
});

// Wireframe toggle: every triangle edge drawn over the fills, hidden lines still hidden.
const wire = new THREE.MeshBasicMaterial({ color: INK, wireframe: true });
const wireBtn = document.getElementById('wire');
let wired = false;
function setWire(on) {
  wired = on;
  wireBtn.setAttribute('aria-pressed', on);
  redraw();
}
wireBtn.addEventListener('click', () => setWire(!wired));
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'w' && !e.metaKey && !e.ctrlKey && !e.altKey) setWire(!wired); });

// The outline pass needs a float colour target; without one, fall back to the fills
// with every triangle edge inked straight to the screen.
const outlines = ['EXT_color_buffer_half_float', 'EXT_color_buffer_float'].some(x => renderer.extensions.has(x));
const dataRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const colorRT = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });

const edges = new THREE.ShaderMaterial({
  uniforms: { tData: { value: dataRT.texture }, tColor: { value: colorRT.texture }, px: { value: new THREE.Vector2() }, ink: { value: new THREE.Color(INK) } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tData, tColor;
    uniform vec2 px;
    uniform vec3 ink;
    varying vec2 vUv;
    vec3 nrm(vec4 d) { return vec3(d.xy, sqrt(max(0.0, 1.0 - dot(d.xy, d.xy)))); }
    // Edge strength across the pair of neighbours at ±o.
    float pair(vec4 c, vec2 o) {
      vec4 a = texture2D(tData, vUv + o * px), b = texture2D(tData, vUv - o * px);
      if (abs(a.w - c.w) > 0.5 || abs(b.w - c.w) > 0.5) return 1.0;  // different part or background
      if (c.w < 0.5) return 0.0;
      float bend = abs(a.z + b.z - 2.0 * c.z) / c.z;                  // depth kink: silhouette within a part
      vec3 n = nrm(c);
      float turn = max(1.0 - dot(nrm(a), n), 1.0 - dot(nrm(b), n));   // crease
      return max(smoothstep(0.004, 0.012, bend), smoothstep(0.08, 0.2, turn));
    }
    void main() {
      vec4 c = texture2D(tData, vUv);
      float e = max(max(pair(c, vec2(1, 0)), pair(c, vec2(0, 1))), max(pair(c, vec2(1, 1)), pair(c, vec2(1, -1))));
      gl_FragColor = vec4(mix(texture2D(tColor, vUv).rgb, ink, e), 1.0);
    }`,
});
const post = new THREE.Scene();
post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edges));
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Supersample up to 2x, but within a pixel budget (big monitors), scaled down further
// by `quality` if frames run slow.
const MAX_PX = 6e6;
let quality = 1;
function resize() {
  const w = innerWidth, h = innerHeight;
  const pr = Math.max(0.5, Math.min(2, Math.sqrt(MAX_PX / (w * h))) * quality);
  const W = Math.round(w * pr), H = Math.round(h * pr);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  dataRT.setSize(W, H);
  const samples = pr >= 1.5 ? 0 : 4;              // supersampling already smooths the fills
  if (colorRT.samples !== samples) { colorRT.samples = samples; colorRT.dispose(); }
  colorRT.setSize(W, H);
  const off = Math.max(pr / 2, 0.75);              // ~1 css px lines, at least a pixel step
  edges.uniforms.px.value.set(off / W, off / H);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  redraw();
}
addEventListener('resize', resize);
resize();

// Sustained frames slower than ~40 fps step the resolution down (never back up).
let last = 0, slow = 0;
function adapt(now) {
  const dt = last ? now - last : 0;
  last = now;
  if (!dt || dt > 100) return;                     // first frame after a pause
  slow = dt > 25 ? slow + 1 : Math.max(0, slow - 1);
  if (slow > 20 && quality > 0.5) { quality *= 0.8; slow = 0; resize(); }
}

function draw(target, clear, alpha, material = null) {
  scene.overrideMaterial = material;
  renderer.setRenderTarget(target);
  renderer.setClearColor(clear, alpha);
  renderer.clear();
  renderer.render(scene, camera);
  scene.overrideMaterial = null;
}

// Draws only when the controls moved, a tween or drift is running, or something
// asked for a redraw; idle frames cost nothing.
function frame(now) {
  const animating = stepTween(now) || drift;
  const moved = controls.update();
  if (!animating && !moved && !dirty) { last = 0; return; }
  dirty = false;
  applyPose(now / 1000);
  if (outlines) {
    draw(dataRT, 0x000000, 0, DATA);
    draw(colorRT, 0xffffff, 1);
  } else draw(null, 0xffffff, 1);
  if (wired || !outlines) {
    scene.overrideMaterial = wire;
    renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = true;
    scene.overrideMaterial = null;
  }
  if (outlines) {
    renderer.setRenderTarget(null);
    renderer.render(post, postCam);
  }
  adapt(now);
}
// Stop the loop entirely while the canvas is scrolled out of view.
new IntersectionObserver(([e]) => {
  renderer.setAnimationLoop(e.isIntersecting ? frame : null);
  last = 0;
  redraw();
}).observe(canvas);
