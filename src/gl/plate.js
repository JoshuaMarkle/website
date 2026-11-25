import * as THREE from 'three';
import { Pass, rt, U } from './gpu.js';

// A block of type, its distance field and four blurs of it. Every plate is built in the same units
// (a capital is about 0.28 tall) and scaled onto the page afterwards, so small type glows the way
// big type does.
export const PAD = 0.46;             // room round the letters for the light
const SIG = [0.0075, 0.022, 0.055, 0.12], PPU = 540, SS = 2;
export const FACE = '"Special Gothic Expanded One"';

// the passes and scratch targets every plate shares
export class Baker {
  constructor(renderer) {
    this.r = renderer;
    this.pool = new Map();
    this.pCopy = new Pass(/* glsl */ `uniform sampler2D t; void main(){ vec2 px=.5/vec2(textureSize(t,0));
      o=.25*(texture(t,vUv+px*vec2(-1,-1))+texture(t,vUv+px*vec2(1,-1))+texture(t,vUv+px*vec2(-1,1))+texture(t,vUv+px*vec2(1,1))); }`, { t: U(null) });
    // seeds sit on the sub-pixel edge; offsets, so half floats keep the fraction
    this.pSeed = new Pass(/* glsl */ `uniform sampler2D t;
      void main(){ ivec2 q=ivec2(gl_FragCoord.xy), m=textureSize(t,0)-1;
        float a=texelFetch(t,q,0).r,l=texelFetch(t,max(q-ivec2(1,0),ivec2(0)),0).r,r=texelFetch(t,min(q+ivec2(1,0),m),0).r,d=texelFetch(t,max(q-ivec2(0,1),ivec2(0)),0).r,u=texelFetch(t,min(q+ivec2(0,1),m),0).r;
        float lo=min(a,min(min(l,r),min(d,u))), hi=max(a,max(max(l,r),max(d,u)));
        o=vec4(900.);
        if(lo<.5&&hi>=.5){ vec2 g=vec2(r-l,u-d)*.5; float gl=length(g); o.xy=gl>1e-3?clamp((.5-a)/gl,-1.,1.)*g/gl:vec2(0.); } }`, { t: U(null) });
    this.pJump = new Pass(/* glsl */ `uniform sampler2D t; uniform int stp;
      void main(){ ivec2 p=ivec2(gl_FragCoord.xy), m=textureSize(t,0)-1; vec2 best=vec2(900.); float bd=1e9;
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
          ivec2 e=ivec2(x,y)*stp, q=p+e; if(q.x<0||q.y<0||q.x>m.x||q.y>m.y) continue;
          vec2 s=texelFetch(t,q,0).xy;
          if(s.x<800.){ vec2 v=s+vec2(e); float d=dot(v,v); if(d<bd){bd=d;best=v;} }
        } o=vec4(best,0.,1.); }`, { t: U(null), stp: U(1) });
    this.pSdf = new Pass(/* glsl */ `uniform sampler2D t,mask; uniform float ppu; void main(){ ivec2 p=ivec2(gl_FragCoord.xy); vec2 s=texelFetch(t,p,0).xy;
      float d=s.x<800.?length(s):220.; o=vec4(d*(texelFetch(mask,p,0).r>.5?-1.:1.)/ppu,0.,0.,1.); }`, { t: U(null), mask: U(null), ppu: U(PPU) });
    this.pBlur = new Pass(/* glsl */ `uniform sampler2D t; uniform vec2 dir; uniform float sigma;
      void main(){ vec2 c=vec2(0.); float w=0.; for(int i=-12;i<=12;i++){ float x=float(i)/12.*2.6; float k=exp(-.5*x*x); c+=k*texture(t,vUv+dir*x*sigma).rg; w+=k; } o=vec4(c/w,0.,1.); }`, { t: U(null), dir: U(new THREE.Vector2()), sigma: U(1) });
  }
  scratch(w, h, cut) {
    const k = `${w}x${h}/${cut}`;
    if (!this.pool.has(k)) {
      if (this.pool.size > 3) { const [old, v] = this.pool.entries().next().value; v.all.forEach((t) => t.dispose()); this.pool.delete(old); }
      const near = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
      const v = { jA: rt(w, h, near), jB: rt(w, h, near), tmp: dims(w, h, cut).map(([a, b]) => rt(a, b)) };
      v.all = [v.jA, v.jB, ...v.tmp];
      this.pool.set(k, v);
    }
    return this.pool.get(k);
  }
  bake(p) {
    const r = this.r, s = this.scratch(p.w, p.h, p.cut);
    this.pSeed.u.t.value = p.mask.texture; this.pSeed.render(r, s.jA);
    let a = s.jA, b = s.jB;
    for (let st = p.reach; st >= 1; st >>= 1) { this.pJump.u.t.value = a.texture; this.pJump.u.stp.value = st; this.pJump.render(r, b); [a, b] = [b, a]; }
    this.pSdf.u.t.value = a.texture; this.pSdf.u.mask.value = p.mask.texture; this.pSdf.u.ppu.value = p.ppu; this.pSdf.render(r, p.sdf);
    let src = p.mask;
    const u = this.pBlur.u;
    const sig = p.sig;
    for (let i = 0; i < 4; i++) {
      u.sigma.value = i ? Math.sqrt(sig[i] ** 2 - sig[i - 1] ** 2) : sig[0];
      u.t.value = src.texture; u.dir.value.set(1 / p.ext.x, 0); this.pBlur.render(r, s.tmp[i]);
      u.t.value = s.tmp[i].texture; u.dir.value.set(0, 1 / p.ext.y); this.pBlur.render(r, p.blur[i]);
      src = p.blur[i];
    }
  }
}
const CUT = [1, 2, 2, 4];
const dims = (w, h, cut) => cut.map((k) => [Math.max(2, Math.round(w / k)), Math.max(2, Math.round(h / k))]);

