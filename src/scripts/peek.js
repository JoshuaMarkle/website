import { h, Spring, clamp } from '../ui/kit.js';

// The view box: what a project looks like, kept just off the cursor while it rests on the glass.
const calmly = (s, x, on) => (on ? s.set(x) : (s.to = x));
export class Peek {
  constructor(stage) {
    const { kit } = stage;
    this.stage = stage;
    this.el = h('div', { className: 'peek', aria: { hidden: 'true' } });
    kit.root.prepend(this.el);
    this.x = new Spring(0, 150, 21); this.y = new Spring(0, 150, 21);
    this.k = new Spring(0, 230, 24); this.w = new Spring(360, 220, 26); this.h = new Spring(202, 220, 26); this.tilt = new Spring(0, 120, 14);
    this.kids = new Map(); this.id = null; this.want = null; this.since = 0; this.still = null;
    kit.in(kit.over, () => {
      this.pane = kit.glass(this.el, { r: 26, a: 0, dim: 0.2, bez: 0.5, dep: 0.6 });
      kit.tick((dt) => this.tick(dt));
    });
  }
  // everything it might show, each made once
  load(p) {
    let e = this.kids.get(p.id);
    if (e) return e;
    e = media(p, this.stage.calm);
    e.classList.add('pic');
    if (p.light) e.classList.add('light');
    this.kids.set(p.id, e);
    this.el.append(e);
    return e;
  }
  // id: what the hand is on. at: a fixed place, for the keyboard
  set(id, at) { this.still = at || null; if (id !== this.want) { this.want = id; this.since = this.stage.now; } }
  get on() { return this.id && this.k.x > 0.3; }
  drop() { this.want = null; this.k.to = 0; this.gone = true; }
  tick(dt) {
    const st = this.stage, { calm, cw, ch } = st, p = this.want && st.projects?.find((q) => q.id === this.want);
    if (p && st.now - this.since > (this.still || calm ? 0 : 0.12)) {
      if (this.id !== p.id) {
        const fresh = this.k.x < 0.05;
        this.load(p);
        for (const [id, e] of this.kids) { const on = id === p.id; e.classList.toggle('on', on); if (e.play) { if (on && !calm) { if (fresh && e.classList.contains('slides')) e.currentTime = 0; e.play().catch(() => {}); } else if (!on) e.pause(); } }
        const big = clamp(cw * 0.28, 260, 400), W = p.tall ? big * 0.5 : big, H = p.tall ? W * (p.id === 'milestone' ? 1.777 : 2.164) : (big * 9) / 16;
        calmly(this.w, W + 12, fresh); calmly(this.h, H + 12, fresh);
        this.id = p.id;
        if (fresh) this.snap = true;
      }
      this.k.to = 1;
    } else if (!p) this.k.to = 0;
    this.k.k = this.k.to ? 230 : 320; this.k.c = this.k.to ? 24 : 34;
    this.k.step(dt); this.w.step(dt); this.h.step(dt);
    if (calm) this.k.set(this.k.to);
    if (this.k.to === 0 && this.k.x < 0.01) { if (this.id) { this.kids.get(this.id)?.pause?.(); this.id = null; } if (this.pane.a) { this.pane.a = 0; this.el.style.opacity = 0; } return; }
    // beside the cursor, on whichever side there is room
    const px = this.still ? this.still.x : st.hand.x, py = this.still ? this.still.y : st.hand.y, w = this.w.to, hh = this.h.to, gap = 26;
    const right = px + gap + w < cw - 12 || px < w + gap, below = py + gap + hh < ch - 12;
    const tx = clamp(right ? px + gap : px - gap - w, 12, Math.max(12, cw - w - 12)), ty = below ? py + gap : clamp(py - gap - hh, 12, ch - hh - 12);
    if (this.snap) { this.snap = false; this.x.set(tx); this.y.set(ty); }
    this.x.to = tx; this.y.to = ty;
    if (calm) { this.x.set(tx); this.y.set(ty); }
    const ox = this.x.x; this.x.step(dt); this.y.step(dt);
    this.tilt.to = calm ? 0 : clamp(((this.x.x - ox) / Math.max(dt, 0.004)) * 0.004, -4, 4); this.tilt.step(dt);
    const k = clamp(this.k.x, 0, 1.06), sc = 0.25 + 0.75 * k, cx = px - this.x.x, cy = py - this.y.x;
    this.el.style.width = `${this.w.x.toFixed(1)}px`; this.el.style.height = `${this.h.x.toFixed(1)}px`;
    this.el.style.transformOrigin = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
    this.el.style.transform = `translate(${this.x.x.toFixed(2)}px,${this.y.x.toFixed(2)}px) scale(${sc.toFixed(4)}) rotate(${this.tilt.x.toFixed(2)}deg)`;
    this.el.style.opacity = clamp(k * 1.6 - 0.2, 0, 1).toFixed(3);
    this.pane.a = clamp(k * 1.6 - 0.2, 0, 1);
  }
}

// a still, a clip, or several stills that push each other along
const HOLD = 1150, MOVE = 620, EASE = 'cubic-bezier(0.76, 0, 0.18, 1)';
export function media(p, calm, src = p.media) {
  const img = (u) => h('img', { src: u, alt: '', decoding: 'async', draggable: false });
  if (p.slides > 1 && src === p.media && !calm) {
    const all = Array.from({ length: p.slides }, (_, i) => src.replace('-1.webp', `-${i + 1}.webp`));
    const strip = h('div', { className: 'strip' }, [...all, all[0]].map(img)), el = h('div', { className: 'slides' }, strip);
    const n = all.length, T = n * (HOLD + MOVE), frames = [];
    for (let i = 0; i < n; i++) {
      const t = i * (HOLD + MOVE), at = `translateX(${-100 * i}%)`;
      frames.push({ offset: t / T, transform: at, easing: 'linear' }, { offset: (t + HOLD) / T, transform: at, easing: EASE });
    }
    frames.push({ offset: 1, transform: `translateX(${-100 * n}%)` });
    const run = strip.animate(frames, { duration: T, iterations: Infinity });
    run.pause();
    el.play = () => { run.play(); return Promise.resolve(); };
    el.pause = () => run.pause();
    Object.defineProperty(el, 'currentTime', { get: () => run.currentTime || 0, set: (v) => { run.currentTime = v; } });
    return el;
  }
  if (!src.endsWith('.mp4') || calm) return img(src.replace('.mp4', '.webp'));
  const v = h('video', { src, poster: src.replace('.mp4', '.webp'), loop: true, muted: true, playsInline: true, preload: 'auto', tabIndex: -1 });
  v.setAttribute('muted', ''); v.disablePictureInPicture = true;
  return v;
}
