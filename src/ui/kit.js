import { icon, swap } from './icons.js';

// The component kit. DOM for text, focus and events; every shape is handed to the GL glass each frame.

export const h = (tag, props = {}, ...kids) => {
  const { style, data, on, aria, ...rest } = props || {};
  const e = Object.assign(document.createElement(tag), rest);
  if (style) for (const k in style) (k.startsWith('--') ? e.style.setProperty(k, style[k]) : (e.style[k] = style[k]));
  if (data) Object.assign(e.dataset, data);
  if (aria) for (const k in aria) e.setAttribute(k === 'role' ? 'role' : `aria-${k}`, aria[k]);
  if (on) for (const k in on) e.addEventListener(k, on[k]);
  e.append(...kids.flat().filter((k) => k != null && k !== false));
  return e;
};
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class Spring {
  constructor(x = 0, k = 420, c = 26) { this.x = x; this.v = 0; this.to = x; this.k = k; this.c = c; }
  step(dt) {
    let n = Math.max(1, Math.ceil(dt / 0.004)); const d = dt / n;
    while (n--) { this.v += ((this.to - this.x) * this.k - this.v * this.c) * d; this.x += this.v * d; }
    if (Math.abs(this.to - this.x) < 1e-4 && Math.abs(this.v) < 1e-3) { this.x = this.to; this.v = 0; }
    return this.x;
  }
  set(x) { this.x = this.to = x; this.v = 0; }
}

// Words that move with the page are kept as a picture and drawn by the glass itself, so a label never
// trails the pane it sits on and a lens can bend it.
const AW = 2048, AH = 2048;
export class Atlas {
  constructor() {
    this.canvas = Object.assign(document.createElement('canvas'), { width: AW, height: AH });
    this.ctx = this.canvas.getContext('2d');
    this.clear();
  }
  clear() { this.x = this.y = this.row = 0; this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, AW, AH); this.dirty = true; }
  put(el, k, colour) {
    const r = el.getBoundingClientRect(), w = Math.ceil(r.width * k), hh = Math.ceil(r.height * k);
    if (!w || !hh || w > AW) return null;
    if (this.x + w + 2 > AW) { this.x = 0; this.y += this.row + 2; this.row = 0; }
    if (this.y + hh > AH) return null;
    const x = this.x, y = this.y;
    this.x += w + 2; this.row = Math.max(this.row, hh);
    paintText(this.ctx, el, { left: r.left - x / k, top: r.top - y / k }, k, colour);
    this.dirty = true;
    return [x / AW, 1 - (y + r.height * k) / AH, (r.width * k) / AW, (r.height * k) / AH];
  }
}

const PANE = { a: 1, solid: 0, col: [1, 1, 1, 0], glow: 0, px: 0, py: 0, zoom: 1, blur: 0, dim: 0, bez: 1, dep: 1, rim: 1, shadow: 1, clip: -1, inside: null, mode: 0, k: 1, group: null };

export class Kit {
  constructor({ root, calm, burst }) {
    this.root = root; this.calm = calm; this.burst = burst;
    this.atlas = new Atlas(); this.labels = []; this.stale = true;
    this.views = new Map();
    this.now = 0; this.s = null; this.give = calm ? 0.25 : 1;
    this.wantInk = false; this.inkKey = '';
    this.page = this.view('page'); this.chrome = this.view('chrome'); this.over = this.view('over');
    this.quiet = new Spring(1, 160, 24); // the page's own words, while something lies over them
    this.top = [0, 60];
    this.cur = this.page;
  }
  view(id) { const v = { id, panes: [], ticks: [], inks: [] }; this.views.set(id, v); this.cur = v; return v; }
  in(v, fn) { const was = this.cur; this.cur = v; try { return fn(); } finally { this.cur = was; } }
  // a new page: everything the old one owned goes
  reset() { this.page.panes.length = this.page.ticks.length = this.page.inks.length = 0; this.labels = this.labels.filter((l) => l.view !== this.page); this.stale = true; }

