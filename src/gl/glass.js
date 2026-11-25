import * as THREE from 'three';
import { Pass, rt, U, ASPECT } from './gpu.js';
import { COMMON } from '../glsl/common.js';

// Clear glass for the interface. Every pane on the page is a rounded box here, with a polished
// edge that bends the finished picture behind it. Painted in order:
//   0  panes        glass over the scene, neighbours can run together
//   1  fills        tracks, levels, and the page's own words
//   2  lenses       thumbs and knobs, glass again, looking at 0 and 1
//   3  sheets       menus and panels; glass is never stacked, so they open a hole in 0 and 2
//                   and look at the words underneath
//   4  their fills
//   5  their lenses

const MAX = 120, COLS = 6;
const VERT = /* glsl */ `precision highp float; precision highp int;
uniform float uAspect;
in vec2 position; in vec4 aB; in vec3 aG;
out vec2 vP; flat out ivec2 vR; flat out float vK;
void main(){ vP=mix(aB.xy,aB.zw,position); vR=ivec2(aG.xy+.5); vK=aG.z; gl_Position=vec4(vP/vec2(uAspect,1.)*2.-1.,0.,1.); }`;

const HEAD = /* glsl */ `precision highp float; precision highp int; precision highp sampler2D;
in vec2 vP; flat in ivec2 vR; flat in float vK; out vec4 o;
uniform sampler2D uData; uniform vec2 uRes;
uniform vec4 uHole[4]; uniform vec3 uHoleR[4]; uniform int uHoles;
vec4 D(int i,int k){ return texelFetch(uData,ivec2(k,i),0); }
// rounded box with a p-norm corner: distance, then the outward direction
vec3 rbox(vec2 p,vec2 b,float r,float n){
  vec2 s=vec2(p.x<0.?-1.:1.,p.y<0.?-1.:1.), q=abs(p)-b+r;
  if(q.x>0.&&q.y>0.){
    float L=n<2.01?length(q):pow(pow(q.x,n)+pow(q.y,n),1./n);
    vec2 g=n<2.01?q/L:pow(q/L,vec2(n-1.));
    float gl=length(g);
    return vec3((L-r)/gl,s*g/gl);
  }
  return q.x>q.y?vec3(q.x-r,s.x,0.):vec3(q.y-r,0.,s.y);
}
float bare(vec2 p,float px){ float m=1.; for(int i=0;i<4;i++){ if(i>=uHoles) break; m*=1.-uHoleR[i].z*smoothstep(.6*px,-.6*px,rbox(p-uHole[i].xy,uHole[i].zw,uHoleR[i].x,uHoleR[i].y).x); } return m; }
`;

