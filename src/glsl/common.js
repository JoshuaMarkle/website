// Shared GLSL. Everything works in "p space": x in screen-heights, y in 0..1.
export const COMMON = /* glsl */ `
uniform float uAspect;
#define ASPECT uAspect
#define PI 3.14159265
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash13(vec3 p){ p=fract(p*.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }

// Gradient noise whose lattice gradients rotate with t, so it boils smoothly instead of sliding.
float fnoise(vec2 p, float t){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  // spin rate depends on the lattice point itself, so neighbouring cells always agree
  float h0=hash12(i),h1=hash12(i+vec2(1,0)),h2=hash12(i+vec2(0,1)),h3=hash12(i+vec2(1,1));
  float a0=h0*6.2831+t*(.75+.5*h0), a1=h1*6.2831+t*(.75+.5*h1), a2=h2*6.2831+t*(.75+.5*h2), a3=h3*6.2831+t*(.75+.5*h3);
  float n0=dot(vec2(cos(a0),sin(a0)),f);
  float n1=dot(vec2(cos(a1),sin(a1)),f-vec2(1,0));
  float n2=dot(vec2(cos(a2),sin(a2)),f-vec2(0,1));
  float n3=dot(vec2(cos(a3),sin(a3)),f-vec2(1,1));
  return 1.42*mix(mix(n0,n1,u.x),mix(n2,n3,u.x),u.y);
}
float n01(vec2 p,float t){ return fnoise(p,t)*.5+.5; }
vec3 lut(sampler2D l,float v){ return texture(l,vec2(clamp(v,.001,.999),.5)).rgb; }
float tri01(float x){ return abs(fract(x*.5)*2.-1.); }

// Four-tap bicubic, hides bilinear diamonds when a steep gradient map is applied on top.
vec4 bicubic(sampler2D tex, vec2 uv, vec2 size){
  vec2 st=uv*size-.5, f=fract(st), i=st-f, m=1.-f;
  vec2 w0=m*m*m/6., w1=(4.-6.*f*f+3.*f*f*f)/6., w2=(4.-6.*m*m+3.*m*m*m)/6., w3=f*f*f/6.;
  vec2 g0=w0+w1, g1=w2+w3;
  vec2 a=(i-.5+w1/g0)/size, b=(i+1.5+w3/g1)/size;
  return mix(mix(texture(tex,vec2(a.x,a.y)),texture(tex,vec2(b.x,a.y)),g1.x),
             mix(texture(tex,vec2(a.x,b.y)),texture(tex,vec2(b.x,b.y)),g1.x),g1.y);
}
`;
