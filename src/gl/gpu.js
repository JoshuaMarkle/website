import * as THREE from 'three';

// The shape of the window, shared by every shader that works in p space.
export const ASPECT = { value: 16 / 9 };

// One oversized triangle shared by every full-screen pass.
const tri = new THREE.BufferGeometry();
tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
const cam = new THREE.Camera();
const scene = new THREE.Scene();
const mesh = new THREE.Mesh(tri);
mesh.frustumCulled = false;
scene.add(mesh);

const VERT = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`;

const HEAD = /* glsl */ `precision highp float; precision highp int; precision highp sampler2D;\n`;

export class Pass {
  constructor(frag, uniforms = {}, opts = {}) {
    uniforms.uAspect = ASPECT;
    this.u = uniforms;
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: HEAD + VERT,
      fragmentShader: HEAD + 'in vec2 vUv;\nout vec4 o;\n' + frag,
      uniforms,
      depthTest: false,
      depthWrite: false,
      ...opts,
    });
  }
  render(renderer, target) {
    mesh.material = this.mat;
    renderer.setRenderTarget(target);
    renderer.render(scene, cam);
  }
}

export function rt(w, h, o = {}) {
  return new THREE.WebGLRenderTarget(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
    ...o,
  });
}

// draw to part of a target: x, y, w, h in 0..1, y up
export function scissor(t, x, y, w, h) {
  const x0 = Math.max(0, Math.floor(x * t.width)), y0 = Math.max(0, Math.floor(y * t.height));
  const x1 = Math.min(t.width, Math.ceil((x + w) * t.width)), y1 = Math.min(t.height, Math.ceil((y + h) * t.height));
  if (x1 <= x0 || y1 <= y0) return false;
  t.scissorTest = true; t.scissor.set(x0, y0, x1 - x0, y1 - y0);
  return true;
}
export function unscissor(t) { t.scissorTest = false; t.scissor.set(0, 0, t.width, t.height); }

export class PingPong {
  constructor(w, h, o) {
    this.a = rt(w, h, o);
    this.b = rt(w, h, o);
  }
  get read() { return this.a; }
  get write() { return this.b; }
  swap() { const t = this.a; this.a = this.b; this.b = t; }
  setSize(w, h) { this.a.setSize(w, h); this.b.setSize(w, h); }
}

export const U = (value) => ({ value });