// type set in lines of one measure. Natural widths come back in cap heights.
const meter = document.createElement('canvas').getContext('2d');
export function measure(lines, track = 0, up = true) {
  meter.font = `400 300px ${FACE}`;
  const cap = meter.measureText(up ? 'H' : 'x').actualBoundingBoxAscent;
  return lines.map((t) => advances(meter, t, track * 300).reduce((a, b) => a + b, 0) / cap);
}
function advances(ctx, text, tr) {
  const c = [...text];
  return c.map((ch, i) => (i < c.length - 1 ? ctx.measureText(ch + c[i + 1]).width - ctx.measureText(c[i + 1]).width + tr : ctx.measureText(ch).width));
}

// text into a canvas of plate size, letters stretched so every line fills `bw`
export function paint(ctx, W, H, lines, { cap, gap, bw, track = 0, most = 1.35 }) {
  const EM = 300, px = PPU * SS;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = `400 ${EM}px ${FACE}`; ctx.textBaseline = 'alphabetic';
  const ch = ctx.measureText('H').actualBoundingBoxAscent, sy = (cap * px) / ch;
  const total = (cap * lines.length + gap * (lines.length - 1)) * px;
  lines.forEach((t, li) => {
    const adv = advances(ctx, t, track * EM), w = adv.reduce((a, b) => a + b, 0);
    const sx = Math.min((bw * px) / w, sy * most);
    ctx.setTransform(sx, 0, 0, sy, W / 2, H / 2 - total / 2 + cap * px + li * (cap + gap) * px);
    let x = -w / 2;
    [...t].forEach((c, i) => { ctx.fillText(c, x, 0); x += adv[i]; });
  });
}

export class Plate {
  constructor(baker) { this.baker = baker; this.ext = new THREE.Vector2(1, 1); this.w = 0; this.h = 0; this.key = ''; this.ppu = PPU; this.padX = this.padY = PAD; this.reach = 32; this.cut = CUT; this.sig = SIG; }
  // block size in plate units; true when the targets had to change
  size(bw, bh) {
    this.bw = bw; this.bh = bh;
    const { ppu } = this, w = Math.round(((bw + 2 * this.padX) * ppu) / 4) * 4, h = Math.round(((bh + 2 * this.padY) * ppu) / 4) * 4;
    this.ext.set(w / ppu, h / ppu);
    if (w === this.w && h === this.h) return false;
    this.dispose();
    this.w = w; this.h = h;
    this.mask = rt(w, h, { type: THREE.UnsignedByteType });
    this.sdf = rt(w, h);
    this.blur = dims(w, h, this.cut).map(([a, b]) => rt(a, b));
    return true;
  }
  set(lines, o) {
    const key = JSON.stringify([lines, o]);
    if (key === this.key) return;
    this.key = key;
    this.size(o.bw, o.cap * lines.length + o.gap * (lines.length - 1));
    const c = document.createElement('canvas');
    c.width = this.w * SS; c.height = this.h * SS;
    paint(c.getContext('2d'), c.width, c.height, lines, o);
    const t = new THREE.CanvasTexture(c);
    t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.NoColorSpace;
    this.baker.pCopy.u.t.value = t; this.baker.pCopy.render(this.baker.r, this.mask);
    t.dispose();
    this.baker.bake(this);
  }
  dispose() { if (!this.w) return; [this.mask, this.sdf, ...this.blur].forEach((t) => t.dispose()); this.w = 0; }
}