const GLASS = HEAD + COMMON + /* glsl */ `
uniform sampler2D uSrc,uPyr,uLut;
uniform vec2 uLight;
uniform float uTime,uCss;
uniform float mBlur,mBezel,mDepth,mIor,mCurve,mZoom,mDisp,mRim,mGlow,mIrid,mFilm,mTint,mStain,mSat,mDim,mShadow;

vec3 bic(vec2 uv,float lod){
  vec2 size=vec2(textureSize(uPyr,int(lod)));
  vec2 st=uv*size-.5, f=fract(st), i=st-f, m=1.-f;
  vec2 w0=m*m*m/6., w1=(4.-6.*f*f+3.*f*f*f)/6., w2=(4.-6.*m*m+3.*m*m*m)/6., w3=f*f*f/6.;
  vec2 g0=w0+w1, g1=w2+w3, a=(i-.5+w1/g0)/size, b=(i+1.5+w3/g1)/size;
  return mix(mix(textureLod(uPyr,a,lod).rgb,textureLod(uPyr,vec2(b.x,a.y),lod).rgb,g1.x),
             mix(textureLod(uPyr,vec2(a.x,b.y),lod).rgb,textureLod(uPyr,b,lod).rgb,g1.x),g1.y);
}
vec3 soft(vec2 uv,float lod){ float f=floor(lod); return mix(bic(uv,f),bic(uv,f+1.),lod-f); }
// lod counts from the full picture; the pyramid starts at half of it
vec3 look(vec2 uv,float blur,float aa){
  if(blur<.01){
    if(aa<.05) return texture(uSrc,uv).rgb;
    vec3 p=textureLod(uPyr,uv,max(aa-1.,0.)).rgb;
    return aa<1.?mix(texture(uSrc,uv).rgb,p,aa):p;
  }
  float l=max(blur,aa); vec3 p=soft(uv,max(l-1.,0.));
  return l<1.?mix(texture(uSrc,uv).rgb,p,l):p;
}
float lum(vec3 c){ return dot(c,vec3(.3,.55,.15)); }
// two-beam interference off a film on the glass, as a colour around white
vec3 film(float nm,float c){ vec3 ph=12.566*1.33*nm*c/vec3(640.,540.,450.); return .5-.5*cos(ph); }

void main(){
  float px=1./uRes.y, u1=uCss;
  float dS=1e4,dL=1e4,B=.01; vec2 gS=vec2(0.,1.),gL=gS,C=vec2(0.);
  vec4 A1=vec4(0.),A2=vec4(0.),A3=vec4(0.),A4=vec4(0.),A5=vec4(0.);
  for(int i=vR.x;i<vR.x+vR.y;i++){
    vec4 box=D(i,0),a1=D(i,1),a4=D(i,4);
    vec2 p=vP-box.xy; float mh=min(box.z,box.w);
    float r=min(a1.x,mh);
    vec3 s=rbox(p,box.zw,r,a1.y);
    // the bevel follows a rounder box than the outline, so wide edges meet without a crease
    float b=min(mBezel*a4.z,mh);
    vec3 l=s; float R=max(r,b);
    if(R>r+1e-5||a1.y>2.01){ l=rbox(p,box.zw,R,2.); float w=smoothstep(0.,max(r*.92,1e-4),-s.x); l=mix(s,l,w); l.yz/=max(length(l.yz),1e-4); }
    float k=max(vK,1e-5);
    float h=i==vR.x?0.:clamp(.5+.5*(s.x-dS)/k,0.,1.);
    float h2=i==vR.x?0.:clamp(.5+.5*(l.x-dL)/k,0.,1.);
    dS=i==vR.x?s.x:mix(s.x,dS,h)-k*h*(1.-h); gS=mix(s.yz,gS,h);
    dL=i==vR.x?l.x:mix(l.x,dL,h2)-k*h2*(1.-h2); gL=mix(l.yz,gL,h2);
    B=mix(b,B,h); C=mix(box.xy,C,h);
    A1=mix(a1,A1,h); A2=mix(D(i,2),A2,h); A3=mix(D(i,3),A3,h); A4=mix(a4,A4,h); A5=mix(D(i,5),A5,h);
  }
  gS/=max(length(gS),1e-4); gL/=max(length(gL),1e-4);
  float al=A1.z;
  float off=.011*A5.y, sg=.026*max(A5.y,.2);
  float sd=dS+gS.y*off;
  float sh=mShadow*A5.y*al*.8*exp(-max(sd,0.)/sg)*smoothstep(sg*4.,sg*2.,sd);
  float cov=smoothstep(.6*px,-.6*px,dS)*al;
  float op=bare(vP,px); cov*=op; sh*=op;
  if(cov<.001){ if(sh<.003) discard; o=vec4(0.,0.,0.,sh); return; }

  /* ---------------------------------------------------------- the bend */
  float t=clamp(-dL/B,0.,1.), v=1.-t, n=mCurve;
  float fit=B/max(mBezel*A4.z,1e-4);                     // a small button is a small lens
  float H=B*.7, dep=mDepth*A4.w*fit*al;
  float vn=pow(v,n), top=pow(max(1.-vn,1e-4),1./n);
  float sl=pow(v,n-1.)*pow(max(1.-vn,2e-3),1./n-1.)*H/B;
  float ti=atan(sl), tr=asin(clamp(sin(ti)/max(mIor,1.),-1.,1.));
  float bend=tan(ti-tr)*(top*H+dep);
  float zoom=mix(1.,mZoom*A3.w,al);
  vec2 sp=C+(vP-C)/zoom-gL*bend;
  vec2 sc=vec2(1./ASPECT,1.);
  float foot=max(length(dFdx(sp)),length(dFdy(sp)))*uRes.y;
  float aa=clamp(log2(max(foot,1.)),0.,5.);
  float blurPx=(mBlur+A4.x)*uRes.y;
  float bl=blurPx>.5?log2(1.+blurPx*.62):0.;

  vec3 col;
  float split=bend*mDisp*.42+mDisp*.0006;
  if(split*uRes.y<.6) col=look(sp*sc,bl,aa);
  else {
    float ig=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
    col=vec3(0.); vec3 W=vec3(0.);
    const int N=9;
    for(int i=0;i<N;i++){
      float x=(float(i)+.2+.6*ig)/float(N);
      vec3 w=clamp(1.5-abs(4.*x-vec3(1.,2.,3.)),0.,1.);
      col+=w*look((sp-gL*split*(x-.5))*sc,bl,aa); W+=w;
    }
    col/=W;
  }

  /* ---------------------------------------------- light on the surface */
  float cosT=1./sqrt(1.+sl*sl);
  float fr=.03+.97*pow(1.-cosT,4.);
  vec2 wide=vP+gS*(.03+.05*v);
  vec3 env=textureLod(uPyr,wide*sc,3.2).rgb;             // what the edge can see of the room
  vec3 room=textureLod(uPyr,(vP+gS*.12)*sc,4.6).rgb;
  float el=lum(env), rl=lum(room);

  // keep white type readable: where the picture behind is bright, turn the exposure down, not the sharpness
  float dim=clamp(mDim+A4.y,0.,1.5);
  if(dim>.01){ vec3 w=soft(sp*sc,4.2); float A=lum(w); float k=1./(1.+dim*max(0.,A-.10)*3.1); col*=mix(1.,k,smoothstep(0.,.55,t)*.75+.25); }
  float g0=lum(col);
  col=max(vec3(0.),g0+(col-g0)*mSat);
  if(abs(mTint)>.001) col=mTint>0.?mix(col,vec3(.96,.96,.98),mTint*.85):mix(col,col*.12+vec3(.012,.011,.016),-mTint);
  if(mStain>.001){ vec3 st=lut(uLut,.36+.34*(.5+.5*sin(vP.x*2.2-vP.y*1.4+uTime*.2))); col=mix(col,col*(st*1.3+.15)+st*.16,mStain); }
  col=mix(col,A2.rgb,A2.a*(1.-A1.w)*mix(.15,1.,smoothstep(0.,.5,t)));   // clear at the rim, quieter inside

  col=mix(col,env*1.15,fr*.75*min(mRim,1.2));
  vec2 ld=uLight-vP; ld=normalize(ld*.8+vec2(-.16,.30));
  float ang=dot(gS,ld);
  float face=.30+.85*pow(max(ang,0.),2.2)+.50*pow(max(-ang,0.),3.);
  float lw=max(u1,px*.9);
  float line=exp(-pow((dS+lw*.95)/(lw*.85),2.));
  vec3 warm=mix(vec3(1.),env/max(el,.02)*.8,.45*smoothstep(.02,.3,el));
  if(mIrid>.001){
    vec3 f=film(mFilm*(1.+.25*sin(atan(gS.y,gS.x)*2.+uTime*.25)),.55+.45*cosT);
    float band=pow(v,1.6)*(1.-.35*v);
    col+=(f-.18)*band*mIrid*(.10+.55*el+.35*rl+.16*max(ang,0.));
    warm=mix(warm,f*1.9,min(mIrid,1.)*.75);
  }
  col+=warm*line*face*mRim*A5.x*(.66+.6*clamp(el*1.6+rl*.6,0.,1.));
  // light that has leaked into the edge
  float leak=exp(dS/(B*.2+.002));
  col+=(env*.55+room*.35+.016)*leak*mGlow*(.35+.65*abs(ang));

  col=mix(col,A2.rgb,A1.w);                              // a thumb at rest is a solid thing
  vec2 pp=vP-A3.yz;
  col+=A3.x*(.26*exp(-dot(pp,pp)/.010)+.05)*(1.-.8*A1.w);
  o=vec4(col*cov,cov+(1.-cov)*sh);
}`;

