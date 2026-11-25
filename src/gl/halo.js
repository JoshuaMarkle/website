import * as THREE from 'three';
import { Pass, U, ASPECT, scissor, unscissor } from './gpu.js';
import { COMMON } from '../glsl/common.js';

// Black letters with the light spilling out from behind them. Plates are drawn one by one into the
// field; alpha carries how much of it the eye may see directly (glass always sees all of it).
const BASE = /* glsl */ `
uniform sampler2D uLut,uDisp,uVel;
uniform float uTime,uLiquify,uIrid,uFilm,uSplit;
vec2 disp(vec2 uv){ return bicubic(uDisp,uv,vec2(textureSize(uDisp,0))).xy*uLiquify; }
// heat to colour: the split pulls the three channels apart along it, the film lays its own bands over
vec3 pal(float v,float tilt){
  vec3 c=abs(uSplit)<.002?lut(uLut,v):vec3(lut(uLut,v+uSplit*v).r,lut(uLut,v).g,lut(uLut,v-uSplit*v).b);
  if(uIrid>.002){ vec3 f=.5-.5*cos(12.566*1.33*uFilm*(.55+.9*v+.25*tilt)/vec3(640.,540.,450.)); c*=mix(vec3(1.),f*1.75,uIrid*smoothstep(.04,.3,v)); }
  return c;
}
`;

const BLEND = { transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, blendEquationAlpha: THREE.MaxEquation };