  /* ---------------------------------------------------------- shapes */
  pane(layer, el, o = {}) {
    const p = { ...PANE, ...o, el, layer, view: this.cur, col: [...(o.col || PANE.col)] };
    this.cur.panes.push(p);
    return p;
  }
  glass(el, o) { el.classList.add('g'); return this.pane(0, el, o); }
  fill(el, o) { return this.pane(1, el, o); }
  lens(el, o) { return this.pane(2, el, o); }
  // an element's words, drawn in GL from now on
  label(el, o = {}) {
    const p = this.fill(el, { r: 0, rpx: 0, mode: 3, word: true, glow: 1, ...o });
    p.col = [0, 0, 0, 0]; p.ready = false;
    this.labels.push(p); this.stale = true;
    return p;
  }
  drop(p) { const i = p.view.panes.indexOf(p); if (i >= 0) p.view.panes.splice(i, 1); this.labels = this.labels.filter((l) => l !== p); }
  tick(fn, view = this.cur) { view.ticks.push(fn); return fn; }

  // repaint the atlas: after fonts, a resize, or new words
  letter() {
    this.stale = false;
    this.atlas.clear();
    const k = Math.min(2, this.k);
    for (const p of this.labels) {
      const t = p.el.style.transform; if (t) p.el.style.transform = '';
      const at = p.el.isConnected ? this.atlas.put(p.el, k, p.ink) : null;
      if (t) p.el.style.transform = t;
      p.ready = !!at;
      if (at) p.col = at;
      p.el.classList.toggle('inked', !!at);
    }
  }

  // everything visible, measured where it is right now
  collect(cw, ch, s) {
    const out = [[], [], [], [], [], []], groups = new Map(), sc = 1 / ch, snap = this.k;
    const quiet = clamp(this.quiet.x, 0, 1);
    for (const v of this.views.values()) {
      const over = v === this.over, page = v === this.page;
      for (const p of v.panes) {
        let a = p.a;
        if (a < 0.004 || (p.word && !p.ready)) continue;
        const r = p.el.getBoundingClientRect();
        if (r.width < 0.5 || r.height < 0.5 || r.bottom < -60 || r.top > ch + 60) continue;
        if (page) {
          if (!p.loud) a *= quiet;
          // in-flow glass gives way to the nav; words do it line by line in the shader
          if (!p.word && !p.stay) a *= clamp((r.top + r.height * 0.5 - this.top[0]) / (this.top[1] - this.top[0] + r.height * 0.5), 0, 1);
          if (a < 0.004) continue;
        }
        let l = r.left, t = r.top;
        if (p.word) { l = Math.round(l * snap) / snap; t = Math.round(t * snap) / snap; }
        const hw = r.width * 0.5 * sc, hh = r.height * 0.5 * sc, x = (l + r.width / 2) * sc, y = 1 - (t + r.height / 2) * sc, mh = Math.min(hw, hh);
        const want = p.r === 'pill' ? 9 : (p.rpx !== undefined ? p.rpx : p.r) * sc;
        const rr = Math.min(want, mh);
        // squarer curvature for panels, true arcs for capsules
        const n = p.rpx !== undefined ? 2 : 2 + s.gCorner * 1.1 * clamp((1 - rr / mh) * 4, 0, 1);
        const q = p.q || (p.q = {});
        Object.assign(q, p, { x, y, hw, hh, r: rr, n, a, inside: p.inside ? p.inside.q : null });
        q.slot = -1;
        if (p.layer === 0 && p.group && !over) {
          let g = groups.get(p.group);
          if (!g) { g = { panes: [], k: s.gMerge * sc }; groups.set(p.group, g); out[0].push(g); }
          g.panes.push(q);
        } else out[p.at ?? p.layer + (over ? 3 : 0)].push({ panes: [q], k: 0 });
      }
    }
    return out;
  }

  frame(dt, s, now) {
    this.now = now; this.s = s; this.wantInk = false;
    this.quiet.step(dt);
    for (const v of this.views.values()) for (const f of v.ticks) f(dt, s);
  }

