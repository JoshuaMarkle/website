// The Corne (crkbd 3x6+3) in clear glass, as the real one is built: bottom plate, circuit board, switch plate,
// and in the pocket at the inner edge the nice!nano on its sockets, the jack and the reset button.
// Nothing here marches a scene. A cap is a convex block, so a ray finds its way out of one in closed form; the
// plates are thin enough that only their edges bend anything, and those need just a baked 2D distance; the solid
// parts are one mesh a half, and the copper is one drawing both halves look up.
//   off screen: board, housings and solids, for the caps to look down at (only when they are seen from above)
//   on screen:  caps, solids, then plate, board and housings blended in the order they stack
// Millimetres inside a half, y up out of the keys, z toward the typist. Layout in u (19.05 mm).
import * as THREE from 'three';
import { Pass, rt, U as uni } from './gpu.js';

const U = 19.05;
const P = 0.12;                                // case margin around the keys (u)
const STAGGER = [0.3, 0.3, 0.1, 0, 0.1, 0.2];  // column offsets toward the typist (u)
// layer heights: bottom plate, board, switch plate, top of the switches, foot of the caps
const Y = { bot0: 0, bot1: 2.4, pcb0: 5, pcb1: 6.7, plate0: 11.2, plate1: 13.2, house: 17.4, cap: 18.4 };
const CAP = { y: Y.cap, h: 8.4, b: 8.85, t: 7.25, r: 3, d: 1.5, k1: 1.9, k2: 1.1, travel: 2.7 };
const PER = 21, LIT = 8;
// what stands under every key, each of which can be left out for a plainer board:
//   stems: the cross that carries the cap; sockets: the hot-swap socket and its pads; holes: the round holes a switch drops into
const PARTS = { stems: true, sockets: true, holes: true };
/* ------------------------------------------------------------- layout (after corne.js) */
const ICON = {
  super: (g) => { g.moveTo(0, -34); g.lineTo(34, 0); g.lineTo(0, 34); g.lineTo(-34, 0); g.closePath(); },
  lower: (g) => { g.moveTo(-34, -22); g.lineTo(34, -22); g.lineTo(0, 30); g.closePath(); },
  space: (g) => { g.moveTo(-44, -10); g.lineTo(-44, 14); g.lineTo(44, 14); g.lineTo(44, -10); },
  raise: (g) => { g.moveTo(-34, 22); g.lineTo(34, 22); g.lineTo(0, -30); g.closePath(); },
  enter: (g) => { g.moveTo(30, -28); g.lineTo(30, 12); g.lineTo(-30, 12); g.moveTo(-14, -4); g.lineTo(-30, 12); g.lineTo(-14, 28); },
};
const THUMBS = [{ x: 4.5, y: 4.2, h: 1, rot: 0 }, { x: 5.55, y: 4.3, h: 1, rot: 0 }, { x: 6.95, y: 4.3, h: 1.5, rot: 25 }];
const HALVES = [
  { m: 1, rows: [['Esc', 'Q', 'W', 'E', 'R', 'T'], ['Ctrl', 'A', 'S', 'D', 'F', 'G'], ['Shift', 'Z', 'X', 'C', 'V', 'B']], thumbs: ['super', 'lower', 'space'] },
  { m: -1, rows: [['Bksp', 'P', 'O', 'I', 'U', 'Y'], ['Del', ';', 'L', 'K', 'J', 'H'], ['Tab', '/', '.', ',', 'M', 'N']], thumbs: ['Alt', 'enter', 'raise'] },
];
export const LABELS = HALVES.flatMap((h) => [...h.rows.flat(), ...h.thumbs]);
const CODES = { Escape: 'Esc', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', ShiftLeft: 'Shift', ShiftRight: 'Shift', MetaLeft: 'super', MetaRight: 'super', Space: 'space', Enter: 'enter', NumpadEnter: 'enter', AltLeft: 'Alt', AltRight: 'Alt', Backspace: 'Bksp', Delete: 'Del', Tab: 'Tab', Semicolon: ';', Slash: '/', Period: '.', Comma: ',', CapsLock: 'lower', ContextMenu: 'raise' };
export const keyOfCode = (code) => LABELS.indexOf(CODES[code] ?? (code.startsWith('Key') ? code.slice(3) : '?'));
export const keyOfChar = (ch) => LABELS.indexOf(ch === ' ' ? 'space' : ch.toUpperCase());

const turn = (x, y, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
const T3 = THUMBS[2];
const t3 = (sx, sy) => { const [x, y] = turn(sx * (0.5 + P), sy * (0.75 + P), T3.rot); return [T3.x + x, T3.y + y]; };
const tl = t3(-1, -1), tr = t3(1, -1), br = t3(1, 1), bl = t3(-1, 1);
const EDGE = 7.2;
const onTop = (x) => tl[1] + ((x - tl[0]) / (tr[0] - tl[0])) * (tr[1] - tl[1]);
const topRun = [[-P, 0.3 - P], [2, 0.3 - P], [2, 0.1 - P], [3, 0.1 - P], [3, -P], [4, -P], [4, 0.1 - P], [5, 0.1 - P], [5, 0.2 - P]];
const bottomRun = [[EDGE, onTop(EDGE)], tr, br, bl, [bl[0], 4.92], [5.05, 4.92], [5.05, 4.82], [4 - P, 4.82], [4 - P, 3.48], [2.6, 3.48], [2.45, 3.22], [2, 3.22], [2, 3.42], [-P, 3.42]];
const OUTLINE = [...topRun, [EDGE, 0.2 - P], ...bottomRun];
// the switch plate leaves a pocket over the microcontroller, the jack and the button
const POCKET = { x0: 6.1, y1: 3.3 };
const PLATE = [...topRun, [POCKET.x0, 0.2 - P], [POCKET.x0, POCKET.y1], [EDGE, POCKET.y1], ...bottomRun];
const xs = OUTLINE.map((p) => p[0]), ys = OUTLINE.map((p) => p[1]);
const CX = (Math.min(...xs) + Math.max(...xs)) / 2, CY = (Math.min(...ys) + Math.max(...ys)) / 2;
const X = (u) => (u - CX) * U, Z = (u) => (u - CY) * U;
// one half's keys, outer column first; the other half is this with x negated
const KEYS = [
  ...[0, 1, 2].flatMap((r) => STAGGER.map((s, c) => ({ x: X(c + 0.5), z: Z(s + r + 0.5), rot: 0, ext: 0 }))),
  ...THUMBS.map((t) => ({ x: X(t.x), z: Z(t.y), rot: (-t.rot * Math.PI) / 180, ext: ((t.h - 1) * U) / 2 })),
];

// what the halves share besides keys: standoffs, and the microcontroller's column with its pins from the USB end
const POSTS = [[1, 1.3], [4, 1.05], [1, 2.3], [4, 2.1], [3.45, 3.3], [5.05, 3.45]].map(([x, y]) => [X(x), Z(y)]);
const MCX = X(6.62), N0 = Z(0.3), PIN_X = 7.62, pinZ = (i) => N0 + 2.77 + i * 2.54;
const JACK = [X(EDGE) - 6.5, Z(3)], RESET = [X(6.4), Z(2.62)];
const keyAt = (k, x, z) => { const c = Math.cos(k.rot), s = Math.sin(k.rot); return [k.x + c * x + s * z, k.z - s * x + c * z]; };

/* ------------------------------------------------------------- glass outlines */
// Resample, smooth along the arc and thin out again: every corner becomes a curve no tighter than the bevel.
function smoothLoop(pts, sigma, step = 0.7, tol = 0.05) {
  const dense = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(l / step));
    for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  });
  const n = dense.length, w = Math.ceil((sigma * 3) / step), out = [], bell = Array.from({ length: w * 2 + 1 }, (_, k) => Math.exp(-0.5 * (((k - w) * step) / sigma) ** 2)), s = bell.reduce((a, b) => a + b);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    for (let k = -w; k <= w; k++) { const g = bell[k + w], q = dense[(i + k + n) % n]; x += q[0] * g; y += q[1] * g; }
    out.push([x / s, y / s]);
  }
  const keep = new Uint8Array(n), cut = (a, b) => {
    const A = out[a], B = out[b % n], dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1;
    let m = 0, at = -1;
    for (let i = a + 1; i < b; i++) { const q = out[i % n], d = Math.abs((q[0] - A[0]) * dy - (q[1] - A[1]) * dx) / l; if (d > m) { m = d; at = i; } }
    if (m > tol) { keep[at % n] = 1; cut(a, at); cut(at, b); }
  };
  const h = n >> 1;
  keep[0] = keep[h] = 1; cut(0, h); cut(h, n);
  return out.filter((_, i) => keep[i]);
}
const normals = (pts) => pts.map((p, i) => {
  const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
  const u = [p[0] - a[0], p[1] - a[1]], v = [b[0] - p[0], b[1] - p[1]], lu = Math.hypot(...u), lv = Math.hypot(...v);
  const x = u[1] / lu + v[1] / lv, y = -u[0] / lu - v[0] / lv, l = Math.hypot(x, y);
  return [x / l, y / l];
});
// outward, whichever way the loop runs
function outward(pts) {
  let a = 0;
  pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; });
  return normals(pts).map(([x, y]) => (a > 0 ? [x, y] : [-x, -y]));
}
function build(pos, idx, extra = {}) {
  let v = 0;
  for (let i = 0; i < idx.length; i += 3) { const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3]; v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]); }
  if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  for (const k in extra) g.setAttribute(k, new THREE.Float32BufferAttribute(extra[k], extra[k].length / (pos.length / 3)));
  g.setIndex(idx);
  return g;
}
const fill = (loop) => THREE.ShapeUtils.triangulateShape(loop.map(([x, z]) => new THREE.Vector2(x, z)), []).flat();
// a plate with rounded edges, y0 to y1; tris fill its outline
function plateGeometry(loop, tris, y0, y1, r) {
  const nrm = outward(loop), M = loop.length, K = 3, pos = [], nor = [], idx = [], rings = [];
  for (let i = 0; i <= K; i++) { const a = (i / K) * (Math.PI / 2); rings.push([r - Math.sin(a) * r, y0 + r - Math.cos(a) * r, Math.sin(a), -Math.cos(a)]); }
  for (let i = 0; i <= K; i++) { const a = (i / K) * (Math.PI / 2); rings.push([r - Math.cos(a) * r, y1 - r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]); }
  for (const [inset, y, nh, ny] of rings) loop.forEach(([x, z], i) => { pos.push(x - nrm[i][0] * inset, y, z - nrm[i][1] * inset); nor.push(nrm[i][0] * nh, ny, nrm[i][1] * nh); });
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < M; i++) { const n = (i + 1) % M, a = j * M + i, b = j * M + n; idx.push(a, a + M, b, b, a + M, b + M); }
  // lids; shared normals are right there already
  for (const j of [0, rings.length - 1]) for (const t of tris) idx.push(j * M + t);
  // everything winds the way its normals point
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const ex = pos[b] - pos[a], ey = pos[b + 1] - pos[a + 1], ez = pos[b + 2] - pos[a + 2], fx = pos[c] - pos[a], fy = pos[c + 1] - pos[a + 1], fz = pos[c + 2] - pos[a + 2];
    const s = (ey * fz - ez * fy) * (nor[a] + nor[b] + nor[c]) + (ez * fx - ex * fz) * (nor[a + 1] + nor[b + 1] + nor[c + 1]) + (ex * fy - ey * fx) * (nor[a + 2] + nor[b + 2] + nor[c + 2]);
    if (s < 0) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
// just the sheet inside an outline, for copper to lie on
function sheetGeometry(loop, tris, y) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(loop.flatMap(([x, z]) => [x, y, z]), 3));
  g.setIndex(tris);
  return g;
}

// the same in a mirror, for the other hand; printed faces swap ends so their text still reads
function mirrored(g) {
  const o = new THREE.BufferGeometry(), flip = (a, stride, at) => { const b = a.slice(); for (let i = 0; i < b.length; i += stride) for (const k of at) b[i + k] = -b[i + k]; return b; };
  const ib = g.attributes.position.data;
  if (ib) {
    const d = flip(ib.array, 16, [0, 3, 6, 10]), b = new THREE.InterleavedBuffer(d, 16);
    for (const n of g.userData.printed) for (const [p, q] of [[0, 1], [3, 2]]) for (const k of [13, 14]) { const i = (n + p) * 16 + k, j = (n + q) * 16 + k, t = d[i]; d[i] = d[j]; d[j] = t; }
    for (const k in g.attributes) { const a = g.attributes[k]; o.setAttribute(k, new THREE.InterleavedBufferAttribute(b, a.itemSize, a.offset)); }
  } else for (const k in g.attributes) o.setAttribute(k, new THREE.BufferAttribute(flip(g.attributes[k].array, 3, [0]), 3));
  const ix = g.index.array.slice();
  for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  o.setIndex(new THREE.BufferAttribute(ix, 1));
  return o;
}