export class Halo {
  constructor(renderer, shared) {
    this.r = renderer;
    const base = { uLut: shared.uLut, uDisp: shared.uDisp, uVel: shared.uVel, uTime: shared.uTime, uLiquify: U(1), uIrid: U(0), uFilm: U(420), uSplit: U(0), uLight: shared.uLight };
    this.base = base;
    this.pass = new Pass(COMMON + BASE + /* glsl */ `
      uniform sampler2D uSdf,uB0,uB1,uB2,uB3;
      uniform float uBleed,uSpread,uLean,uLine,uFill,uK,uAmt,uLeak,uFade,uBed,uTouch,uEach; // touch: how much the hand moves it
      uniform vec2 uLight,uOrg,uExt; uniform vec3 uRim;
      void main(){
        vec2 P=vUv*vec2(ASPECT,1.);
        vec2 p=P+disp(vUv)*min(1.,uK*1.4)*uTouch;
        vec2 q=(p-uOrg)/uK;                                  // plate units
        vec2 uv=q/uExt+.5;
        vec2 e=min(uv,1.-uv)*uExt;
        float win=smoothstep(0.,.16,e.x)*smoothstep(0.,.16,e.y);
        if(win<=0.) discard;
        float d=texture(uSdf,uv).r;
        float aa=clamp(fwidth(d),.0006/uK,.03)*.9;          // the field stops dead a way off, and that is not an edge
        float inside=smoothstep(aa,-aa,d);

        float kk=max(uK,.42);
        vec2 L=(uLight-p)/kk;
        float lobe=exp(-dot(L,L)/.16)*uTouch;
        L=mix(vec2(.12,-.5),L/max(1.,length(L)),uTouch);
        vec2 np=p/kk;
        float n=n01(np*vec2(1.05,1.2)+vec2(0.,uTime*.05),uTime*.25);
        float n2=n01(np*2.3+11.,uTime*.35);
        float spd=length(texture(uVel,vUv).xy)*uTouch;
        float h=clamp(smoothstep(.44,.84,n*.74+n2*.26)*uBleed+lobe*uBleed*.85+min(spd*.55,.5),0.,1.);

        // the glow is cast away from the light, further for the wider blurs
        vec2 away=-L*uLean/uExt;
        float b0=texture(uB0,uv-away*.015).r;
        float b1=bicubic(uB1,uv-away*.05,vec2(textureSize(uB1,0))).r;
        float b2=bicubic(uB2,uv-away*.11,vec2(textureSize(uB2,0))).r;
        float b3=bicubic(uB3,uv-away*.20,vec2(textureSize(uB3,0))).r;
        float s=h*uSpread*3.;
        float b=s<1.?mix(b0,b1,smoothstep(0.,1.,s)):s<2.?mix(b1,b2,smoothstep(0.,1.,s-1.)):mix(b2,b3,smoothstep(0.,1.,min(s-2.,1.)));
        float g=clamp(b*2.,0.,1.5);
        // violet at a plain edge, red to amber only where the light pools or two strokes close up
        float body=pow(g,1.45)*mix(.30,.74,smoothstep(0.,.85,h));
        body+=.22*pow(clamp(b3*1.5,0.,1.),1.6)*h;
        // a bed of light under a whole line, so what is behind one word joins what is behind the next
        if(uBed>.001){ float rb=bicubic(uB3,uv-away*.10,vec2(textureSize(uB3,0))).g; float bed=uBed*(.62+.7*n)*smoothstep(.0,.62,rb); body=max(body,bed)+.12*min(body,bed); }
        body*=min(uBleed*1.15,1.);

        float w=.0016*uLine/uK;
        float ln=exp(-d*d/(w*w*1.6));
        float soft=exp(-abs(d)/(.009+.012*h));
        float edge=.46*ln+.26*soft;
        float outer=max(body,edge*(1.-.25*h)+body*.30);
        float inner=edge*(.85+.15*h)*smoothstep(-.03,0.,d)+uFill*b3*.6;
        float v=mix(outer,inner,inside)*uAmt;
        // letters that fade one by one: green over red is how much of itself each has left, and it cools as it goes
        float each=1.;
        if(uEach>.5){ vec2 m=texture(uB1,uv).rg+.12*texture(uB2,uv).rg+.015*texture(uB3,uv).rg; each=clamp(2.*m.g/max(m.r,1e-4),0.,2.); v=min(v*each,1.); each=smoothstep(0.,.3,each); }
        // seen straight on, the light thins out away from the middle
        // and only its glow does: the edge of the letter is for the glass
        vec2 rr=(P-uOrg)/uRim.xy; float seen=exp(-dot(rr,rr)*1.3)*smoothstep(.0,.014,d)*smoothstep(.03,.42,body*uAmt);
        o=vec4(pal(v,q.y)*win*uFade*each,uLeak*mix(1.,seen,uRim.z));
      }`, {
      ...base, uSdf: U(null), uB0: U(null), uB1: U(null), uB2: U(null), uB3: U(null),
      uBleed: U(1), uSpread: U(1), uLean: U(1), uLine: U(1), uFill: U(0), uK: U(1), uAmt: U(1), uLeak: U(1), uFade: U(1), uBed: U(0), uTouch: U(1), uEach: U(0), uOrg: U(new THREE.Vector2()), uExt: U(new THREE.Vector2(1, 1)), uRim: U(new THREE.Vector3(1, 1, 0)),
    }, BLEND);

    // the page is a black sheet too: at its end the light comes round the two bottom corners
    this.hem = new Pass(COMMON + BASE + /* glsl */ `
      uniform vec4 uSheet; uniform vec2 uLight; uniform float uBleed,uAmt,uOpen,uPx;
      void main(){
        vec2 P=vUv*vec2(ASPECT,1.), p=P+disp(vUv)*.6;
        float end=uSheet.x, in_=uSheet.y, r=uSheet.z, y=p.y-end;
        vec2 e=vec2(abs(p.x-ASPECT*.5)-ASPECT*.5+in_,in_-y)+r;
        float d=length(max(e,0.))+min(max(e.x,e.y),0.)-r;      // over nought is off the sheet
        float inside=smoothstep(uPx,-uPx,d);

        // it keeps to the corners: gone a little way up the sides, lower along the middle
        float side=p.x>ASPECT*.5?1.:0., sm=clamp(ASPECT,.56,1.); // and smaller on a narrow page
        float up=max(y-in_-r*.4,0.), reach=.105*sm+.16*uOpen*side;
        float away=exp(-up*up/(reach*reach));
        float far=min(p.x,ASPECT-p.x), corner=exp(-dot(vec2(far,up),vec2(far,up))/(.05*sm*sm));
        float keep=away*mix(.62,1.,exp(-far*far/.22));

        vec2 np=p/.42, L=(uLight-p)/.42; float lobe=exp(-dot(L,L)/.16);
        float n=n01(np*vec2(.8,1.2)+vec2(uTime*.06,uTime*.05),uTime*.25), n2=n01(np*2.1+11.,uTime*.35);
        float spd=length(texture(uVel,vUv).xy);
        float h=clamp(smoothstep(.40,.84,n*.74+n2*.26)*uBleed*(.55+.45*corner)+.26*corner*uBleed+lobe*uBleed*.6+min(spd*.55,.5)+.2*uOpen*side*corner,0.,1.);

        float ln=exp(-d*d/(uSheet.w*uSheet.w*1.6)), soft=exp(-abs(d)/(.009+.012*h)), edge=.46*ln+.26*soft;
        // off the sheet it is the light itself; on it, what spills: close by, and further where it runs hot
        float off=mix(.30,.74,smoothstep(0.,.85,h));
        float in1=exp(min(d,0.)/(.012+.030*h)), in2=exp(min(d,0.)/((.045+.085*h)*sm*sm+.05*uOpen*side));
        float spill=.28*in1*(.5+.5*h)+.34*in2*(.14+.86*h);
        float v=mix(max(off,edge*(1.-.25*h)+off*.3),max(edge*(.85+.15*h),spill+edge*.35),inside);
        v*=keep*uAmt*min(uBleed*1.15,1.);
        if(v<.002) discard;
        vec3 c=pal(clamp(v,0.,.95),y*2.);
        // the edge itself is a film, so it turns through its colours as it goes round
        float way=p.x*1.5+up*2.2+n*.9+uTime*.05;
        vec3 f=.5-.5*cos(12.566*1.33*uFilm*(.62+.22*sin(way*2.1)+.12*h)/vec3(640.,540.,450.));
        c+=f*(ln*.62+.10*in1*inside)*(.35+.65*h+.4*corner)*keep*uAmt;
        o=vec4(c,smoothstep(.002,.03,v));
      }`, { ...base, uSheet: U(new THREE.Vector4()), uBleed: U(1), uAmt: U(0), uOpen: U(0), uPx: U(0.001) }, BLEND);
  }