  /* ------------------------------------------------------------- feel */
  // press: the glass swells and lights up under the finger, and leans a little after it
  pressable(el, pane, o = {}) {
    const sc = new Spring(1, 520, 20), gl = new Spring(0, 260, 26), tx = new Spring(0, 300, 20), ty = new Spring(0, 300, 20);
    let held = false, sx = 0, sy = 0, hov = 0, lastT = '';
    const grow = o.grow ?? 0.06;
    el.addEventListener('pointerenter', () => { hov = 1; });
    el.addEventListener('pointerleave', () => { hov = 0; });
    el.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      e.stopPropagation();
      held = true; sx = e.clientX; sy = e.clientY; pane.ex = e.clientX; pane.ey = e.clientY;
      if (o.ripple !== false) this.burst(e.clientX, e.clientY, 0.35 * this.give);
      const mv = (m) => { pane.ex = m.clientX; pane.ey = m.clientY; const r = el.getBoundingClientRect(), soft = (d, w) => Math.sign(d) * w * 0.16 * (1 - Math.exp(-Math.abs(d) / w)) * this.give; tx.to = soft(m.clientX - sx, r.width); ty.to = soft(m.clientY - sy, r.height); };
      const up = () => { held = false; tx.to = ty.to = 0; removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
    const t = this.tick((dt) => {
      const on = held || o.lit?.();
      sc.to = 1 + (held ? grow * this.give : 0);
      gl.to = held ? 1 : on ? 0.5 : hov * 0.28;
      sc.step(dt); gl.step(dt); tx.step(dt); ty.step(dt);
      pane.glow = gl.x * (o.glow ?? 1);
      if (pane.ex !== undefined && held) this.aim(pane); else if (!held && gl.x < 0.4) this.mid(pane, el);
      // a lean stretches the way it leans
      const st = 1 + Math.min(0.12, (Math.abs(tx.x) + Math.abs(ty.x)) * 0.004);
      const ax = Math.abs(tx.x) >= Math.abs(ty.x);
      const T = `translate(${tx.x.toFixed(2)}px,${ty.x.toFixed(2)}px) scale(${(sc.x * (ax ? st : 1 / Math.sqrt(st))).toFixed(4)},${(sc.x * (ax ? 1 / Math.sqrt(st) : st)).toFixed(4)})`;
      if (T !== lastT) { el.style.transform = lastT = T; }
    });
    return { held: () => held, sc, t };
  }
  aim(p) { p.px = p.ex / this.ch; p.py = 1 - p.ey / this.ch; }
  mid(p) { if (p.q) { p.px = p.q.x; p.py = p.q.y + p.q.hh * 0.6; } }


  /* -------------------------------------------------------- components */
  // a button that is already on the page
  pill(el, o = {}) {
    const p = this.glass(el, { r: 'pill', ...o });
    this.pressable(el, p, o);
    if (o.label !== false) { const w = el.querySelector('.lab') || el; el.word = this.label(w, o.at !== undefined ? { at: 4 } : {}); }
    el.pane = p;
    return p;
  }
  // a solid sheet just inside the rim
  fillOver(el, p, o = {}) {
    const i = h('i', { className: 'sheet' });
    el.prepend(i);
    return this.fill(i, { r: 'pill', inside: p, col: [0.985, 0.985, 1, 0], ...o });
  }

  // value by drag, wheel or arrow keys; shared by both sliders
  drive(el, { min, max, step, get, set, vertical, jump, grab, done }) {
    const snap = (v) => +(Math.round(clamp(v, min, max) / step) * step).toFixed(5);
    const a11y = () => { el.setAttribute('aria-valuenow', String(+get().toFixed(3))); };
    Object.assign(el, { tabIndex: 0 }); el.setAttribute('role', 'slider'); el.setAttribute('aria-valuemin', min); el.setAttribute('aria-valuemax', max);
    if (vertical) el.setAttribute('aria-orientation', 'vertical');
    const st = { held: false, over: 0 };
    el.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      e.stopPropagation(); e.preventDefault(); el.focus({ preventScroll: true });
      st.held = true; grab?.(e);
      const r = el.getBoundingClientRect(), len = vertical ? r.height : r.width;
      const at = (m) => (vertical ? r.bottom - m.clientY : m.clientX - r.left) / len;
      let v0 = (get() - min) / (max - min), p0 = at(e);
      if (jump) { v0 = p0; set(snap(min + p0 * (max - min))); }
      const mv = (m) => { const f = v0 + at(m) - p0; st.over = f > 1 ? f - 1 : f < 0 ? f : 0; set(snap(min + clamp(f, 0, 1) * (max - min))); };
      const up = () => { st.held = false; st.over = 0; done?.(); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
    el.addEventListener('keydown', (e) => {
      const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
      if (d) { e.preventDefault(); e.stopPropagation(); set(snap(get() + d * Math.max(step, (max - min) / 40))); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); e.stopPropagation(); set(e.key === 'Home' ? min : max); }
    });
    this.tick(a11y);
    return st;
  }

  // hairline track with a knob that turns into a drop of glass while you hold it
  slider({ name, get, set, min, max, step = 0.01, cls = '', tone = 'white', grab, done, jump = true }) {
    const tr = h('i', { className: 'rail' }), fl = h('i', { className: 'run' }), kn = h('i', { className: 'knob' });
    const el = h('div', { className: `sld ${cls}`, aria: { label: name } }, tr, fl, kn);
    const t = this.fill(tr, { r: 'pill', col: [1, 1, 1, 0.24] });
    this.fill(fl, { r: 'pill', inside: t, ...(tone === 'lut' ? { mode: 1, col: [0.38, 0.94, 0, 1] } : { col: [0.985, 0.985, 1, 1] }) });
    const L = this.lens(kn, { r: 'pill', solid: 1, col: [0.985, 0.985, 1, 0], shadow: 0.55, dep: 0.55, bez: 0.6 });
    const st = this.drive(el, { min, max, step, get, set, jump, grab, done });
    const v = new Spring((get() - min) / (max - min), 520, 38), w = new Spring(0, 340, 24), sq = new Spring(0, 300, 20);
    let last = '';
    this.tick((dt) => {
      v.to = clamp((get() - min) / (max - min), 0, 1); v.step(dt);
      w.to = st.held ? 1 : 0; w.step(dt);
      sq.to = Math.min(0.3, Math.abs(v.v) * 0.12) * this.give; sq.step(dt);
      const x = clamp(v.x, 0, 1), k = clamp(w.x, 0, 1.2);
      fl.style.width = `${(x * 100).toFixed(2)}%`;
      L.solid = 1 - Math.min(1, k) * 0.96; L.zoom = 1 + 0.12 * k;
      kn.style.left = `${(x * 100).toFixed(2)}%`;
      const T = `translate(-50%,-50%) scale(${((1 + 0.5 * k * this.give) * (1 + sq.x)).toFixed(3)},${((1 + 0.5 * k * this.give) * (1 - sq.x * 0.5)).toFixed(3)})`;
      if (T !== last) kn.style.transform = last = T;
    });
    return el;
  }

  // one of several, already on the page; the thumb is a lens that rides between them
  tabs(el, row, items, { get, pick }) {
    const bg = this.glass(el, { r: 'pill', bez: 0.34, dep: 0.5, dim: 0.2 });
    const th = h('i', { className: 'lensthumb' });
    row.before(th);
    const paint = this.fill(th, { r: 'pill', col: [1, 1, 1, 0.15], inside: bg });
    const L = this.lens(th, { r: 'pill', col: [1, 1, 1, 0.07], shadow: 0.7, dep: 0.6, bez: 0.22, rim: 1.1, dim: -1.5, a: 0 });
    const ink = this.fill(row, { r: 0, rpx: 0, mode: 2, col: [1, 1, 1, 0] });
    const x = new Spring(0, 330, 23), wd = new Spring(0, 330, 26), wake = new Spring(0, 300, 25), sq = new Spring(0, 260, 18);
    let held = false, moved = false, first = true, aim = 0, hx = 0, sx = 0, last = '';
    const boxes = () => items.map((b) => [b.offsetLeft, b.offsetWidth]);
    const near = (px) => { let bi = 0, bd = 1e9; boxes().forEach(([l, w], i) => { const d = Math.abs(l + w / 2 - px); if (d < bd) { bd = d; bi = i; } }); return bi; };
    const local = (e) => { const rc = row.getBoundingClientRect(); return (e.clientX - rc.left) * (row.offsetWidth / rc.width); };
    el.addEventListener('pointerdown', (e) => {
      if (e.button || e.ctrlKey || e.metaKey) return;
      held = true; moved = false; sx = e.clientX; hx = local(e);
      const mv = (m) => { if (Math.abs(m.clientX - sx) > 6) moved = true; hx = local(m); };
      const up = (u) => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); held = false; const i = near(hx); if (moved && u.type === 'pointerup' && i !== get()) pick(i); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
    items.forEach((b) => { b.draggable = false; b.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true); });
    this.cur.inks.push(row);
    this.tick((dt) => {
      if (!row.offsetWidth) return;
      const bx = boxes(), i = get(), [l, w] = bx[Math.max(0, i)];
      aim = held && moved ? clamp(hx, bx[0][1] / 2, row.offsetWidth - bx[bx.length - 1][1] / 2) : l + w / 2;
      const tw = held && moved ? bx[near(hx)][1] : w;
      if (first) { x.set(aim); wd.set(tw); first = false; } else { x.to = aim; wd.to = tw; }
      x.k = held ? 620 : 330; x.c = held ? 42 : 23;
      x.step(dt); wd.step(dt);
      wake.to = held || Math.abs(aim - x.x) > w * 0.07 ? 1 : 0; wake.step(dt);
      sq.to = Math.min(0.24, (Math.abs(x.v) / Math.max(60, w)) * 0.028) * this.give; sq.step(dt);
      const k = clamp(wake.x, 0, 1.15), on = clamp(k, 0, 1), g = this.give;
      const sX = (1 + 0.1 * k * g) * (1 + sq.x), sY = (1 + 0.24 * k * g) * (1 - sq.x * 0.45);
      const T = `translateX(${(x.x - wd.x / 2).toFixed(2)}px) scale(${sX.toFixed(4)},${sY.toFixed(4)})`;
      th.style.width = `${wd.x.toFixed(2)}px`;
      if (T !== last) th.style.transform = last = T;
      paint.a = i < 0 ? 0 : 1 - on; L.a = Math.min(1, on * 1.6); L.zoom = 1 + 0.12 * on;
      if (on > 0.02) this.wantInk = true;
      // the DOM labels step aside while the lens is reading the drawn ones
      const o = clamp(1 - on * 5, 0, 1);
      row.style.opacity = o.toFixed(2); ink.col = [1, 1, 1, 1 - o];
    });
    return bg;
  }

  // one of several, small, in a sheet: solid thumb, no lens
  choice({ name, items, get, set }) {
    const el = h('div', { className: 'choice', aria: { role: 'radiogroup', label: name } });
    const th = h('i', { className: 'lensthumb' }), row = h('div', { className: 'items' });
    el.append(th, row);
    const btns = items.map((it) => { const b = h('button', { type: 'button', className: 'it', textContent: it.label, aria: { role: 'radio' } }); row.append(b); return b; });
    const track = this.fill(el, { r: 'pill', col: [1, 1, 1, 0.1] });
    this.fill(th, { r: 'pill', col: [0.985, 0.985, 1, 1], inside: track });
    const x = new Spring(0, 420, 32), w = new Spring(0, 420, 32);
    let first = true;
    btns.forEach((b, i) => {
      b.addEventListener('click', () => set(items[i].v));
      b.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return; e.preventDefault(); const j = (i + d + items.length) % items.length; set(items[j].v); btns[j].focus();
      });
    });
    this.tick((dt) => {
      const i = Math.max(0, items.findIndex((it) => it.v === get()));
      if (!row.offsetWidth) { first = true; return; }
      x.to = btns[i].offsetLeft; w.to = btns[i].offsetWidth;
      if (first) { x.set(x.to); w.set(w.to); first = false; }
      x.step(dt); w.step(dt);
      th.style.width = `${w.x.toFixed(1)}px`; th.style.transform = `translateX(${x.x.toFixed(1)}px)`;
      btns.forEach((b, j) => { const c = String(j === i); if (b.getAttribute('aria-checked') !== c) { b.setAttribute('aria-checked', c); b.tabIndex = j === i ? 0 : -1; b.classList.toggle('sel', j === i); } });
    });
    return el;
  }

  /* --------------------------------------------------------------- ink */
  // labels a lens may pass over, drawn where the page has them
  drawInk(ctx, cw) {
    const k = ctx.canvas.width / cw, cr = { left: 0, top: 0 };
    const key = [cw, ctx.canvas.height].join() + [...this.views.values()].map((v) => v.inks.map((e) => { const r = e.getBoundingClientRect(); return [r.left | 0, r.top | 0, r.width | 0].join(); })).join();
    if (key === this.inkKey) return false;
    this.inkKey = key;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const v of this.views.values()) for (const el of v.inks) paintText(ctx, el, cr, k, '#fff');
    return true;
  }
}