// signed distance to an outline and the way out of it: exact within a band, which is as far in as a thin plate looks
function bakeOutline(loop, W = 320, band = 3.8) {
  const m = 3, x = loop.map((p) => p[0]), z = loop.map((p) => p[1]), N = loop.length, f = THREE.DataUtils.toHalfFloat;
  const x0 = Math.min(...x) - m, z0 = Math.min(...z) - m, w = Math.max(...x) + m - x0, d = Math.max(...z) + m - z0, H = Math.round((W * d) / w), s = W / w;
  const reach = Math.fround(band * band), best = new Float32Array(W * H).fill(reach), vx = new Float32Array(W * H), vz = new Float32Array(W * H), data = new Uint16Array(W * H * 4), side = new Uint8Array(W * H), near = new Int32Array(W * H);
  const cell = (v, o, hi) => Math.min(hi, Math.max(0, Math.floor((v - o) * s)));
  let met = 0;
  const edge = (ax, az, bx, bz) => {
    const ex = bx - ax, ez = bz - az, ee = ex * ex + ez * ez;
    const i0 = cell(Math.min(ax, bx) - band, x0, W - 1), i1 = cell(Math.max(ax, bx) + band, x0, W - 1), j0 = cell(Math.min(az, bz) - band, z0, H - 1), j1 = cell(Math.max(az, bz) + band, z0, H - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0, o = j * W + i0; i <= i1; i++, o++) {
      const qx = x0 + (i + 0.5) / s - ax, qz = z0 + (j + 0.5) / s - az, t = Math.min(1, Math.max(0, (qx * ex + qz * ez) / ee)), px = qx - ex * t, pz = qz - ez * t, dd = px * px + pz * pz;
      if (dd < best[o]) { if (best[o] === reach) near[met++] = o; best[o] = dd; vx[o] = px; vz[o] = pz; }
    }
  };
  for (let k = 0, l = N - 1; k < N; l = k++) edge(x[l], z[l], x[k], z[k]);
  for (let j = 0; j < H; j++) {
    const pz = z0 + (j + 0.5) / s, cut = [];
    for (let k = 0, l = N - 1; k < N; l = k++) if (z[l] > pz !== z[k] > pz) cut.push(x[l] + ((x[k] - x[l]) * (pz - z[l])) / (z[k] - z[l]));
    cut.sort((a, b) => a - b);
    for (let c = 0; c < cut.length; c += 2) side.fill(1, j * W + Math.ceil((cut[c] - x0) * s - 0.5), j * W + Math.ceil((cut[c + 1] - x0) * s - 0.5));
  }
  const far = [f(band), f(-band)], one = f(1);
  for (let o = 0; o < W * H; o++) { data[o * 4] = far[side[o]]; data[o * 4 + 3] = one; }
  for (let n = 0; n < met; n++) {
    const o = near[n], l = Math.sqrt(best[o]) || 1e-4, g = side[o] ? -1 : 1;
    data[o * 4] = f(g * l); data[o * 4 + 1] = f((g * vx[o]) / l); data[o * 4 + 2] = f((g * vz[o]) / l);
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return { tex: t, box: new THREE.Vector4(x0, z0, w, d) };
}

// A cap loft for the 1u cap. aD says how much of the dish a vertex wears, so the shader can stretch it to 1.5u.
function capGeometry() {
  const { b, t, h, r } = CAP, N = 4, E = 2, pos = [], aD = [], idx = [], kx = (b - t) / h, fb = 0.75, ft = 1.15;
  const outline = (s, rr) => {
    const c = s - rr, out = [];
    [[c, c], [-c, c], [-c, -c], [c, -c]].forEach(([cx, cz], q, all) => {
      for (let i = 0; i <= N; i++) { const a = (q + i / N) * (Math.PI / 2); out.push([cx + rr * Math.cos(a), cz + rr * Math.sin(a)]); }
      const a = ((q + 1) * Math.PI) / 2, p = out.at(-1), n = all[(q + 1) % 4], e = [n[0] + rr * Math.cos(a), n[1] + rr * Math.sin(a)];
      for (let i = 1; i < E; i++) out.push([p[0] + ((e[0] - p[0]) * i) / E, p[1] + ((e[1] - p[1]) * i) / E]);
    });
    return out;
  };
  const rings = [], wall = (y) => b - kx * y;
  for (let i = 0; i <= 2; i++) { const a = (i / 2) * (Math.PI / 2); rings.push([wall(fb) - fb + Math.sin(a) * fb, fb - Math.cos(a) * fb, 0]); }
  for (let i = 0; i <= 3; i++) { const a = (i / 3) * (Math.PI / 2); rings.push([wall(h - ft) - ft + Math.cos(a) * ft, h - ft + Math.sin(a) * ft, 1]); }
  rings.push([t * 0.5, h, 1]);
  const M = outline(1, 0.3).length;
  for (const [s, y, d] of rings) for (const [x, z] of outline(s, Math.max(0.05, Math.min(r * (s / b) ** 0.5, r - (b - s) * 0.35)))) { pos.push(x, y, z); aD.push(d); }
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < M; i++) { const n = (i + 1) % M, a = j * M + i, c = j * M + n; idx.push(a, a + M, c, c, a + M, c + M); }
  const c0 = pos.length / 3; pos.push(0, 0, 0); aD.push(0);
  const c1 = c0 + 1; pos.push(0, h, 0); aD.push(1);
  const L = (rings.length - 1) * M;
  for (let i = 0; i < M; i++) { const n = (i + 1) % M; idx.push(c0, i, n, c1, L + n, L + i); }
  return build(pos, idx, { aD });
}

/* ------------------------------------------------------------- the board: copper, laid out once for both halves */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// cut every corner of a right-angled run back to 45 degrees
function mitre(pts, r = 1.9) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, p, b] = [pts[i - 1], pts[i], pts[i + 1]], la = dist(a, p), lb = dist(p, b), k = Math.min(r, la / (i > 1 ? 2 : 1), lb / (i < pts.length - 2 ? 2 : 1));
    if (Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) < 1e-6) continue;
    out.push([p[0] + ((a[0] - p[0]) * k) / la, p[1] + ((a[1] - p[1]) * k) / la], [p[0] + ((b[0] - p[0]) * k) / lb, p[1] + ((b[1] - p[1]) * k) / lb]);
  }
  return [...out, pts.at(-1)].filter((p, i, l) => !i || dist(p, l[i - 1]) > 1e-3);
}
// a run d to the right of this one, corners kept parallel
function beside(pts, d) {
  const n = pts.slice(1).map((p, i) => { const l = dist(p, pts[i]); return [-(p[1] - pts[i][1]) / l, (p[0] - pts[i][0]) / l]; });
  return pts.map((p, i) => {
    const a = n[Math.max(0, i - 1)], b = n[Math.min(n.length - 1, i)], k = d / (1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + (a[0] + b[0]) * k, p[1] + (a[1] + b[1]) * k];
  });
}
// where along a run a point lies: segment index and how far into it
function along(pts, q) {
  let best = 1e9, at = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]], ex = b[0] - a[0], ez = b[1] - a[1], t = Math.min(1, Math.max(0, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ez) / (ex * ex + ez * ez || 1)));
    const d = Math.hypot(q[0] - a[0] - ex * t, q[1] - a[1] - ez * t);
    if (d < best - 1e-6) { best = d; at = i + t; }
  }
  return at;
}
const spot = (pts, t) => { const i = Math.min(pts.length - 2, Math.floor(t)), f = t - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; };
function between(pts, a, b) {
  const s = along(pts, a), e = along(pts, b), out = [spot(pts, s)];
  if (s < e) for (let i = Math.floor(s) + 1; i < e; i++) out.push(pts[i]);
  else for (let i = Math.ceil(s) - 1; i > e; i--) out.push(pts[i]);
  return [...out, spot(pts, e)];
}
function crossing(p, q) {
  for (let i = 0; i < p.length - 1; i++) for (let j = 0; j < q.length - 1; j++) {
    const [a, b, c, d] = [p[i], p[i + 1], q[j], q[j + 1]], k = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(k) < 1e-9) continue;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / k, u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / k;
    if (t >= -1e-6 && t <= 1.000001 && u >= -1e-6 && u <= 1.000001) return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  return null;
}

