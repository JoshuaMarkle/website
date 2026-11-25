import * as THREE from 'three';
import { Pass, rt, U } from './gpu.js';
import { COMMON } from '../glsl/common.js';

// Procedural light studio, drawn to an equirect every frame so lights can follow the pointer.
// Hard-edged softboxes on black: dispersion needs sharp edges to split into a rainbow.
export class Env {
  constructor(renderer, shared) {
    this.r = renderer;
    this.target = rt(1024, 512, { wrapS: THREE.RepeatWrapping });
    this.pass = new Pass(COMMON + /* glsl */ `
      uniform sampler2D uLut; uniform float uTime,uWhite,uColour,uFlash,uSpinY,uTilt,uHard;
      mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
      // palette colour pushed to full chroma, so panels read as coloured light instead of pastel white
      vec3 lc(float v){ vec3 c=pow(lut(uLut,v),vec3(2.2)); float m=max(c.r,max(c.g,c.b)); c/=max(m,.02); return pow(c,vec3(1.7))*smoothstep(0.,.12,m); }
      vec3 box(vec3 d,vec3 c,float roll,vec2 s,float soft,vec3 a,vec3 b){
        c=normalize(c); float k=dot(d,c); if(k<.03) return vec3(0.);
        vec3 up=abs(c.y)>.95?vec3(0,0,1):vec3(0,1,0);
        vec3 u=normalize(cross(up,c)), v=cross(c,u);
        vec2 q=rot(roll)*vec2(dot(d,u),dot(d,v))/k;
        vec2 e=abs(q)-s; float dd=max(e.x,e.y);
        float m=smoothstep(soft,-soft*.3,dd);
        return m*mix(a,b,smoothstep(-1.,1.,q.y/s.y+q.x/s.x*.35));
      }
      void main(){
        float ph=(vUv.x-.5)*6.2831853, th=(vUv.y-.5)*PI;
        vec3 d=vec3(cos(th)*cos(ph),sin(th),cos(th)*sin(ph));
        d.yz=rot(uTilt)*d.yz; d.xz=rot(uSpinY)*d.xz;
        float h=mix(.16,.018,uHard);
        vec3 c=vec3(0.), w=vec3(1.)*uWhite;
        // white keys
        c+=box(d,vec3(-.25,1.,.15),.35,vec2(.50,.07),h,w*3.4,w*1.2);
        c+=box(d,vec3(-1.,.12,.35),.06,vec2(.06,.85),h,w*4.2,w*.9);
        c+=box(d,vec3(.35,.55,1.),-.4,vec2(.62,.03),h,w*3.8,w*1.6);
        c+=box(d,vec3(.9,-.55,.5),.7,vec2(.30,.035),h,w*2.6,w*.6);
        c+=box(d,vec3(0.,-1.,.05),.8,vec2(.36,.05),h,w*2.6,w*.4);
        c+=box(d,vec3(.15,.1,-1.),1.1,vec2(.035,.6),h,w*1.8,w*.8);
        // colour panels, always drawn from the active palette
        float k=uColour;
        // kept off the line of sight: what you see straight through the glass stays black
        c+=box(d,vec3(1.,.15,.12),.2,vec2(.30,.46),h*2.,lc(.50)*1.25,lc(.68)*1.0)*k;
        c+=box(d,vec3(-.95,-.30,-.55),-.5,vec2(.30,.14),h*2.,lc(.80)*1.2,lc(.60)*.9)*k;
        c+=box(d,vec3(.75,.75,-.5),.9,vec2(.22,.20),h*2.,lc(.34)*1.2,lc(.46)*1.)*k;
        c+=box(d,vec3(-.75,.75,.6),.2,vec2(.20,.30),h*2.5,lc(.46)*.8,lc(.76)*.9)*k;
        c+=box(d,vec3(.1,-.75,-.8),.1,vec2(.8,.07),h*2.5,lc(.28)*1.2,lc(.42)*.9)*k;
        c+=box(d,vec3(.7,-.8,-.1),.1,vec2(.22,.26),h*2.5,lc(.62)*.9,lc(.88)*.7)*k;
        c+=box(d,vec3(-.2,-.1,1.),.5,vec2(.40,.05),h*2.5,lc(.40)*.8,lc(.66)*.7)*k;
        c+=box(d,vec3(-.35,.28,-1.),.8,vec2(.45,.028),h*2.,lc(.56)*.9,lc(.74)*.7)*k;
        c+=box(d,vec3(.40,-.12,-1.),1.25,vec2(.40,.022),h*2.,lc(.40)*.8,lc(.50)*.7)*k;
        c*=1.+uFlash*2.2;
        o=vec4(c,1.);
      }`, {
      uLut: shared.uLut, uTime: shared.uTime, uWhite: U(1), uColour: U(1), uFlash: U(0), uSpinY: U(0), uTilt: U(0), uHard: U(0.8),
    });
  }
  render() { this.pass.render(this.r, this.target); }
}