// Two words, one blurring out while the next blurs in, and a threshold that turns the overlap into
// goo. At rest it is a still plate and costs nothing to keep.
const CAP = 0.285, GAP = 0.05;
export class LiquidPlate extends Plate {
  constructor(baker, words) {
    super(baker);
    this.list = words; this.i = 0; this.ph = 0; this.f = 0; this.was = -1;
    this.hold = 1.6; this.morph = 1; this.goo = 0.03;
    this.words = [0, 1].map(() => {
      const canvas = document.createElement('canvas');
      return { canvas, ctx: canvas.getContext('2d'), tex: null, text: '' };
    });
    this.pBlur = new Pass(/* glsl */ `uniform sampler2D t; uniform vec2 dir; uniform float sigma,size;
      void main(){ float c=0.,w=0.; float lod=max(0.,log2(sigma*size*2.6/16.*1.15));
        for(int i=-16;i<=16;i++){ float x=float(i)/16.*2.6; float k=exp(-.5*x*x); c+=k*textureLod(t,vUv+dir*x*sigma,lod).r; w+=k; } o=vec4(c/w); }`, { t: U(null), dir: U(new THREE.Vector2()), sigma: U(0), size: U(1) });
    this.pCut = new Pass(/* glsl */ `uniform sampler2D a,b,A,B; uniform vec2 f; uniform float cut;
      void main(){ vec2 q=vUv;
        float va=mix(texture(a,q).r,texture(A,q).r,smoothstep(.82,.98,f.x))*pow(f.x,.4);
        float vb=mix(texture(b,q).r,texture(B,q).r,smoothstep(.82,.98,f.y))*pow(f.y,.4);
        float v=va+vb-va*vb, e=max(fwidth(v),.004)*.75; o=vec4(smoothstep(cut-e,cut+e,v)); }`, { a: U(null), b: U(null), A: U(null), B: U(null), f: U(new THREE.Vector2()), cut: U(140 / 255) });
  }
  fit(bw) {
    if (Math.abs(bw - (this.bw || 0)) < 0.005 && this.w) return;
    this.size(bw, CAP * 2 + GAP);
    for (const s of this.words) {
      s.tex?.dispose(); s.text = '';
      s.canvas.width = this.w * SS; s.canvas.height = this.h * SS;
      s.tex = new THREE.CanvasTexture(s.canvas);
      s.tex.colorSpace = THREE.NoColorSpace; s.tex.generateMipmaps = true; s.tex.minFilter = THREE.LinearMipmapLinearFilter;
    }
    const a = Math.round(this.w / 2), b = Math.round(this.h / 2);
    for (const t of [this.tmp, ...(this.soft || [])]) t?.dispose();
    this.tmp = rt(a, b); this.soft = [rt(a, b), rt(a, b)];
    this.was = -1;
  }
  skip() { if (this.ph < this.hold) this.ph = this.hold; }
  get now() { return this.list[this.i]; }
  write(s, text) {
    if (s.text === text) return;
    s.text = text;
    paint(s.ctx, s.canvas.width, s.canvas.height, text.toUpperCase().split('/'), { cap: CAP, gap: GAP, bw: this.bw });
    s.tex.needsUpdate = true;
  }
  step(dt) {
    this.ph += dt;
    let f = (this.ph - this.hold) / this.morph;
    if (f >= 1) { this.i = (this.i + 1) % this.list.length; this.ph = 0; f = 0; }
    this.f = Math.min(1, Math.max(0, f));
    const tag = this.f === 0 ? this.i : -2;
    if (tag === this.was && tag >= 0) return;
    this.was = tag;
    const r = this.baker.r, live = this.f > 0, fs = [1 - this.f, this.f];
    this.write(this.words[0], this.now);
    this.write(this.words[1], this.list[(this.i + 1) % this.list.length]);
    for (let k = 0; k < 2; k++) {
      const g = Math.min(1, Math.max(1e-4, fs[k]));
      if (!live || g > 0.98 || g < 0.02) continue;
      const u = this.pBlur.u;
      u.sigma.value = Math.min(this.goo * (1 / g - 1), 0.14);
      u.size.value = this.words[k].canvas.height / this.ext.y;
      u.t.value = this.words[k].tex; u.dir.value.set(1 / this.ext.x, 0); this.pBlur.render(r, this.tmp);
      u.t.value = this.tmp.texture; u.dir.value.set(0, 1 / this.ext.y); u.size.value = 1; this.pBlur.render(r, this.soft[k]);
    }
    const c = this.pCut.u;
    c.a.value = this.soft[0].texture; c.b.value = this.soft[1].texture; c.A.value = this.words[0].tex; c.B.value = this.words[1].tex;
    c.f.value.set(live ? fs[0] : 1, live ? fs[1] : 0); c.cut.value = live ? 140 / 255 : 0.5;
    this.pCut.render(r, this.mask);
    this.baker.bake(this);
  }
  dispose() {
    super.dispose();
    for (const s of this.words || []) { s.tex?.dispose(); s.tex = null; }
    for (const t of [this.tmp, ...(this.soft || [])]) t?.dispose();
    this.tmp = this.soft = null;
  }
}
