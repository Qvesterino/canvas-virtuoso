import { BASE_VS, paramNum, type Pipeline } from "./types";

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uVariant;
uniform float uDensity;
uniform float uDetail;
uniform float uWarp;
uniform float uScale;
uniform float uStructure;
uniform float uSpeed;
uniform float uTurbulence;
uniform float uDrift;
uniform float uHue;
uniform float uSpread;
uniform float uContrast;
uniform float uLuminosity;
uniform float uBloom;
uniform float uGrain;
uniform float uVignette;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1,0));
  float c = hash(i + vec2(0,1));
  float d = hash(i + vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p, int oct){
  float v = 0.0, amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    v += amp * vnoise(p);
    p = rot * p * 2.02 + vec2(37.0, 17.0);
    amp *= 0.5;
  }
  return v;
}
float ridged(vec2 p, int oct){
  float v = 0.0, amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
    n *= n;
    v += amp * n;
    p = rot * p * 2.1 + 7.3;
    amp *= 0.5;
  }
  return v;
}
vec2 curl(vec2 p, float t){
  float e = 0.1;
  float n1 = fbm(p + vec2(0.0, t*0.3), 4);
  float n2 = fbm(p + vec2(5.2, -t*0.25), 4);
  float d1 = (fbm(p + vec2(0.0, e), 4) - fbm(p - vec2(0.0, e), 4)) / (2.0*e);
  float d2 = (fbm(p + vec2(e, 0.0), 4) - fbm(p - vec2(e, 0.0), 4)) / (2.0*e);
  return vec2(n1 * 0.2 + d1, n2 * 0.2 - d2);
}
vec3 palette(float t){
  vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0);
  vec3 d = vec3(uHue, uHue + 0.33, uHue + 0.66);
  return a + b * cos(6.28318 * (c * t + d));
}

float fieldCosmic(vec2 p, float t, int oct){
  vec2 q = vec2(fbm(p + vec2(0.0, t*0.6), oct),
                fbm(p + vec2(5.2, -t*0.5), oct));
  vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7 + t*uTurbulence, 9.2), oct),
                fbm(p + 4.0*q + vec2(8.3, 2.8 - t*uTurbulence), oct));
  return fbm(p + uWarp * 4.0 * r + vec2(uDrift*t, 0.0), oct);
}
float fieldCurl(vec2 p, float t, int oct){
  // advect by curl-like flow for coherent large-scale streaks
  vec2 q = p;
  for (int i = 0; i < 3; i++){
    q += curl(q * 0.9 + vec2(t*0.15, uDrift*t), t) * (0.35 + uTurbulence*0.4);
  }
  return fbm(q * 1.2 + vec2(t*0.1, 0.0), oct);
}
float fieldRidged(vec2 p, float t, int oct){
  vec2 q = p * 1.4;
  q += 0.6 * uWarp * vec2(fbm(q + t*0.2, oct), fbm(q + 5.0 - t*0.2, oct));
  return ridged(q + vec2(uDrift*t, t*0.05), oct);
}
float fieldCells(vec2 p, float t, int oct){
  // reaction-cell approximation: two competing fbms interfered
  float a = fbm(p * 1.3 + vec2(t*0.2, 0.0), oct);
  float b = fbm(p * 2.6 - vec2(0.0, t*0.15), oct);
  float c = smoothstep(0.35, 0.65, a - b*0.6 + 0.5);
  return c * 0.7 + a * 0.3;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x/uResolution.y, 1.0);
  p *= uDensity * uScale;
  float t = uTime * uSpeed + uSeed * 0.001;
  int oct = int(clamp(uDetail, 1.0, 6.0));
  int variant = int(clamp(uVariant, 0.0, 3.0));

  float f;
  if (variant == 0) f = fieldCosmic(p, t, oct);
  else if (variant == 1) f = fieldCurl(p, t, oct);
  else if (variant == 2) f = fieldRidged(p, t, oct);
  else f = fieldCells(p, t, oct);

  // Large-scale coherent structure lift
  float macro = fbm(p * 0.25 + vec2(t*0.05, -t*0.03), 3);
  f = mix(f, 0.5 + 0.5*(f - 0.5) + (macro - 0.5)*0.6, uStructure);

  float shade = smoothstep(0.15, 0.95, f);
  shade = pow(shade, uContrast);

  vec3 col = palette(f * uSpread + uHue) * uLuminosity;
  col *= mix(0.35, 1.25, shade);

  float halo = smoothstep(0.4, 1.1, f);
  col += halo * uBloom * palette(f * uSpread + uHue + 0.1) * 0.7;

  float d = length(uv - 0.5);
  col *= mix(1.0, smoothstep(0.9, 0.15, d), uVignette);

  float g = hash(gl_FragCoord.xy + uTime * 60.0) - 0.5;
  col += g * uGrain;

  outColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}
`;

export const livingFieldsPipeline: Pipeline = {
  id: "living-fields",
  vs: BASE_VS,
  fs: FS,
  uniforms: [
    "uVariant",
    "uDensity", "uDetail", "uWarp", "uScale", "uStructure",
    "uSpeed", "uTurbulence", "uDrift",
    "uHue", "uSpread", "uContrast", "uLuminosity",
    "uBloom", "uGrain", "uVignette",
  ],
  project(artwork) {
    return {
      uVariant: paramNum(artwork, "form", "form.variant", 0),
      uDensity: paramNum(artwork, "form", "form.density", 2.2),
      uDetail: paramNum(artwork, "form", "form.detail", 4),
      uWarp: paramNum(artwork, "form", "form.warp", 0.85),
      uScale: paramNum(artwork, "form", "form.scale", 1),
      uStructure: paramNum(artwork, "form", "form.structure", 0.55),
      uSpeed: paramNum(artwork, "motion", "motion.speed", 0.35),
      uTurbulence: paramNum(artwork, "motion", "motion.turbulence", 0.6),
      uDrift: paramNum(artwork, "motion", "motion.drift", 0.15),
      uHue: paramNum(artwork, "color", "color.hue", 0.55),
      uSpread: paramNum(artwork, "color", "color.spread", 0.35),
      uContrast: paramNum(artwork, "color", "color.contrast", 1.05),
      uLuminosity: paramNum(artwork, "color", "color.luminosity", 0.95),
      uBloom: paramNum(artwork, "light", "light.bloom", 0.55),
      uGrain: paramNum(artwork, "light", "light.grain", 0.04),
      uVignette: paramNum(artwork, "output", "output.vignette", 0.35),
    };
  },
};
