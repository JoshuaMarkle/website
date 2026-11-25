import * as THREE from 'three';
import { Pass, PingPong, rt, U, ASPECT } from './gpu.js';
import { COMMON } from '../glsl/common.js';

// Stable-fluids velocity grid shared by every plate, plus a relaxing displacement map
// (what makes the art smear and spring back under the pointer).
const VH = 108, DH = 216;

const ADV = /* glsl */ `uniform sampler2D vel; uniform float dt; uniform vec2 px,uScroll;
vec2 toUv(vec2 v){ return v/vec2(ASPECT,1.); }`;

export class Fluid {
  constructor(renderer) {
    this.r = renderer;
    const VW = (this.vw = Math.round(VH * 16 / 9)), DW = VW * 2;
    const o = { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
    this.vel = new PingPong(VW, VH, o);
    this.prs = new PingPong(VW, VH, o);
    this.div = rt(VW, VH, o);
    this.crl = rt(VW, VH, o);
    this.dsp = new PingPong(DW, DH, o);
    const px = (this.px = new THREE.Vector2(1 / VW, 1 / VH));
    this.scroll = U(new THREE.Vector2()); // how far the page moved this frame, so smears stay on the type

    this.pAdv = new Pass(COMMON + ADV + /* glsl */ `uniform float fade;
      void main(){ vec2 v=texture(vel,vUv).xy; vec2 q=vUv-dt*toUv(v)-uScroll;
        o=vec4(texture(vel,q).xy*fade,0.,1.); }`,
      { vel: U(null), dt: U(0), px: U(px), fade: U(1), uScroll: this.scroll });

    // Pointer stroke (distance to segment), shock ring and object swirl, all in p space.
    this.pForce = new Pass(COMMON + /* glsl */ `uniform sampler2D vel; uniform vec2 A,B,F; uniform float rad;
      uniform vec4 shock; uniform vec4 swirl; uniform float time,ambient;
      void main(){
        vec2 p=vUv*vec2(ASPECT,1.);
        vec2 v=texture(vel,vUv).xy;
        vec2 ab=B-A; float h=clamp(dot(p-A,ab)/max(dot(ab,ab),1e-6),0.,1.);
        vec2 d=p-A-ab*h;
        v+=F*exp(-dot(d,d)/(rad*rad));
        // shock: xy centre, z radius, w strength
        vec2 s=p-shock.xy; float sl=length(s)+1e-4;
        v+=s/sl*shock.w*exp(-pow((sl-shock.z)/.06,2.));
        // swirl: xy centre, z radius, w angular
        vec2 w=p-swirl.xy; v+=vec2(-w.y,w.x)/(length(w)+.05)*swirl.w*exp(-dot(w,w)/(swirl.z*swirl.z));
        // slow room draught so nothing is ever completely still
        float e=.01; float n0=fnoise(p*1.1,time*.4), nx=fnoise(p*1.1+vec2(e,0),time*.4), ny=fnoise(p*1.1+vec2(0,e),time*.4);
        v+=vec2(ny-n0,-(nx-n0))/e*ambient;
        o=vec4(clamp(v,-6.,6.),0.,1.);
      }`, { vel: U(null), A: U(new THREE.Vector2()), B: U(new THREE.Vector2()), F: U(new THREE.Vector2()), rad: U(0.08), shock: U(new THREE.Vector4()), swirl: U(new THREE.Vector4(0, 0, 1, 0)), time: U(0), ambient: U(0) });

    this.pCurl = new Pass(/* glsl */ `uniform sampler2D vel; uniform vec2 px; void main(){
      float l=texture(vel,vUv-vec2(px.x,0)).y,r=texture(vel,vUv+vec2(px.x,0)).y,b=texture(vel,vUv-vec2(0,px.y)).x,t=texture(vel,vUv+vec2(0,px.y)).x;
      o=vec4(.5*((r-l)-(t-b)),0.,0.,1.); }`, { vel: U(null), px: U(px) });

    this.pVort = new Pass(/* glsl */ `uniform sampler2D vel,crl; uniform vec2 px; uniform float amt,dt; void main(){
      float l=texture(crl,vUv-vec2(px.x,0)).x,r=texture(crl,vUv+vec2(px.x,0)).x,b=texture(crl,vUv-vec2(0,px.y)).x,t=texture(crl,vUv+vec2(0,px.y)).x,c=texture(crl,vUv).x;
      vec2 f=.5*vec2(abs(t)-abs(b),abs(l)-abs(r)); f/=length(f)+1e-4; f*=amt*c;
      o=vec4(texture(vel,vUv).xy+f*dt,0.,1.); }`, { vel: U(null), crl: U(null), px: U(px), amt: U(0), dt: U(0) });

    this.pDiv = new Pass(/* glsl */ `uniform sampler2D vel; uniform vec2 px; void main(){
      float l=texture(vel,vUv-vec2(px.x,0)).x,r=texture(vel,vUv+vec2(px.x,0)).x,b=texture(vel,vUv-vec2(0,px.y)).y,t=texture(vel,vUv+vec2(0,px.y)).y;
      o=vec4(.5*(r-l+t-b),0.,0.,1.); }`, { vel: U(null), px: U(px) });

    this.pPrs = new Pass(/* glsl */ `uniform sampler2D prs,div; uniform vec2 px; void main(){
      float l=texture(prs,vUv-vec2(px.x,0)).x,r=texture(prs,vUv+vec2(px.x,0)).x,b=texture(prs,vUv-vec2(0,px.y)).x,t=texture(prs,vUv+vec2(0,px.y)).x;
      o=vec4((l+r+b+t-texture(div,vUv).x)*.25,0.,0.,1.); }`, { prs: U(null), div: U(null), px: U(px) });

    this.pGrad = new Pass(/* glsl */ `uniform sampler2D vel,prs; uniform vec2 px; void main(){
      float l=texture(prs,vUv-vec2(px.x,0)).x,r=texture(prs,vUv+vec2(px.x,0)).x,b=texture(prs,vUv-vec2(0,px.y)).x,t=texture(prs,vUv+vec2(0,px.y)).x;
      o=vec4(texture(vel,vUv).xy-.5*vec2(r-l,t-b),0.,1.); }`, { vel: U(null), prs: U(null), px: U(px) });

    this.pDsp = new Pass(COMMON + ADV + /* glsl */ `uniform sampler2D dsp; uniform float relax;
      void main(){ vec2 v=texture(vel,vUv).xy; vec2 q=vUv-dt*toUv(v)-uScroll; vec2 d=texture(dsp,q).xy; vec2 e=1.5/vec2(textureSize(dsp,0));
        // a little diffusion each step: the smear stays syrupy instead of crinkling
        vec2 av=.25*(texture(dsp,q+vec2(e.x,0.)).xy+texture(dsp,q-vec2(e.x,0.)).xy+texture(dsp,q+vec2(0.,e.y)).xy+texture(dsp,q-vec2(0.,e.y)).xy);
        d=mix(d,av,.55); d-=v*dt; d*=relax;
        float l=length(d); d*=min(1.,.4/max(l,1e-4)); o=vec4(d,0.,1.); }`,
      { vel: U(null), dsp: U(null), dt: U(0), px: U(px), relax: U(1), uScroll: this.scroll });

    this.pClear = new Pass(`void main(){o=vec4(0.);}`);
    this.shock = { x: 0, y: 0, r: 0, w: 0 };
    this.reset();
  }

  fit() {
    const w = Math.max(40, Math.round((VH * ASPECT.value) / 8) * 8);
    if (w === this.vw) return;
    this.vw = w; this.px.set(1 / w, 1 / VH);
    for (const t of [this.vel, this.prs, this.div, this.crl]) t.setSize(w, VH);
    this.dsp.setSize(w * 2, DH);
    this.reset();
  }

  reset() {
    for (const t of [this.vel, this.prs, this.dsp]) { this.pClear.render(this.r, t.a); this.pClear.render(this.r, t.b); }
  }

  burst(x, y, strength = 1) { this.shock = { x, y, r: 0.03, w: strength }; }

  step(dt, s) {
    const r = this.r;
    const v = this.vel;
    const run = (p, t) => { p.render(r, t.write); t.swap(); };

    const f = this.pForce.u;
    f.vel.value = v.read.texture;
    f.A.value.set(s.ax, s.ay);
    f.B.value.set(s.bx, s.by);
    f.F.value.set(s.fx, s.fy);
    f.rad.value = s.radius;
    f.shock.value.set(this.shock.x, this.shock.y, this.shock.r, this.shock.w * dt * 22);
    f.swirl.value.set(s.sx, s.sy, s.sr, s.sw * dt);
    f.time.value = s.time;
    f.ambient.value = s.ambient * dt;
    run(this.pForce, v);
    this.shock.r += dt * 1.1;
    this.shock.w *= Math.exp(-dt * 3.2);

    if (s.curl > 0.001) {
      this.pCurl.u.vel.value = v.read.texture;
      this.pCurl.render(r, this.crl);
      const q = this.pVort.u;
      q.vel.value = v.read.texture; q.crl.value = this.crl.texture; q.amt.value = s.curl * 22; q.dt.value = dt;
      run(this.pVort, v);
    }

    this.pDiv.u.vel.value = v.read.texture;
    this.pDiv.render(r, this.div);
    this.pPrs.u.div.value = this.div.texture;
    for (let i = 0; i < 14; i++) { this.pPrs.u.prs.value = this.prs.read.texture; run(this.pPrs, this.prs); }
    this.pGrad.u.vel.value = v.read.texture;
    this.pGrad.u.prs.value = this.prs.read.texture;
    run(this.pGrad, v);

    const a = this.pAdv.u;
    a.vel.value = v.read.texture; a.dt.value = dt; a.fade.value = Math.exp(-dt * s.damp);
    run(this.pAdv, v);

    const d = this.pDsp.u;
    d.vel.value = v.read.texture; d.dsp.value = this.dsp.read.texture; d.dt.value = dt; d.relax.value = Math.exp(-dt * s.relax);
    run(this.pDsp, this.dsp);
  }
}
