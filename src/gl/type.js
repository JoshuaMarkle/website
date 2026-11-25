import * as THREE from 'three';
import { U } from './gpu.js';
import { Plate, FACE } from './plate.js';

// A line that is being typed: each letter comes in hot after the last, stands a second and a half and
// cools away. One plate holds them all, so their light still pools between them. Red is the letters;
// green over red is how much of itself each has left.
const CAP = 0.285, EM = 150, EDGE = 16, MAXN = 64, SIDE = 2048;
const HOLD = 1.5, FADE = 0.75, TRACK = 0.012, GAP = 0.07; // seconds, seconds; between letters, and a space
export const TYPE_H = CAP;
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export class TypePlate extends Plate {
  constructor(baker) {
    super(baker);
    this.padX = 0.3; this.padY = 0.34; this.reach = 16; this.cut = [2, 2, 3, 4]; // cast again every frame, like the marquee
    this.chars = []; this.caret = 0; this.last = ''; this.run = 0;
    const quad = new THREE.PlaneGeometry(1, 1), g = (this.geo = new THREE.InstancedBufferGeometry());
    g.index = quad.index; g.setAttribute('position', quad.attributes.position);
    const at = (n) => new THREE.InstancedBufferAttribute(new Float32Array(MAXN * n), n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('place', (this.aPlace = at(4))); // x, y, half width, half height
    g.setAttribute('cell', (this.aCell = at(4)));
    g.setAttribute('ink', (this.aInk = at(1)));
    this.u = { map: U(null), uHalf: U(new THREE.Vector2(1, 1)) };
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, uniforms: this.u, depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      vertexShader: `precision highp float; in vec3 position; in vec4 place,cell; in float ink; out vec2 vT; out float vI; uniform vec2 uHalf;
        void main(){ vI=ink; vT=cell.xy+(position.xy*vec2(1.,-1.)+.5)*cell.zw; gl_Position=vec4((place.xy+position.xy*2.*place.zw)/uHalf,0.,1.); }`,
      fragmentShader: 'precision highp float; in vec2 vT; in float vI; uniform sampler2D map; out vec4 o; void main(){ float m=texture(map,vT).r; o=vec4(m,m*vI*.5,0.,1.); }',
    });
    this.scene = new THREE.Scene();
    const mesh = new THREE.Mesh(g, this.mat);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.cam = new THREE.Camera();
  }
  get empty() { return !this.chars.length; }

  // a picture of every letter there is a key for; any other is added when it is first typed
  atlas() {
    if (this.tex) return;
    const c = (this.canvas = Object.assign(document.createElement('canvas'), { width: SIDE, height: SIDE })), x = (this.ctx = c.getContext('2d'));
    x.fillStyle = '#000'; x.fillRect(0, 0, SIDE, SIDE);
    x.font = `400 ${EM}px ${FACE}`; x.fillStyle = '#fff';
    this.capH = x.measureText('H').actualBoundingBoxAscent / EM;
    this.asc = Math.ceil(EM * 0.98); this.cellH = this.asc + Math.ceil(EM * 0.3);
    this.lift = ((this.asc - EM * 0.3) / 2 - (this.capH * EM) / 2) / EM;
    this.pen = { x: 0, y: 0 }; this.glyphs = new Map();
    for (let i = 33; i < 127; i++) if (i < 97 || i > 122) this.glyph(String.fromCharCode(i));
    this.tex = new THREE.CanvasTexture(c);
    this.tex.colorSpace = THREE.NoColorSpace; this.tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex.anisotropy = 8;
    this.u.map.value = this.tex;
  }
  glyph(c) {
    if (this.glyphs.has(c)) return this.glyphs.get(c);
    const x = this.ctx, p = this.pen, m = x.measureText(c), l = Math.ceil(Math.max(0, m.actualBoundingBoxLeft)) + EDGE, w = l + Math.ceil(m.actualBoundingBoxRight) + EDGE;
    if (p.x + w > SIDE) { p.x = 0; p.y += this.cellH; }
    if (p.y + this.cellH > SIDE) return null;
    x.save(); x.beginPath(); x.rect(p.x, p.y, w, this.cellH); x.clip(); x.fillText(c, p.x + l, p.y + this.asc); x.restore();
    const g = { cell: [p.x / SIDE, 1 - p.y / SIDE, w / SIDE, -this.cellH / SIDE], l: l / EM, w: w / EM, adv: m.width / EM };
    p.x += w;
    this.glyphs.set(c, g);
    if (this.tex) this.tex.needsUpdate = true;
    return g;
  }

  // bw: plate units across; ppu: pixels to one of them
  fit(bw, ppu) {
    ppu = Math.round(Math.min(360, Math.max(160, ppu * 0.8)) / 20) * 20;
    bw = Math.round(bw * 50) / 50;
    if (this.w && bw === this.bw && ppu === this.ppu) return;
    this.ppu = ppu;
    this.size(bw, CAP);
    this.atlas();
    this.u.uHalf.value.set(this.ext.x / 2, this.ext.y / 2);
    this.chars = []; this.caret = 0; this.last = '';
  }

  // how wide some words come out, in plate units
  span(text) { return this.w ? (this.ctx.measureText(text.toUpperCase()).width / EM) * (CAP / this.capH) + TRACK * text.length : 0; }
  // back to the left; what is there makes way
  fresh() { for (const q of this.chars) q.rush = 4; this.caret = 0; this.last = ''; this.run++; }

  // where it landed, in plate units from the middle; null if there was no letter to set. wait: seconds it stands beyond its own
  type(ch, wait = 0) {
    if (!this.w) return null;
    if (ch === ' ') { if (!this.empty) { this.caret += GAP; this.last = ''; } return null; }
    const up = ch.toUpperCase(), c = [...up].length === 1 ? up : ch, g = this.glyph(c);
    if (!g) return null;
    const em = CAP / this.capH, x = this.ctx, w = g.adv * em;
    if (this.last) this.caret += ((x.measureText(this.last + c).width - x.measureText(this.last).width) / EM - g.adv) * em; // kerned to the one before
    if (this.caret + w > this.bw) { this.caret = 0; this.run++; } // off the right, back to the left
    const s = this.caret;
    // it takes the place of whatever is left there from the time before, and what is just ahead makes way
    this.chars = this.chars.filter((q) => q.run === this.run || q.s > s + w || q.s + q.w < s);
    for (const q of this.chars) if (q.run !== this.run && q.s > s && q.s < s + w + CAP * 2.4) q.rush = 6;
    this.chars.push({ g, s, w, age: 0, rush: 1, run: this.run, hold: HOLD + wait });
    if (this.chars.length > MAXN) this.chars.shift();
    this.caret = s + w + TRACK; this.last = c;
    return s + w / 2 - this.bw / 2;
  }
  back() {
    const q = this.chars.pop();
    if (q) { this.caret = q.s; this.run = q.run; }
    this.last = '';
  }

  step(dt) {
    for (const q of this.chars) { q.age += dt; if (q.rush > 1) q.age = Math.max(q.age, q.hold) + dt * (q.rush - 1); }
    this.chars = this.chars.filter((q) => q.age < q.hold + FADE);
    if (this.empty) { this.caret = 0; this.last = ''; return; }
    if (!this.w) return;
    const em = CAP / this.capH, P = this.aPlace.array, C = this.aCell.array, I = this.aInk.array;
    this.chars.forEach((q, n) => {
      const k = 1 - Math.exp(-q.age * 22), z = 0.82 + 0.18 * k, g = q.g; // it lands
      P[n * 4] = q.s - this.bw / 2 + q.w / 2 + (g.w / 2 - g.l - g.adv / 2) * em * z;
      P[n * 4 + 1] = (this.lift * em) * z - 0.05 * (1 - k);
      P[n * 4 + 2] = (g.w / 2) * em * z; P[n * 4 + 3] = (this.cellH / EM / 2) * em * z;
      C.set(g.cell, n * 4);
      I[n] = Math.min(2, (1 + 0.8 * Math.exp(-q.age * 5)) * (1 - sm((q.age - q.hold) / FADE)));
    });
    this.geo.instanceCount = this.chars.length;
    this.aPlace.needsUpdate = this.aCell.needsUpdate = this.aInk.needsUpdate = true;
    const r = this.baker.r;
    r.setRenderTarget(this.mask); r.setClearColor(0x000000, 0); r.clear(true, false, false);
    r.render(this.scene, this.cam);
    this.baker.bake(this);
  }
  dispose() { super.dispose(); this.tex?.dispose(); this.tex = null; }
}