const FILL = HEAD + COMMON + /* glsl */ `
uniform sampler2D uPyr,uSrc,uLut,uInk,uAtlas; uniform vec2 uTop;
void main(){
  int i=vR.x; float px=1./uRes.y;
  vec4 box=D(i,0),a1=D(i,1),a2=D(i,2),a5=D(i,5);
  float mh=min(box.z,box.w);
  vec2 p=vP-box.xy;
  float d=rbox(p,box.zw,min(a1.x,mh),a1.y).x;
  if(a5.z>-.5){ int c=int(a5.z+.5); vec4 b=D(c,0),q=D(c,1); d=max(d,rbox(vP-b.xy,b.zw,min(q.x,min(b.z,b.w)),q.y).x+D(i,3).x); }
  float cov=smoothstep(.6*px,-.6*px,d)*a1.z*bare(vP,px);
  if(cov<.002&&a5.w<2.5) discard;
  vec2 uv=p/(2.*box.zw)+.5;
  vec4 c=vec4(a2.rgb,a2.a);
  if(a5.w>2.5){                                          // words and icons, kept as a picture
    vec4 k=texture(uAtlas,a2.xy+vec2(uv.x,uv.y)*a2.zw);
    float f=smoothstep(uTop.x,uTop.y,1.-vP.y);
    o=k*a1.z*mix(1.,f,D(i,3).x); return;
  } else if(a5.w>1.5){ vec4 k=texture(uInk,vP/vec2(ASPECT,1.)); o=k*cov*a2.a; return; }
  else if(a5.w>.5) c=vec4(lut(uLut,mix(a2.x,a2.y,a2.z>.5?uv.y:uv.x)),a2.a);
  o=vec4(c.rgb,1.)*c.a*cov;
}`;

