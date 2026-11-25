import * as THREE from 'three';
import { COMMON } from '../glsl/common.js';
import { Pass, U, rt, ASPECT } from './gpu.js';

// Every project is a flat mark, pushed up into glass with its edges rounded over. One shader does all
// of them: a mark is a picture of how far each point is from its outline, and two of those can be mixed,
// so one piece of glass can melt from any mark into any other.
const HEAD = 'precision highp float; precision highp int; precision highp sampler2D;\n';
const BOX = 2.4;         // the mark's 512 square, in world units
const EXT = 3.3;         // what its picture covers
const N = 512;
const SOFT = 0.02;       // how far corners are softened before they are rounded
export const UNIT = 2 * Math.tan((26 * Math.PI) / 360) * 7.4; // world height of the view
export const LOOK = { film: 0.6, filmNm: 420, dispersion: 0.32, ior: 1.5, bounces: 4, light: 1.3, rim: 0.7, tint: 0.1, half: 0.2, round: 0.17 };

/* -------------------------------------------------------------------------------------- the glass */
const ENV = /* glsl */ `
uniform sampler2D uEnv,uField;
uniform mat4 uViewProj;
uniform float uFieldAmt,uLight,uExposure;
vec2 envUv(vec3 d){ d=normalize(d); return vec2(atan(d.z,d.x)/6.2831853+.5, asin(clamp(d.y,-1.,1.))/3.14159265+.5); }
vec3 env(vec3 d){ return textureLod(uEnv,envUv(d),0.).rgb*uLight; }
// The light field hangs as a lit wall behind the glass (and, dimmer, in front of it).
vec3 world(vec3 ro,vec3 rd){
  vec3 e=env(rd);
  if(uFieldAmt>.001 && abs(rd.z)>.04){
    float pz=rd.z<0.?-1.9:3.4;
    float t=(pz-ro.z)/rd.z;
    if(t>0.){
      vec3 h=ro+rd*t;
      vec4 c=uViewProj*vec4(h.x,h.y,-1.9,1.);
      vec2 uv=c.xy/c.w*.5+.5;
      vec2 q=smoothstep(vec2(-.02),vec2(.06),uv)*smoothstep(vec2(-.02),vec2(.06),1.-uv);
      vec3 f=texture(uField,uv).rgb;
      e+=f*f*uFieldAmt*(rd.z<0.?.85:.4)*q.x*q.y;
    }
  }
  return e;
}
vec3 spec(float t){ return vec3(smoothstep(.58,.18,t)+.22*smoothstep(.82,1.,t), smoothstep(.12,.42,t)*smoothstep(.88,.52,t), smoothstep(.46,.82,t)); }
vec3 film(float ct,float nm){
  float s2=1.-ct*ct; float ci=sqrt(max(0.,1.-s2/(1.38*1.38)));
  return .5-.5*cos(6.2831853*2.*1.38*nm*ci/vec3(640.,535.,445.));
}
float snz(vec2 p,float t){ return .5*sin(p.x*1.7+t+1.3*sin(p.y*1.3-t*.6))+.5*sin(p.y*2.1-t*.8+1.1*sin(p.x*1.1+t*.4)); }
vec3 tone(vec3 c){ c=1.-exp(-c*uExposure); return pow(c,vec3(1./2.2)); }
`;