// Columns run down on the back, rows across on the front. The columns come up through vias into a bundle that works its
// way along between the second and third rows and dives under the controller; the rows go round to its near pins.
function route() {
  const F = 0, B = 1, tracks = [], vias = [], diodes = [], col = [], row = [];
  const track = (layer, pts, w = 0.36) => { tracks.push({ layer, pts, w }); return pts; };
  const via = (p) => { vias.push(p); return p; };
  const on = (layer, pts) => pts.map(([x, z]) => [x, z, layer]);
  const key = (r, c) => KEYS[r * 6 + c], L = MCX - PIN_X, R = MCX + PIN_X;
  const p1 = (k) => keyAt(k, -7.085, -2.54), p2 = (k) => keyAt(k, 5.842, -5.08);

  // the bundle's middle, then six lanes off it
  const GAP = 0.76, bus = (c) => Z(STAGGER[c] + 2), [pa, pb] = [POSTS[2], POSTS[3]], N = MCX + 2;
  const mid = mitre([
    [X(-0.1), bus(0)], [pa[0] - 3.4, bus(0)], [pa[0] - 3.4, pa[1] - 2.4], [pa[0] + 4.4, pa[1] - 2.4], [pa[0] + 4.4, bus(1)],
    [X(2) + 2, bus(1)], [X(2) + 2, bus(2)], [X(3) + 1.5, bus(2)], [X(3) + 1.5, bus(3)], [pb[0] - 3.2, bus(3)], [pb[0] - 3.2, pb[1] - 3.2],
    [pb[0] + 4.4, pb[1] - 3.2], [pb[0] + 4.4, bus(4)], [X(5) + 1.5, bus(4)], [X(5) + 1.5, bus(5)], [N, bus(5)], [N, pinZ(0)],
  ], 3.2);
  const lanes = STAGGER.map((_, c) => {
    const d = (c - 2.5) * GAP, l = beside(mid, d), z = pinZ(4 + c);
    return [...l.slice(0, -1).filter((p, i, a) => i < 2 || !(p[1] < z + 1.3 && Math.abs(p[0] - N - d) < 0.1)), [N + d, z + 1.3], [N + d + 1.3, z], [R, z]];
  });

  // columns: down the gap left of each, stepping round the standoffs
  for (let c = 0; c < 6; c++) {
    const x = key(0, c).x - 9.1, run = [p1(key(0, c)), [x, p1(key(0, c))[1]]];
    for (const [px, pz] of POSTS) if (Math.abs(px - x) < 1.5 && pz > key(0, c).z && pz < key(2, c).z) run.push([x, pz - 2.2], [x + 2.2, pz - 2.2], [x + 2.2, pz + 2.2], [x, pz + 2.2]);
    const thumb = c > 2 && KEYS[18 + c - 3], end = thumb && p1(thumb);
    if (c === 3) run.push([x, Z(3.1)], [X(4.06), Z(3.1)], [X(4.06), end[1]]);
    if (c === 4) run.push([x, Z(2.95)], [X(4.79), Z(2.95)], [X(4.79), Z(3.74)], [X(5.09), Z(3.74)], [X(5.09), end[1]]);
    if (c === 5) run.push([x, Z(3.27)], [X(6.34), Z(3.27)], [X(6.34), end[1]]);
    if (!thumb) run.push([x, p1(key(2, c))[1]]);
    const trunk = track(B, mitre([...run, end || p1(key(2, c))], 1.9)), tap = via(crossing(trunk, lanes[c]));
    const lane = track(F, between(lanes[c], tap, lanes[c].at(-1)));
    const to = (i, stub) => { col[i] = [...on(B, stub), ...on(B, between(trunk, stub.at(-1), tap)), ...on(F, lane)]; };
    for (let r = 0; r < 3; r++) {
      const p = p1(key(r, c));
      if (r === 0 || (r === 2 && !thumb)) to(r * 6 + c, [p]);
      else to(r * 6 + c, track(B, [p, [x + 2, p[1]], [x, p[1] - 2]]));
    }
    if (thumb) to(18 + c - 3, [end]);
  }

  // rows: three trunks across the front and one for the thumbs
  const trunks = [0, 1, 2].map((r) => {
    const z = (c) => key(r, c).z + (r === 2 ? 8.4 : -7.4), pts = r === 1 ? [[key(r, 0).x + 8.3, z(0) + 0.7], [X(1) + 2.4, z(0) + 0.7], [X(1) + 2.4, z(0)]] : [[key(r, 0).x + 8.3, z(0)]];
    for (let c = 1; c < 6; c++) {
      const up = z(c) < z(c - 1), x = X(c) + (r === 2 ? (up ? -4 : 2) : r === 1 && !up ? -3.4 : 2.1);
      if (z(c) !== z(c - 1)) pts.push([x, z(c - 1)], [x, z(c)]);
    }
    const last = z(5);
    if (r === 0) pts.push([X(6.06), last], [X(6.06), pinZ(6)], [L, pinZ(6)]);
    if (r === 1) pts.push([X(5.98), last], [X(5.98), pinZ(7)], [L, pinZ(7)]);
    if (r === 2) pts.push([X(6.04), last], [X(6.04), Z(2.6)]);
    return track(F, mitre(pts, 2.4));
  });
  trunks[3] = track(F, mitre([[KEYS[18].x + 8.6, Z(3.68)], [X(6.13), Z(3.68)], [X(6.13), Z(2.7)]], 2.4));
  const under = [null, null, track(B, mitre([via(trunks[2].at(-1)), [X(6.04), pinZ(8)], [L, pinZ(8)]], 1.6)), track(B, mitre([via(trunks[3].at(-1)), [X(6.13), pinZ(9)], [L, pinZ(9)]], 1.6))];

  // a diode a key, in the gap to its right
  KEYS.forEach((k, i) => {
    const r = i < 18 ? Math.floor(i / 6) : 3, t = trunks[r], tall = k.rot !== 0;
    let path;
    if (tall) { // the big thumb has its diode above it, lying down
      const a = keyAt(k, 5.0, -9.6), c = keyAt(k, 1.7, -9.6), e = via(keyAt(k, -1.2, -9.6));
      diodes.push({ p: keyAt(k, 3.35, -9.6), rot: k.rot, flat: true });
      track(B, [p2(k), keyAt(k, 5.842, -8.4), keyAt(k, 5.0, -9.25), a]); track(B, [c, e]);
      const zt = t[0][1], jx = X(6.13), br = track(F, [e, [e[0] - (e[1] - zt), zt], [jx + 2.4, zt], [jx, zt - 2.4]]);
      path = [...on(B, [p2(k), keyAt(k, 5.842, -8.4), keyAt(k, 5.0, -9.25), a, c, e]), ...on(F, br), ...on(F, between(t, br.at(-1), t.at(-1))), ...on(B, under[3])];
    } else {
      const x = r === 3 ? 8.6 : 8.3, hit = crossing(t, [[k.x + x, k.z - 16], [k.x + x, k.z + 16]]) || t[0], zt = hit[1] - k.z;
      const south = zt > 0, cz = south ? -1.6 : r === 3 ? -3.6 : Math.max(-3.6, zt + 3.8), az = cz + (south ? -1.65 : 1.65), kz = cz + (south ? 1.65 : -1.65);
      diodes.push({ p: keyAt(k, x, cz), rot: 0, flip: south });
      const feed = track(B, (south ? [[5.842, -5.08], [7, -5.08], [x, az - 0.5], [x, az]] : [[5.842, -5.08], [5.842, az - 1.25], [7.09, az], [x, az]]).map((p) => keyAt(k, ...p)));
      const c = keyAt(k, x, kz), e = r === 3 ? keyAt(k, x, kz - 1.2) : hit;
      track(B, [c, via(e)]);
      if (r === 3) track(F, [e, hit]);
      path = [...on(B, feed), ...on(B, [c, e]), ...on(F, r === 3 ? [e] : []), ...on(F, between(t, hit, t.at(-1))), ...(under[r] ? on(B, under[r]) : [])];
    }
    row[i] = path;
  });

  // the rest of the controller: supply and data down to the jack, the button, ground round the rim
  const jack = [[-4.2, 2.3], [-0.5, -2.3], [2.8, 2.3], [2.8, -2.3]].map(([x, z]) => [JACK[0] + x, JACK[1] + z]);
  const btn = [[-3.25, -2.25], [3.25, -2.25], [-3.25, 2.25], [3.25, 2.25]].map(([x, z]) => [RESET[0] + x, RESET[1] + z]);
  track(B, mitre([[R, pinZ(2)], [R - 2.7, pinZ(2)], [R - 2.7, Z(2.2)], [btn[1][0], Z(2.2)], btn[1]], 1.8));
  track(B, mitre([[R, pinZ(3)], [R - 1.7, pinZ(3)], [R - 1.7, Z(2.64)], [jack[1][0], Z(2.64)], jack[1]], 1.8), 0.6);
  track(B, [[R, pinZ(11)], [R, jack[3][1] - 0.3], jack[3]]);
  track(B, mitre([btn[3], [btn[3][0] + 1.3, btn[3][1]], [btn[3][0] + 1.3, jack[0][1]], jack[0]], 1), 0.6);
  const [r0, ...ring] = OUTLINE.map(([x, y]) => [X(x), Z(y)]), half = [(r0[0] + ring[0][0]) / 2, r0[1]], rim = mitre(beside([half, ...ring, r0, half], 1.75), 1.5);
  track(B, rim, 0.55);
  track(B, [[R, pinZ(1)], [X(EDGE) - 1.75, pinZ(1)]], 0.6); track(B, [jack[2], [X(EDGE) - 1.75, jack[2][1]]], 0.6);
  for (let i = 0, l = 5; i < rim.length - 1; i++) { const a = rim[i], b = rim[i + 1], d = dist(a, b); for (; l < d; l += 11) via([a[0] + ((b[0] - a[0]) * l) / d, a[1] + ((b[1] - a[1]) * l) / d]); l -= d; }
  return { tracks, vias, diodes, col, row, jack, btn };
}
/* ------------------------------------------------------------- the drawing: copper, silkscreen and print in one sheet */
const ART = 2048;
// red: front copper, green: back copper (full where it is bare pad, 0.6 where it is trace), blue: anything printed white
function drawArt(board, box, parts) {
  const c = Object.assign(document.createElement('canvas'), { width: ART, height: ART }), x = c.getContext('2d', { alpha: false }), k = ART / box[2];
  const INK = [['#990000', '#ff0000'], ['#009900', '#00ff00']], home = () => x.setTransform(k, 0, 0, k, -box[0] * k, -box[1] * k);
  x.fillStyle = '#000'; x.fillRect(0, 0, ART, ART);
  x.globalCompositeOperation = 'lighten';
  x.lineJoin = x.lineCap = 'round';
  home();
  for (const t of board.tracks) { x.strokeStyle = INK[t.layer][0]; x.lineWidth = t.w; x.beginPath(); t.pts.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](...p)); x.stroke(); }
  const dot = ([a, b], r, f) => { x.fillStyle = f; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
  const ring = ([a, b], r, w, f) => { x.strokeStyle = f; x.lineWidth = w; x.beginPath(); x.arc(a, b, r, 0, 7); x.stroke(); };
  const both = (f) => { f(INK[0]); f(INK[1]); };
  const pins = [-1, 1].flatMap((s) => Array.from({ length: 12 }, (_, i) => [MCX + s * PIN_X, pinZ(i)]));
  const drill = [];
  for (const kc of KEYS) {
    x.save(); x.translate(kc.x, kc.z); x.rotate(-kc.rot);
    x.fillStyle = INK[1][1];
    if (parts.sockets) for (const [a, b] of [[-7.085, -2.54], [5.842, -5.08]]) { x.beginPath(); x.roundRect(a - 1.28, b - 1.25, 2.56, 2.5, 0.35); x.fill(); }
    if (parts.holes) both(([t, p]) => { ring([-3.81, -2.54], 1.78, 0.42, p); ring([2.54, -5.08], 1.78, 0.42, p); ring([0, 0], 2.2, 0.3, t); ring([-5.08, 0], 1.02, 0.26, t); ring([5.08, 0], 1.02, 0.26, t); });
    // a corner mark where the housing stands
    x.strokeStyle = '#000066'; x.lineWidth = 0.16;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { x.beginPath(); x.moveTo(a * 7.5, b * 5.9); x.lineTo(a * 7.5, b * 7.5); x.lineTo(a * 5.9, b * 7.5); x.stroke(); }
    x.restore();
    if (parts.holes) drill.push([keyAt(kc, 0, 0), 2.02], [keyAt(kc, -5.08, 0), 0.88], [keyAt(kc, 5.08, 0), 0.88], [keyAt(kc, -3.81, -2.54), 1.55], [keyAt(kc, 2.54, -5.08), 1.55]);
  }
  for (const d of board.diodes) {
    x.save(); x.translate(...d.p); x.rotate(-d.rot + (d.flat ? -Math.PI / 2 : d.flip ? Math.PI : 0));
    x.fillStyle = INK[1][1]; for (const s of [-1.65, 1.65]) x.fillRect(-0.6, s - 0.5, 1.2, 1);
    x.restore();
  }
  for (const p of board.vias) { both((i) => dot(p, 0.44, i[1])); drill.push([p, 0.17]); }
  for (const p of [...pins, ...board.jack, ...board.btn]) { both((i) => dot(p, 0.86, i[1])); drill.push([p, 0.46]); }
  for (const p of POSTS) { both((i) => ring(p, 2.45, 0.5, i[1])); }
  // board outline of the controller, the jack and the button
  x.strokeStyle = '#000088'; x.lineWidth = 0.16;
  x.strokeRect(MCX - 9.4, N0 - 0.4, 18.8, 33.8); x.strokeRect(RESET[0] - 3.4, RESET[1] - 3.4, 6.8, 6.8);
  x.globalCompositeOperation = 'source-over';
  for (const [p, r] of drill) dot(p, r, '#000');

  // below the board, the prints that go on single faces
  x.globalCompositeOperation = 'lighten';
  const y0 = Math.ceil(box[3] * k) + 10, cells = {};
  let px = 6;
  const cell = (name, w, h, s, draw, lay) => { // lay: stored lying on its side, so a tall face fits the strip
    const [W, H] = lay ? [h * s, w * s] : [w * s, h * s];
    cells[name] = { x: px, y: y0, w: W, h: H, lay };
    x.save();
    if (lay) x.setTransform(0, -s, s, 0, px, y0 + w * s); else x.setTransform(s, 0, 0, s, px, y0);
    x.beginPath(); x.rect(0, 0, w, h); x.clip(); x.translate(w / 2, 0);
    draw();
    x.restore();
    px += Math.ceil(W) + 12;
  };
  const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif', MONO = 'ui-monospace, Menlo, "DejaVu Sans Mono", monospace', type = (s, a, b, font) => { x.font = font; x.fillText(s, a, b); };
  x.textAlign = 'center'; x.textBaseline = 'middle';
  cell('nano', 18, 33, 26, () => {
    x.strokeStyle = x.fillStyle = '#0000ff';
    type('nice!nano', 0, 27.1, `bold 1.5px ${SANS}`); type('v2.0', 0, 28.5, `0.85px ${MONO}`);
    x.lineWidth = 0.16; x.strokeRect(-2.1, 30.2, 4.2, 2);
    x.globalAlpha = 0.75;
    for (const [i, l] of ['006', '008', 'G', 'G', '017', '020', '022', '024', '100', '011', '104', '106'].entries()) { x.textAlign = 'left'; type(l, -6.5, 2.77 + i * 2.54, `0.78px ${MONO}`); }
    for (const [i, l] of ['B+', 'G', 'RST', 'VCC', '031', '029', '002', '115', '113', '111', '010', '009'].entries()) { x.textAlign = 'right'; type(l, 6.5, 2.77 + i * 2.54, `0.78px ${MONO}`); }
    x.textAlign = 'center'; x.globalAlpha = 1;
    // masked copper under the black: a fan from the chip to the pads
    x.strokeStyle = '#00a000'; x.lineWidth = 0.16;
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) {
      const z = 2.77 + i * 2.54, q = 9.4 + i * 0.46, j = Math.abs(z - q);
      x.beginPath(); x.moveTo(s * 3.2, q); const xa = 3.5 + 0.2 * Math.min(i, 11 - i); x.lineTo(s * xa, q); const dx = Math.min(j, 1.5); x.lineTo(s * (xa + dx), q + Math.sign(z - q) * dx);
      x.lineTo(s * (xa + dx), z - Math.sign(z - q) * Math.min(j - dx, 0.6)); x.lineTo(s * (xa + dx + Math.min(j - dx, 0.6)), z); x.lineTo(s * PIN_X, z); x.stroke();
    }
    x.fillStyle = '#ff0000';
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) { x.beginPath(); x.arc(s * PIN_X, 2.77 + i * 2.54, 0.9, 0, 7); x.fill(); }
    for (const [a, b, w, h] of [[-1.8, 24.6, 0.9, 0.7], [1.8, 24.6, 0.9, 0.7], [-6.2, 31.6, 1.1, 1.1], [6.2, 31.6, 1.1, 1.1], [-4.6, 24, 0.8, 0.8], [-4.6, 25.4, 0.8, 0.8]]) x.fillRect(a - w / 2, b - h / 2, w, h);
  }, true);
  const chip = (name, w, mark, s) => cell(name, w, w, s, () => {
    x.fillStyle = '#0000ff'; x.beginPath(); x.arc(-w / 2 + w * 0.14, w * 0.14, w * 0.055, 0, 7); x.fill();
    mark.forEach((l, i) => type(l, 0, w / 2 + (i - (mark.length - 1) / 2) * w * 0.2, `${i ? 500 : 600} ${w * 0.155}px ${MONO}`));
  });
  chip('nrf', 7, ['N52840', 'QIAAD0', '2142AB'], 40);
  chip('chg', 3, ['4054'], 50);
  chip('reg', 1.6, [], 40);
  cell('mark', 12, 5, 40, () => { x.fillStyle = '#0000ff'; type('corne', 0, 2.1, `600 2.9px ${SANS}`); x.globalAlpha = 0.8; type('42 KEYS  REV 4', 0, 4.1, `0.86px ${MONO}`); });

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.flipY = false; t.anisotropy = 8;
  return { tex: t, cells, scale: 1 / box[2] };
}

/* ------------------------------------------------------------- solid parts */
const M = { epoxy: 0, gold: 1, steel: 2, mask: 3, led: 4, passive: 5, plastic: 6, hole: 7 };
// Every face knows where on itself it is, in mm, so its edges can be lit as fine bevels without any geometry for them.
class Parts {
  constructor(cells) { this.cells = cells; this.v = new Float32Array(16 * 512); this.n = 0; this.i = []; this.printed = []; }
  room(n) { if ((this.n + n) * 16 > this.v.length) { const v = new Float32Array(Math.max(this.v.length * 2, (this.n + n) * 16)); v.set(this.v); this.v = v; } return this.v; }
  // position, normal, tangent, place on the face and its half size, print, material
  vert(p, nx, ny, nz, tx, ty, tz, u, w, hu, hw, pu, pv, mat) {
    const v = this.room(1), o = this.n++ * 16;
    v[o] = p[0]; v[o + 1] = p[1]; v[o + 2] = p[2]; v[o + 3] = nx; v[o + 4] = ny; v[o + 5] = nz; v[o + 6] = tx; v[o + 7] = ty; v[o + 8] = tz;
    v[o + 9] = u; v[o + 10] = w; v[o + 11] = hu; v[o + 12] = hw; v[o + 13] = pu; v[o + 14] = pv; v[o + 15] = mat;
  }
  // set down a copy of some other parts
  stamp(q, x, z, rot = 0) {
    const n0 = this.n, v = this.room(q.n), c = Math.cos(rot), s = Math.sin(rot);
    for (let k = 0, o = n0 * 16; k < q.n * 16; k += 16, o += 16) {
      for (let e = 0; e < 16; e++) v[o + e] = q.v[k + e];
      for (let e = 0; e < 9; e += 3) { const a = q.v[k + e], b = q.v[k + e + 2]; v[o + e] = c * a + s * b; v[o + e + 2] = c * b - s * a; }
      v[o] += x; v[o + 2] += z;
    }
    this.n += q.n;
    for (let k = 0; k < q.i.length; k++) this.i.push(q.i[k] + n0);
  }
  // corners anticlockwise seen from outside; top and foot may differ in width. seam: the upright edges are not edges
  quad(a, b, c, d, mat, { seam, cell, nn, flat } = {}) {
    const n0 = this.n, e = cell && this.cells[cell];
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const lx = (d[0] + c[0] - a[0] - b[0]) / 2, ly = (d[1] + c[1] - a[1] - b[1]) / 2, lz = (d[2] + c[2] - a[2] - b[2]) / 2, lu = Math.hypot(ux, uy, uz) || 1;
    let nx = uy * lz - uz * ly, ny = uz * lx - ux * lz, nz = ux * ly - uy * lx;
    const ln = Math.hypot(nx, ny, nz) || 1;
    nx /= ln; ny /= ln; nz /= ln; ux /= lu; uy /= lu; uz /= lu;
    const hb = seam ? 0 : lu / 2, ht = seam ? 0 : Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]) / 2, hy = flat ? 1e3 : Math.hypot(lx, ly, lz) / 2;
    if (e) this.printed.push(n0);
    for (let i = 0; i < 4; i++) {
      const p = i === 0 ? a : i === 1 ? b : i === 2 ? c : d, q = nn && nn[i], h = i < 2 ? hb : ht, su = i === 1 || i === 2 ? 1 : 0, sv = i < 2 ? 1 : 0;
      this.vert(p, q ? q[0] : nx, q ? q[1] : ny, q ? q[2] : nz, ux, uy, uz, flat ? 0 : su ? h : -h, flat ? 0 : sv ? -hy : hy, seam || flat ? 1e3 : h, hy,
        e ? (e.lay ? e.x + sv * e.w : e.x + su * e.w) / ART : 0, e ? (e.lay ? e.y + (1 - su) * e.h : e.y + sv * e.h) / ART : 0, mat);
    }
    this.i.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3);
  }
  // a slice of a disc, lit only round its rim
  fan(a, b, c, mat, r) {
    const n0 = this.n;
    this.quad(a, b, c, c, mat, { seam: true });
    for (let k = 0; k < 4; k++) { const o = (n0 + k) * 16; this.v[o + 10] = k < 2 ? -r : 0; this.v[o + 12] = r; }
  }
  // foot and lid given as [x0, z0, x1, z1]
  hexa([a0, b0, a1, b1], y0, [c0, d0, c1, d1], y1, mat, { top, topMat = mat, foot = true, lid = true } = {}) {
    if (lid) this.quad([c0, y1, d1], [c1, y1, d1], [c1, y1, d0], [c0, y1, d0], topMat, { cell: top });
    if (foot) this.quad([a0, y0, b0], [a1, y0, b0], [a1, y0, b1], [a0, y0, b1], mat);
    this.quad([a0, y0, b1], [a1, y0, b1], [c1, y1, d1], [c0, y1, d1], mat);
    this.quad([a1, y0, b0], [a0, y0, b0], [c0, y1, d0], [c1, y1, d0], mat);
    this.quad([a1, y0, b1], [a1, y0, b0], [c1, y1, d0], [c1, y1, d1], mat);
    this.quad([a0, y0, b0], [a0, y0, b1], [c0, y1, d1], [c0, y1, d0], mat);
  }
  box(x, z, w, d, y0, y1, mat, o) { const r = [x - w / 2, z - d / 2, x + w / 2, z + d / 2]; this.hexa(r, y0, r, y1, mat, o); }
  // a round or many-sided post along y, or along x if lying
  post(x, z, r, y0, y1, n, mat, { smooth, lying, ph = 0, r1 = r, lid = mat, foot = mat } = {}) {
    const P = (a, q, y) => { const k = [Math.cos(a) * q, Math.sin(a) * q]; return lying ? [x + y, lying + k[1], z + k[0]] : [x + k[0], y, z + k[1]]; };
    const D = (a) => { const k = [Math.cos(a), Math.sin(a)]; return lying ? [0, k[1], k[0]] : [k[0], 0, k[1]]; };
    for (let i = 0; i < n; i++) {
      const a = ph + ((i + 1) / n) * Math.PI * 2, b = ph + (i / n) * Math.PI * 2, nn = smooth && [D(a), D(b), D(b), D(a)];
      this.quad(P(a, r, y0), P(b, r, y0), P(b, r1, y1), P(a, r1, y1), mat, { seam: smooth, nn });
      for (const [q, y, e, g] of [[r1, y1, lid, 1], [r, y0, foot, 0]]) {
        if (e === null) continue;
        this.fan(P(g ? a : b, q, y), P(g ? b : a, q, y), P(0, 0, y), e, q * Math.cos(Math.PI / n));
      }
    }
  }
  // any outline in x,z stood between two heights, with a narrow bevel round the far end (below if y1 < y0)
  poly(pts, y0, y1, mat, bev = 0.22) {
    let area = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; });
    if (area > 0) pts = [...pts].reverse();
    const N = pts.length, nr = pts.map((p, i) => { const a = pts[(i + N - 1) % N], b = pts[(i + 1) % N], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; });
    const down = y1 < y0, ym = y1 + (down ? bev : -bev), inn = pts.map((p, i) => [p[0] - nr[i][0] * bev, p[1] - nr[i][1] * bev]), at = (p, y) => [p[0], y, p[1]];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, [A, B] = down ? [j, i] : [i, j];
      this.quad(at(pts[A], y0), at(pts[B], y0), at(pts[B], ym), at(pts[A], ym), mat, { seam: true });
      this.quad(at(pts[A], ym), at(pts[B], ym), at(inn[B], y1), at(inn[A], y1), mat, { flat: true });
    }
    const n0 = this.n;
    for (const p of inn) this.vert(at(p, y1), 0, down ? -1 : 1, 0, 1, 0, 0, 0, 0, 1e3, 1e3, 0, 0, mat);
    const tri = THREE.ShapeUtils.triangulateShape(inn.map((p) => new THREE.Vector2(...p)), []);
    for (const [a, b, c] of tri) this.i.push(n0 + a, n0 + b, n0 + c);
  }
  geometry() {
    // whatever the recipe, a face winds the way its normals point
    const v = this.v.slice(0, this.n * 16), ix = this.i;
    for (let k = 0; k < ix.length; k += 3) {
      const a = ix[k] * 16, b = ix[k + 1] * 16, c = ix[k + 2] * 16, ex = v[b] - v[a], ey = v[b + 1] - v[a + 1], ez = v[b + 2] - v[a + 2], fx = v[c] - v[a], fy = v[c + 1] - v[a + 1], fz = v[c + 2] - v[a + 2];
      if ((ey * fz - ez * fy) * v[a + 3] + (ez * fx - ex * fz) * v[a + 4] + (ex * fy - ey * fx) * v[a + 5] < 0) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; }
    }
    const g = new THREE.BufferGeometry(), b = new THREE.InterleavedBuffer(v, 16), at = (n, o) => new THREE.InterleavedBufferAttribute(b, n, o);
    g.setAttribute('position', at(3, 0)); g.setAttribute('normal', at(3, 3)); g.setAttribute('aT', at(3, 6)); g.setAttribute('aF', at(4, 9)); g.setAttribute('uv', at(2, 13)); g.setAttribute('aM', at(1, 15));
    g.setIndex(ix); g.userData.printed = this.printed;
    return g;
  }
}

