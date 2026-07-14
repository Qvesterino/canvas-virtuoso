import { BASE_VS, paramNum, type Pipeline } from "./types";

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uVariant;
uniform float uSize;
uniform float uSmoothness;
uniform float uCluster;
uniform float uDeform;
uniform float uTwist;
uniform float uCameraDist;
uniform float uCameraOrbit;
uniform float uCameraTilt;
uniform float uMetalness;
uniform float uRoughness;
uniform float uIridescence;
uniform float uTranslucency;
uniform float uClearcoat;
uniform float uLightAngle;
uniform float uLightIntensity;
uniform float uHue;
uniform float uSaturation;
uniform float uFog;
uniform float uVignette;

float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
float noise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float n000 = hash(i);
  float n100 = hash(i + vec3(1,0,0));
  float n010 = hash(i + vec3(0,1,0));
  float n110 = hash(i + vec3(1,1,0));
  float n001 = hash(i + vec3(0,0,1));
  float n101 = hash(i + vec3(1,0,1));
  float n011 = hash(i + vec3(0,1,1));
  float n111 = hash(i + vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y),
             mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
}
float fbm3(vec3 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ v += a * noise3(p); p *= 2.05; a *= 0.5; }
  return v;
}

float sdSphere(vec3 p, float r){ return length(p) - r; }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q,0.0)) + min(max(q.x, max(q.y,q.z)), 0.0); }
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdOct(vec3 p, float s){ p = abs(p); return (p.x + p.y + p.z - s) * 0.5773; }

mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c); }
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }

// ------ scene variants
float sceneBlobs(vec3 p, float t){
  float d = sdSphere(p, uSize);
  int n = int(clamp(uCluster, 1.0, 5.0));
  for (int i = 1; i < 6; i++){
    if (i >= n) break;
    float fi = float(i);
    vec3 offs = vec3(
      sin(t*(0.6 + fi*0.13) + uSeed*0.001 + fi),
      cos(t*(0.5 + fi*0.11) + uSeed*0.0007 + fi*1.7),
      sin(t*(0.7 + fi*0.09) + fi*2.3)
    ) * (uSize * 0.9);
    d = smin(d, sdSphere(p - offs, uSize*(0.55 + 0.15*sin(fi + t))), uSmoothness);
  }
  return d + (fbm3(p*3.0 + t*0.3) - 0.5) * uDeform * 0.15;
}
float sceneTorus(vec3 p, float t){
  float ang = p.y * uTwist * 1.5 + t*0.2;
  mat3 R = rotY(ang);
  vec3 q = R * p;
  float d = sdTorus(q, vec2(uSize*1.1, uSize*0.35));
  // stack shells
  for (int i = 1; i < 4; i++){
    float fi = float(i);
    d = smin(d, sdTorus(rotY(ang + fi*0.9)*p, vec2(uSize*(0.6 + 0.2*fi), uSize*0.15)), uSmoothness);
  }
  return d + (fbm3(q*4.0 + t*0.4) - 0.5) * uDeform * 0.12;
}
float sceneLattice(vec3 p, float t){
  vec3 q = p;
  q = rotY(t*0.15 + uTwist*0.5) * q;
  vec3 c = vec3(uSize * 1.6);
  vec3 r = q - c * clamp(round(q/c), -vec3(1.0), vec3(1.0));
  float d = sdOct(r, uSize * 0.55);
  float box = sdBox(p, vec3(uSize*2.2));
  d = max(d, box);
  return d + (fbm3(p*5.0 + t*0.5) - 0.5) * uDeform * 0.08;
}
float sceneDome(vec3 p, float t){
  // liquid dome with rippling surface
  float baseY = -uSize*0.6;
  float dome = length(p - vec3(0.0, baseY, 0.0)) - uSize*1.3;
  float ripples = 0.0;
  for (int i = 0; i < 3; i++){
    float fi = float(i+1);
    ripples += sin(length(p.xz)*fi*4.0 - t*(1.2 + fi*0.4)) * 0.03 / fi;
  }
  dome -= ripples * (0.4 + uDeform*1.2);
  float ground = p.y - baseY - uSize*0.2;
  return smin(dome, ground, uSmoothness*1.5);
}

float scene(vec3 p){
  float t = uTime * 0.4;
  int v = int(clamp(uVariant, 0.0, 3.0));
  if (v == 0) return sceneBlobs(p, t);
  if (v == 1) return sceneTorus(p, t);
  if (v == 2) return sceneLattice(p, t);
  return sceneDome(p, t);
}