const MARK = /* glsl */ `
uniform sampler2D uA,uB; uniform float uM,uHalf,uRound,uDrop;
// distance to the outline, and which way it lies
vec3 fld(vec2 p){
  vec2 uv=p/${EXT.toFixed(2)}+.5;
  vec3 a=texture(uA,uv).rgb;
  if(uM<=.0005) return a;
  vec3 c=mix(a,texture(uB,uv).rgb,uM);
  // half way it has run together into a drop
  c.x-=.16*uDrop;
  return c;
}
#define HZ (uHalf+.10*uDrop)
#define RZ (uRound+.09*uDrop)
float map(vec3 p){ float d=fld(p.xy).x; vec2 w=vec2(d+RZ,abs(p.z)-HZ+RZ); return min(max(w.x,w.y),0.)+length(max(w,0.))-RZ; }
vec3 nrm(vec3 p){
  vec3 f=fld(p.xy); vec2 w=vec2(f.x+RZ,abs(p.z)-HZ+RZ), k=max(w,0.);
  if(k.x+k.y<1e-4) k=w.x>w.y?vec2(1.,0.):vec2(0.,1.);
  return normalize(vec3(f.yz*k.x,(p.z<0.?-1.:1.)*k.y)+1e-5);
}
`;

const VERT = /* glsl */ `
in vec3 position; uniform mat4 uMod,viewMatrix,projectionMatrix; uniform vec3 uBnd; out vec3 vL;
void main(){ vL=position*uBnd*2.; gl_Position=projectionMatrix*viewMatrix*uMod*vec4(vL,1.); }`;

