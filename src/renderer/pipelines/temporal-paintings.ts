import { BASE_VS, paramNum, type Pipeline } from "./types";

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uBrush;
uniform float uStrokes;
uniform float uFlow;
uniform float uChaos;
uniform float uPersistence;
uniform float uBleed;
uniform float uHue;
uniform float uSpread;
uniform float uContrast;
uniform float uVignette;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1,0)),
        c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++){
    v += amp * noise(p);
    p = p * 2.03 + 11.0;
    amp *= 0.5;
  }
  return v;
}

vec3 palette(float t){
  vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0);
  vec3 d = vec3(uHue, uHue + 0.28, uHue + 0.6);
  return a + b * cos(6.28318 * (c*t + d));
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x/uResolution.y, 1.0);
  float t = uTime * (0.15 + uFlow * 0.5) + uSeed * 0.0007;

  vec3 accum = vec3(0.0);
  float wsum = 0.0;
  int n = int(clamp(uStrokes, 1.0, 6.0));
  for (int i = 0; i < 6; i++){
    if (i >= n) break;
    float fi = float(i);
    // temporal memory: sample earlier "time-slices" with decreasing weight
    float dt = fi * (0.4 + uPersistence * 1.8);
    float w = pow(uPersistence, fi);
    vec2 flow = vec2(
      fbm(p * (1.0 + uBleed) + vec2(0.0, t - dt)),
      fbm(p * (1.0 + uBleed) + vec2(5.2, -t + dt))
    );
    vec2 pp = p + (flow - 0.5) * uChaos * 1.5;
    float f = fbm(pp * (1.0 + uBrush * 2.0) + vec2(t*0.2, -t*0.15) + fi*3.1);
    vec3 col = palette(f * uSpread + uHue + fi * 0.05);
    accum += col * w * smoothstep(0.1, 0.9, f);
    wsum += w;
  }
  vec3 col = accum / max(wsum, 0.001);
  col = pow(col, vec3(uContrast));

  float d = length(uv - 0.5);
  col *= mix(1.0, smoothstep(0.85, 0.2, d), uVignette);
  outColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);
}
`;

export const temporalPaintingsPipeline: Pipeline = {
  id: "temporal-paintings",
  vs: BASE_VS,
  fs: FS,
  uniforms: [
    "uBrush", "uStrokes", "uFlow", "uChaos",
    "uPersistence", "uBleed",
    "uHue", "uSpread", "uContrast", "uVignette",
  ],
  project(artwork) {
    return {
      uBrush: paramNum(artwork, "form", "form.brush", 0.6),
      uStrokes: paramNum(artwork, "form", "form.strokes", 3),
      uFlow: paramNum(artwork, "motion", "motion.flow", 0.5),
      uChaos: paramNum(artwork, "motion", "motion.chaos", 0.35),
      uPersistence: paramNum(artwork, "memory", "memory.persistence", 0.72),
      uBleed: paramNum(artwork, "memory", "memory.bleed", 0.4),
      uHue: paramNum(artwork, "color", "color.hue", 0.4),
      uSpread: paramNum(artwork, "color", "color.spread", 0.5),
      uContrast: paramNum(artwork, "color", "color.contrast", 1.1),
      uVignette: paramNum(artwork, "output", "output.vignette", 0.25),
    };
  },
};