// DOM text and icons, onto a 2D canvas
export function paintText(ctx, root, cr, k, colour) {
  const rg = document.createRange();
  const put = (t, r, cs, a, x0) => {
    if (cs.textTransform === 'uppercase') t = t.toUpperCase();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = a;
    const el = r.el, z = el && el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1;
    const up = cs.writingMode !== 'vertical-rl' ? 0 : 1, q = k * (up || !(z > 0.2 && z < 4) ? 1 : z);
    ctx.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * q}px ${cs.fontFamily}`;
    ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : `${parseFloat(cs.letterSpacing) * q}px`;
    ctx.fillStyle = colour || cs.color;
    const m = ctx.measureText(t), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
    if (up) { ctx.setTransform(0, 1, -1, 0, (r.right - cr.left) * k, (r.top - cr.top) * k); ctx.fillText(t, 0, (r.width * k - asc - desc) / 2 + asc); return; }
    ctx.fillText(t, (r.left - cr.left) * k, (r.top - cr.top) * k + (r.height * k - asc - desc) / 2 + asc);
  };
  // a text node may wrap: one piece for each line it makes
  const lines = (n) => {
    const t = n.textContent, out = [];
    rg.selectNodeContents(n);
    if (rg.getClientRects().length <= 1) { const r = rg.getBoundingClientRect(); return r.width ? [[t.trim(), r]] : []; }
    const re = /\S+\s*/g; let m, cur = null;
    while ((m = re.exec(t))) {
      rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].trimEnd().length);
      const r = rg.getBoundingClientRect();
      if (cur && Math.abs(cur.r.top - r.top) < r.height * 0.5) { cur.e = m.index + m[0].trimEnd().length; } else { cur = { s: m.index, e: m.index + m[0].trimEnd().length, r }; out.push(cur); }
    }
    return out.map((c) => { rg.setStart(n, c.s); rg.setEnd(n, c.e); return [t.slice(c.s, c.e), rg.getBoundingClientRect()]; });
  };
  const walk = (n, a) => {
    if (n.nodeType === 3) {
      if (!n.textContent.trim()) return;
      const el = n.parentElement, cs = getComputedStyle(el);
      for (const [t, r] of lines(n)) put(t, Object.assign({ left: r.left, top: r.top, right: r.right, width: r.width, height: r.height }, { el: cs.display === 'inline' ? el.parentElement : el }), cs, a);
      return;
    }
    if (n.nodeType !== 1) return;
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (n !== root && !n.classList.contains('items')) a *= parseFloat(cs.opacity);
    if (a < 0.01) return;
    if (n.tagName === 'svg') {
      for (const p of n.querySelectorAll('path,circle')) {
        const m = p.getScreenCTM(); if (!m) continue;
        const ps = getComputedStyle(p), c = colour || cs.color;
        ctx.globalAlpha = a;
        ctx.setTransform(m.a * k, m.b * k, m.c * k, m.d * k, (m.e - cr.left) * k, (m.f - cr.top) * k);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = parseFloat(ps.strokeWidth) || 2;
        if (p.tagName === 'circle') {
          const dash = parseFloat(ps.strokeDasharray), off = parseFloat(ps.strokeDashoffset) || 0;
          ctx.beginPath(); ctx.arc(p.cx.baseVal.value, p.cy.baseVal.value, p.r.baseVal.value, 0, 6.2832 * (dash ? Math.max(0, 1 - off / dash) : 1));
          ctx.strokeStyle = ps.stroke === 'none' ? c : ps.stroke; ctx.stroke(); continue;
        }
        const path = new Path2D(p.getAttribute('d'));
        if (p.classList.contains('f')) { ctx.fillStyle = c; ctx.fill(path); } else { ctx.strokeStyle = c; ctx.stroke(path); }
      }
      return;
    }
    if (n.tagName === 'INPUT') { if (n.value && n.type === 'text') { const r = n.getBoundingClientRect(); put(n.value, { left: r.left, top: r.top, right: r.right, width: r.width, height: r.height, el: n }, cs, a); } return; }
    if (n.tagName === 'CANVAS') { const r = n.getBoundingClientRect(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.drawImage(n, (r.left - cr.left) * k, (r.top - cr.top) * k, r.width * k, r.height * k); return; }
    n.childNodes.forEach((c) => walk(c, a));
  };
  walk(root, 1);
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export { icon, swap };
