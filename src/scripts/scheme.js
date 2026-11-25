import { PALETTES, Lut, css, sample } from '../palettes.js';
import { clamp } from '../ui/kit.js';

// One set of sliders for everything that shines: the liquid type, the interface glass, the models.
export const KNOBS = [
  { k: 'hue', label: 'Hue', min: -180, max: 180, step: 1 },
  { k: 'film', label: 'Film thickness', min: 200, max: 900, step: 5 },
  { k: 'irid', label: 'Iridescence', min: 0, max: 1, step: 0.01 },
  { k: 'split', label: 'Colour split', min: 0, max: 1, step: 0.01 },
  { k: 'glow', label: 'Glow', min: 0, max: 1, step: 0.01 },
  { k: 'weave', label: 'Weave', min: 0, max: 1, step: 0.01 },
  { k: 'grain', label: 'Grain', min: 0, max: 1, step: 0.01 },
];
const DEF = { palette: 'ember', hue: 0, film: 420, irid: 0.4, split: 0.4, glow: 0.6, weave: 0.3, grain: 0.5 };
const KEY = 'jm-scheme';
const rand = (a, b) => a + Math.random() * (b - a);

export class Scheme {
  constructor() {
    this.v = { ...DEF };
    try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); for (const k in DEF) if (typeof o[k] === typeof DEF[k]) this.v[k] = o[k]; } catch { /* private window */ }
    if (!PALETTES[this.v.palette]) this.v.palette = DEF.palette;
    this.now = { ...this.v };
    this.lut = new Lut(); this.studio = new Lut(); // the second one lights the models, a few degrees round
    this.turn = 0;
    this.fns = [];
    this.aim(true);
  }
  aim(snap) { this.lut.set(this.v.palette, this.v.hue, snap); this.studio.set(this.v.palette, this.v.hue + this.turn, snap); }
  set(k, x) { this.v[k] = x; this.changed(); }
  changed() { try { localStorage.setItem(KEY, JSON.stringify(this.v)); } catch { /* nothing to do */ } this.fns.forEach((f) => f()); }
  // always lands somewhere that looks good, and never on the gradient you were looking at
  shuffle() {
    const ids = Object.keys(PALETTES).filter((p) => p !== this.v.palette);
    this.v = { ...this.v, palette: ids[Math.floor(Math.random() * ids.length)], hue: Math.random() < 0.5 ? 0 : Math.round(rand(-70, 70)), film: Math.round(rand(280, 680)), irid: +rand(0.25, 0.75).toFixed(2), split: +rand(0.25, 0.7).toFixed(2), glow: +rand(0.48, 0.8).toFixed(2) };
    this.changed();
  }
  reset() { this.v = { ...DEF }; this.changed(); }
  get home() { return Object.keys(DEF).every((k) => this.v[k] === DEF[k]); }
  tint(deg) { if (Math.abs(deg - this.turn) > 0.5) this.turn = deg; }
  update(dt) {
    const k = 1 - Math.exp(-dt * 6), n = this.now, v = this.v;
    for (const q of ['film', 'irid', 'split', 'glow', 'weave', 'grain']) n[q] += (v[q] - n[q]) * k;
    this.aim(false); this.lut.update(dt); this.studio.update(dt);
    // what each surface makes of them; the middle of every slider is the look the site was drawn in
    this.halo = { bleed: 0.95 * (n.glow / 0.6), spread: 0.82 + 0.3 * n.glow, irid: clamp((n.irid - 0.4) / 0.6, 0, 1) * 0.85, split: (n.split - 0.4) * 0.16 };
    this.glass = { gBlur: 0, gBezel: 34, gDepth: 40, gIor: 1.5, gCurve: 2.2, gZoom: 1, gDisp: 1.25 * n.split, gRim: 1, gGlow: 0.35 + 0.25 * n.glow, gIrid: 0.55 * n.irid, gFilm: n.film, gTint: 0, gStain: 0, gSat: 1.06, gDim: 0.35, gShadow: 0, gCorner: 0.6, gMerge: 18, gGive: 1 };
    this.model = { film: n.film / 420, irid: n.irid / 0.4, split: n.split / 0.4 };
  }
  swatch(id) { return css(PALETTES[id].stops, this.v.hue).replace('90deg', '100deg'); }
  at(t) { const c = sample(PALETTES[this.v.palette].stops, this.v.hue), j = Math.round(t * 511) * 4; return `rgb(${[0, 1, 2].map((i) => Math.round(c[j + i] * 255)).join(' ')})`; }
}
export { PALETTES };
