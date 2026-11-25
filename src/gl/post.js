import * as THREE from 'three';
import { Pass, rt, U, ASPECT, scissor, unscissor } from './gpu.js';
import { COMMON } from '../glsl/common.js';

// what is drawn over the light says how much film it wears: the picture's alpha is the film stock
const MODEL_STOCK = 0.5;
const OVER = { transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, blendEquationAlpha: THREE.AddEquation };

export class Post {
  constructor(renderer, shared) {
    this.r = renderer;
    this.field = null; this.scene = null; this.chain = []; this.up = [];
    this.pBase = new Pass('uniform sampler2D t; void main(){ vec4 c=texture(t,vUv); o=vec4(c.rgb*c.a,1.); }', { t: U(null) });
    this.pObj = new Pass(/* glsl */ `uniform sampler2D t; uniform vec4 uRect; uniform float uA;
      void main(){ vec2 q=(vUv-uRect.xy)/uRect.zw; vec4 c=texture(t,q);
        vec2 e=smoothstep(vec2(0.),vec2(.02),q)*smoothstep(vec2(0.),vec2(.02),1.-q); float k=e.x*e.y*uA;
        o=vec4(c.rgb*k,clamp(c.a,0.,1.)*k); }`, { t: U(null), uRect: U(new THREE.Vector4()), uA: U(1) }, { ...OVER, blendSrcAlpha: THREE.ConstantAlphaFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor, blendAlpha: MODEL_STOCK });

    // a drop of glass with the whole gradient in it, end to end
    this.pBead = new Pass(COMMON + /* glsl */ `
      uniform sampler2D uLut; uniform vec2 uC,uLight; uniform float uR,uTime,uA,uSwirl,uGlow,uPx,uIrid,uFilm;
      void main(){
        vec2 P=vUv*vec2(ASPECT,1.), d=(P-uC)/uR; float r=length(d);
        float aa=uPx/uR, cov=smoothstep(1.+aa,1.-aa,r)*uA;
        float halo=exp(-max(r-1.,0.)*3.2)*uGlow*uA*smoothstep(2.6,1.6,r);
        vec3 c=vec3(0.);
        if(cov>.001){
          vec3 N=vec3(d,sqrt(max(0.,1.-min(r*r,.9999))));
          float ct=N.z, v=1.-ct;
          // it turns a little as it goes, and bends where the drop is thick; held dark enough for the sign on it
          float a=uSwirl, ca=cos(a), sa=sin(a); vec2 g=mat2(ca,-sa,sa,ca)*d*(1.-.12*ct);
          float t=.5+.56*g.x+.16*fnoise(g*.95+3.,uTime*.3)*(1.-.3*abs(g.x))+.10*g.y*g.y;
          // a few taps of the palette, so one colour melts into the next
          float q=mix(.36,.9,smoothstep(.02,.98,t));
          c=.24*lut(uLut,q-.13)+.26*lut(uLut,q-.045)+.26*lut(uLut,q+.045)+.24*lut(uLut,q+.13);
          c*=min(1.,.56/max(dot(c,vec3(.3,.59,.11)),.001));
          vec3 f=.5-.5*cos(12.566*1.33*uFilm*(.5+.5*ct)/vec3(640.,540.,450.));
          vec2 ld=normalize(uLight-uC+vec2(-.2,.4));
          float ang=dot(d/max(r,.001),ld);
          c+=f*pow(v,2.4)*(.12+.75*uIrid);
          float rim=smoothstep(.82,.985,r)*smoothstep(1.,.985,r);
          c+=rim*(.22+.8*pow(max(ang,0.),2.)+.4*pow(max(-ang,0.),3.));
          c+=.10*smoothstep(.2,1.,ang*r)*smoothstep(1.,.8,r);
        }
        vec3 g=lut(uLut,.52)*halo*.5;
        o=vec4(c*cov+g*(1.-cov),cov);
      }`, { uLut: shared.uLut, uC: U(new THREE.Vector2()), uLight: shared.uLight, uR: U(0.03), uTime: shared.uTime, uA: U(1), uSwirl: U(0), uGlow: U(0), uPx: U(0.001), uIrid: U(0.3), uFilm: U(420) }, OVER);

    this.pBright = new Pass(/* glsl */ `uniform sampler2D t; uniform vec2 px; uniform float thr;
      vec3 s(vec2 q){ vec4 k=texture(t,q); vec3 c=min(k.rgb,vec3(2.5))*clamp(k.a*2.,0.,1.); float l=max(c.r,max(c.g,c.b)); return c*smoothstep(thr-.18,thr+.3,l); }
      void main(){ o=vec4(.25*(s(vUv+px*vec2(-.5))+s(vUv+px*vec2(.5,-.5))+s(vUv+px*vec2(-.5,.5))+s(vUv+px*vec2(.5))),1.); }`, { t: U(null), px: U(new THREE.Vector2()), thr: U(0.5) });
    this.pDown = new Pass(/* glsl */ `uniform sampler2D t; uniform vec2 px; void main(){
      vec3 c=texture(t,vUv).rgb*4.; c+=texture(t,vUv+px*vec2(1,1)).rgb+texture(t,vUv+px*vec2(-1,1)).rgb+texture(t,vUv+px*vec2(1,-1)).rgb+texture(t,vUv+px*vec2(-1,-1)).rgb; o=vec4(c/8.,1.); }`, { t: U(null), px: U(new THREE.Vector2()) });
    this.pUp = new Pass(/* glsl */ `uniform sampler2D t,base; uniform vec2 px; uniform float k; void main(){
      vec3 c=texture(t,vUv+px*vec2(-1,0)).rgb+texture(t,vUv+px*vec2(1,0)).rgb+texture(t,vUv+px*vec2(0,-1)).rgb+texture(t,vUv+px*vec2(0,1)).rgb;
      c+=2.*(texture(t,vUv+px*vec2(.5,.5)).rgb+texture(t,vUv+px*vec2(-.5,.5)).rgb+texture(t,vUv+px*vec2(.5,-.5)).rgb+texture(t,vUv+px*vec2(-.5,-.5)).rgb);
      o=vec4(c/12.*k+texture(base,vUv).rgb,1.); }`, { t: U(null), base: U(null), px: U(new THREE.Vector2()), k: U(0.82) });
    this.pFinal = new Pass(COMMON + /* glsl */ `
      uniform sampler2D uScene,uBloom; uniform float uFrame,uBloomAmt,uGrain,uWeave,uCss;
      void main(){
        vec4 k=texture(uScene,vUv); vec3 c=k.rgb;
        if(uBloomAmt>.001){
          vec3 b=texture(uBloom,vUv).rgb*uBloomAmt;
          b*=1.-.62*smoothstep(.35,.95,max(c.r,max(c.g,c.b)));
          c=1.-(1.-clamp(c,0.,1.))*(1.-clamp(b,0.,1.));
        }
        c=max(c-.006,0.)/.994;
        float hi=max(c.r,max(c.g,c.b));
        if(hi>.0015){
          float l=dot(c,vec3(.3,.55,.15)), on=smoothstep(.0015,.03,hi), stock=on*mix(.06,1.,clamp(k.a,0.,1.));
          // woven print: rows three pixels deep, their threads cut at random
          vec2 px=gl_FragCoord.xy*uCss;
          float th=.5+.5*sin(px.y*2.0944); th*=.65+.35*hash12(floor(vec2(px.x/5.+floor(px.y/3.)*2.3,px.y/3.)));
          c*=1.-uWeave*.42*th*stock;
          c+=uWeave*.05*th*smoothstep(0.,.25,l)*(1.-l)*stock;
          // grain: strongest in the mid-tones, gone on true black
          vec2 gp=floor(px);
          float f=uFrame;
          float n0=hash13(vec3(gp,mod(f,97.)))+hash13(vec3(gp+17.3,mod(f,89.)))-1.;
          float n1=hash13(vec3(gp+51.1,mod(f,83.)))-.5, n2=hash13(vec3(gp-31.7,mod(f,79.)))-.5;
          float n3=hash13(vec3(floor(gp/2.),mod(f,71.)))-.5;
          float amp=stock*uGrain*(.012+.34*sqrt(clamp(l,0.,1.))*(1.-.55*l));
          c+=amp*(n0*.62+vec3(n1,n2,-n1)*.30+n3*.35);
          // and enough noise under that to keep long gradients from banding
          c+=n0*(1.2/255.)*on;
        }
        o=vec4(c,1.);
      }`, { uScene: U(null), uBloom: U(null), uFrame: U(0), uBloomAmt: U(0.3), uGrain: U(0.5), uWeave: U(0.2), uCss: U(1) });
  }