export class Glass {
  constructor(renderer, shared, atlas) {
    this.r = renderer;
    this.shared = shared;
    this.data = new Float32Array(MAX * COLS * 4);
    this.tex = new THREE.DataTexture(this.data, COLS, MAX, THREE.RGBAFormat, THREE.FloatType);
    this.tex.minFilter = this.tex.magFilter = THREE.NearestFilter;
    this.pyr = rt(960, 540, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.src = null;
    this.ink = document.createElement('canvas');
    this.ink.width = 1920; this.ink.height = 1080;
    this.inkTex = new THREE.CanvasTexture(this.ink);
    this.inkTex.colorSpace = THREE.NoColorSpace; this.inkTex.generateMipmaps = false; this.inkTex.minFilter = THREE.LinearFilter; this.inkTex.premultiplyAlpha = true;
    this.pCopy = new Pass('uniform sampler2D t; void main(){ o=texture(t,vUv); }', { t: U(null) });
    this.pDown = new Pass(/* glsl */ `uniform sampler2D t; uniform vec2 px; void main(){
      vec3 c=texture(t,vUv).rgb*4.; c+=texture(t,vUv+px*vec2(1,1)).rgb+texture(t,vUv+px*vec2(-1,1)).rgb+texture(t,vUv+px*vec2(1,-1)).rgb+texture(t,vUv+px*vec2(-1,-1)).rgb; o=vec4(min(c/8.,vec3(2.)),1.); }`, { t: U(null), px: U(new THREE.Vector2()) });

    const common = { uAspect: ASPECT, uCss: U(1 / 1080), uData: U(this.tex), uRes: U(new THREE.Vector2()), uSrc: U(null), uPyr: U(this.pyr.texture), uLut: shared.uLut };
    const m = {};
    for (const k of ['Blur', 'Bezel', 'Depth', 'Ior', 'Curve', 'Zoom', 'Disp', 'Rim', 'Glow', 'Irid', 'Film', 'Tint', 'Stain', 'Sat', 'Dim', 'Shadow']) m[`m${k}`] = U(0);
    this.m = m;
    this.u = { ...common, ...m, uLight: shared.uLight, uTime: shared.uTime };
    this.fu = { ...common, uInk: U(this.inkTex), uAtlas: U(atlas), uTop: U(new THREE.Vector2(0.04, 0.1)) };
    this.holes = { uHole: U([0, 1, 2, 3].map(() => new THREE.Vector4())), uHoleR: U([0, 1, 2, 3].map(() => new THREE.Vector3())), uHoles: U(0) };
    const whole = { ...this.holes, uHoles: U(0) };
    Object.assign(this.u, this.holes); Object.assign(this.fu, this.holes);
    this.layers = [this.layer(GLASS, this.u), this.layer(FILL, this.fu, 2), this.layer(GLASS, this.u, 1),
      this.layer(GLASS, { ...this.u, ...whole }), this.layer(FILL, { ...this.fu, ...whole }, 2), this.layer(GLASS, { ...this.u, ...whole }, 1)];
    this.cam = new THREE.Camera();
    this.mat = null; // the material as drawn, easing toward the sliders
  }

  layer(frag, uniforms, solid = 0) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    const B = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4), G = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    B.setUsage(THREE.DynamicDrawUsage); G.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aB', B); g.setAttribute('aG', G);
    g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
    const mat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
      // the picture's alpha is its film stock: a lens covers it, and paint takes all of it however thin it lies
      ...(solid === 2 ? { blendSrcAlpha: THREE.ConstantAlphaFactor, blendDstAlpha: THREE.OneFactor, blendEquationAlpha: THREE.ReverseSubtractEquation, blendAlpha: 8 }
        : { blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: solid ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor, blendEquationAlpha: THREE.AddEquation }) });
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    return { g, B, G, scene };
  }

  setSize(w, h, cssH) {
    if (this.src) this.src.setSize(w, h); else this.src = rt(w, h);
    this.u.uRes.value.set(w, h); this.u.uCss.value = 1 / cssH;
    this.pyr.setSize(Math.max(8, Math.round((540 * w) / h)), 540);
    this.ink.width = w; this.ink.height = h; this.inkTex.dispose();
  }

  // sliders to shader units; every number glides, so changing the material is a morph and not a cut
  material(s, dt, scale) {
    const px = scale;
    const goal = { Blur: s.gBlur * px, Bezel: s.gBezel * px, Depth: s.gDepth * px, Ior: s.gIor, Curve: s.gCurve, Zoom: s.gZoom, Disp: s.gDisp, Rim: s.gRim, Glow: s.gGlow, Irid: s.gIrid, Film: s.gFilm, Tint: s.gTint, Stain: s.gStain, Sat: s.gSat, Dim: s.gDim, Shadow: s.gShadow };
    const k = this.mat ? 1 - Math.exp(-dt * 9) : 1;
    this.mat ??= { ...goal };
    for (const n in goal) { this.mat[n] += (goal[n] - this.mat[n]) * k; this.m[`m${n}`].value = this.mat[n]; }
  }

  put(i, p) {
    const d = this.data, o = i * COLS * 4;
    d.set([p.x, p.y, p.hw, p.hh, p.r, p.n, p.a, p.solid, p.col[0], p.col[1], p.col[2], p.col[3] ?? 0,
      p.glow, p.px, p.py, p.zoom, p.blur, p.dim, p.bez, p.dep, p.rim, p.shadow, p.clip, p.mode], o);
  }

  fillLayer(L, groups, start, pad) {
    let i = start, k = 0;
    for (const g of groups) {
      let x0 = 9, y0 = 9, x1 = -9, y1 = -9;
      const first = i;
      for (const p of g.panes) {
        if (i >= MAX) break;
        p.slot = i;
        p.clip = p.inside ? p.inside.slot ?? -1 : -1; // whatever holds it has already been placed
        this.put(i++, p);
        x0 = Math.min(x0, p.x - p.hw); y0 = Math.min(y0, p.y - p.hh); x1 = Math.max(x1, p.x + p.hw); y1 = Math.max(y1, p.y + p.hh);
      }
      if (i === first) break;
      const m = pad(g);
      L.B.array.set([x0 - m, y0 - m, x1 + m, y1 + m], k * 4);
      L.G.array.set([first, i - first, g.k || 0], k * 3);
      k++;
    }
    L.g.instanceCount = k; L.B.needsUpdate = L.G.needsUpdate = true;
    return i;
  }

  // a lens looks at what was painted a moment ago, so the ground under each one is copied first
  ground(target, list) {
    const W = target.width, H = target.height, m = 0.05;
    this.pCopy.u.t.value = target.texture;
    this.src.scissorTest = true;
    for (const g of list) {
      const p = g.panes[0];
      const x = Math.max(0, Math.floor(((p.x - p.hw - m) / ASPECT.value) * W)), y = Math.max(0, Math.floor((p.y - p.hh - m) * H));
      const x2 = Math.min(W, Math.ceil(((p.x + p.hw + m) / ASPECT.value) * W)), y2 = Math.min(H, Math.ceil((p.y + p.hh + m) * H));
      if (x2 <= x || y2 <= y) continue;
      this.src.scissor.set(x, y, x2 - x, y2 - y);
      this.pCopy.render(this.r, this.src);
    }
    this.src.scissorTest = false;
  }

  render(target, lists, s) {
    const r = this.r;
    if (!lists.some((l) => l.length)) return;
    const hs = lists[3].flatMap((g) => g.panes).slice(0, 4), H = this.holes;
    H.uHoles.value = hs.length;
    hs.forEach((p, i) => { H.uHole.value[i].set(p.x, p.y, p.hw, p.hh); H.uHoleR.value[i].set(p.r, p.n, Math.min(1, p.a)); });
    this.pCopy.u.t.value = target.texture; this.pCopy.render(r, this.src);
    this.pDown.u.t.value = this.src.texture; this.pDown.u.px.value.set(0.75 / this.src.width, 0.75 / this.src.height); this.pDown.render(r, this.pyr);
    this.u.uSrc.value = this.src.texture;

    const cast = s.gShadow > 0.01 ? 0.12 : 0.004, glass = (g) => cast + (g.k || 0), paint = () => 0.002;
    let i = 0;
    lists.forEach((l, k) => { i = this.fillLayer(this.layers[k], l, i, k % 3 === 1 ? paint : glass); });
    this.tex.needsUpdate = true;
    lists.forEach((l, k) => {
      const L = this.layers[k];
      if (!L.g.instanceCount) return;
      if (k % 3 === 2 || k === 3) this.ground(target, l);
      r.setRenderTarget(target);
      r.render(L.scene, this.cam);
    });
  }
}