const LEDS = [[-2.5, 25.4], [2.5, 25.4]], NANO = { w: 18, l: 33, t: 1.6, y: Y.pcb1 + 3 }, NT = NANO.y + NANO.t;
function solids(cells, board, parts) {
  const p = new Parts(cells);
  // standoffs, from the bottom plate up through the switch plate, threaded at both ends
  for (const [x, z] of POSTS) {
    p.post(x, z, 2, Y.bot1, Y.plate1 + 1.3, 6, M.gold);
    p.post(x, z, 0.85, Y.plate1 + 1.3, Y.plate1 + 1.32, 10, M.hole, { smooth: true, foot: null });
    p.post(x, z, 0.85, Y.bot1 - 0.02, Y.bot1, 10, M.hole, { smooth: true, lid: null });
  }
  // under every key: the socket it plugs into with its two contacts, and the cross that carries the cap
  const arc = (cx, cz, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; return [cx + r * Math.cos(a), cz + r * Math.sin(a)]; });
  const sock = [[5.08, -6.985], ...arc(-3.81, -4.445, 2.54, 270, 180, 4), [-6.35, -0.635], [-2.54, -0.635], ...arc(0, 0, 2.54, 194, 270, 5), [5.08, -2.54]];
  const some = (f) => { const q = new Parts(cells); f(q); return q; };
  const under = some((q) => {
    if (parts.sockets) { q.poly(sock, Y.pcb0, Y.pcb0 - 1.85, M.plastic); q.box(-7.25, -2.54, 2, 1.7, Y.pcb0 - 1.3, Y.pcb0, M.gold); q.box(6.05, -5.08, 2, 1.7, Y.pcb0 - 1.3, Y.pcb0, M.gold); }
    if (parts.stems) { q.box(0, 0, 4.1, 1.25, Y.house - 0.4, Y.cap, M.plastic, { foot: false }); q.box(0, 0, 1.25, 4.1, Y.house - 0.4, Y.cap, M.plastic, { foot: false }); }
  });
  for (const k of KEYS) p.stamp(under, k.x, k.z, k.rot);
  const diode = some((q) => {
    q.box(0, 0, 1.6, 2.7, Y.pcb0 - 1.15, Y.pcb0 - 0.05, M.epoxy); q.box(0, 0, 0.6, 3.7, Y.pcb0 - 0.5, Y.pcb0, M.gold);
    q.box(0, -0.95, 1.64, 0.36, Y.pcb0 - 1.17, Y.pcb0 - 0.06, M.steel);
  });
  for (const d of board.diodes) p.stamp(diode, ...d.p, d.rot + (d.flat ? Math.PI / 2 : d.flip ? Math.PI : 0));

  // the nice!nano on two socket strips
  const pin = some((q) => {
    q.box(0, 0, 0.64, 0.64, NT, NT + 1.4, M.gold, { foot: false });
    q.hexa([-0.78, -0.78, 0.78, 0.78], NT, [-0.42, -0.42, 0.42, 0.42], NT + 0.6, M.steel, { foot: false, lid: false });
    q.box(0, 0, 0.64, 0.64, Y.pcb0 - 0.9, Y.pcb0, M.gold, { lid: false });
  });
  const at = (x, h, z, w, d, mat, o) => p.box(MCX + x, N0 + z, w, d, NT, NT + h, mat, { foot: false, ...o });
  p.box(MCX, N0 + NANO.l / 2, NANO.w, NANO.l, NANO.y, NT, M.mask, { top: 'nano' });
  for (const s of [-1, 1]) {
    const x = MCX + s * PIN_X;
    p.box(x, (pinZ(0) + pinZ(11)) / 2, 2.5, 12 * 2.54, Y.pcb1, NANO.y, M.plastic);
    for (let i = 0; i < 12; i++) p.stamp(pin, x, pinZ(i));
  }
  at(0, 0.85, 12, 7, 7, M.epoxy, { top: 'nrf' });
  at(-2, 0.6, 17.2, 2, 1.6, M.steel); at(2, 0.8, 17.2, 3.2, 1.5, M.steel);
  at(1.8, 0.8, 21, 3, 3, M.epoxy, { top: 'chg' });
  at(-1.8, 1.1, 21, 1.6, 2.9, M.epoxy);
  for (const [s, dz] of [[-1, -0.95], [-1, 0], [-1, 0.95], [1, -0.95], [1, 0.95]]) at(-1.8 + s * 1.05, 0.3, 21 + dz, 0.5, 0.4, M.gold);
  for (const [x, z] of [[-2, 8.4], [-0.7, 8.4], [0.7, 8.4], [2, 8.4], [-2.6, 15.8], [-1.2, 15.8], [1.2, 15.8], [-2.5, 23.6], [-1, 23.6], [0.6, 23.6], [2.2, 23.6]]) at(x, 0.5, z, 1, 0.5, M.passive);
  for (const [x, z] of LEDS) { at(x, 0.3, z, 0.8, 1.6, M.gold); at(x, 0.6, z, 0.8, 0.95, M.led); }
  at(0, 0.9, 31.2, 3.2, 1.4, M.passive);

  // USB-C: a hollow shell hanging over the far edge, open there, a tongue inside it
  const pill = (w, h, n = 5) => { const r = h / 2, o = []; for (const [cx, a0] of [[w / 2 - r, -90], [-w / 2 + r, 90]]) for (let i = 0; i <= n; i++) { const a = ((a0 + (i / n) * 180) * Math.PI) / 180; o.push([cx + r * Math.cos(a), r * Math.sin(a), Math.cos(a), Math.sin(a)]); } return o; };
  const UY = NT + 1.63, out = pill(8.94, 3.26), inn = pill(8.34, 2.66), z0 = N0 - 1, z1 = z0 + 7.3, Q = (q, z) => [MCX + q[0], UY + q[1], z], D = (q, s) => [s * q[2], s * q[3], 0];
  out.forEach((a, i) => {
    const j = (i + 1) % out.length, b = out[j], e = inn[i], f = inn[j], straight = i === 5 || i === 11, nn = (s, u, w) => (straight ? null : [D(u, s), D(w, s), D(w, s), D(u, s)]);
    p.quad(Q(b, z1), Q(a, z1), Q(a, z0), Q(b, z0), M.steel, { seam: true, nn: nn(1, b, a) });
    p.quad(Q(e, z1), Q(f, z1), Q(f, z0), Q(e, z0), M.steel, { seam: true, nn: nn(-1, e, f) });
    p.quad(Q(b, z0), Q(a, z0), Q(e, z0), Q(f, z0), M.steel, { seam: true });
    p.quad(Q(a, z1), Q(b, z1), Q(f, z1), Q(e, z1), M.steel, { seam: true });
    p.fan(Q(e, z1 - 0.1), Q(f, z1 - 0.1), [MCX, UY, z1 - 0.1], M.steel, 1.33); p.fan(Q(f, z1 - 0.4), Q(e, z1 - 0.4), [MCX, UY, z1 - 0.4], M.plastic, 1.33); // shut at the back
  });
  p.box(MCX, N0 + 3.3, 6.6, 5.4, UY - 0.32, UY + 0.32, M.epoxy);
  for (let i = 0; i < 8; i++) p.box(MCX + (i - 3.5) * 0.74, N0 + 2.6, 0.34, 3.4, UY - 0.35, UY + 0.35, M.gold);
  for (const s of [-1, 1]) for (const z of [0.9, 5]) p.box(MCX + s * 4.62, N0 + z, 0.5, 1.3, NT, NT + 1.5, M.steel, { foot: false });

  // the jack with its barrel, the button with its cap
  const [jx, jz] = JACK, [bx, bz] = RESET, top = Y.pcb1;
  p.box(jx, jz, 12, 6, top, top + 5, M.plastic, { topMat: M.epoxy });
  p.post(jx, jz, 2.6, 6, 8, 20, M.steel, { smooth: true, lying: top + 2.6 });
  p.post(jx, jz, 1.75, 8, 8.02, 16, M.hole, { smooth: true, lying: top + 2.6, foot: null });
  for (const [x, z] of board.jack) p.box(x, z < jz ? jz - 3.1 : jz + 3.1, 1.2, 0.5, top, top + 2, M.gold, { foot: false });
  p.box(bx, bz, 6, 6, top, top + 3, M.plastic); p.box(bx, bz, 6.1, 5.2, top + 2.2, top + 3.5, M.steel);
  for (const [x, z] of [[-2.2, -1.8], [2.2, -1.8], [-2.2, 1.8], [2.2, 1.8]]) p.post(bx + x, bz + z, 0.42, top + 3.5, top + 3.7, 8, M.plastic, { smooth: true, foot: null });
  p.post(bx, bz, 1.7, top + 3.5, top + 4.8, 18, M.epoxy, { smooth: true, foot: null });
  for (const [x, z] of board.btn) p.box(x, z, 0.8, 0.5, top, top + 1.6, M.gold, { foot: false });
  return p.geometry();
}
// the switches' clear housings
function housings(part) {
  const p = new Parts({}), one = new Parts({}), sq = (h) => [-h, -h, h, h];
  if (part === 'low') one.hexa(sq(6.9), Y.pcb1, sq(7), Y.plate0, 0, { lid: false, foot: false });
  else {
    one.hexa(sq(7.8), Y.plate1, sq(7.8), Y.plate1 + 0.8, 0, { foot: false });
    one.hexa(sq(7.3), Y.plate1 + 0.8, sq(5.5), Y.house, 0, { foot: false });
  }
  for (const k of KEYS) p.stamp(one, k.x, k.z, k.rot);
  return p.geometry();
}
/* ------------------------------------------------------------- shaders */
const HEAD = 'precision highp float; precision highp int; precision highp sampler2D;\n';
const f1 = (x) => (Number.isInteger(x) ? `${x}.` : String(x));

