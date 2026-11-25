import { h, Spring, clamp } from './kit.js';

// A sheet of glass that lets go of the button that opened it. 'center' floats in the middle and holds
// the page still; 'above' stands over its button and leaves the page alone.
export class Pop {
  constructor(stage, root, { label, cls = '', place = 'above', modal = false, r = 38, pane = {} }) {
    const kit = (this.kit = stage.kit);
    Object.assign(this, { stage, place, modal, on: false, from: null });
    this.box = h('i', { className: 'pbox' });
    this.body = h('div', { className: 'pbody', aria: { role: 'dialog', label, ...(modal ? { modal: 'true' } : {}) }, tabIndex: -1 });
    this.el = h('div', { className: `pop ${place} ${cls}` }, this.box, this.body);
    this.el.inert = true; this.el.hidden = true;
    root.append(this.el);
    this.sx = new Spring(0, 250, 22); this.sy = new Spring(0, 205, 20);
    kit.in(kit.over, () => {
      this.pane = kit.glass(this.box, { r, a: 0, dim: 0.5, bez: 1.1, col: [0, 0, 0, 0.3], ...pane });
      kit.tick((dt) => this.tick(dt));
    });
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); this.close(); }
      if (e.key === 'Tab' && this.modal) {
        const f = [...this.body.querySelectorAll('a[href],button,[tabindex="0"]')].filter((x) => x.offsetWidth);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement), n = e.shiftKey ? i - 1 : i + 1;
        if (n < 0 || n >= f.length || i < 0) { e.preventDefault(); f[(n + f.length) % f.length].focus(); }
      }
    });
    addEventListener('keydown', (e) => { if (this.on && e.key === 'Escape' && !this.el.contains(e.target)) this.close(); });
    addEventListener('pointerdown', (e) => {
      if (!this.on || this.loose || this.body.contains(e.target) || this.from?.contains(e.target)) return;
      if (this.modal) e.preventDefault();
      this.close();
    }, true);
  }
  toggle(from) { if (this.on) this.close(); else this.open(from); }
  open(from) {
    if (this.on) return;
    this.on = true; this.from = from; this.el.hidden = false; this.el.inert = false;
    from.setAttribute?.('aria-expanded', 'true');
    this.put();
    this.y0 = scrollY;
    if (this.modal) document.documentElement.classList.add('locked');
    this.onopen?.();
    this.body.focus({ preventScroll: true });
  }
  put() {
    if (this.place !== 'above' || !this.from?.isConnected) return;
    const a = this.from.getBoundingClientRect(), w = this.body.offsetWidth, vw = document.documentElement.clientWidth;
    this.body.style.left = `${clamp(a.right - w, 14, Math.max(14, vw - w - 14))}px`;
    this.body.style.top = `${Math.max(14, a.top - 14 - this.body.offsetHeight)}px`;
  }
  close(quick) {
    if (!this.on) return;
    this.on = false; this.el.inert = true;
    this.from?.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('locked');
    this.onclose?.();
    if (!quick) (this.back || this.from)?.focus?.({ preventScroll: true });
  }
  tick(dt) {
    const { sx, sy } = this;
    sx.to = sy.to = this.on ? 1 : 0;
    if (!this.on && sy.x < 0.002) { if (!this.el.hidden) { this.el.hidden = true; this.pane.a = 0; sx.set(0); sy.set(0); if (this.from?.pane && this.modal) this.shade(1); } return; }
    if (this.on && this.place === 'above') { if (Math.abs(scrollY - this.y0) > 140) this.close(true); else this.put(); }
    sx.step(dt); sy.step(dt);
    const t = this.body.getBoundingClientRect(), f = this.from?.isConnected ? this.from.getBoundingClientRect() : t;
    const L = (a, b, k) => a + (b - a) * k, w = Math.max(8, L(f.width, t.width, sx.x)), hh = Math.max(8, L(f.height, t.height, sy.x));
    const cx = L(f.left + f.width / 2, t.left + t.width / 2, sx.x), cy = L(f.top + f.height / 2, t.top + t.height / 2, sy.x);
    Object.assign(this.box.style, { width: `${w.toFixed(1)}px`, height: `${hh.toFixed(1)}px`, transform: `translate(${(cx - w / 2).toFixed(2)}px,${(cy - hh / 2).toFixed(2)}px)` });
    this.pane.a = clamp(sy.x * 6, 0, 1);
    this.body.style.opacity = clamp((sy.x - 0.4) * 2.2, 0, 1).toFixed(3);
    if (this.modal) this.shade(1 - this.pane.a);
  }
  // the button becomes the sheet
  shade(a) { const f = this.from; if (!f) return; if (f.pane) f.pane.a = a; if (f.word) f.word.a = a; }
}
