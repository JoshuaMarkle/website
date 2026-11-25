import * as THREE from 'three';
import { U } from './gpu.js';
import { Plate, FACE } from './plate.js';

// A word said over and over along a sine. Letters ride it by arc length and turn to its slope, so the
// gaps open and close over the crests and the light pools in them. Pull it and it rings like a string.
const CAP = 0.285, EM = 256, EDGE = 24, SEG = 10, MAXN = 140, N = 420;
const AMP = 0.2, LONG = 4.4, SPEED = 0.17, TRACK = 0.01, BEND = 0.3;
const DOT = '\u00b7', ROUND = 0.34, APART = 0.27; // between the words: how big and how far off, in capitals
const FAST = 5.2; // plate units a second, as hard as the wheel can push it
export const WAVE_H = CAP + 2 * AMP; // plate units from crest to trough

export class WavePlate extends Plate {
  constructor(baker, word) {
    super(baker);
    this.padX = 0.3; this.padY = 0.34; this.reach = 16; this.cut = [2, 2, 3, 4]; // it is cast again every frame, so no more than it needs
    this.sig = [0.0075, 0.022, 0.055, 0.13]; // and its light reaches further, to run from one word into the next
    this.word = word.trim().toUpperCase() + DOT;
    this.off = 0; this.push = 0; this.vel = 0; this.swell = 0; this.ph = 0;
    this.pull = { x: 0, y: 0, v: 0, held: false, grab: 0, tx: 0, ty: 0 };
    this.arc = new Float32Array(N + 1);

    const quad = new THREE.PlaneGeometry(1, 1, SEG, 1), g = (this.geo = new THREE.InstancedBufferGeometry());
    g.index = quad.index; g.setAttribute('position', quad.attributes.position);
    this.aPlace = new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 3), 3).setUsage(THREE.DynamicDrawUsage); // x, half width, half height
    this.aCell = new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('place', this.aPlace); g.setAttribute('cell', this.aCell);
    this.u = { map: U(null), uK: U(1), uAmp: U(AMP), uPh: U(0), uPull: U(new THREE.Vector3(0, 0, 0.36)), uLift: U(0), uLean: U(0), uHalf: U(new THREE.Vector2(1, 1)) };
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, uniforms: this.u, depthTest: false, depthWrite: false, transparent: true, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      vertexShader: /* glsl */ `precision highp float;
        in vec3 position; in vec3 place; in vec4 cell; out vec2 vT; out float vY;
        uniform float uK,uAmp,uPh,uLift,uLean; uniform vec3 uPull; uniform vec2 uHalf;
        float w(float x){ float e=(x-uPull.x)/uPull.z; return uPull.y*exp(-e*e); }
        float curve(float x){ return uAmp*sin(uK*x+uPh)+w(x); }
        float slope(float x){ return uAmp*uK*cos(uK*x+uPh)-2.*(x-uPull.x)/(uPull.z*uPull.z)*w(x); }
        void main(){
          vec2 l=position.xy*2.*place.yz+vec2(0.,uLift); // pivot on the middle of the capitals
          vY=l.y/${CAP / 2};
          l.x+=l.y*uLean;
          float x=place.x, m=slope(x), c=1./sqrt(1.+m*m);
          vec2 rigid=vec2(x,curve(x))+vec2(c,m*c)*l.x+vec2(-m*c,c)*l.y;
          float bx=x; for(int i=0;i<4;i++){ float s=slope(bx); bx+=l.x*.25/sqrt(1.+s*s); }
          float bm=slope(bx), bc=1./sqrt(1.+bm*bm);
          vec2 bent=vec2(bx,curve(bx))+vec2(-bm*bc,bc)*l.y;
          vT=cell.xy+(position.xy*vec2(1.,-1.)+.5)*cell.zw;
          gl_Position=vec4(mix(rigid,bent,${BEND})/uHalf,0.,1.);
        }`,
      // red is the letters; green is a ribbon under the whole line, dots and gaps and all
      fragmentShader: 'precision highp float; in vec2 vT; in float vY; uniform sampler2D map; out vec4 o; void main(){ o=vec4(texture(map,vT).r,smoothstep(1.,.75,abs(vY)),0.,1.); }',
    });
    this.scene = new THREE.Scene();
    const mesh = new THREE.Mesh(g, this.mat);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.cam = new THREE.Camera();
  }

  // one picture for each letter, and how far each carries the pen
  atlas() {
    if (this.tex) return;
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'), font = `400 ${EM}px ${FACE}`, chars = [...this.word];
    ctx.font = font;
    this.capH = ctx.measureText('H').actualBoundingBoxAscent / EM;
    const asc = Math.ceil(EM * 0.98), desc = Math.ceil(EM * 0.3), ch = asc + desc, ink = new Map();
    let x = 0;
    const dot = ROUND * this.capH * EM, gap = APART * this.capH * EM;
    for (const c of new Set(chars.filter((q) => q.trim()))) {
      if (c === DOT) { const w = Math.ceil(dot + 2 * gap); ink.set(c, { x, w, l: (w - dot) / 2 - gap }); x += w; continue; }
      const m = ctx.measureText(c), l = Math.ceil(m.actualBoundingBoxLeft) + EDGE, w = l + Math.ceil(m.actualBoundingBoxRight) + EDGE;
      ink.set(c, { x, w, l }); x += w;
    }
    canvas.width = x; canvas.height = ch;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, x, ch);
    ctx.font = font; ctx.fillStyle = '#fff';
    for (const [c, q] of ink) {
      if (c !== DOT) { ctx.fillText(c, q.x + q.l, asc); continue; }
      ctx.beginPath(); ctx.arc(q.x + q.w / 2, asc - (this.capH * EM) / 2, dot / 2, 0, 7); ctx.fill();
    }
    this.tex = new THREE.CanvasTexture(canvas);
    this.tex.colorSpace = THREE.NoColorSpace; this.tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex.anisotropy = 8;
    this.u.map.value = this.tex;
    this.cellH = ch / EM;
    this.lift = ((asc - desc) / 2 - (this.capH * EM) / 2) / EM;
    this.glyphs = chars.map((c, i) => {
      const next = chars[i + 1] ?? chars[0], q = ink.get(c);
      const adv = c === DOT ? dot + 2 * gap : next === DOT ? ctx.measureText(c).width : ctx.measureText(c + next).width - ctx.measureText(next).width;
      return { adv: adv / EM, q: q && { cell: [q.x / x, 1, q.w / x, -1], l: q.l / EM, w: q.w / EM } };
    });
  }

  // bw: plate units across; ppu: pixels to one of them
  fit(bw, ppu) {
    ppu = Math.round(Math.min(360, Math.max(160, ppu * 0.74)) / 20) * 20;
    bw = Math.round(bw * 50) / 50;
    if (this.w && bw === this.bw && ppu === this.ppu) return;
    this.ppu = ppu;
    this.size(bw, WAVE_H); // lets go of the old pictures, so the letters are drawn after it
    this.atlas();
    this.u.uHalf.value.set(this.ext.x / 2, this.ext.y / 2);
    this.drawn = false;
  }

  step(dt, still) {
    if (!this.w || (still && this.drawn)) return;
    this.drawn = true;
    const em = CAP / this.capH, pl = this.pull, pw = this.u.uPull.value.z;
    this.push *= Math.exp(-dt * 1.5);
    this.vel += (this.push - this.vel) * (1 - Math.exp(-dt * 10));
    this.off += (SPEED + this.vel) * dt;
    this.swell += (Math.min(1, Math.abs(this.vel) / 2.4) - this.swell) * (1 - Math.exp(-dt * 5));
    if (pl.held) { const to = Math.max(-0.1, Math.min(0.1, (pl.ty - pl.grab) * 0.5)); pl.v = (to - pl.y) * 14; pl.x += (pl.tx - pl.x) * (1 - Math.exp(-dt * 12)); }
    else pl.v += (-pl.y * 95 - pl.v * 3.4) * dt;
    pl.y += pl.v * dt;

    // pushed along, the wave rises, the crests are carried with it and the letters lean back
    const k = (2 * Math.PI) / LONG, amp = AMP * (1 + this.swell * 0.4);
    const ph = (this.ph += dt * (this.vel * k * 0.28 - 0.12));
    this.u.uLean.value = Math.max(-0.3, Math.min(0.3, this.vel * 0.085));
    this.u.uK.value = k; this.u.uAmp.value = amp; this.u.uPh.value = ph; this.u.uPull.value.set(pl.x, pl.y, pw); this.u.uLift.value = this.lift * em;

    const half = this.ext.x / 2 + 0.3, x0 = -half, dx = (2 * half) / N, arc = this.arc;
    for (let i = 0; i < N; i++) {
      const x = x0 + (i + 0.5) * dx, e = (x - pl.x) / pw;
      const m = amp * k * Math.cos(k * x + ph) - ((2 * (x - pl.x)) / (pw * pw)) * pl.y * Math.exp(-e * e);
      arc[i + 1] = arc[i] + dx * Math.sqrt(1 + m * m);
    }
    const P = this.aPlace.array, C = this.aCell.array, len = arc[N], phrase = this.glyphs.reduce((a, g) => a + g.adv * em + TRACK, 0);
    let n = 0, j = 0;
    for (let base = ((((-this.off) % phrase) + phrase) % phrase) - phrase; base < len && n < MAXN; base += phrase) {
      let at = base;
      for (const g of this.glyphs) {
        if (g.q && n < MAXN) {
          const gw = g.q.w * em, s = at - g.q.l * em + gw / 2;
          if (s > 0 && s < len) {
            while (j > 0 && arc[j] > s) j--;
            while (j < N - 1 && arc[j + 1] < s) j++;
            P[n * 3] = x0 + (j + (s - arc[j]) / Math.max(1e-6, arc[j + 1] - arc[j])) * dx; P[n * 3 + 1] = gw / 2; P[n * 3 + 2] = (this.cellH * em) / 2;
            C.set(g.q.cell, n * 4);
            n++;
          }
        }
        at += g.adv * em + TRACK;
      }
    }
    this.geo.instanceCount = n;
    this.aPlace.needsUpdate = this.aCell.needsUpdate = true;

    const r = this.baker.r;
    r.setRenderTarget(this.mask); r.setClearColor(0x000000, 0); r.clear(true, false, false);
    r.render(this.scene, this.cam);
    this.baker.bake(this);
  }
  // the faster it goes the less a push adds; against it, all of it counts
  kick(d) { this.push = Math.max(-FAST, Math.min(FAST, this.push + d * (d * this.push > 0 ? 1 - Math.abs(this.push) / FAST : 1))); }
  dispose() { super.dispose(); this.tex?.dispose(); this.tex = null; this.geo?.dispose(); this.mat?.dispose(); }
}