const LIGHT = /* glsl */ `
uniform sampler2D uEnvM,uField,uFieldM,uLut,uBack;
uniform mat4 uViewProj,uVP,uInv,modelMatrix; uniform vec3 cameraPosition;
uniform float uWall,uFieldAmt,uLight,uExposure,uIor,uDisp,uFilm,uFilmNm,uTint,uTime,uRim;
uniform int uBounces,uLitN; uniform vec4 uLit[${LIT}];
vec3 env(vec3 d,float l){ return textureLod(uEnvM,vec2(atan(d.z,d.x)/6.2831853+.5,asin(clamp(d.y,-1.,1.))/3.14159265+.5),l).rgb*uLight; }
// the type field hangs as a lit wall behind the glass (and, dimmer, in front of it)
vec3 wall(vec3 ro,vec3 rd,float a){
  if(uFieldAmt<.001||abs(rd.z)<.04) return vec3(0.);
  float t=((rd.z<0.?-1.9:3.4)-ro.z)/rd.z; if(t<0.) return vec3(0.);
  vec3 h=ro+rd*t; vec4 c=uViewProj*vec4(h.xy,-1.9,1.); vec2 uv=c.xy/c.w*.5+.5, q=clamp(min(uv,1.-uv)*12.5+.25,0.,1.);
  if(q.x*q.y<=0.) return vec3(0.);
  float l=log2(max(a*t*uWall/c.w,.25));
  vec3 f=vec3(0.); if(l<0.){ f=textureLod(uField,uv,0.).rgb; f*=f; } if(l>-1.) f=mix(f,textureLod(uFieldM,uv,max(l,0.)).rgb,clamp(l+1.,0.,1.));
  return f*uFieldAmt*(rd.z<0.?.85:.4)*q.x*q.y;
}
vec3 spec(float t){ return vec3(smoothstep(.58,.18,t)+.22*smoothstep(.82,1.,t),smoothstep(.12,.42,t)*smoothstep(.88,.52,t),smoothstep(.46,.82,t)); }
vec3 film(float ct,float nm){ float s2=1.-ct*ct, ci=sqrt(max(0.,1.-s2/(1.38*1.38))); return .5-.5*cos(6.2831853*2.*1.38*nm*ci/vec3(640.,535.,445.)); }
float snz(vec2 p,float t){ return .5*sin(p.x*1.7+t+1.3*sin(p.y*1.3-t*.6))+.5*sin(p.y*2.1-t*.8+1.1*sin(p.x*1.1+t*.4)); }
float p5(float k){ float q=k*k; return q*q*k; }
float fres(float c,float n){ float r0=(1.-n)/(1.+n); r0*=r0; return r0+(1.-r0)*p5(1.-clamp(c,0.,1.)); }
vec3 tone(vec3 c){ return pow(1.-exp(-c*uExposure),vec3(1./2.2)); }
// its inverse, near enough (c^2.2, then -log(1-y)) and without six transcendentals a tap
vec3 untone(vec3 c){ c=min(c,.985); c*=c*(.8+.2*c); return c*(6.-c)/((6.-4.*c)*uExposure); }
vec3 lut(float v){ return texture(uLut,vec2(clamp(v,.001,.999),.5)).rgb; }
float level(float a){ return log2(max(a*81.5,1.)); } // env mip for a cone this wide
vec3 toW(vec3 d){ return normalize(mat3(modelMatrix)*d); }
vec2 scr(vec3 p){ vec4 c=uVP*(modelMatrix*vec4(p,1.)); return c.xy/c.w*.5+.5; }
// what the struck keys pour into a stretch of glass: the integral of 1/(1+d2/r2) along it
float soak(vec3 a,vec3 d,float t){
  float h=0.;
  for(int i=0;i<uLitN;i++){ vec3 m=a-uLit[i].xyz; float b=dot(m,d); m-=d*b; float w=sqrt(dot(m,m)+10.); h+=uLit[i].w*5.6/w*(atan((b+t)/w)-atan(b/w)); }
  return h;
}
vec3 glow(vec3 c,float h){ c=clamp(c,0.,1.); return h<.004?c:1.-(1.-c)*(1.-lut(1.-exp(-h))); }
`;
const CAPG = /* glsl */ `
const float CB=${f1(CAP.b)},CT=${f1(CAP.t)},CH=${f1(CAP.h)},CR=${f1(CAP.r)},CD=${f1(CAP.d)},K1=${f1(CAP.k1)},K2=${f1(CAP.k2)},CY=${f1(CAP.y)},KX=(CB-CT)/CH;
float dishAt(vec2 p,float e){ vec2 a=vec2(CT,CT+e); p/=a; return CH-CD+CD*.5*min(dot(p,p),2.2); }
`;
const CAP_VERT = /* glsl */ `
in vec3 position; in float aD; in vec4 aKey,aDyn;
uniform mat4 modelMatrix,viewMatrix,projectionMatrix;
centroid out vec3 vP,vW; flat out vec4 vK; flat out vec4 vD;
${CAPG}
void main(){
  vec3 p=position; if(abs(p.z)>.01) p.z+=sign(p.z)*aDyn.x;
  p.y+=aD*(dishAt(p.xz,aDyn.x)-CH);
  vP=p; vK=aKey; vD=aDyn;
  vec4 w=modelMatrix*vec4(aKey.x+aKey.z*p.x+aKey.w*p.z,CY-aDyn.z+p.y,aKey.y-aKey.w*p.x+aKey.z*p.z,1.);
  vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w;
}`;

