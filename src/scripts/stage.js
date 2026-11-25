import * as THREE from 'three';
import { U, ASPECT } from '../gl/gpu.js';
import { Baker, Plate, LiquidPlate, measure } from '../gl/plate.js';
import { WavePlate, WAVE_H } from '../gl/wave.js';
import { Halo } from '../gl/halo.js';
import { Fluid } from '../gl/fluid.js';
import { Env } from '../gl/env.js';
import { TypePlate, TYPE_H } from '../gl/type.js';
import { Keyboard } from '../gl/keyboard.js';
import { Logos } from '../gl/logo.js';
import { Post } from '../gl/post.js';
import { Glass } from '../gl/glass.js';
import { Kit, Spring, clamp } from '../ui/kit.js';
import { Scheme } from './scheme.js';

// One canvas behind every page. Pages say what they hold with data attributes; the stage finds the
// boxes, measures them every frame and paints light and glass where they are.
const CAP = 0.285, GAP = 0.05;
const ease = (dt, k) => 1 - Math.exp(-dt * k);
// [light, model] resolution; traced glass is the cost, so it gives way first
const LADDER = { halo: [[1, 1], [0.84, 1], [0.7, 1], [0.58, 1], [0.48, 1]], model: [[1, 1], [0.8, 0.84], [0.7, 0.7], [0.6, 0.6], [0.5, 0.5]] };

export class Stage {
  constructor(canvas, root) {
    this.canvas = canvas;
    this.calm = (matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('calm'));
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!renderer.capabilities.isWebGL2 || !renderer.extensions.has('EXT_color_buffer_float')) throw new Error('float targets');
    renderer.autoClear = false;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(1);
    renderer.extensions.has('OES_texture_float_linear');
    this.r = renderer;

    const sh = (this.shared = { uLut: U(null), uDisp: U(null), uVel: U(null), uTime: U(0), uReal: U(0), uLight: U(new THREE.Vector2(0.9, 0.5)) });
    this.scheme = new Scheme();
    sh.uLut.value = this.scheme.lut.tex;
    const studio = U(this.scheme.studio.tex);
    this.kit = new Kit({ root, calm: this.calm, burst: (x, y, k) => this.fluid.burst(x / this.ch, 1 - y / this.ch, k) });
    this.atlas = new THREE.CanvasTexture(this.kit.atlas.canvas);
    this.atlas.colorSpace = THREE.NoColorSpace; this.atlas.generateMipmaps = false; this.atlas.minFilter = THREE.LinearFilter; this.atlas.premultiplyAlpha = true;
    this.baker = new Baker(renderer);
    this.fluid = new Fluid(renderer);
    this.halo = new Halo(renderer, sh);
    this.env = new Env(renderer, { ...sh, uLut: studio });
    this.models = new Logos(renderer, sh, this.env.target, studio, this.baker);
    this.makeKeys = () => new Keyboard(renderer, sh, this.env.target, studio);
    this.post = new Post(renderer, sh);
    this.glass = new Glass(renderer, sh, this.atlas);

