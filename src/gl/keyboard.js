import * as THREE from 'three';
import { U, rt, ASPECT } from './gpu.js';
import { CorneGlass, LABELS, keyOfChar, keyOfCode } from './corne-glass.js';
import { UNIT } from './logo.js';

// The glass Corne on its own: lit by the same room and the same light as the logos, drawn into one part of the window.
export { LABELS, keyOfChar, keyOfCode };
const LOOK = { film: 0.6, filmNm: 420, dispersion: 0.3, ior: 1.5, bounces: 3, light: 1.4, rim: 1.2 };
// kept plain, so that its board and its light are what is seen; true puts a part back
const PARTS = { stems: false, sockets: false, holes: false };
// in a tall box the halves go one over the other
const STACK = [
  { x: -22, y: 55, z: -4, spin: -8, tilt: 52, bank: -6 },
  { x: 22, y: -55, z: 4, spin: 8, tilt: 52, bank: 5 },
];

export class Keyboard {
  constructor(renderer, shared, envTarget, studio) {
    this.r = renderer;
    this.cam = new THREE.PerspectiveCamera(26, 16 / 9, 0.1, 60);   // the whole window
    this.lens = new THREE.PerspectiveCamera(26, 16 / 9, 0.1, 60);  // just the part it is in
    for (const c of [this.cam, this.lens]) { c.position.set(0, 0, 7.4); c.updateMatrixWorld(); }
    this.scene = new THREE.Scene();
    this.g = {
      uAspect: ASPECT, uEnv: U(envTarget.texture), uField: U(null), uViewProj: U(new THREE.Matrix4()), uFieldAmt: U(1.15), uLight: U(LOOK.light), uExposure: U(1.15),
      uIor: U(LOOK.ior), uDisp: U(0.2), uFilm: U(0.5), uFilmNm: U(380), uTint: U(0.1), uBounces: U(LOOK.bounces), uTime: shared.uTime, uLut: studio, uRim: U(LOOK.rim),
    };
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.corne = new CorneGlass(renderer, this.g, { font: '"Inter Variable", sans-serif', parts: PARTS });
    this.pivot.add(this.corne.group);
    this.flat = this.corne.rest; this.tall = false;
    this.spin = new THREE.Quaternion(); this.vel = new THREE.Vector2(); this.dragging = false;
    this.q = new THREE.Quaternion(); this.e = new THREE.Euler();
    this.flash = 0; this.over = null; this.target = null;
    this.ray = new THREE.Raycaster();
  }
  // its shaders, and the board's drawing, sent ahead
  warm() {
    const r = this.r, keep = r.getRenderTarget(), t = rt(8, 8, { depthBuffer: true, samples: 4 });
    r.setRenderTarget(t);
    const jobs = [this.scene, this.corne.sceneFar].map((s) => r.compileAsync(s, this.lens));
    r.setRenderTarget(keep);
    r.initTexture(this.corne.halves[0].solids.material.uniforms.uArt.value);
    return Promise.all(jobs).catch(() => {}).then(() => t.dispose());
  }
  drag(dx, dy) { this.vel.x += dx; this.vel.y += dy; }
  // box in css pixels, and the resolution to draw it at
  setSize(w, h, k) {
    const W = Math.max(8, Math.round((w * k) / 4) * 4), H = Math.max(8, Math.round((h * k) / 4) * 4);
    if (this.target && this.target.width === W && this.target.height === H) return;
    this.target?.dispose();
    this.target = rt(W, H, { depthBuffer: true, samples: 4 });
    this.corne.setSize(W, H);
  }
  // the key at this point of the window (-1..1): its number, -1 for the case, null for nothing
  pick(nx, ny) {
    this.ray.setFromCamera({ x: nx, y: ny }, this.cam);
    const hit = this.ray.intersectObjects(this.corne.pick, false)[0];
    return hit ? this.corne.hit(hit) : null;
  }
  // x y: centre, in screen heights from the middle. w h: room it may fill, in screen heights
  update(dt, { x, y, w, h, near }, sch, hand, time, calm) {
    const g = this.g, c = this.corne, t = calm ? 0 : time;
    g.uDisp.value = LOOK.dispersion * sch.split; g.uFilm.value = Math.min(1, LOOK.film * sch.irid); g.uFilmNm.value = LOOK.filmNm * sch.film;
    this.spin.premultiply(this.q.setFromEuler(this.e.set(this.vel.y * dt, this.vel.x * dt, 0)));
    this.vel.multiplyScalar(Math.exp(-dt * 2.2));
    if (!this.dragging) this.spin.slerp(this.q.identity(), 1 - Math.exp(-dt * 0.9));
    this.flash *= Math.exp(-dt * 4);
    this.e.set(0.13 + Math.sin(t * 0.31) * 0.03 - hand.y * 0.16 + near * 0.28, Math.sin(t * 0.23) * 0.06 + hand.x * 0.2, 0);
    this.pivot.quaternion.setFromEuler(this.e).premultiply(this.spin);
    const tall = h > w * 0.8;
    if (tall !== this.tall) { this.tall = tall; c.rest = tall ? STACK : this.flat; c.fit(3.1); }
    this.pivot.scale.setScalar(Math.min((w * UNIT) / 3.16, (h * UNIT) / (c.size.y + 0.2)));
    this.pivot.position.set(x * UNIT, y * UNIT, 0);
    c.update(dt, { time, pointer: this.over, calm });
  }
  // rect: its part of the window, in css pixels; W H: the window's
  render(fieldTex, rect, W, H) {
    const r = this.r, g = this.g;
    g.uField.value = fieldTex;
    this.cam.aspect = W / H; this.cam.updateProjectionMatrix();
    this.lens.aspect = W / H; this.lens.setViewOffset(W, H, rect.x, rect.y, rect.w, rect.h);
    this.scene.updateMatrixWorld(true);
    g.uViewProj.value.multiplyMatrices(this.cam.projectionMatrix, this.cam.matrixWorldInverse);
    this.corne.syncMatrices(); this.corne.prerender(r, this.lens);
    r.setRenderTarget(this.target);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, false);
    r.render(this.scene, this.lens);
  }
}