const CAP_FRAG = LIGHT + CAPG + /* glsl */ `
centroid in vec3 vP,vW; flat in vec4 vK; flat in vec4 vD; out vec4 o;
uniform sampler2D uLeg; uniform float uBelow,uStem;
const float SIDE=1./sqrt(1.+KX*KX),HT=${f1(+(Y.house - Y.cap).toFixed(3))},HF=${f1(+(Y.plate1 + 0.8 - Y.cap).toFixed(3))},HOME_F=${f1(LABELS.indexOf('F'))},HOME_J=${f1(LABELS.indexOf('J'))};
float gK,gF=1.; // curvature where grad was last asked (1/mm); how much of the room a ray may carry
vec3 toHalf(vec3 v){ return vec3(vK.z*v.x+vK.w*v.z,v.y,-vK.w*v.x+vK.z*v.z); }
vec3 toCap(vec3 v){ return vec3(vK.z*v.x-vK.w*v.z,v.y,vK.w*v.x+vK.z*v.z); }
vec3 org(){ return vec3(vK.x,CY-vD.z,vK.y); }
// surface normal of the rounded block: walls, dish and floor blended over their fillets
vec3 grad(vec3 p){
  vec2 q=abs(p.xz)-(vec2(CB,CB+vD.x)-KX*p.y-CR), g; float d;
  gK=.02;
  if(q.x>0.&&q.y>0.){ d=length(q); g=q/d; d-=CR; gK=1./CR; } else if(q.x>q.y){ g=vec2(1.,0.); d=q.x-CR; } else { g=vec2(0.,1.); d=q.y-CR; }
  g*=sign(p.xz); d*=SIDE;
  vec3 ns=normalize(vec3(g.x,KX,g.y));
  vec2 ia=1./vec2(CT,CT+vD.x); ia*=ia;
  vec3 nt=vec3(-CD*p.x*ia.x,1.,-CD*p.z*ia.y); float il=1./length(nt);
  float dt=(p.y-(CH-CD+CD*.5*dot(p.xz*p.xz,ia)))*il;
  float h=clamp(.5+.5*(dt-d)/K1,0.,1.);
  vec3 n=mix(ns,nt*il,h); float m=max(d,dt)+pow(max(K1-abs(d-dt),0.),2.)/K1*.25;
  float f=clamp(.5+.5*(-p.y-m)/K2,0.,1.);
  gK=max(max(gK,h*(1.-h)*3.4)*(1.-f),max(f*(1.-f)*5.,.002));
  return normalize(mix(n,vec3(0.,-1.,0.),f));
}
// way out of the block, as if its edges were sharp
float out_(vec3 p,vec3 d){
  float t=1e3;
  vec2 b=vec2(CB,CB+vD.x)-KX*p.y;
  for(int s=0;s<2;s++){ float k=s==0?1.:-1.; vec2 n=b-k*p.xz, e=k*d.xz+KX*d.y; if(e.x>1e-4) t=min(t,n.x/e.x); if(e.y>1e-4) t=min(t,n.y/e.y); }
  if(d.y<-1e-4) t=min(t,-p.y/d.y);
  vec2 ia=1./vec2(CT,CT+vD.x); ia*=ia;
  float A=CD*.5*dot(d.xz*d.xz,ia), B=CD*dot(p.xz*d.xz,ia)-d.y, C=CH-CD+CD*.5*dot(p.xz*p.xz,ia)-p.y, D=B*B-4.*A*C;
  if(B<0.&&D>0.) t=min(t,2.*max(C,0.)/(-B+sqrt(D)));
  return max(t,.02);
}
vec3 gV; float gL,gW,gA,gPx; // view; env level; then the width, spread and pixel size of the cone this pixel sees
// a softbox seen flat through flat would be a grey sheet: there it may only be a sheen, and it keeps its fire for the curves
vec3 room(vec3 w,vec3 d){ float k=smoothstep(.015,.2,1.-dot(d,gV)); if(k<.004) return vec3(0.); vec3 c=env(w,gL)*k; return c*gF/(1.+max(c.r,max(c.g,c.b))*(1.-gF)*3.5); }
// past the glass: the layer behind where the ray comes down through it, the room where it does not
vec3 beyond(vec3 hp,vec3 wp,vec3 d){
  vec3 h=toHalf(d), w=toW(h);
  vec3 c=room(w,d)+wall(wp,w,gA);
  if(h.y<-.1){
    float t=min((hp.y-8.)/-h.y,60.); vec4 b=textureLod(uBack,scr(hp+h*t),log2(max((gW+gA*t)/gPx,1.)));
    c=c*(1.-b.a)+untone(b.rgb);
  }
  return c;
}
vec3 leave(vec3 dir,vec3 n,vec3 lp,int N){
  vec3 hp=org()+toHalf(lp), wp=(modelMatrix*vec4(hp,1.)).xyz, c=vec3(0.), ws=vec3(1e-4);
  for(int i=0;i<N;i++){
    float t=(float(i)+.5)/float(N);
    vec3 e=refract(dir,-n,uIor+uDisp*(t-.5)); if(dot(e,e)<.5) e=normalize(dir-n*dot(dir,n)*1.02);
    vec3 w=N==1?vec3(1.):spec(t); c+=w*beyond(hp,wp,e); ws+=w;
  }
  return c/ws;
}
// what the block stands on and what is moulded into it, met analytically so it stays a line however the dish bends it
float gE; vec3 gLine;
float edge(float d,float w){ return (1.-smoothstep(w-gE,w+gE,abs(d)))*min(1.,2.4*w/(w+gE)); } // spread thin where it is blurred
float rbox(vec2 p,float h,float r){ vec2 q=abs(p)-h+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
// the switch housing below q, along d: lit edges, and how much of it is in the way
vec2 housing(vec3 q,vec3 d){
  if(d.y>-.12) return vec2(0.);
  float yt=min(HT+vD.z,-.04), yf=HF+vD.z;
  vec2 a=q.xz+d.xz*((yt-q.y)/d.y), b=q.xz+d.xz*((yf-q.y)/d.y), s=sign(a+b);
  float sa=rbox(a,5.5,.6), sb=rbox(b,7.3,.5);
  vec3 n=cross(d,normalize(vec3(s.x*1.9,yf-yt,s.y*1.9)));
  float dc=dot(vec3(s.x*5.35,yt,s.y*5.35)-q,n)/max(length(n),.02);
  return vec2(edge(sa,.10)+edge(sb,.07)*.5+edge(rbox(a,3.6,.35),.06)*.35*uStem+edge(dc,.06)*.55*step(-.25,sa)*step(sb,.25),1.-smoothstep(-.12,.12,min(sa,sb)));
}
// the cross that carries the cap
float stem(vec3 p,vec3 d,float tmax,out vec3 n){
  float t=tmax; n=vec3(0.); d+=vec3(equal(d,vec3(0.)))*1e-5; vec3 m=1./d, o=p-vec3(0.,1.6,0.);
  for(int k=0;k<2;k++){
    vec3 b=k==0?vec3(2.05,1.6,.62):vec3(.62,1.6,2.05), h=abs(m)*b, t1=-m*o-h, t2=-m*o+h;
    float tn=max(max(t1.x,t1.y),t1.z), tf=min(min(t2.x,t2.y),t2.z);
    if(tn<tf&&tn>0.&&tn<t){ t=tn; n=-sign(d)*step(t1.yzx,t1.xyz)*step(t1.zxy,t1.xyz); }
  }
  return t;
}
void main(){
  vec3 camL=toCap((uInv*vec4(cameraPosition,1.)).xyz-org());
  vec3 V=normalize(vP-camL), N=grad(vP);
  float top=smoothstep(.75,.93,N.y);
  if(dot(V,N)>0.) N=normalize(N-V*(dot(V,N)+.02));
  float bar=0., rim=0.;
  if(abs(vD.y-HOME_F)<.5||abs(vD.y-HOME_J)<.5){
    vec2 q=vP.xz-vec2(0.,4.7); q.x-=clamp(q.x,-1.9,1.9); float l=length(q), e=fwidth(l)+.02; bar=(1.-smoothstep(.62-e,.62+e,l))*step(.7,N.y); rim=1.-smoothstep(.05,.05+e*1.5,abs(l-.58)); rim*=step(.7,N.y);
    N=normalize(N+vec3(q.x,0.,q.y)*1.9*bar);
  }
  gV=V;
  gPx=max(length(fwidth(vP))*.6,.02); gW=gPx;
  float k0=gK, spread=gK*gPx, lod=level(2.*spread); spread*=1.-1./uIor;
  float ct=clamp(-dot(V,N),0.,1.), F=fres(ct,uIor);
  vec2 q=(org().xz+toHalf(vP).xz)*.028;
  float nm=uFilmNm*(1.+.42*snz(q*1.5+vP.y*.06,uTime*.35)+.2*snz(q*3.1+4.,uTime*.25))-(vP.y-4.)*6.;
  float nm2=uFilmNm*(1.1+.4*snz(q*1.6-3.,uTime*.3));
  vec3 fc=film(ct,max(nm,40.));
  float hush=1.-top*.94*smoothstep(.02,.22,ct), rd=uDisp*.22;
  hush=max(hush,bar*.85);
  vec3 col=vec3(0.);
  if(hush>.08){
    vec3 R=toW(toHalf(reflect(V,N))), side=normalize(cross(R,vec3(.2,1.,.1)));
    vec3 refl=vec3(env(normalize(R+side*rd),lod).r,env(R,lod).g,env(normalize(R-side*rd),lod).b)+wall(vW,R,2.*gK*gPx);
    col=hush*(refl*(F*1.15+.02)*mix(vec3(1.),fc*1.9,uFilm)+fc*uFilm*.5*(1.-ct)*(1.-ct)*sqrt(1.-ct)*(.25+.75*dot(refl,vec3(.333))));
  }

  vec3 dir=refract(V,N,1./uIor), pos=vP, acc=vec3(0.);
  vec3 thr=vec3(1.-F)*mix(vec3(1.),mix(vec3(1.),fc*1.5,.55),uFilm*.7*(1.-.7*top));
  vec3 tintc=lut(.55);
  gLine=mix(vec3(.6),film(.8,uFilmNm*.8+230.*snz(q*1.3+vP.y*.04,uTime*.3)+vP.x*6.)*1.25,.25+.5*uFilm)*min(uLight,1.6)*.3;
  float heat=0., lids=top;
  for(int i=0;i<6;i++){
    if(i>=uBounces) break;
    float t=out_(pos,dir);
    if(i==0&&uBelow<.5&&uStem>.5){
      vec3 ns; float ts=stem(pos,dir,t,ns);
      if(ts<t){
        vec3 h=pos+dir*ts; vec2 a=abs(h.xz); gE=max((gW+spread*ts)*.8,.03);
        float c=min(max(a.x-2.05,a.y-.62),max(a.x-.62,a.y-2.05)), l=ns.y>.5?edge(c,.09):edge(h.y-3.2,.11)+.5*edge(h.y,.11);
        if(uLitN>0) heat+=dot(thr,vec3(.333))*soak(org()+toHalf(pos),toHalf(dir),ts);
        acc+=thr*(gLine*l*.55+tintc*tintc*(ns.y>.5?.075:.02)*uLight); thr=vec3(0.); break;
      }
    }
    if(uLitN>0) heat+=dot(thr,vec3(.333))*soak(org()+toHalf(pos),toHalf(dir),t);
    pos+=dir*t; gW+=spread*t;
    vec3 n=grad(pos);
    if(dot(dir,n)<0.) n=normalize(n-dir*(dot(dir,n)-.02));
    gA=spread*uIor+(uIor-1.)*gK*gW; gL=level(gA)+float(i)*.1;
    gF=mix(.28,1.,smoothstep(.04,.34,max(k0,gK)))*mix(1.,.4,smoothstep(1.5,4.,gL))*(i==0?1.:.5);
    thr*=exp(-t*.07*uTint*(1.-tintc));
    lids*=smoothstep(.8,.96,abs(n.y));
    vec3 ex=refract(dir,-n,uIor);
    vec3 f2=mix(vec3(1.),film(dot(dir,n),nm2)*1.7,uFilm*.6*(1.-.8*smoothstep(.8,.95,abs(n.y))));
    if(dot(ex,ex)>.5){
      float kr=fres(dot(ex,n),uIor);
      vec3 lv=leave(dir,n,pos,i<2?3:1);
      if(i==0&&uBelow<.5){ gE=max(gW*.8,.03); vec2 h=housing(pos,ex); lv=lv*(1.-.22*h.y)+gLine*min(h.x,1.2); }
      acc+=thr*(1.-kr)*lv*f2*(i==0?1.:1.-.8*lids);
      thr*=max(kr,.05)*f2;
    } else if(i==uBounces-1) acc+=thr*leave(dir,n,pos,3)*.5;
    if(max(thr.r,max(thr.g,thr.b))<.08) break;
    dir=reflect(dir,-n); spread+=2.*gK*gW;
  }
  col+=acc;
  col+=uRim*p5(1.-ct)*(.15+fc*.35)*uLight+gLine*rim*1.6;
  vec3 ink=glow(tone(col),heat);
  // the legend is cut into the dish, and the dish never burns so hot that white would drown in it
  vec2 cell=vec2(mod(vD.y,7.),floor(vD.y/7.)), lu=clamp(vP.xz/17.+.5,.004,.996), at=vec2(cell.x+lu.x,6.-cell.y-lu.y)/vec2(7.,6.);
  float lum=dot(ink,vec3(.3,.55,.15)); ink*=mix(1.,min(1.,(.4+.2*lum)/max(lum,.01)),top);
  o=vec4(mix(ink,vec3(1.),texture(uLeg,at).r*top),1.);
}`;
const PLATE_VERT = /* glsl */ `
in vec3 position,normal; uniform mat4 modelMatrix,viewMatrix,projectionMatrix; centroid out vec3 vP,vN,vW;
void main(){ vP=position; vN=normal; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;

// A thin plate lets what is behind it straight through its lids (that part is simply blended); near the rim and on it the
// ray is followed until it leaves, and lands in the room, the liquid or the layer below.
const PLATE_FRAG = LIGHT + /* glsl */ `
centroid in vec3 vP,vN,vW; out vec4 o;
uniform sampler2D uSdf; uniform vec4 uBox; uniform float uMir,uBelow; uniform vec4 uSpan; // y0, y1, rim radius, inset
float gK,gF=1.;
vec3 sd2(vec2 p){ vec3 s=texture(uSdf,(vec2(p.x*uMir,p.y)-uBox.xy)/uBox.zw).xyz; s.y*=uMir; s.x+=uSpan.w; return s; }
vec3 grad(vec3 p){
  float ym=(uSpan.x+uSpan.y)*.5, r=uSpan.z;
  vec3 s=sd2(p.xz); vec2 w=vec2(s.x+r,abs(p.y-ym)-(uSpan.y-uSpan.x)*.5+r);
  vec3 a=vec3(s.y,0.,s.z), b=vec3(0.,p.y>ym?1.:-1.,0.);
  gK=w.x>0.&&w.y>0.?1./r:w.x>w.y?.06:.002;
  return w.x>0.&&w.y>0.?normalize(normalize(a)*w.x+b*w.y):w.x>w.y?normalize(a):b;
}
float out_(vec3 p,vec3 d){
  float tv=abs(d.y)<1e-4?1e3:((d.y>0.?uSpan.y:uSpan.x)-p.y)/d.y, l=max(length(d.xz),1e-4), t=.1; tv=max(tv,.02);
  for(int i=0;i<7;i++){ float s=-sd2(p.xz+d.xz*t).x; if(s<.03) break; t+=max(s/l,.02); if(t>tv) return tv; }
  return min(t,tv);
}
vec3 gV; float gL,gW,gA,gPx;
vec3 room(vec3 w,vec3 d){ float k=smoothstep(.015,.2,1.-dot(d,gV)); if(k<.004) return vec3(0.); vec3 c=env(w,gL)*k; return c*gF/(1.+max(c.r,max(c.g,c.b))*(1.-gF)*5.); }
vec3 beyond(vec3 p,vec3 wp,vec3 d){
  vec3 w=toW(d), c=room(w,d)+wall(wp,w,gA);
  if(uBelow<.5&&d.y<-.1){ float t=min(max(p.y-${f1(Y.pcb1)},.5)/-d.y,40.); vec4 b=textureLod(uBack,scr(p+d*t),log2(max((gW+gA*t)/gPx,1.))); c=c*(1.-b.a)+untone(b.rgb); }
  return c;
}
vec3 leave(vec3 dir,vec3 n,vec3 p,int N){
  vec3 wp=(modelMatrix*vec4(p,1.)).xyz, c=vec3(0.), ws=vec3(1e-4);
  for(int i=0;i<N;i++){
    float t=(float(i)+.5)/float(N);
    vec3 e=refract(dir,-n,uIor+uDisp*(t-.5)); if(dot(e,e)<.5) e=normalize(dir-n*dot(dir,n)*1.02);
    vec3 w=N==1?vec3(1.):spec(t); c+=w*beyond(p,wp,e); ws+=w;
  }
  return c/ws;
}
void main(){
  vec3 camL=(uInv*vec4(cameraPosition,1.)).xyz;
  vec3 N=normalize(vN), V=normalize(vP-camL);
  if(dot(V,N)>0.) N=normalize(N-V*(dot(V,N)+.02));
  float fl=smoothstep(.97,.999,abs(N.y)), ct=clamp(-dot(V,N),0.,1.), hush=1.-fl*smoothstep(.02,.26,ct);
  vec3 dir=refract(V,N,1./uIor);
  // well inside the rim there is nothing to bend, only a sheen when it is seen along its face
  bool inner=fl>.99&&sd2(vP.xz).x<-(uSpan.y-uSpan.x)*length(dir.xz)/max(abs(dir.y),.1)-.25;
  if(inner&&hush<.02) discard;
  gV=V; gPx=max(length(fwidth(vP))*.6,.02); gW=gPx; grad(vP);
  float k0=gK, spread=gK*gPx, lod=level(2.*spread); spread*=1.-1./uIor;
  float F=fres(ct,uIor);
  vec2 q=vP.xz*.028;
  float nm=uFilmNm*(1.+.42*snz(q*1.5+vP.y*.06,uTime*.35)+.2*snz(q*3.1+4.,uTime*.25))-(vP.y-6.)*6.;
  float nm2=uFilmNm*(1.1+.4*snz(q*1.6-3.,uTime*.3)), rd=uDisp*.22;
  vec3 fc=film(ct,max(nm,40.)), col=vec3(0.);
  if(hush>.02){
    vec3 R=toW(reflect(V,N)), side=normalize(cross(R,vec3(.2,1.,.1)));
    vec3 refl=vec3(env(normalize(R+side*rd),lod).r,env(R,lod).g,env(normalize(R-side*rd),lod).b)+wall(vW,R,2.*gK*gPx);
    col=hush*(refl*(F*1.15+.02)*mix(vec3(1.),fc*1.9,uFilm)+fc*uFilm*.5*(1.-ct)*(1.-ct)*sqrt(1.-ct)*(.25+.75*dot(refl,vec3(.333))));
  }
  if(inner){ col*=.4; o=vec4(tone(col),0.); return; }

  vec3 pos=vP, acc=vec3(0.), tintc=lut(.55);
  vec3 thr=vec3(1.-F)*mix(vec3(1.),mix(vec3(1.),fc*1.5,.55),uFilm*.7*(1.-.7*fl));
  float heat=0., lids=fl, pass=0.;
  int nb=min(uBounces,3);
  for(int i=0;i<3;i++){
    if(i>=nb) break;
    float t=out_(pos,dir);
    if(uLitN>0) heat+=dot(thr,vec3(.333))*soak(pos,dir,t);
    pos+=dir*t; gW+=spread*t;
    vec3 n=grad(pos);
    if(dot(dir,n)<0.) n=normalize(n-dir*(dot(dir,n)-.02));
    gA=spread*uIor+(uIor-1.)*gK*gW; gL=level(gA)+float(i)*.4;
    gF=mix(.1,1.,smoothstep(.04,.3,max(k0,gK)))*mix(1.,.8,smoothstep(2.,4.5,gL));
    thr*=exp(-t*.05*uTint*(1.-tintc));
    lids*=smoothstep(.9,.99,abs(n.y));
    vec3 ex=refract(dir,-n,uIor);
    vec3 f2=mix(vec3(1.),film(dot(dir,n),nm2)*1.7,uFilm*.6*(1.-.8*smoothstep(.8,.95,abs(n.y))));
    if(dot(ex,ex)>.5){
      float kr=fres(dot(ex,n),uIor);
      if(lids<.99) acc+=thr*(1.-kr)*leave(dir,n,pos,i<2?3:1)*f2*(1.-lids);
      pass+=dot(thr,vec3(.333))*(1.-kr)*lids;
      thr*=max(kr,.05)*f2;
    } else if(i==nb-1) acc+=thr*leave(dir,n,pos,3)*.5;
    if(max(thr.r,max(thr.g,thr.b))<.08) break;
    dir=reflect(dir,-n); spread+=2.*gK*gW;
  }
  pass=clamp(pass*1.06,0.,1.);
  col+=acc+uRim*p5(1.-ct)*(.15+fc*.35)*uLight*(1.-.8*fl);
  o=vec4(glow(tone(col),heat*(1.-pass)),1.-pass);
}`;

const SOLID_VERT = /* glsl */ `
in vec3 position,normal,aT; in vec4 aF; in vec2 uv; in float aM; uniform mat4 modelMatrix,viewMatrix,projectionMatrix;
out vec3 vP,vN,vW; flat out vec3 vT; out vec4 vF; out vec2 vUv; flat out float vM;
void main(){ vP=position; vN=normal; vT=aT; vF=aF; vUv=uv; vM=aM; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;

const FACE = /* glsl */ `
in vec3 vP,vN,vW; flat in vec3 vT; in vec4 vF; in vec2 vUv; flat in float vM; out vec4 o;
// how near the rim of its own face this is, and the normal rolled over it
vec3 rolled(vec3 N,float w,out float e){
  vec2 fw=max(fwidth(vF.xy),vec2(1e-4)), d=vF.zw-abs(vF.xy), k=1.-smoothstep(vec2(0.),max(vec2(w),fw*1.25),d);
  e=max(k.x,k.y)*min(1.,w*1.6/max(max(fw.x,fw.y),1e-4)+.35);
  return normalize(N+(vT*sign(vF.x)*k.x+cross(N,vT)*sign(vF.y)*k.y)*.9);
}`;

const SOLID_FRAG = LIGHT + FACE + /* glsl */ `
uniform sampler2D uArt; uniform float uLed,uMir;
void main(){
  vec3 V=normalize(vP-(uInv*vec4(cameraPosition,1.)).xyz), N=normalize(vN); int m=int(vM+.5);
  float e; vec3 n=rolled(N,.15,e);
  if(m==${M.steel}||m==${M.gold}) n=normalize(n+(vT*vF.x/max(vF.z,.1)+cross(N,vT)*vF.y/max(vF.w,.1)*.5)*.22); // metal is never quite flat
  if(dot(V,n)>0.) n=normalize(n-V*(dot(V,n)+.02));
  float ct=clamp(-dot(V,n),0.,1.), fr=p5(1.-ct);
  vec3 R=toW(reflect(V,n)), fc=film(ct,uFilmNm*.7+150.*snz(vP.xz*.12,uTime*.3)+vP.x*2.2+vP.z*1.1);
  vec3 f0=vec3(.045), base=vec3(.003); float lod=3.2;
  if(m==${M.gold}){ f0=mix(vec3(1.,.72,.36),fc*1.2,.18*uFilm); base=f0*.012; lod=1.7; }
  else if(m==${M.steel}){ f0=mix(vec3(.34,.34,.37),fc*.7,.4*uFilm); base=vec3(.006); lod=1.8; }
  else if(m==${M.plastic}){ base=vec3(.003); lod=4.5; f0=vec3(.03); }
  else if(m==${M.passive}){ float k=smoothstep(-.04,.04,abs(vF.x)-vF.z+.24); f0=mix(vec3(.04),vec3(.45,.43,.40),k); base=mix(vec3(.016,.012,.010),vec3(.03),k); lod=3.; }
  else if(m==${M.mask}&&vN.y>.5){
    vec4 t=texture(uArt,vUv); float pad=smoothstep(.62,.9,t.r);
    base=vec3(.002)+t.g*vec3(.030,.032,.036); f0=mix(vec3(.04),vec3(1.,.74,.40),pad); base=mix(base,vec3(.03,.02,.01),pad); lod=mix(3.4,2.6,pad);
  }
  vec3 amb=env(toW(n),6.6), r=env(R,lod)+wall(vW,R,.12);
  bool metal=m==${M.gold}||m==${M.steel};
  // black parts would turn grey under a whole softbox, so flat on they barely mirror it
  r/=1.+r*(metal?.45:.8);
  vec3 col=amb*base*3.+r*(metal?f0:f0*(.12+.88*e)+fr*.3);
  if(metal) col+=f0*amb*.09;
  // a fine lit edge is what makes black parts read on black
  vec3 lit=mix(vec3(.75),fc*1.3,.2+.45*uFilm);
  col+=e*lit*(.045+.30*dot(amb,vec3(.333))+.25*dot(r,vec3(.333)))*(m==${M.gold}?.6:1.);
  float heat=0.; for(int i=0;i<uLitN;i++){ vec3 a=vP-uLit[i].xyz; heat+=uLit[i].w*22./(22.+dot(a,a)); }
  vec3 c=tone(col);
  if(vN.y>.5){
    float w=0.; if(m==${M.mask}||m==${M.epoxy}) w=texture(uArt,vUv).b;
    c=mix(c,vec3(.93),w*(m==${M.mask}?.92:.82));
  }
  if(m==${M.hole}) c=vec3(0.);
  if(uLed>.002){
    vec2 p=vec2(vP.x*uMir,vP.z)-vec2(${f1(+MCX.toFixed(4))},${f1(+N0.toFixed(4))}), a=p-vec2(${LEDS[0].map(f1)}), b=p-vec2(${LEDS[1].map(f1)});
    float g=m==${M.led}?2.4:vP.y>${f1(NT - 0.2)}&&vP.y<${f1(NT + 2.4)}?1.5/(1.+1.1*min(dot(a,a),dot(b,b))):0.;
    c=1.-(1.-c)*(1.-clamp(lut(m==${M.led}?.96:.72)*g*uLed,0.,1.));
  }
  if(m==${M.led}) c+=vec3(.10)+e*.12;
  o=vec4(glow(c,heat*.5*(.25+e)),1.);
}`;

// clear housings: almost nothing but their edges
const HOUSE_FRAG = LIGHT + FACE + /* glsl */ `
void main(){
  vec3 V=normalize(vP-(uInv*vec4(cameraPosition,1.)).xyz), N=normalize(vN); if(dot(V,N)>0.) N=-N;
  vec2 fw=max(fwidth(vF.xy),vec2(1e-4)), d=(vF.zw-abs(vF.xy))/fw; float l=1.-smoothstep(.4,1.5,min(d.x,d.y)), e;
  vec3 n=rolled(N,.2,e); float ct=clamp(-dot(V,N),0.,1.);
  vec3 fc=film(max(ct,.3),uFilmNm*.8+180.*snz(vP.xz*.1,uTime*.3)+vP.x*1.4);
  vec3 r=env(toW(reflect(V,n)),2.5), lit=mix(vec3(.62),fc*1.25,.25+.5*uFilm)*min(uLight,1.6);
  vec3 col=l*lit*(.13+.22*dot(r,vec3(.333)))+env(toW(reflect(V,N)),2.)*fc*p5(1.-ct)*.5;
  float heat=0.; for(int i=0;i<uLitN;i++){ vec3 a=vP-uLit[i].xyz; heat+=uLit[i].w*26./(26.+dot(a,a)); }
  float a=max(l*.55,.16); vec3 c=tone(col);
  o=vec4(c+lut(1.-exp(-heat*1.6))*min(1.,heat*2.)*(l*.55+.10),a);
}`;

const SHEET_VERT = /* glsl */ `in vec3 position; uniform mat4 modelMatrix,viewMatrix,projectionMatrix; out vec3 vP,vW;
void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;

// copper, as metal under a film, on either face of the board
const COPPER_FRAG = LIGHT + /* glsl */ `in vec3 vP,vW; out vec4 o; uniform sampler2D uArt; uniform vec4 uArtBox,uMark,uMarkUv; uniform float uMir,uRear,uSmoke;
void main(){
  vec3 V=normalize(vP-(uInv*vec4(cameraPosition,1.)).xyz); float s=V.y<0.?1.:-1., ct=abs(V.y);
  vec2 p=vec2(vP.x*uMir,vP.z), uv=(p-uArtBox.xy)*uArtBox.z;
  vec4 t=texture(uArt,uv); float raw=uRear>.5?t.g:t.r, px=max(length(dFdx(uv)),length(dFdy(uv)))*${f1(ART)}, sh=clamp(1./px,1.,3.5);
  float cov=clamp((min(raw/.6,1.)-.5)*sh+.5,0.,1.), pad=clamp(((raw-.6)/.4-.5)*sh+.5,0.,1.);
  vec2 g=vec2(dFdx(cov),dFdy(cov));
  float relief=dot(g,vec2(-.55,.83))*min(px,2.);
  vec3 N=vec3(0.,s,0.), fc=film(max(ct,.25),uFilmNm*.75+170.*snz(p*.055,uTime*.25)+p.x*1.6-p.y*1.1);
  vec3 r=env(toW(reflect(V,N)),2.2)+wall(vW,toW(reflect(V,N)),.1);
  // front copper from the warm end of the palette, back copper from the cool one
  vec3 body=lut(uRear>.5?.40:.66); body*=body; float mx=max(body.r,max(body.g,body.b)); body/=max(mx,.12);
  body=mix(body,body*(.35+fc*1.5),.3+.6*uFilm); body=mix(body,mix(vec3(1.,.8,.52),fc*1.3,.35*uFilm),pad*.55);
  bool away=(uRear>.5)==(s>0.); // the far face, seen through the board
  r/=1.+r;
  vec3 col=body*((away?.27:.5)+.04*pad+(.2+.1*pad)*dot(r,vec3(.333)))*min(uLight,1.6)*(1.+clamp(relief,-.5,.5)*.8)+r*pad*.03;
  float heat=0.; for(int i=0;i<uLitN;i++){ vec3 a=vP-uLit[i].xyz; heat+=uLit[i].w*60./(60.+dot(a,a)); }
  vec3 c=tone(col); c=1.-(1.-c)*(1.-lut(1.-exp(-heat*1.8))*min(1.,heat*1.5)*.8);
  float ink=0.;
  if(uRear<.5&&!away){
    ink=t.b*.34;
    vec2 q=(p-uMark.xy)/uMark.zw; if(abs(q.x)<.5&&abs(q.y)<.5){ q+=.5; if(uMir<0.) q.x=1.-q.x; ink=max(ink,texture(uArt,uMarkUv.xy+q*uMarkUv.zw).b*.8); }
  }
  float a=max(cov*(away?.8:.94),uSmoke);
  o=vec4(c*cov*(away?.8:.94),a);
  o=mix(o,vec4(vec3(.85),1.),ink);
}`;

// what a struck key sends down its row and its column
const PULSE_VERT = /* glsl */ `in vec3 position,aA,aB,aS; in float aK; uniform mat4 modelMatrix,viewMatrix,projectionMatrix; uniform float uMir; uniform vec2 uPulse[${PER}];
out vec2 vQ; flat out vec2 vH; out vec3 vP;
void main(){
  vec2 u=uPulse[int(aK+.5)];
  if(u.y<.004){ gl_Position=vec4(0.,0.,2.,1.); vQ=vec2(0.); vH=vec2(0.); vP=vec3(0.); return; }
  vec2 d=aB.xz-aA.xz; float l=length(d); d=l>1e-4?d/l:vec2(1.,0.);
  float w=1.9, s=mix(-w*.6,l+w*.6,position.x); vec3 p=vec3(aA.x+d.x*s-d.y*position.y*w,mix(aA.y,aB.y,position.x),aA.z+d.y*s+d.x*position.y*w);
  vQ=vec2(aS.x+s,position.y*w); vH=vec2(u.x*(aS.z+34.),u.y); vP=p;
  gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(p.x*uMir,p.y,p.z,1.);
}`;
const PULSE_FRAG = LIGHT + /* glsl */ `in vec2 vQ; flat in vec2 vH; in vec3 vP; out vec4 o;
void main(){
  float b=vH.x-vQ.x, a=b>0.?exp(-b/15.):exp(-b*b*.5), x=vQ.y*vQ.y;
  o=vec4((lut(.5+.4*a)*exp(-x*2.2)*.75+mix(lut(.9),vec3(1.),.7)*exp(-x*26.)*a)*a*vH.y,0.);
}`;

/* ------------------------------------------------------------- poses */
const DEG = Math.PI / 180;
const REST = [
  { x: -70, y: 13, z: -8, spin: -8, tilt: 52, bank: -7 },
  { x: 70, y: -13, z: 8, spin: 8, tilt: 52, bank: 5 },
];

// how far the board stands in from the plates
const RIM = 0.9;

export class CorneGlass {
  constructor(renderer, g, { font = '"Special Gothic Variable", "Helvetica Neue", Helvetica, Arial, sans-serif', width = 3.1, parts } = {}) {
    this.r = renderer;
    this.g = g;
    this.group = new THREE.Group();
    this.rig = new THREE.Group();
    this.group.add(this.rig);
    this.press = new Float32Array(42); this.vel = new Float32Array(42); this.goal = new Float32Array(42); this.heat = new Float32Array(42);
    this.sent = new Float32Array(42).fill(9); this.gain = new Float32Array(42); // how far each key's pulse has got, and how strong
    this.held = new Set(); this.live = new Map();
    this.taps = [];
    this.idle = 2.5;
    this.struck = [];
    this.v = new THREE.Vector3(); this.e = new THREE.Vector3(); this.clr = new THREE.Color();
    parts = { ...PARTS, ...parts };
    this.owned = []; // geometries, materials, textures and targets to let go of

    // outlines: the case, the board a little inside it, the switch plate with its pocket
    const mm = (o) => smoothLoop(o.map(([x, y]) => [X(x), Z(y)]), 1.2);
    const loop = mm(OUTLINE), open = mm(PLATE), nrm = outward(loop), inset = loop.map(([x, z], i) => [x - nrm[i][0] * RIM, z - nrm[i][1] * RIM]);
    const caseSdf = this.own(bakeOutline(loop)), openSdf = this.own(bakeOutline(open));
    const board = this.board = route(), bx = loop.map((p) => p[0]), bz = loop.map((p) => p[1]), x0 = Math.min(...bx), z0 = Math.min(...bz);
    const art = drawArt(board, [x0, z0, Math.max(...bx) - x0, Math.max(...bz) - z0], parts);
    this.own(art.tex);
    const capG = this.own(capGeometry());
    const inCase = fill(loop), inBoard = fill(inset);
    const onLeft = {
      bottom: plateGeometry(loop, inCase, Y.bot0, Y.bot1, 0.75), rimmed: plateGeometry(inset, inBoard, Y.pcb0, Y.pcb1, 0.4), top: plateGeometry(open, fill(open), Y.plate0, Y.plate1, 0.65),
      back: sheetGeometry(inset, inBoard, Y.pcb0), front: sheetGeometry(inset, inBoard, Y.pcb1), solids: solids(art.cells, board, parts), low: housings('low'), high: housings('high'),
      slab: plateGeometry(loop, inCase, Y.bot0, Y.plate1, 0.75),
    }, onRight = {};
    for (const k in onLeft) { this.own(onLeft[k]); onRight[k] = this.own(mirrored(onLeft[k])); }
    const pulseG = this.own(this.traces(board));

    const packed = { format: THREE.RGBFormat, type: THREE.UnsignedInt101111Type, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, depthBuffer: false };
    this.envM = this.own(new THREE.WebGLRenderTarget(512, 256, { ...packed, wrapS: THREE.RepeatWrapping }));
    this.pEnv = new Pass(`uniform sampler2D t; void main(){ o=vec4(min(texture(t,vUv).rgb,vec3(12.)),1.); }`, { t: uni(null) });
    this.fieldM = this.own(new THREE.WebGLRenderTarget(768, 432, packed));
    this.pField = new Pass(`uniform sampler2D t; void main(){ vec2 h=.25/vec2(768.,432.); vec3 c=vec3(0.); for(int i=0;i<4;i++){ vec3 f=texture(t,vUv+h*vec2(i&1,i>>1)*2.-h).rgb; c+=f*f; } o=vec4(c*.25,1.); }`, { t: uni(null) });
    this.black = this.own(new THREE.DataTexture(new Uint8Array(4), 1, 1)); this.black.needsUpdate = true;
    this.uVP = uni(new THREE.Matrix4()); this.uWall = uni(1); this.uFar = uni(this.black);
    this.legends(font);

    this.sceneFar = new THREE.Scene();
    this.sceneGuts = new THREE.Scene(); // nothing is buried any more; hosts still compile it along with the rest
    for (const s of [this.sceneGuts, this.sceneFar]) s.matrixWorldAutoUpdate = false;
    this.halves = [];
    this.pick = [];
    this.slots = [];
    HALVES.forEach((h, hi) => {
      const half = new THREE.Group();
      half.rotation.order = 'ZXY';
      this.rig.add(half);
      const lit = Array.from({ length: LIT }, () => new THREE.Vector4());
      const base = { ...g, uEnvM: uni(this.envM.texture), uFieldM: uni(this.fieldM.texture), uVP: this.uVP, uWall: this.uWall, uInv: uni(new THREE.Matrix4()), uLit: uni(lit), uLitN: uni(0), uMir: uni(h.m) };
      const mat = (vert, frag, u, o = {}) => this.own(new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: { ...base, ...u }, vertexShader: HEAD + vert, fragmentShader: HEAD + frag, ...o }));
      const OVER = { transparent: true, depthWrite: false, premultipliedAlpha: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
      const uBelow = uni(0), uBack = uni(this.black), uSmoke = uni(0.2), uLed = uni(0), uPulse = uni(Array.from({ length: PER }, () => new THREE.Vector2()));

      // caps: one instanced draw per half
      const ig = this.own(new THREE.InstancedBufferGeometry());
      ig.index = capG.index; ig.setAttribute('position', capG.attributes.position); ig.setAttribute('aD', capG.attributes.aD);
      const own = new Float32Array(PER * 4), key = new THREE.InstancedBufferAttribute(new Float32Array(PER * 4), 4), dyn = new THREE.InstancedBufferAttribute(new Float32Array(PER * 4), 4);
      KEYS.forEach((k, i) => own.set([k.x * h.m, k.z, Math.cos(k.rot * h.m), Math.sin(k.rot * h.m)], i * 4));
      for (const a of [key, dyn]) a.setUsage(THREE.DynamicDrawUsage);
      ig.setAttribute('aKey', key); ig.setAttribute('aDyn', dyn);
      ig.instanceCount = PER;

      const mesh = (geo, m) => { const o = new THREE.Mesh(geo, m); o.frustumCulled = false; o.matrixAutoUpdate = false; return o; };
      const here = (geo, m) => { const o = mesh(geo, m); half.add(o); return o; };
      // drawn off screen, so it borrows the half's matrix instead of hanging from it
      const off = (geo, m, order) => { const o = mesh(geo, m); o.matrixWorldAutoUpdate = false; o.matrixWorld = half.matrixWorld; o.renderOrder = order; this.sceneFar.add(o); return o; };
      const G = h.m > 0 ? onLeft : onRight, plate = (sdf, ...span) => mat(PLATE_VERT, PLATE_FRAG, { uSdf: uni(sdf.tex), uBox: uni(sdf.box), uSpan: uni(new THREE.Vector4(...span)), uBelow, uBack }, OVER);
      const mk = art.cells.mark, copper = (uRear) => mat(SHEET_VERT, COPPER_FRAG, { uArt: uni(art.tex), uArtBox: uni(new THREE.Vector4(x0, z0, art.scale, 0)), uMark: uni(new THREE.Vector4(X(6.84), Z(2.5), 8, 8 * 5 / 12)), uMarkUv: uni(new THREE.Vector4(mk.x / ART, mk.y / ART, mk.w / ART, mk.h / ART)), uRear: uni(uRear), uSmoke }, { ...OVER, side: THREE.DoubleSide });
      const solidM = mat(SOLID_VERT, SOLID_FRAG, { uArt: uni(art.tex), uLed }), houseM = mat(SOLID_VERT, HOUSE_FRAG, {}, { ...OVER, side: THREE.DoubleSide }), frontM = copper(0), backM = copper(1);
      const pulseM = mat(PULSE_VERT, PULSE_FRAG, { uPulse }, { ...OVER, side: THREE.DoubleSide });
      const H = {
        led: 0, half, base, lit, dyn, key, own, uBelow, uBack, uSmoke, uLed, uPulse, below: false, eye: new THREE.Vector3(), order: KEYS.map((_, i) => i),
        caps: here(ig, mat(CAP_VERT, CAP_FRAG, { uLeg: this.uLeg, uBack, uBelow, uStem: uni(parts.stems ? 1 : 0) })),
        solids: here(G.solids, solidM),
        stack: [
          here(G.bottom, plate(caseSdf, Y.bot0, Y.bot1, 0.75, 0)), here(G.back, backM), here(G.rimmed, plate(caseSdf, Y.pcb0, Y.pcb1, 0.4, RIM)), here(G.front, frontM),
          here(pulseG, pulseM), here(G.low, houseM), here(G.top, plate(openSdf, Y.plate0, Y.plate1, 0.65, 0)), here(G.high, houseM),
        ],
        far: [off(G.solids, solidM, 0), off(G.back, backM, 1), off(G.front, frontM, 2), off(pulseG, pulseM, 3), off(G.low, houseM, 4)],
      };
      H.pulses = [H.stack[4], H.far[3]];
      this.halves.push(H);

      // unseen stand-ins for the pointer
      const box = (w, y0, y1, d) => this.own(new THREE.BoxGeometry(w, y1 - y0, d).translate(0, (y0 + y1) / 2, 0));
      const one = box(CAP.b * 2, CAP.y - 1, CAP.y + CAP.h, CAP.b * 2);
      KEYS.forEach((k, i) => {
        const o = new THREE.Mesh(k.ext ? box(CAP.b * 2, CAP.y - 1, CAP.y + CAP.h, (CAP.b + k.ext) * 2) : one);
        o.visible = false; o.position.set(k.x * h.m, 0, k.z); o.rotation.y = k.rot * h.m; o.userData.key = hi * PER + i;
        half.add(o); this.pick.push(o);
        this.slots.push({ half: hi, x: k.x * h.m, z: k.z, nx: 9, ny: 9, r: 0 });
      });
      const s = new THREE.Mesh(G.slab); s.visible = false; s.userData.key = -1; half.add(s); this.pick.push(s);
    });
    this.rest = REST; this.loop = loop;
    this.fit(width);
  }

  // centre the resting keyboard on the group and make it the asked-for width
  fit(width) {
    this.pose(0);
    this.rig.scale.setScalar(1); this.rig.position.set(0, 0, 0);
    this.rig.updateMatrixWorld(true);
    const bb = new THREE.Box3(), pts = [], inv = new THREE.Matrix4().copy(this.rig.matrixWorld).invert();
    this.halves.forEach((H, i) => this.loop.forEach(([x, z]) => [0, CAP.y + CAP.h].forEach((y) => { const v = new THREE.Vector3(x * HALVES[i].m, y, z).applyMatrix4(H.half.matrixWorld).applyMatrix4(inv); bb.expandByPoint(v); pts.push(v); })));
    const size = bb.getSize(new THREE.Vector3()), mid = bb.getCenter(new THREE.Vector3()), k = width / size.x;
    this.rig.scale.setScalar(k); this.rig.position.copy(mid).multiplyScalar(-k);
    this.size = size.multiplyScalar(k);
    this.hull = pts.map((v) => v.sub(mid).multiplyScalar(k).toArray()); // points it could rest on
  }

  own(o) { this.owned.push(o.tex || o); return o; }

  legends(font) {
    const S = 192, c = Object.assign(document.createElement('canvas'), { width: S * 7, height: S * 6 }), x = c.getContext('2d');
    const draw = () => {
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = x.strokeStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.lineJoin = x.lineCap = 'round';
      LABELS.forEach((l, i) => {
        x.setTransform(1, 0, 0, 1, (i % 7 + 0.5) * S, (Math.floor(i / 7) + 0.5) * S);
        if (ICON[l]) { x.scale(0.62, 0.62); x.lineWidth = 9.5; x.beginPath(); ICON[l](x); x.stroke(); return; }
        const fs = l.length === 1 ? 62 : l.length < 4 ? 41 : 36;
        x.font = `${l.length === 1 ? 500 : 560} ${fs}px ${font}`;
        x.fillText(l, 0, fs * (/[a-z;,.]/.test(l[0]) ? 0.3 : 0.355));
      });
    };
    draw();
    const t = this.own(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
    this.uLeg = uni(t);
    document.fonts?.load(`500 62px ${font}`, 'QSpace').then(() => { draw(); t.needsUpdate = true; }).catch(() => {});
  }

  // every key's way to the controller, as ribbons: along its column and along its row
  traces(board) {
    const a = [], y = [Y.pcb1 + 0.06, Y.pcb0 - 0.06];
    KEYS.forEach((_, k) => [board.col[k], board.row[k]].forEach((path) => {
      let total = 0;
      const pts = path.map(([x, z, l], i) => { if (i) total += Math.hypot(x - path[i - 1][0], z - path[i - 1][1]); return [x, y[l], z, total]; });
      for (let i = 1; i < pts.length; i++) if (pts[i][3] - pts[i - 1][3] > 1e-3) a.push(...pts[i - 1].slice(0, 3), ...pts[i].slice(0, 3), pts[i - 1][3], pts[i][3], total, k);
    }));
    const geo = new THREE.InstancedBufferGeometry(), b = new THREE.InstancedInterleavedBuffer(new Float32Array(a), 10), at = (n, o) => new THREE.InterleavedBufferAttribute(b, n, o);
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3)); geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.setAttribute('aA', at(3, 0)); geo.setAttribute('aB', at(3, 3)); geo.setAttribute('aS', at(3, 6)); geo.setAttribute('aK', at(1, 9));
    geo.instanceCount = a.length / 10;
    return geo;
  }

  setSize(w, h) {
    w = Math.round(w); h = Math.round(h);
    if (this.w === w && this.h === h) return;
    this.w = w; this.h = h;
    this.tFar?.dispose();
    this.tFar = rt(w, h, { type: THREE.UnsignedByteType, minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: true, depthBuffer: true });
    this.uFar.value = this.tFar.texture;
  }

  key(k) { return typeof k === 'number' ? k : keyOfCode(k); }
  // the short tap underneath keeps a press that comes and goes between two frames
  down(code) { const k = this.tap(code, 0, 0.07); if (k >= 0) { this.held.add(k); this.heat[k] = 1; this.idle = 6; } return k; }
  up(code) { const k = this.key(code); this.held.delete(k); return k; }
  tap(key, wait = 0, hold = 0.11, force = 1) { const k = this.key(key); if (k >= 0) this.taps.push({ key: k, at: wait, hold, force }); return k; }
  hit(i) { return i?.object?.userData.key ?? -1; }
  release() { this.held.clear(); }

  pose(time) {
    this.halves.forEach(({ half }, i) => {
      const p = this.rest[i], b = this.calm ? 0 : Math.sin(time * 0.8 + i * 2.1);
      half.position.set(p.x, p.y + b * 1.6, p.z);
      half.rotation.set((p.tilt + b * 0.7) * DEG, (p.spin + b * 0.5) * DEG, (p.bank - b * 0.5) * DEG);
    });
  }

  update(dt, { time = 0, pointer = null, calm = false } = {}) {
    dt = Math.max(0, dt);
    this.calm = calm;
    this.pose(time);
    if (!calm && (this.idle -= dt) < 0) {
      this.tap(Math.floor(Math.random() * 42), 0, 0.14, 0.7);
      this.idle = 2.2 + Math.random() * 3.2;
    }
    let over = -1, best = 1;
    if (pointer) this.slots.forEach((q, i) => { const d = Math.hypot((pointer.x - q.nx) / (q.rx || 1), (pointer.y - q.ny) / (q.ry || 1)); if (q.rx && d < best) { best = d; over = i; } });
    const live = this.live;
    live.clear();
    for (const k of this.held) live.set(k, 1);
    this.taps = this.taps.filter((t) => { const was = t.at <= 0; if (was) live.set(t.key, Math.max(live.get(t.key) || 0, t.force)); t.at -= dt; return !was || t.at > -t.hold; });
    for (let i = 0; i < 42; i++) {
      const on = live.has(i);
      if (on && !this.goal[i]) {
        this.heat[i] = Math.max(this.heat[i], live.get(i));
        if (!calm) { this.sent[i] = 0; this.gain[i] = live.get(i); }
      }
      this.goal[i] = on ? 1 : 0;
      const to = on ? 1 : i === over ? 0.14 : 0; // a cap gives a little under the pointer
      for (let n = 0, h = Math.min(dt, 0.05) / 3; n < 3; n++) { this.vel[i] += ((to - this.press[i]) * 1250 - this.vel[i] * 34) * h; this.press[i] += this.vel[i] * h; }
      this.heat[i] *= Math.exp(-dt * (on ? 0.5 : 2.6));
      if (this.heat[i] < 0.004) this.heat[i] = 0;
      // the pulse takes a third of a second to reach the controller, whose light answers as it lands
      if (this.sent[i] < 1.6) { const was = this.sent[i]; this.sent[i] += dt / 0.34; if (was < 0.92 && this.sent[i] >= 0.92) { const H = this.halves[Math.floor(i / PER)]; H.led = Math.max(H.led, this.gain[i]); } }
    }

    this.halves.forEach((H, hi) => {
      const lit = [];
      for (let k = hi * PER; k < (hi + 1) * PER; k++) if (this.heat[k]) lit.push(k);
      lit.sort((p, q) => this.heat[q] - this.heat[p]);
      H.base.uLitN.value = Math.min(LIT, lit.length);
      let busy = false;
      for (let k = 0; k < PER; k++) { const s = this.sent[hi * PER + k], on = s < 1.5; busy ||= on; H.uPulse.value[k].set(s, on ? this.gain[hi * PER + k] * (1 - Math.max(0, s - 1) * 2) : 0); }
      for (const p of H.pulses) p.visible = busy;
      H.led *= Math.exp(-dt * 5.5); if (H.led < 0.004) H.led = 0;
      H.uLed.value = H.led;
      lit.slice(0, LIT).forEach((k, n) => { const s = this.slots[k]; H.lit[n].set(s.x, CAP.y + 1.4 - this.press[k] * CAP.travel, s.z, this.heat[k]); });
    });
  }

  syncMatrices() {
    for (const H of this.halves) H.base.uInv.value.copy(H.half.matrixWorld).invert();
  }

  prerender(renderer, camera) {
    const keep = renderer.getRenderTarget(), clr = renderer.getClearColor(this.clr), alpha = renderer.getClearAlpha();
    this.uVP.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.uWall.value = camera.projectionMatrix.elements[5] * 216; // texels of the small field per unit, at unit distance
    const v = this.v, e = this.e;
    let deep = false;
    // whichever half is nearer is laid over the other
    const z = this.halves.map((H) => v.setFromMatrixPosition(H.half.matrixWorld).applyMatrix4(camera.matrixWorldInverse).z), rank = z[0] < z[1] ? [0, 20] : [20, 0];
    this.halves.forEach((H, hi) => {
      const eye = H.eye.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(H.base.uInv.value), b = H.below = eye.y < (Y.pcb1 + Y.plate0) / 2;
      // nearest cap first, so the ones behind it are never shaded for nothing
      H.order.sort((p, q) => Math.hypot(H.own[p * 4] - eye.x, H.own[p * 4 + 1] - eye.z) - Math.hypot(H.own[q * 4] - eye.x, H.own[q * 4 + 1] - eye.z));
      H.order.forEach((i, n) => {
        const k = hi * PER + i;
        for (let c = 0; c < 4; c++) H.key.array[n * 4 + c] = H.own[i * 4 + c];
        H.dyn.array[n * 4] = KEYS[i].ext; H.dyn.array[n * 4 + 1] = k; H.dyn.array[n * 4 + 2] = this.press[k] * CAP.travel; H.dyn.array[n * 4 + 3] = this.heat[k];
      });
      H.key.needsUpdate = H.dyn.needsUpdate = true;
      H.uBelow.value = b ? 1 : 0; H.uBack.value = b ? this.black : this.uFar.value; H.uSmoke.value = b ? 0.5 : 0.2;
      H.caps.renderOrder = b ? 2 : 0; H.solids.renderOrder = 1;
      H.stack.forEach((o, n) => { o.renderOrder = 10 + rank[hi] + (b ? H.stack.length - n : n); });
      deep ||= !b;
    });
    // where the caps are on screen, for the pointer and for anyone throwing light off a struck key
    this.struck.length = 0;
    this.slots.forEach((s, i) => {
      const m = this.halves[s.half].half.matrixWorld;
      v.set(s.x, CAP.y + CAP.h, s.z).applyMatrix4(m).project(camera); e.set(s.x + CAP.b, CAP.y + CAP.h, s.z + CAP.b).applyMatrix4(m).project(camera);
      s.nx = v.x; s.ny = v.y; s.rx = Math.abs(e.x - v.x) * 1.1; s.ry = Math.abs(e.y - v.y) * 1.1;
      if (this.heat[i] > 0.02) this.struck.push({ x: s.nx, y: s.ny, s: this.heat[i], key: i });
    });

    // both only stand in where they are seen very small, so a frame of age does not show
    if (this.turn ^= 1) { this.pEnv.u.t.value = this.g.uEnv.value; this.pEnv.render(renderer, this.envM); }
    if (this.g.uFieldAmt.value > 0.001 && (!this.turn || !this.fresh)) { this.fresh = true; this.pField.u.t.value = this.g.uField.value; this.pField.render(renderer, this.fieldM); }
    renderer.setClearColor(0x000000, 0);
    if (deep) { renderer.setRenderTarget(this.tFar); renderer.clear(true, true, false); renderer.render(this.sceneFar, camera); }
    renderer.setRenderTarget(keep);
    renderer.setClearColor(clr, alpha);
  }

  dispose() {
    for (const o of this.owned) o.dispose?.();
    this.tFar?.dispose(); this.pEnv.mat.dispose(); this.pField.mat.dispose();
    this.group.removeFromParent();
  }
}