    this.items = []; this.liquids = []; this.bead = null; this.reel = null; this.tiles = []; this.board = null;
    // the one piece of glass: what it is, what it is turning into, where it is, and how far it still has to go to get there
    this.one = { at: null, a: null, b: null, t: 0, m: 0, x: 0, y: 0, s: 0, dx: new Spring(0, 120, 19), dy: new Spring(0, 120, 19), ds: new Spring(0, 120, 19), vis: 0, over: null, wild: 0, ph: 0, back: null };
    this.opened = null; this.openK = new Spring(0, 130, 22); this.openBox = null;
    this.reading = { p: 0, goal: 0, moved: -9 };
    this.hem = { el: null, a: new Spring(0, 40, 12.6), open: new Spring(0, 60, 15) };
    // what this machine could hold last time
    this.rung = { halo: 0, model: 0 }; this.best = {};
    try { const r = JSON.parse(localStorage.getItem('jm-rung')); for (const k of ['halo', 'model']) if (Number.isInteger(r?.[k])) this.rung[k] = clamp(r[k], 0, 3); } catch {}
    this.woke = 0; this.nth = 0;
    this.time = 0; this.prev = performance.now(); this.now = 0; this.touch = matchMedia('(hover: none)').matches;
    this.ptr = { x: 0.9, y: 0.5, px: 0.9, py: 0.5, last: -99, down: false };
    this.soft = { x: 0.9, y: 0.5 };
    // where the hand really is. ptr wanders off by itself when it rests, to keep the light alive; nothing held by the hand may follow that
    this.hand = { x: 0, y: 0, sx: 0, sy: 0, on: false }; this.keyed = false;
    this.lastY = scrollY; this.dy = 0;
    this.pace = { acc: 0, n: 0, slow: 0, fast: 0, settle: 0, fps: 60 };
    this.seen = new Map();
    this.size();
    this.listen();
  }

  async start() {
    await Promise.all([document.fonts.load('400 100px "Special Gothic Expanded One"', 'JOSHUA'), document.fonts.load('600 100px "Inter Variable"', 'esc.'), document.fonts.load('450 20px "Inter Variable"', 'Work')]).catch(() => {});
    requestAnimationFrame((t) => this.frame(t));
    const warm = () => { if (this.models.warm()) setTimeout(warm, 60); };
    setTimeout(warm, 500);
  }

  /* ------------------------------------------------------------ sizes */
  size() {
    const cw = this.canvas.clientWidth || innerWidth, ch = this.canvas.clientHeight || innerHeight;
    const k = Math.min(devicePixelRatio || 1, 2, Math.sqrt(4.4e6 / (cw * ch)));
    this.cw = cw; this.ch = ch; this.k = k;
    const W = Math.round(cw * k), H = Math.round(ch * k);
    ASPECT.value = cw / ch;
    if (W !== this.W || H !== this.H) { this.W = W; this.H = H; this.r.setSize(W, H, false); this.glass.setSize(W, H, ch); this.kit.stale = true; }
    this.kit.k = k; this.kit.ch = ch;
    const q = LADDER[this.kind][this.rung[this.kind]];
    this.q = q;
    this.post.setSize(W, H, Math.round(W * q[0]), Math.round(H * q[0]));
    this.fluid.fit();
    this.pace.settle = performance.now() / 1000 + 1.2;
  }
  get kind() { return this.models?.active || this.adrift || this.board?.on ? 'model' : 'halo'; }

  /* ------------------------------------------------------ what is here */
  mount(root) {
    this.unmount();
    for (const el of root.querySelectorAll('[data-halo]')) {
      this.items.push({ el, role: el.dataset.role || 'hero', plate: new Plate(this.baker), amt: new Spring(0, this.calm ? 200 : 14, this.calm ? 28 : 7.4), key: '' });
    }
    for (const el of root.querySelectorAll('[data-liquid]')) {
      const it = { el, role: 'liquid', plate: new LiquidPlate(this.baker, el.dataset.liquid.split(',').map((w) => w.trim())), amt: new Spring(0, 14, 7.4) };
      if (this.calm) it.plate.hold = 4;
      this.items.push(it); this.liquids.push(it);
    }
    for (const el of root.querySelectorAll('[data-marquee]')) this.string(el);
    for (const el of root.querySelectorAll('[data-type]')) this.items.push({ el, role: 'type', plate: new TypePlate(this.baker), amt: new Spring(1) });
    const keys = root.querySelector('[data-corne]');
    if (keys) this.keys(keys);
    const data = root.querySelector('#projects');
    if (data) {
      this.projects = JSON.parse(data.textContent);
      for (const p of this.projects) this.models.learn(p.id, p.d);
      const el = root.querySelector('[data-reel]');
      if (el) {
        const model = el.querySelector('[data-model]'), pin = model.closest('.pin');
        this.reel = { el, model, pin, ids: this.projects.filter((p) => p.main).map((p) => p.id), nums: this.items.filter((i) => i.role === 'num'), hov: 0, lit: new Spring(0, 60, 14) };
        this.reel.nums.forEach((n, i) => { n.id = this.reel.ids[i]; n.open = new Spring(0, 60, 15); });
        model.addEventListener('pointerenter', () => { this.reel.hov = 1; });
        model.addEventListener('pointerleave', () => { this.reel.hov = 0; });
        this.handle(model, { tap: () => this.one.over && this.onTap?.(this.one.over) });
      }
      [...root.querySelectorAll('[data-mark]')].forEach((m, i) => {
        // each drifts on its own clock, which stops under the hand
        const t = { el: m, id: m.dataset.mark, btn: m.closest('button'), cell: m.closest('li'), ph: i * 2.399 + 0.7, clock: i * 7.3, hov: false, foc: false, hold: new Spring(0, 90, 19), x: 0, y: 0, s: 0, spin: 0, live: false };
        this.tiles.push(t);
        t.btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') t.hov = true; });
        t.btn.addEventListener('pointerleave', () => { t.hov = false; });
        t.btn.addEventListener('focus', () => { t.foc = t.btn.matches(':focus-visible'); });
        t.btn.addEventListener('blur', () => { t.foc = false; });
      });
    }
    this.hem.el = root.querySelector('.foot');
    this.layout();
    this.kit.stale = true;
    this.woke = performance.now();
  }
  unmount() {
    for (const it of this.items) { it.off?.(); it.plate.dispose(); }
    this.items = []; this.liquids = []; this.tiles = []; this.reel = null; this.bead = null; this.board = null;
    Object.assign(this.one, { at: null, vis: 0, over: null, back: null, wild: 0 }); this.opened = null; this.adrift = false; this.openK.set(0); this.onTap = null;
    this.kit.reset();
    this.hem.el = null; this.hem.a.set(0); this.hem.open.set(0); this.models.active = null;
  }
  // the marquee: pull it and let it go
  string(el) {
    const it = { el, role: 'marquee', plate: new WavePlate(this.baker, el.dataset.marquee), amt: new Spring(0, this.calm ? 200 : 14, this.calm ? 28 : 7.4) };
    this.items.push(it);
    if (this.calm) return;
    // the wheel drives it directly, so it runs on when the page has nowhere left to go
    const wheel = (e) => {
      if (e.ctrlKey) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY, px = d * (e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? this.ch : 1);
      it.wheeled = this.now;
      it.plate.kick(clamp(px / 900, -0.3, 0.3) * 11);
    };
    addEventListener('wheel', wheel, { passive: true });
    it.off = () => removeEventListener('wheel', wheel);
    const pl = it.plate.pull, at = (e) => { const b = el.getBoundingClientRect(); pl.tx = (e.clientX - b.left - b.width / 2) / it.unit; pl.ty = -(e.clientY - b.top - b.height / 2) / it.unit; };
    el.addEventListener('pointerdown', (e) => {
      if (e.button || !it.unit) return;
      at(e); pl.held = true; pl.x = pl.tx; pl.grab = pl.ty - pl.y;
      const up = () => { pl.held = false; removeEventListener('pointermove', at); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
      addEventListener('pointermove', at); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  }
  // the keyboard: press its keys, or drag it round. It is heavy to make, so it is made once, when a page first wants it
  keys(el) {
    const bd = (this.board = { el, kb: null, seen: 0, on: false, a: new Spring(0, 60, 15), key: '', tap: null });
    const ready = () => {
      if (this.board !== bd) return;
      if (!this.fontsIn) { setTimeout(ready, 60); return; }
      const first = !this.keyboard;
      const kb = (this.keyboard ||= this.makeKeys());
      (first ? kb.warm() : Promise.resolve()).then(() => { if (this.board === bd) { bd.kb = kb; this.woke = performance.now(); } });
    };
    setTimeout(ready, this.keyboard ? 0 : 350);
    el.addEventListener('pointerdown', (e) => {
      const kb = bd.kb;
      if (e.button || !kb || !bd.on) return;
      const k = kb.pick((e.clientX / this.cw) * 2 - 1, 1 - (e.clientY / this.ch) * 2);
      if (k === null) return;
      let lx = e.clientX, ly = e.clientY, far = 0;
      if (k >= 0 && e.pointerType === 'mouse') bd.tap?.(k);
      this.fluid.burst(e.clientX / this.ch, 1 - e.clientY / this.ch, 0.3);
      const mv = (m) => {
        const dx = m.clientX - lx, dy = m.clientY - ly; lx = m.clientX; ly = m.clientY; far += Math.abs(dx) + Math.abs(dy);
        if (far > 5) kb.dragging = true;
        if (kb.dragging) kb.drag((dx / this.ch) * 22, (dy / this.ch) * 22);
      };
      // a finger may be about to scroll, so its key goes down when it lets go
      const up = (u) => { kb.dragging = false; removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (u.type === 'pointerup' && far <= 8 && k >= 0 && e.pointerType !== 'mouse') bd.tap?.(k); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  }
  // drag to spin it; a press that goes nowhere is a tap
  handle(el, { tap, held }) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button || !this.models.active || held?.(e)) return;
      let lx = e.clientX, ly = e.clientY, far = 0;
      const on = this.on(e.clientX, e.clientY);
      if (on) { this.models.flash = Math.max(this.models.flash, 0.5); this.fluid.burst(e.clientX / this.ch, 1 - e.clientY / this.ch, 0.5); }
      const mv = (m) => {
        const dx = m.clientX - lx, dy = m.clientY - ly; lx = m.clientX; ly = m.clientY; far += Math.abs(dx) + Math.abs(dy);
        if (far > 5) this.models.dragging = true;
        if (this.models.dragging) this.models.drag((dx / this.ch) * 22, (dy / this.ch) * 22);
      };
      const up = (u) => { this.models.dragging = false; removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (u.type === 'pointerup' && far <= 5) tap?.(on, u); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  }
  // is there glass at this point of the page?
  on(px, py) { const o = this.one; return o.vis > 0.4 && !(o.m > 0.2 && o.m < 0.8) && this.models.pick((px / this.cw) * 2 - 1, 1 - (py / this.ch) * 2, o.over ? 100 : 46); }

  // the page holds still while this many steps go by
  track() {
    const R = this.reel, b = R.el.getBoundingClientRect(), n = R.ids.length, hold = this.ch * 0.22;
    return { top: b.top, hold, step: (b.height - R.pin.offsetHeight - 2 * hold) / Math.max(1, n - 1), n };
  }
  goTo(i) { const t = this.track(); scrollTo({ top: scrollY + t.top + t.hold + i * t.step, behavior: 'instant' }); }
  placeOf(id) { return this.reel ? this.reel.ids.indexOf(id) : -1; }

  // the wall: ten pieces of glass, each adrift about its own place
  float(dt) {
    const { ch, calm } = this;
    let any = false;
    for (const t of this.tiles) {
      const c = t.cell.getBoundingClientRect();
      t.live = c.width > 0 && c.bottom > -ch * 0.2 && c.top < ch * 1.2;
      t.hold.to = (t.hov || (t.foc && this.keyed) || this.opened === t.id) ? 1 : 0; t.hold.step(dt);
      const k = clamp(t.hold.x, 0, 1);
      if (!calm) t.clock += dt * (1 - k) * (1 - clamp(this.openK.x, 0, 1));
      if (!t.live) continue;
      any = true;
      const q = t.clock, w = c.width * (this.cw < 900 ? 0.62 : 1), h = c.height, p = t.ph;
      const dx = calm ? 0 : w * (0.1 * Math.sin(p * 3.1) + 0.1 * Math.sin(q * 0.78 + p) + 0.045 * Math.sin(q * 1.31 + p * 2.3));
      const dy = calm ? 0 : h * (0.06 * Math.sin(p * 5.7) + 0.085 * Math.sin(q * 0.66 + p * 1.7) + 0.04 * Math.sin(q * 1.17 + p * 3.1));
      t.deep = calm ? 1 : 1 + 0.07 * Math.sin(p * 4.3) + 0.05 * Math.sin(q * 0.53 + p * 2.9);
      const T = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`;
      if (T !== t.T) t.btn.style.transform = t.T = T;
    }
    for (const t of this.tiles) if (t.live) {
      const b = t.el.getBoundingClientRect(), k = clamp(t.hold.x, 0, 1.1);
      t.x = b.left + b.width / 2; t.y = b.top + b.height / 2; t.s = b.width * (t.deep + (1.16 - t.deep) * k);
      t.w = b.width * 1.16;
    }
    this.adrift = any;
  }
  // an open one starts from where it was floating
  lift(id) {
    const t = this.tiles.find((q) => q.id === id), o = this.one;
    if (!t || !t.live) return;
    Object.assign(o, { at: 'wall', vis: 1, a: id, b: id, t: 0, m: 0, tied: false, x: t.x, y: t.y, s: t.s, back: t, ph: t.ph, wild: 1 - clamp(t.hold.x, 0, 1) });
    for (const k of ['dx', 'dy', 'ds']) o[k].set(0);
    this.models.spin.identity(); this.models.vel.set(0, 0);
  }

  // where the glass should be and what it should be, this frame
  aim(dt) {
    const { cw, ch, one, reel, reading: rd } = this;
    let want = null;
    if (reel) {
      const t = this.track(), p = clamp((-t.top - t.hold) / t.step, 0, t.n - 1);
      if (Math.abs(this.dy) > 0.4) rd.moved = this.now;
      // at rest it is always one thing or the other
      const rest = this.now - rd.moved > 0.22 || this.calm;
      rd.goal = rest ? Math.round(p) : p;
      if (Math.abs(rd.goal - rd.p) > 1.1 || this.calm) rd.p = rd.goal; else rd.p += (rd.goal - rd.p) * ease(dt, rest ? 7 : 12);
      if (Math.abs(rd.goal - rd.p) < 0.002) rd.p = rd.goal;
      const b = reel.model.getBoundingClientRect();
      reel.b = b; reel.d = (b.top + b.height / 2 - ch / 2) / ch;
    }
    const back = one.back;
    if (this.opened) {
      const o = this.openBox;
      want = { at: 'open', id: this.opened, x: o.x, y: o.y, s: o.s, vis: 1, d: 0 };
      one.back = this.tiles.find((t) => t.id === this.opened) || null;
      one.ph = one.back ? one.back.ph : 0;
    } else if (back && one.at) {
      // home to where its logo is drifting, and it is that logo again
      want = { at: 'back', id: back.id, x: back.x, y: back.y, s: back.s, vis: 1, d: 0 };
      if (one.at === 'back' && (this.calm || Math.abs(one.dx.x) + Math.abs(one.dy.x) + Math.abs(one.ds.x) < 0.6)) { one.back = null; want = null; }
    } else if (reel && Math.abs(reel.d) < 1) {
      const b = reel.b;
      want = { at: 'reel', x: b.left + b.width / 2, y: b.top + b.height / 2, s: Math.min(b.width, b.height), vis: clamp((1 - Math.abs(reel.d)) / 0.08, 0, 1), d: reel.d };
    }
    one.wild += ((want?.at === 'back' ? 1 - back.hold.x : 0) - one.wild) * ease(dt, want?.at === 'back' ? 9 : 6);
    if (this.opened) this.follow = this.opened;
    else if (this.follow && (!want || (want.at === one.at && Math.abs(one.dx.x) + Math.abs(one.dy.x) < 2))) this.follow = null;
    if (!want) { one.vis = 0; one.at = null; return null; }
    // a new place: keep where it was as a distance still to cover
    if (want.at !== one.at) {
      if (one.vis > 0.05 && !this.calm) { one.dx.x = one.x - want.x; one.dy.x = one.y - want.y; one.ds.x = one.s - want.s; } else { one.dx.set(0); one.dy.set(0); one.ds.set(0); one.a = one.b = want.id || null; one.t = 0; }
      one.at = want.at;
    }
    for (const k of ['dx', 'dy', 'ds']) { one[k].to = 0; one[k].step(dt); }
    one.x = want.x + one.dx.x; one.y = want.y + one.dy.x; one.s = Math.max(8, want.s + one.ds.x); one.full = want.s;
    one.vis = want.vis; one.d = want.d;
    // what it is. Reading, the page drives the melt itself, once it has caught up
    if (want.at === 'reel') {
      const i = Math.floor(rd.p), f = rd.p - i, A = reel.ids[i], B = reel.ids[Math.min(i + 1, reel.ids.length - 1)];
      one.a ||= A; one.b ||= A;
      const idle = one.t === 0 || one.t === 1, now = one.t > 0.5 ? one.b : one.a;
      if (one.tied ? (one.a === A || one.b === A || one.a === B || one.b === B) : idle && (now === A || now === B)) {
        one.tied = true; one.a = A; one.b = B; one.t = f; one.m = ((x) => x * x * (3 - 2 * x))(clamp((f - 0.2) / 0.6, 0, 1));
        return want;
      }
      want.id = reel.ids[Math.round(rd.p)];
    }
    if (one.tied) { one.tied = false; one.t = one.m; if (one.m < 0.02) { one.t = 0; one.b = one.a; } else if (one.m > 0.98) { one.t = 0; one.a = one.b; } }
    one.a ||= want.id; one.b ||= one.a;
    if (one.b !== want.id) {
      if (one.t === 0) one.b = want.id;
      else if (one.a === want.id) { [one.a, one.b] = [one.b, one.a]; one.t = 1 - one.t; }
    }
    if (one.a !== one.b) {
      one.t = this.calm ? 1 : Math.min(1, one.t + dt * (one.b === want.id ? 2.1 : 5.5));
      one.m = one.t * one.t * (3 - 2 * one.t);
      if (one.t >= 1) { one.a = one.b; one.t = 0; one.m = 0; }
    } else { one.t = 0; one.m = 0; }
    return want;
  }

  // boxes to plates: only when a box has changed shape
  layout() {
    if (!this.fontsIn) return;
    for (const it of this.items) {
      const w = it.el.offsetWidth, hh = it.el.offsetHeight;
      if (!w || !hh) continue;
      if (it.role === 'liquid') { it.unit = w / (w / hh > 1.6 ? Math.max(1.5, (w / hh) * 0.62) : 1.5); it.plate.fit(w / it.unit); continue; }
      if (it.role === 'marquee') { it.unit = hh / WAVE_H; it.plate.fit(w / it.unit, it.unit * this.k); continue; }
      if (it.role === 'type') { it.unit = hh / TYPE_H; it.plate.fit(w / it.unit, it.unit * this.k); continue; }
      const fill = it.el.dataset.fit === 'fill';
      const lines = (it.el.dataset.tall && w / hh < 1.1 ? it.el.dataset.tall : it.el.dataset.halo).toUpperCase().split('/');
      const rho = measure(lines), n = lines.length, most = Math.max(...rho);
      let cap = hh / (n + (n - 1) * (GAP / CAP));
      cap = Math.min(cap, w / (most * (fill ? 0.6 : 1)));
      it.unit = cap / CAP;                                        // css pixels to one plate unit
      const bw = fill ? Math.round((w / it.unit) * 100) / 100 : Math.round(most * CAP * 100) / 100;
      it.bw = bw * it.unit;
      it.plate.set(lines, { cap: CAP, gap: GAP, bw, most: fill ? 1.5 : 1 });
    }
  }

  /* ------------------------------------------------------------- hands */
  listen() {
    const P = this.ptr;
    const H = this.hand;
    addEventListener('pointermove', (e) => { H.x = e.clientX; H.y = e.clientY; H.on = e.pointerType === 'mouse'; if (e.pointerType === 'touch' && !P.down) return; P.x = e.clientX / this.ch; P.y = 1 - e.clientY / this.ch; P.last = performance.now() / 1000; }, { passive: true });
    addEventListener('pointerdown', (e) => { H.x = e.clientX; H.y = e.clientY; H.on = e.pointerType === 'mouse'; P.down = true; P.x = P.px = e.clientX / this.ch; P.y = P.py = 1 - e.clientY / this.ch; P.last = performance.now() / 1000; if (!e.target.closest?.('a,button,input,[role=slider],#over')) this.fluid.burst(P.x, P.y, 0.35); }, { passive: true });
    addEventListener('pointerup', () => { P.down = false; }, { passive: true });
    addEventListener('pointercancel', () => { P.down = false; }, { passive: true });
    const wake = () => { this.woke = performance.now(); };
    for (const e of ['pointermove', 'pointerdown', 'keydown', 'scroll', 'resize', 'focusin', 'input', 'wheel']) addEventListener(e, wake, { passive: true, capture: true });
    let t = 0;
    addEventListener('resize', () => { clearTimeout(t); this.size(); this.layout(); t = setTimeout(() => { this.size(); this.layout(); this.kit.stale = true; }, 200); });
    this.canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  }

  /* -------------------------------------------------------------- frame */
  frame(t) {
    requestAnimationFrame((n) => this.frame(n));
    // nothing lit and nobody touching it: the glass still shimmers, at a quarter of the rate
    this.doze = !this.alight && t - this.woke > 900;
    if (this.doze && ++this.nth % 4) return;
    const raw = (t - this.prev) / 1000, dt = Math.min(0.04, Math.max(0, raw));
    this.prev = t; this.now = t / 1000;
    if (document.hidden) return;
    const { cw, ch, shared, kit, post, models, scheme, ptr } = this, r = this.r;
    this.time += dt * (this.calm ? 0.35 : 1);
    shared.uTime.value = this.time; shared.uReal.value = this.now;

    const y = scrollY; this.dy = y - this.lastY; this.lastY = y;
    scheme.update(dt);
    const hb = this.halo.base; hb.uIrid.value = scheme.halo.irid; hb.uFilm.value = scheme.now.film; hb.uSplit.value = scheme.halo.split;

    /* what can be seen */
    const draw = [];
    for (const it of this.items) {
      it.amt.to = it.ready === false || !it.plate.w ? 0 : 1;
      it.amt.step(dt);
      const b = it.el.getBoundingClientRect(), pad = (it.unit || 0) * 0.5;
      it.b = b;
      if (!(it.open?.x > 0.004) && (b.bottom < -pad || b.top > ch + pad || !b.width)) continue;
      if (it.role === 'type' && it.plate.empty) continue;
      draw.push(it);
    }
    const was = this.kind, one = this.one; this.float(dt);
    const aim = this.aim(dt), what = aim && one.vis > 0.003;
    this.openK.to = this.opened ? 1 : 0; this.openK.step(dt);
    const openK = clamp(this.openK.x, 0, 1);

    /* the hand, the light and the liquid */
    const idle = this.now - ptr.last > 2.4;
    let fx = 0, fy = 0;
    if (idle && !this.calm) {
      const gx = ASPECT.value * (0.5 + Math.sin(this.time * 0.41) * 0.3 + Math.sin(this.time * 0.93) * 0.09), gy = 0.5 + Math.sin(this.time * 0.57 + 1.1) * 0.24 + Math.cos(this.time * 1.21) * 0.06;
      ptr.x += (gx - ptr.x) * ease(dt, 1.6); ptr.y += (gy - ptr.y) * ease(dt, 1.6);
      fx = (ptr.x - ptr.px) * 1.1; fy = (ptr.y - ptr.py) * 1.1;
    } else if (!models.dragging && !this.calm) {
      const b = ptr.down ? 8 : 4.6; fx = (ptr.x - ptr.px) * b; fy = (ptr.y - ptr.py) * b;
    }
    // the light at the end of the page comes up as you reach it
    const hem = this.hem, hb0 = hem.el?.getBoundingClientRect();
    const below = hb0 ? (hb0.bottom - innerHeight) / ch : 9;
    hem.a.to = clamp(1.04 - below / 0.5, 0, 1); hem.a.step(dt); hem.open.step(dt);
    const glint = hem.a.x > 0.004 && below < 0.62;
    const wall = this.tiles.filter((t) => t.live && !(one.back === t && what)), shown = wall.length > 0 && openK < 0.99;
    // the keyboard: there as far as its box is in the window
    const bd = this.board;
    if (bd) {
      const b = (bd.b = bd.el.getBoundingClientRect()), part = Math.max(1, b.height * 0.4);
      bd.seen = clamp((ch - b.top) / part, 0, 1) * clamp(b.bottom / part, 0, 1);
      bd.a.to = bd.kb ? 1 : 0; bd.a.step(dt);
      bd.on = Boolean(bd.kb) && bd.seen > 0.003;
    }
    const typed = bd?.on || false;
    const busy = draw.length || what || glint || shown || typed;
    if (busy) {
      this.fluid.scroll.value.set(0, this.dy / ch);
      this.fluid.step(dt, {
        ax: ptr.px, ay: ptr.py, bx: ptr.x, by: ptr.y, fx, fy: fy + (this.calm ? 0 : clamp(this.dy / ch, -0.2, 0.2) * 0.5), radius: 0.085, time: this.time,
        damp: 1.1, relax: 1, curl: 0.12, ambient: this.calm ? 0.008 : 0.0245,
        sx: what ? one.x / ch : typed ? (bd.b.left + bd.b.width / 2) / ch : 0, sy: what ? 1 - one.y / ch : typed ? 1 - (bd.b.top + bd.b.height / 2) / ch : 0, sr: 0.3, sw: what ? -models.vel.x * 1.1 : typed ? -bd.kb.vel.x * 1.1 : 0,
      });
      shared.uVel.value = this.fluid.vel.read.texture; shared.uDisp.value = this.fluid.dsp.read.texture;
    }
    ptr.px = ptr.x; ptr.py = ptr.y;
    this.soft.x += (ptr.x - this.soft.x) * ease(dt, 5); this.soft.y += (ptr.y - this.soft.y) * ease(dt, 5);
    shared.uLight.value.set(this.soft.x, this.soft.y);
    const hand = this.hand, hx = hand.on ? (hand.x / cw) * 2 - 1 : 0, hy = hand.on ? 1 - (hand.y / ch) * 2 : 0;
    hand.sx += (hx - hand.sx) * ease(dt, 5); hand.sy += (hy - hand.sy) * ease(dt, 5);

    /* the light */
    for (const it of this.liquids) if (it.plate.w && draw.includes(it)) it.plate.step(dt * (this.calm ? 0.6 : 1));
    for (const it of draw) if (it.role === 'marquee') { if (!this.calm && !(this.now - it.wheeled < 0.5)) it.plate.kick(clamp(this.dy / ch, -0.2, 0.2) * 5); it.plate.step(dt, this.calm); }
    for (const it of draw) if (it.role === 'type') it.plate.step(dt);
    const lit = draw.length > 0 || glint || what || shown || typed;
    if (lit) post.clearField();
    for (const it of draw) {
      if (!it.plate.w || (it.role === 'type' && it.plate.empty)) continue;
      const b = it.b; let k = it.unit / ch;
      let x = (b.left + b.width / 2) / ch, yy = 1 - (b.top + b.height / 2) / ch;
      const o = { bleed: scheme.halo.bleed, spread: scheme.halo.spread, lean: 1.1, line: 1, amt: clamp(it.amt.x, 0, 1), leak: 1, fade: 1, rim: 0 };
      if (it.role === 'marquee') { const s = it.plate.swell; o.bleed *= 1.15 + 0.3 * s; o.spread *= 0.74 + 0.2 * s; o.line = 0.9; o.bed = 0.14 + 0.1 * s; o.touch = 0.2; }
      if (it.role === 'type') { o.bleed *= 1.2; o.spread *= 0.8; o.each = true; }
      if (it.role === 'liquid') { o.bleed *= 0.84; o.spread *= 0.9; }
      let keep = 1 - openK;
      if (it.open) {
        // the open project's light goes with its glass
        it.open.to = this.opened === it.id ? 1 : 0; it.open.step(dt);
        const near = this.reel ? clamp(1 - Math.abs(this.reading.p - this.reel.ids.indexOf(it.id)) * 1.9, 0, 1) : 0;
        keep = Math.max(near * keep, clamp(it.open.x, 0, 1));
        if (what && this.follow === it.id) { x = one.x / ch; yy = 1 - one.y / ch; k *= Math.min(1, one.s / Math.min(this.reel.b.width, this.reel.b.height)); }
        if (it.role === 'num') {
          const R = this.reel, close = clamp(1 - Math.abs(R.d) / 0.3, 0, 1);
          R.lit.to = this.opened ? 1 : close * (0.56 + 0.36 * R.hov) + models.flash * 0.3;
          R.lit.step(dt / R.ids.length);
          o.bleed *= 1.1; o.leak = clamp(R.lit.x, 0, 1);
          o.rim = clamp((1 - R.lit.x) * 4, 0, 1); o.rx = (it.bw / ch) * 0.75; o.ry = (b.height / ch) * 0.75;
          keep *= Math.max(clamp((0.95 - Math.abs(R.d)) / 0.3, 0, 1), it.open.x);
        }
      }
      o.fade = keep;
      if (o.fade < 0.01) continue;
      // what is typed always has some of the film's own colours in it
      if (o.each) hb.uIrid.value = Math.min(1, scheme.halo.irid + 0.4);
      this.halo.draw(post.field, it.plate, x, yy, k, o);
      hb.uIrid.value = scheme.halo.irid;
    }
    if (glint) this.halo.drawHem(post.field, { end: 1 - hb0.bottom / ch, inset: 11 / ch, corner: (cw < 640 ? 36 : 48) / ch, line: 0.0016 }, { amt: clamp(hem.a.x, 0, 1) * (1 - openK), open: hem.open.x, bleed: scheme.halo.bleed });

    /* the glass */
    post.base(lit);
    if (what || shown || typed) {
      const e = this.env.pass.u, nx = (this.soft.x / ASPECT.value) * 2 - 1, ny = this.soft.y * 2 - 1, d = what ? one.d : 0, flash = Math.max(models.flash, typed ? bd.kb.flash : 0);
      e.uWhite.value = 1; e.uColour.value = 0.7 + 0.5 * scheme.now.glow; e.uHard.value = 0.85; e.uFlash.value = flash;
      e.uSpinY.value = nx * 0.5 + Math.sin(this.time * 0.13) * 0.28; e.uTilt.value = ny * 0.3 + d * 0.5;
      this.env.render();
      models.tune(scheme.model);
    }
    const put = (target, size, x, y, a) => {
      const rect = { x: x - size / 2, y: y - size / 2, w: size, h: size };
      models.render(target, post.field.texture, rect, cw, ch, (target.width / size) * ch);
      post.object(target.texture, rect.x / cw, 1 - (rect.y + rect.h) / ch, rect.w / cw, rect.h / ch, a);
    };
    if (shown) {
      const small = models.size('small', wall[0].w * 1.34 * this.k * this.q[1]);
      for (const t of wall) {
        const k = clamp(t.hold.x, 0, 1);
        models.place({ a: t.id, b: t.id, m: 0, x: (t.x - cw / 2) / ch, y: 0.5 - t.y / ch, size: t.s / ch }, models.pose(this.time, { near: 0, x: hand.sx * k, y: hand.sy * k, wild: 1 - k, clock: t.clock, ph: t.ph }, this.calm));
        put(small, t.s * 1.34, t.x, t.y, 1 - openK);
      }
    }
    if (what) {
      const main = models.size('main', one.full * 1.34 * this.k * this.q[1]);
      models.active = one.m > 0.5 ? one.b : one.a;
      models.whirl(dt);
      models.place({ a: one.a, b: one.b, m: one.m, x: (one.x - cw / 2) / ch, y: 0.5 - one.y / ch, size: one.s / ch }, models.pose(this.time, { near: one.d, x: hand.sx, y: hand.sy, wild: one.wild, clock: one.back?.clock || 0, ph: one.ph }, this.calm), models.spin);
      put(main, one.s * 1.34, one.x, one.y, one.vis);
      models.keep();
      one.over = this.reel?.hov && hand.on && one.at === 'reel' && !models.dragging && this.on(hand.x, hand.y) ? models.active : null;
    } else { models.active = null; one.over = null; }
    if (typed) {
      const b = bd.b, kb = bd.kb, m = Math.min(90, b.width * 0.06), my = Math.round(b.height * 0.1), x0 = Math.max(0, b.left - m), x1 = Math.min(cw, b.right + m);
      const rect = { x: x0, y: b.top - my, w: x1 - x0, h: b.height + my * 2 };
      kb.setSize(rect.w, rect.h, this.k * this.q[1]);
      kb.over = hand.on && !kb.dragging ? { x: ((hand.x - rect.x) / rect.w) * 2 - 1, y: 1 - ((hand.y - rect.y) / rect.h) * 2 } : null;
      const off = (b.top + b.height / 2 - ch / 2) / ch;
      kb.update(dt, { x: (b.left + b.width / 2 - cw / 2) / ch, y: -off, w: b.width / ch, h: b.height / ch, near: off }, scheme.model, { x: hand.sx, y: hand.sy }, this.time, this.calm);
      kb.render(post.field.texture, rect, cw, ch);
      post.object(kb.target.texture, rect.x / cw, 1 - (rect.y + rect.h) / ch, rect.w / cw, rect.h / ch, bd.seen * clamp(bd.a.x, 0, 1));
    }
    if (was !== this.kind) this.reQ = true;

    /* the glass over it */
    kit.frame(dt, scheme.glass, this.now);
    if (kit.stale && this.fontsIn) { kit.letter(); }
    if (kit.atlas.dirty) { kit.atlas.dirty = false; this.atlas.needsUpdate = true; }
    const bead = this.bead && this.drawBead(dt);
    const lists = kit.collect(cw, ch, scheme.glass);
    if (lists.some((l) => l.length)) {
      if (kit.wantInk && kit.drawInk(this.glass.ink.getContext('2d'), cw)) this.glass.inkTex.needsUpdate = true;
      this.glass.fu.uTop.value.set(kit.top[0] / ch, kit.top[1] / ch);
      this.glass.material(scheme.glass, dt, 1 / ch);
      this.glass.render(post.scene, lists, scheme.glass);
    }
    this.alight = Boolean(lit || bead);
    const bloom = lit;
    if (bloom) post.bloom(0.5);
    post.final(bloom ? 0.3 : 0, { grain: scheme.now.grain, weave: scheme.now.weave, css: 1 / this.k, frame: this.calm ? 7 : Math.floor(this.now * 24) % 6000 });
    this.after?.(dt);
    this.tune(raw);
  }

  drawBead(dt) {
    const b = this.bead, q = b.el.getBoundingClientRect();
    if (q.bottom < -60 || q.top > this.ch + 60) return false;
    b.s.to = 1 + (b.held ? 0.1 : b.hov ? 0.04 : 0); b.s.step(dt);
    b.spin.to = b.turns * 3.2; b.spin.step(dt); b.gl.to = b.held ? 1 : b.hov ? 0.6 : 0.32; b.gl.step(dt);
    this.post.bead({ x: (q.left + q.width / 2) / this.ch, y: 1 - (q.top + q.height / 2) / this.ch, r: ((q.width / 2) / this.ch) * b.s.x, a: 1 - clamp(this.openK.x, 0, 1), swirl: b.spin.x + this.time * 0.12, glow: b.gl.x * (0.5 + this.scheme.now.glow), irid: this.scheme.now.irid, film: this.scheme.now.film });
    return true;
  }

  keep() { try { localStorage.setItem('jm-rung', JSON.stringify(this.rung)); } catch {} }

  // keep the frame rate by giving up resolution, light and models separately
  tune(raw) {
    const p = this.pace;
    if (this.reQ) { this.reQ = false; this.size(); }
    if (raw > 0.4 || this.doze) { p.acc = p.n = p.slow = 0; return; }        // asleep, not slow
    p.acc += raw; p.n++;
    if (p.acc < 0.5) return;
    const f = p.n / p.acc, k = this.kind, n = LADDER[k].length - 1, q = this.rung[k];
    p.fps = f; p.acc = p.n = 0;
    if (this.now < p.settle || document.hidden) { p.slow = p.fast = 0; return; }
    if (f < 48) { p.slow++; p.fast = 0; } else if (f > 57) { p.fast++; p.slow = 0; } else p.slow = p.fast = 0;
    if (p.slow >= 3 && q < n) { this.rung[k] = q + 1; this.best[k] = q + 1; p.slow = 0; this.size(); this.keep(); }
    if (p.fast >= 16 && q > (this.best[k] ?? 0)) { this.rung[k] = q - 1; p.fast = 0; this.size(); this.keep(); }
    if (p.fast >= 70 && this.best[k]) { this.best[k]--; p.fast = 0; }
  }
}
