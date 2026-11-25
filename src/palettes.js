import * as THREE from 'three';

// Gradient maps. Stops sampled from the reference posters, then pushed to a true #000 floor.
export const PALETTES = {
  ember: { name: 'Ember', stops: [[0, '#000000'], [0.16, '#0d0424'], [0.34, '#3f13b0'], [0.5, '#7a2cff'], [0.63, '#b63db0'], [0.73, '#ff2a1a'], [0.86, '#ff8d1f'], [1, '#ffe6a3']] },
  thermal: { name: 'Thermal', stops: [[0, '#000000'], [0.1, '#03042a'], [0.24, '#0a0f9a'], [0.38, '#1907ff'], [0.47, '#8a0fe0'], [0.56, '#ff1493'], [0.66, '#ff5a50'], [0.74, '#f4c86a'], [0.83, '#86f7a0'], [0.92, '#d4ffe4'], [1, '#ffffff']] },
  prism: { name: 'Prism', stops: [[0, '#000000'], [0.12, '#1022ff'], [0.25, '#14c6e0'], [0.37, '#39e07a'], [0.49, '#f6ee2a'], [0.6, '#ff9a1e'], [0.72, '#ff2a20'], [0.84, '#e22bff'], [1, '#ffe8fb']] },
  amber: { name: 'Amber', stops: [[0, '#000000'], [0.14, '#10032b'], [0.32, '#3f0c90'], [0.52, '#7d12f0'], [0.66, '#9a2bf2'], [0.76, '#c04a9c'], [0.85, '#f27a1c'], [1, '#ff9a1f']] },
  nacre: { name: 'Nacre', stops: [[0, '#000000'], [0.14, '#0c0a2c'], [0.3, '#2b3bd0'], [0.44, '#34b7e8'], [0.56, '#8ff0d0'], [0.68, '#e79bff'], [0.8, '#ff7fa8'], [0.9, '#ffc59a'], [1, '#ffffff']] },
  oil: { name: 'Oil', stops: [[0, '#000000'], [0.12, '#15051a'], [0.24, '#5a0f4a'], [0.36, '#1238c8'], [0.48, '#0aa7b0'], [0.6, '#5fd23a'], [0.72, '#f2d21a'], [0.84, '#ff3d7a'], [1, '#f3d8ff']] },
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function oklab(rgb) {
  const [r, g, b] = rgb.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((c) => gam(Math.min(1, Math.max(0, c))));
}

const N = 512;

export function sample(stops, hue = 0, out = new Float32Array(N * 4)) {
  const lab = stops.map(([p, h]) => [p, oklab(hex(h))]);
  const ca = Math.cos((hue * Math.PI) / 180), sa = Math.sin((hue * Math.PI) / 180);
  let k = 0;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    while (k < lab.length - 2 && t > lab[k + 1][0]) k++;
    const [p0, c0] = lab[k], [p1, c1] = lab[k + 1];
    const f = Math.min(1, Math.max(0, (t - p0) / (p1 - p0)));
    const L = c0[0] + (c1[0] - c0[0]) * f, a = c0[1] + (c1[1] - c0[1]) * f, b = c0[2] + (c1[2] - c0[2]) * f;
    const rgb = fromOklab([L, a * ca - b * sa, a * sa + b * ca]);
    out[i * 4] = rgb[0]; out[i * 4 + 1] = rgb[1]; out[i * 4 + 2] = rgb[2]; out[i * 4 + 3] = 1;
  }
  return out;
}

export function css(stops, hue = 0) {
  const s = sample(stops, hue);
  const parts = [];
  for (let i = 0; i <= 16; i++) {
    const j = Math.round((i / 16) * (N - 1)) * 4;
    parts.push(`rgb(${[0, 1, 2].map((c) => Math.round(s[j + c] * 255)).join(' ')}) ${((i / 16) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

// A live LUT texture that eases toward its target so palette changes bleed across instead of cutting.
export class Lut {
  constructor() {
    this.cur = new Float32Array(N * 4);
    this.target = new Float32Array(N * 4);
    this.bytes = new Uint8Array(N * 4);
    this.tex = new THREE.DataTexture(this.bytes, N, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.tex.minFilter = this.tex.magFilter = THREE.LinearFilter;
    this.tex.wrapS = THREE.ClampToEdgeWrapping;
    this.key = '';
    this.settled = false;
  }
  set(id, hue, snap) {
    const key = id + hue;
    if (key !== this.key) {
      this.key = key;
      sample(PALETTES[id].stops, hue, this.target);
      this.settled = false;
    }
    if (snap) { this.cur.set(this.target); this.upload(); }
  }
  update(dt) {
    if (this.settled) return;
    const k = 1 - Math.exp(-dt * 7);
    let max = 0;
    for (let i = 0; i < this.cur.length; i++) {
      const d = this.target[i] - this.cur[i];
      this.cur[i] += d * k;
      if (Math.abs(d) > max) max = Math.abs(d);
    }
    if (max < 0.002) { this.cur.set(this.target); this.settled = true; }
    this.upload();
  }
  upload() {
    for (let i = 0; i < this.bytes.length; i++) this.bytes[i] = Math.round(this.cur[i] * 255);
    this.tex.needsUpdate = true;
  }
}