vec3 normal(vec3 p){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)
  ));
}
float softShadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 32; i++){
    float d = scene(ro + rd*t);
    if (d < 0.001) return 0.0;
    res = min(res, 8.0 * d / t);
    t += clamp(d, 0.01, 0.2);
    if (t > 4.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float ao(vec3 p, vec3 n){
  float occ = 0.0, w = 1.0;
  for (int i = 1; i <= 5; i++){
    float h = 0.02 * float(i);
    float d = scene(p + n*h);
    occ += (h - d) * w;
    w *= 0.7;
  }
  return clamp(1.0 - occ*1.4, 0.0, 1.0);
}
vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 sky(vec3 rd){
  float g = smoothstep(-0.4, 0.7, rd.y);
  vec3 top = hsv2rgb(vec3(uHue + 0.5, 0.5, 0.6));
  vec3 bot = hsv2rgb(vec3(uHue, 0.6, 0.15));
  return mix(bot, top, g);
}

void main(){
  vec2 uv = (vUv - 0.5) * vec2(uResolution.x/uResolution.y, 1.0);
  // Camera orbit
  vec3 target = vec3(0.0);
  float ang = uCameraOrbit + uTime * 0.05;
  vec3 ro = target + vec3(sin(ang), uCameraTilt, cos(ang)) * uCameraDist;
  vec3 fwd = normalize(target - ro);
  vec3 right = normalize(cross(vec3(0,1,0), fwd));
  vec3 up = cross(fwd, right);
  vec3 rd = normalize(fwd*1.3 + right*uv.x + up*uv.y);

  float tHit = 0.0;
  bool hit = false;
  for (int i = 0; i < 128; i++){
    vec3 p = ro + rd * tHit;
    float d = scene(p);
    if (d < 0.001){ hit = true; break; }
    tHit += d * 0.95;
    if (tHit > 8.0) break;
  }

  vec3 col = sky(rd);
  if (hit){
    vec3 p = ro + rd * tHit;
    vec3 n = normal(p);
    vec3 L = normalize(vec3(cos(uLightAngle), 0.9, sin(uLightAngle)));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float sh = softShadow(p + n*0.01, L);
    float occ = ao(p, n);
    vec3 h = normalize(L - rd);
    float specExp = mix(400.0, 6.0, uRoughness);
    float spec = pow(clamp(dot(n, h), 0.0, 1.0), specExp);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);

    vec3 base = hsv2rgb(vec3(uHue + uIridescence * n.x * 0.35, uSaturation, 1.0));
    vec3 env = sky(reflect(rd, n));
    vec3 metal = mix(base, env, 0.55);
    vec3 diffuse = base * (0.15 + 0.85 * diff * sh) * occ;
    vec3 specular = mix(vec3(1.0), metal, uMetalness) * spec * uLightIntensity * sh;
    col = mix(diffuse, specular + diffuse*0.2, uMetalness);

    // Environment reflection for dielectrics
    col = mix(col, env, fres * (0.15 + 0.6*uClearcoat) * (1.0 - uRoughness*0.8));

    // Iridescence rim
    col += fres * hsv2rgb(vec3(fract(uHue + 0.5 + n.y*0.2), 0.85, 1.0)) * uIridescence * 0.7;

    // Translucency: back-light bleed
    float back = clamp(dot(-n, L), 0.0, 1.0);
    col += hsv2rgb(vec3(uHue + 0.05, uSaturation*0.9, 1.0)) * back * uTranslucency * 0.6;
  }

  col = mix(col, sky(rd)*0.3 + vec3(0.02,0.025,0.035), uFog * smoothstep(1.5, 6.0, tHit));
  float d = length(vUv - 0.5);
  col *= mix(1.0, smoothstep(0.9, 0.15, d), uVignette);
  outColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);
}
`;

export const materialFormsPipeline: Pipeline = {
  id: "material-forms",
  vs: BASE_VS,
  fs: FS,
  uniforms: [
    "uVariant", "uSize", "uSmoothness", "uCluster", "uDeform", "uTwist",
    "uCameraDist", "uCameraOrbit", "uCameraTilt",
    "uMetalness", "uRoughness", "uIridescence", "uTranslucency", "uClearcoat",
    "uLightAngle", "uLightIntensity",
    "uHue", "uSaturation", "uFog", "uVignette",
  ],
  project(artwork) {
    return {
      uVariant: paramNum(artwork, "form", "form.variant", 0),
      uSize: paramNum(artwork, "form", "form.size", 0.6),
      uSmoothness: paramNum(artwork, "form", "form.smoothness", 0.18),
      uCluster: paramNum(artwork, "form", "form.cluster", 3),
      uDeform: paramNum(artwork, "form", "form.deform", 0.25),
      uTwist: paramNum(artwork, "form", "form.twist", 0.4),
      uCameraDist: paramNum(artwork, "form", "form.cameraDist", 2.6),
      uCameraOrbit: paramNum(artwork, "form", "form.cameraOrbit", 0.4),
      uCameraTilt: paramNum(artwork, "form", "form.cameraTilt", 0.15),
      uMetalness: paramNum(artwork, "material", "material.metalness", 0.4),
      uRoughness: paramNum(artwork, "material", "material.roughness", 0.35),
      uIridescence: paramNum(artwork, "material", "material.iridescence", 0.2),
      uTranslucency: paramNum(artwork, "material", "material.translucency", 0.15),
      uClearcoat: paramNum(artwork, "material", "material.clearcoat", 0.35),
      uLightAngle: paramNum(artwork, "light", "light.angle", 1.2),
      uLightIntensity: paramNum(artwork, "light", "light.intensity", 1.0),
      uHue: paramNum(artwork, "color", "color.hue", 0.62),
      uSaturation: paramNum(artwork, "color", "color.saturation", 0.55),
      uFog: paramNum(artwork, "atmosphere", "atmosphere.fog", 0.25),
      uVignette: paramNum(artwork, "output", "output.vignette", 0.35),
    };
  },
};
