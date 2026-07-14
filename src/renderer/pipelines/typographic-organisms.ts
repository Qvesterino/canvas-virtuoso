import { BASE_VS, paramNum, type Pipeline } from "./types";

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uCellSize;
uniform float uWeight;
uniform float uJitter;
uniform float uSpeed;
uniform float uBreath;
uniform float uSoftness;
uniform float uHue;
uniform float uContrast;
uniform float uVignette;

float hash(vec2 p){
  p = fract(p * vec2(51.13, 91.7));
  p += dot(p, p + 17.3);
  return fract(p.x * p.y);
}

// SDF for a rounded glyph-like shape (composed of two arcs + a bar) chosen per cell
float glyph(vec2 p, float kind){
  p *= 1.2;
  // Base: rounded box
  vec2 b = vec2(0.28, 0.42);
  vec2 q = abs(p) - b;
  float box = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.08;
  // Cutouts vary by kind
  float k = fract(kind * 7.13);
  float d = box;
  // Interior circle cut
  float c = length(p - vec2(0.0, 0.05 + 0.2 * k)) - (0.14 + 0.1 * k);
  d = max(d, -c);
  // Diagonal stroke for some glyphs
  if (k > 0.55){
    float s = abs(p.x * 0.7 + p.y * 0.7) - 0.06;
    d = min(d, s - 0.02);
  }
  // Bar
  if (k > 0.3 && k < 0.7){
    float bar = max(abs(p.x) - 0.3, abs(p.y - 0.15) - 0.05);
    d = min(d, bar);
  }
  return d;
}

vec3 palette(float t){
  vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0);
  vec3 d = vec3(uHue, uHue + 0.33, uHue + 0.66);
  return a + b * cos(6.28318 * (c*t + d));
}

void main(){
  vec2 res = uResolution;
  vec2 frag = vUv * res;
  float cell = max(uCellSize, 6.0);
  vec2 cellPos = floor(frag / cell);
  vec2 local = (fract(frag / cell) - 0.5) * 2.0;

  float k = hash(cellPos + floor(uSeed * 0.01));
  float breathe = 1.0 + uBreath * 0.25 * sin(uTime * uSpeed * 2.0 + k * 6.28);
  local /= breathe;
  vec2 jit = (vec2(hash(cellPos + 3.1), hash(cellPos + 7.7)) - 0.5) * uJitter * 0.6;
  local += jit;

  float d = glyph(local, k + floor(uTime * uSpeed * 0.5 + k * 4.0) * 0.11);
  float mask = 1.0 - smoothstep(-uSoftness, uSoftness, d - (uWeight - 0.5) * 0.3);

  vec3 bg = palette(k * 0.4) * 0.08;
  vec3 fg = palette(k * 0.7 + 0.2);
  vec3 col = mix(bg, fg, mask);
  col = pow(col, vec3(uContrast));

  float dv = length(vUv - 0.5);
  col *= mix(1.0, smoothstep(0.85, 0.2, dv), uVignette);
  outColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);
}
`;

export const typographicOrganismsPipeline: Pipeline = {
  id: "typographic-organisms",
  vs: BASE_VS,
  fs: FS,
  uniforms: [
    "uCellSize", "uWeight", "uJitter",
    "uSpeed", "uBreath", "uSoftness",
    "uHue", "uContrast", "uVignette",
  ],
  project(artwork) {
    return {
      uCellSize: paramNum(artwork, "form", "form.cellSize", 32),
      uWeight: paramNum(artwork, "form", "form.weight", 0.55),
      uJitter: paramNum(artwork, "form", "form.jitter", 0.3),
      uSpeed: paramNum(artwork, "motion", "motion.speed", 0.4),
      uBreath: paramNum(artwork, "motion", "motion.breath", 0.4),
      uSoftness: paramNum(artwork, "material", "material.softness", 0.02),
      uHue: paramNum(artwork, "color", "color.hue", 0.15),
      uContrast: paramNum(artwork, "color", "color.contrast", 1.1),
      uVignette: paramNum(artwork, "output", "output.vignette", 0.2),
    };
  },
};