  // p: plate, x y: centre in p space, k: p-space size of one plate unit
  draw(target, p, x, y, k, o) {
    const w = (p.ext.x * k) / ASPECT.value, h = p.ext.y * k;
    if (!scissor(target, x / ASPECT.value - w / 2, y - h / 2, w, h)) return;
    const u = this.pass.u;
    u.uSdf.value = p.sdf.texture;
    [u.uB0, u.uB1, u.uB2, u.uB3].forEach((b, i) => { b.value = p.blur[i].texture; });
    u.uExt.value.copy(p.ext); u.uOrg.value.set(x, y); u.uK.value = k;
    u.uBleed.value = o.bleed; u.uSpread.value = o.spread; u.uLean.value = o.lean; u.uLine.value = o.line; u.uAmt.value = o.amt; u.uLeak.value = o.leak; u.uFade.value = o.fade; u.uBed.value = o.bed || 0; u.uTouch.value = o.touch ?? 1; u.uEach.value = o.each ? 1 : 0;
    u.uRim.value.set(o.rx || 1, o.ry || 1, o.rim || 0);
    this.pass.render(this.r, target);
    unscissor(target);
  }
  // s: end of the page, inset, corner and line, all in p space
  drawHem(target, s, o) {
    if (!scissor(target, 0, s.end - 0.01, 1, 0.72)) return;
    const u = this.hem.u;
    u.uSheet.value.set(s.end, s.inset, s.corner, s.line); u.uAmt.value = o.amt; u.uOpen.value = o.open; u.uBleed.value = o.bleed; u.uPx.value = 0.75 / target.height;
    this.hem.render(this.r, target);
    unscissor(target);
  }
}