export class Logos {
  constructor(renderer, shared, envTarget, studio, baker) {
    this.r = renderer; this.baker = baker;
    this.cam = new THREE.PerspectiveCamera(26, 16 / 9, 0.1, 60);   // the whole window
    this.lens = new THREE.PerspectiveCamera(26, 16 / 9, 0.1, 60);  // just the part the glass is in
    for (const c of [this.cam, this.lens]) { c.position.set(0, 0, 7.4); c.updateMatrixWorld(); }
    this.scene = new THREE.Scene();
    this.g = {
      uAspect: ASPECT, uEnv: U(envTarget.texture), uField: U(null), uViewProj: U(new THREE.Matrix4()), uFieldAmt: U(1.15), uLight: U(LOOK.light), uExposure: U(1.15),
      uIor: U(LOOK.ior), uDisp: U(0.2), uFilm: U(0.5), uFilmNm: U(380), uTint: U(LOOK.tint), uBounces: U(LOOK.bounces), uTime: shared.uTime, uLut: studio, uRim: U(LOOK.rim),
      uA: U(null), uB: U(null), uM: U(0), uDrop: U(0), uHalf: U(LOOK.half), uRound: U(LOOK.round), uInv: U(new THREE.Matrix4()), uMod: U(new THREE.Matrix4()), uPx: U(0.001), uBnd: U(new THREE.Vector3(1.4, 1.4, 0.4)),
    };
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.material());
    this.mesh.frustumCulled = false;
    this.pivot = new THREE.Group();
    this.pivot.add(this.mesh);
    this.scene.add(this.pivot);
    this.marks = new Map();
    this.spin = new THREE.Quaternion(); this.vel = new THREE.Vector2(); this.flash = 0;
    this.active = null; this.targets = {}; this.inv = new THREE.Matrix4(); this.dragging = false;
    this.ctx = document.createElement('canvas').getContext('2d');
    this.pGrad = new Pass(/* glsl */ `uniform sampler2D t; uniform float e;
      void main(){ vec2 px=1./vec2(textureSize(t,0)); float d=texture(t,vUv).r;
        float a=texture(t,vUv+vec2(2.,0.)*px).r-texture(t,vUv-vec2(2.,0.)*px).r, b=texture(t,vUv+vec2(0.,2.)*px).r-texture(t,vUv-vec2(0.,2.)*px).r;
        o=vec4(d,a/(4.*e),b/(4.*e),1.); }`, { t: U(null), e: U(EXT / N) });
  }

  material() {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, uniforms: this.g, depthTest: false, depthWrite: false,
      vertexShader: HEAD + VERT,
      fragmentShader: HEAD + COMMON + ENV + MARK + /* glsl */ `
        in vec3 vL; out vec4 o;
        uniform mat4 uMod,uInv; uniform vec3 cameraPosition,uBnd;
        uniform float uIor,uDisp,uFilm,uFilmNm,uTint,uTime,uRim,uPx; uniform int uBounces; uniform sampler2D uLut;
        float gJit;
        vec3 toW(vec3 d){ return normalize(mat3(uMod)*d); }
        float fres(float c,float n){ float r0=(1.-n)/(1.+n); r0*=r0; return r0+(1.-r0)*pow(1.-clamp(c,0.,1.),5.); }
        // light leaving the solid, fanned out across K wavelengths
        vec3 leave(vec3 dir,vec3 n,vec3 lp,int K){
          vec3 wp=(uMod*vec4(lp,1.)).xyz; vec3 c=vec3(0.),ws=vec3(1e-4);
          for(int i=0;i<K;i++){
            float t=clamp((float(i)+.5+gJit*.9)/float(K),0.,1.);
            vec3 e=refract(dir,-n,uIor+uDisp*(t-.5)); if(dot(e,e)<.5) e=normalize(dir-n*dot(dir,n)*1.02);
            vec3 w=spec(t); c+=w*world(wp,toW(e)); ws+=w;
          }
          return c/ws;
        }
        void main(){
          gJit=hash12(gl_FragCoord.xy)-.5;
          vec3 camL=(uInv*vec4(cameraPosition,1.)).xyz, V=normalize(vL-camL);
          // find the surface; a ray that only grazes it counts for part of its pixel
          float t=length(vL-camL), best=9., bt=t; bool hit=false;
          for(int i=0;i<64;i++){
            vec3 p=camL+V*t;
            if(i>0&&any(greaterThan(abs(p),uBnd+.02))) break;
            float d=map(p), q=d/(uPx*t);
            if(q<best){ best=q; bt=t; }
            if(q<.15){ hit=true; break; }
            t+=max(d*.96,.0015);
          }
          float cov=hit?1.:1.-smoothstep(0.,1.15,best);
          if(cov<.004) discard;
          vec3 P=camL+V*bt, N=nrm(P), W=(uMod*vec4(P,1.)).xyz;
          if(dot(V,N)>0.) N=normalize(N-V*(dot(V,N)+.02));
          float ct=clamp(-dot(V,N),0.,1.), F=fres(ct,uIor);
          // film thickness drains downward and swirls, like a soap film
          float nm=uFilmNm*(1.+.42*snz(P.xy*1.5+P.z*.7,uTime*.35)+.2*snz(P.yz*3.1+4.,uTime*.25))-P.y*70.;
          vec3 fc=film(ct,max(nm,40.));
          vec3 R=toW(reflect(V,N)), side=normalize(cross(R,vec3(.2,1.,.1)));
          float rd=uDisp*.22;
          vec3 refl=vec3(world(W,normalize(R+side*rd)).r,world(W,R).g,world(W,normalize(R-side*rd)).b);
          vec3 col=refl*(F*1.15+.05)*mix(vec3(1.),fc*1.9,uFilm);
          col+=fc*uFilm*(.016+.2*pow(1.-ct,2.6))*(.35+.65*dot(refl,vec3(.333)))*1.2;

          vec3 dir=refract(V,N,1./uIor), pos=P;
          vec3 thr=vec3(1.-F)*mix(vec3(1.),mix(vec3(1.),fc*1.5,.55),uFilm*.7), acc=vec3(0.), tintc=lut(uLut,.55);
          for(int i=0;i<6;i++){
            if(i>=uBounces) break;
            float s=.03; for(int k=0;k<26;k++){ float d=-map(pos+dir*s); if(d<.002) break; s+=max(d,.006); }
            pos+=dir*s;
            vec3 n=nrm(pos);
            if(dot(dir,n)<0.) n=normalize(n-dir*(dot(dir,n)-.02));
            thr*=exp(-s*uTint*(1.-tintc));
            vec3 ex=refract(dir,-n,uIor);
            vec3 f2=mix(vec3(1.),film(dot(dir,n),uFilmNm*(1.1+.4*snz(pos.xy*1.6-3.,uTime*.3)))*1.7,uFilm*.6);
            if(dot(ex,ex)>.5){
              float kr=fres(dot(ex,n),uIor);
              acc+=thr*(1.-kr)*leave(dir,n,pos,i==0?7:i==1?4:3)*f2;
              thr*=max(kr,.06)*f2;
            } else if(i==uBounces-1){ acc+=thr*leave(dir,n,pos,3)*.5; }
            if(max(thr.r,max(thr.g,thr.b))<.04) break;
            dir=reflect(dir,-n);
          }
          col+=acc;
          col+=uRim*pow(1.-ct,5.)*(.15+fc*.35)*uLight;
          o=vec4(tone(col)*cov,cov);
        }`,
    });
  }

  /* ------------------------------------------------------------ marks */
  learn(id, d) {
    if (this.marks.has(id)) return;
    this.marks.set(id, { id, path: new Path2D(d), tex: null });
  }
  // made the first time it is wanted
  mark(id) {
    const m = this.marks.get(id);
    if (!m || m.tex) return m;
    const c = document.createElement('canvas'), S = N * 2, k = (BOX / 512) * (S / EXT);
    c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
    x.setTransform(k, 0, 0, k, S / 2 - 256 * k, S / 2 - 256 * k);
    x.fillStyle = '#fff'; x.fill(m.path, 'evenodd');
    const t = new THREE.CanvasTexture(c);
    t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.NoColorSpace;
    const { baker: b, r } = this, cut = [1, 2, 2, 4], s = b.scratch(N, N, cut), mask = rt(N, N, { type: THREE.UnsignedByteType }), raw = rt(N, N);
    b.pCopy.u.t.value = t; b.pCopy.render(r, mask); t.dispose();
    b.pSeed.u.t.value = mask.texture; b.pSeed.render(r, s.jA);
    let p = s.jA, q = s.jB;
    for (let st = 256; st >= 1; st >>= 1) { b.pJump.u.t.value = p.texture; b.pJump.u.stp.value = st; b.pJump.render(r, q); [p, q] = [q, p]; }
    b.pSdf.u.t.value = p.texture; b.pSdf.u.mask.value = mask.texture; b.pSdf.u.ppu.value = N / EXT; b.pSdf.render(r, raw);
    const u = b.pBlur.u; u.sigma.value = SOFT;
    u.t.value = raw.texture; u.dir.value.set(1 / EXT, 0); b.pBlur.render(r, s.tmp[0]);
    u.t.value = s.tmp[0].texture; u.dir.value.set(0, 1 / EXT); b.pBlur.render(r, raw);
    m.tex = rt(N, N);
    this.pGrad.u.t.value = raw.texture; this.pGrad.render(r, m.tex);
    mask.dispose(); raw.dispose();
    return m;
  }
  warm() { // one at a time, between frames
    for (const m of this.marks.values()) if (!m.tex) { this.mark(m.id); return true; }
    return false;
  }

  /* ------------------------------------------------------------ hands */
  drag(dx, dy) { this.vel.x += dx; this.vel.y += dy; }
  // is this point of the window (-1..1) on the glass? a little slack, so thin limbs are easy to find
  pick(nx, ny, slack = 46) {
    const m = this.active && this.marks.get(this.active);
    if (!m) return false;
    const o = this.p0 || (this.p0 = new THREE.Vector3()), d = this.p1 || (this.p1 = new THREE.Vector3()), inv = this.inv;
    d.set(nx, ny, 0.5).unproject(this.cam).applyMatrix4(inv); o.copy(this.cam.position).applyMatrix4(inv);
    d.sub(o);
    if (Math.abs(d.z) < 1e-4) return false;
    const t = -o.z / d.z, x = ((o.x + d.x * t) / BOX) * 512 + 256, y = 256 - ((o.y + d.y * t) / BOX) * 512;
    const c = this.ctx; c.lineWidth = slack; c.lineJoin = 'round';
    return c.isPointInPath(m.path, x, y, 'evenodd') || c.isPointInStroke(m.path, x, y);
  }

  // the main one is drawn at its own size; the small ones share a sheet
  size(name, px) {
    const s = Math.max(16, Math.min(2048, Math.round(px / 8) * 8)), t = this.targets[name];
    if (t && t.width === s) return t;
    t?.dispose();
    return (this.targets[name] = rt(s, s));
  }
  tune(sch) { const g = this.g; g.uDisp.value = LOOK.dispersion * sch.split; g.uFilm.value = Math.min(1, LOOK.film * sch.irid); g.uFilmNm.value = LOOK.filmNm * sch.film; }
  // a spin runs down and the glass comes back to face you
  whirl(dt) {
    const q = this.q || (this.q = new THREE.Quaternion()), e = this.e || (this.e = new THREE.Euler());
    this.spin.premultiply(q.setFromEuler(e.set(this.vel.y * dt, this.vel.x * dt, 0)));
    this.vel.multiplyScalar(Math.exp(-dt * 2.2));
    if (!this.dragging) this.spin.slerp(q.identity(), 1 - Math.exp(-dt * 0.9));
    this.flash *= Math.exp(-dt * 4);
  }
  // held, it faces you and leans to the hand; wild, it tumbles gently about
  pose(time, { near, x, y, wild, clock, ph }, calm) {
    const t = calm ? 0 : time, w = calm ? 0 : wild, c = clock;
    return [
      0.1 + Math.sin(t * 0.37) * 0.07 * (1 - w) - y * 0.26 + near * 0.35 + w * (0.3 * Math.sin(c * 0.62 + ph * 1.3) - 0.04),
      (-0.2 + Math.sin(t * 0.29) * 0.2) * (1 - w) + x * 0.42 + w * (0.42 * Math.sin(c * 0.5 + ph * 2.1)),
      Math.sin(t * 0.23) * 0.03 * (1 - w) + w * (0.16 * Math.sin(c * 0.4 + ph * 3.7)),
    ];
  }
  // a into b by m. x y: centre, in screen heights from the middle; size: the mark's square, in screen heights
  place({ a, b, m, x, y, size }, pose, spin) {
    const g = this.g;
    g.uA.value = this.mark(a).tex.texture; g.uB.value = this.mark(b).tex.texture;
    g.uM.value = m; g.uDrop.value = 4 * m * (1 - m);
    this.pivot.quaternion.setFromEuler((this.e2 ||= new THREE.Euler()).set(...pose));
    if (spin) this.pivot.quaternion.premultiply(spin);
    this.pivot.scale.setScalar((size * UNIT) / BOX);
    this.pivot.position.set(x * UNIT, y * UNIT, 0);
    const hz = LOOK.half + 0.1 * g.uDrop.value + 0.005, xy = 1.18 + 0.16 * g.uDrop.value;
    g.uBnd.value.set(xy, xy, hz);
  }
  keep() { this.inv.copy(this.g.uInv.value); } // for the hand to be tested against

  // rect: the part of the window to draw, in css pixels; W H: the window's; px: pixels down the window
  render(target, fieldTex, rect, W, H, px) {
    const r = this.r, g = this.g;
    g.uField.value = fieldTex;
    g.uPx.value = (2 * Math.tan((13 * Math.PI) / 180)) / px;
    this.cam.aspect = W / H; this.cam.updateProjectionMatrix();
    this.lens.aspect = W / H; this.lens.setViewOffset(W, H, rect.x, rect.y, rect.w, rect.h);
    this.scene.updateMatrixWorld(true);
    g.uViewProj.value.multiplyMatrices(this.cam.projectionMatrix, this.cam.matrixWorldInverse);
    g.uMod.value.copy(this.pivot.matrixWorld); g.uInv.value.copy(this.pivot.matrixWorld).invert();
    r.setRenderTarget(target);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    r.render(this.scene, this.lens);
  }
}