  // sw sh: the picture. fw fh: the light, which can be coarser
  setSize(sw, sh, fw, fh) {
    const put = (k, w, h) => { if (!this[k]) this[k] = rt(w, h); else if (this[k].width !== w || this[k].height !== h) this[k].setSize(w, h); };
    put('scene', sw, sh); put('field', fw, fh);
    let h = 270, w = Math.max(8, Math.round((h * sw) / sh));
    if (w > 640) { h = Math.round((h * 640) / w); w = 640; }
    for (let i = 0; i < 5; i++) {
      for (const L of [this.chain, this.up]) { if (!L[i]) L[i] = rt(w, h); else L[i].setSize(w, h); }
      w = Math.max(2, Math.round(w / 2)); h = Math.max(2, Math.round(h / 2));
    }
  }
  clearField() { const r = this.r; r.setRenderTarget(this.field); r.setClearColor(0x000000, 0); r.clear(true, false, false); }
  base(has) {
    const r = this.r;
    if (has) { this.pBase.u.t.value = this.field.texture; this.pBase.render(r, this.scene); return; }
    r.setRenderTarget(this.scene); r.setClearColor(0x000000, 1); r.clear(true, false, false);
  }
  object(tex, x, y, w, h, a) {
    if (!scissor(this.scene, x, y, w, h)) return;
    this.pObj.u.t.value = tex; this.pObj.u.uRect.value.set(x, y, w, h); this.pObj.u.uA.value = a;
    this.pObj.render(this.r, this.scene); unscissor(this.scene);
  }
  bead(b) {
    const R = b.r * 2.7;
    if (b.a < 0.004 || !scissor(this.scene, (b.x - R) / ASPECT.value, b.y - R, (2 * R) / ASPECT.value, 2 * R)) return;
    const u = this.pBead.u;
    u.uC.value.set(b.x, b.y); u.uR.value = b.r; u.uA.value = b.a; u.uSwirl.value = b.swirl; u.uGlow.value = b.glow; u.uPx.value = 1 / this.scene.height; u.uIrid.value = b.irid; u.uFilm.value = b.film;
    this.pBead.render(this.r, this.scene); unscissor(this.scene);
  }
  bloom(thr) {
    const r = this.r, n = this.chain.length;
    this.pBright.u.t.value = this.scene.texture; this.pBright.u.px.value.set(1 / this.chain[0].width, 1 / this.chain[0].height).multiplyScalar(0.5); this.pBright.u.thr.value = thr;
    this.pBright.render(r, this.chain[0]);
    for (let i = 1; i < n; i++) { const s = this.chain[i - 1]; this.pDown.u.t.value = s.texture; this.pDown.u.px.value.set(1 / s.width, 1 / s.height); this.pDown.render(r, this.chain[i]); }
    let cur = this.chain[n - 1];
    for (let i = n - 2; i >= 0; i--) { this.pUp.u.t.value = cur.texture; this.pUp.u.base.value = this.chain[i].texture; this.pUp.u.px.value.set(1 / cur.width, 1 / cur.height); this.pUp.render(r, this.up[i]); cur = this.up[i]; }
    this.pFinal.u.uBloom.value = cur.texture;
  }
  // css: page pixels to one of the picture's; frame: which frame of film
  final(amt, { grain, weave, css, frame }) {
    const u = this.pFinal.u;
    u.uScene.value = this.scene.texture; u.uBloomAmt.value = amt; u.uGrain.value = grain; u.uWeave.value = weave; u.uCss.value = css; u.uFrame.value = frame;
    this.pFinal.render(this.r, null);
  }
}
