import { BASE_VS, paramNum, type Pipeline } from "./types";

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uVariant;
uniform float uCellSize;
uniform float uWeight;
uniform float uJitter;
uniform float uDissolve;
uniform float uMelt;
uniform float uFracture;
uniform float uSpeed;
uniform float uBreath;
uniform float uGrowth;
uniform float uSoftness;
uniform float uHue;
uniform float uContrast;
uniform float uVignette;

float hash(vec2 p){
  p = fract(p * vec2(51.13, 91.7));
  p += dot(p, p + 17.3);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

// SDF for a rounded glyph-like shape chosen per cell.
float glyph(vec2 p, float kind){
  p *= 1.2;
  vec2 b = vec2(0.28, 0.42);
  vec2 q = abs(p) - b;
  float box = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.08;
  float k = fract(kind * 7.13);
  float d = box;
  float c = length(p - vec2(0.0, 0.05 + 0.2*k)) - (0.14 + 0.1*k);
  d = max(d, -c);
  if (k > 0.55){
    float s = abs(p.x*0.7 + p.y*0.7) - 0.06;
    d = min(d, s - 0.02);
  }
  if (k > 0.3 && k < 0.7){
    float bar = max(abs(p.x) - 0.3, abs(p.y - 0.15) - 0.05);
    d = min(d, bar);
  }
  // fracture: cut with a diagonal slit driven by fracture
  if (uFracture > 0.01){
    float slit = abs(p.y - (k - 0.5) * uFracture * 1.2) - 0.02;
    d = max(d, -slit + (0.02 - uFracture*0.08));
  }
  return d;
}

vec3 palette(float t){
  vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0);
  vec3 d = vec3(uHue, uHue + 0.33, uHue + 0.66);
  return a + b * cos(6.28318 * (c*t + d));
}

// --- Variant renderers
vec3 renderGrid(vec2 frag, vec2 res){
  float cell = max(uCellSize, 6.0);
  // Whole grid marches sideways — makes the "choir" actually move.
  float march = uTime * uSpeed * cell * 0.6;
  vec2 gp = vec2(frag.x + march, frag.y);
  vec2 cellPos = floor(gp / cell);
  vec2 local = (fract(gp / cell) - 0.5) * 2.0;

  float k = hash(cellPos + floor(uSeed*0.01));
  // Stronger breath so pulsing is unmistakable.
  float breathe = 1.0 + uBreath * 0.55 * sin(uTime*uSpeed*2.5 + k*6.28);
  local /= breathe;
  vec2 jit = (vec2(hash(cellPos+3.1), hash(cellPos+7.7)) - 0.5) * uJitter * 0.6;
  local += jit;
  local.y += uMelt * (0.35 + 0.35*sin(uTime*uSpeed + k*6.28)) * (0.5 + 0.5*hash(cellPos+9.1));

  // growth: modulate weight per cell over time
  float grow = mix(0.6, 1.0, 0.5 + 0.5*sin(uTime*uSpeed*0.6 + k*6.28)) * (0.5 + uGrowth*0.8);

  // Cycle glyphs ~2 per second at speed=1 so letters visibly shuffle.
  float glyphTick = floor(uTime * (0.8 + uSpeed*1.6) + k*4.0) * 0.137;
  float d = glyph(local, k + glyphTick);
  float mask = 1.0 - smoothstep(-uSoftness, uSoftness, d - (uWeight - 0.5)*0.3 * grow);

  // dissolve: subtract random speckle
  if (uDissolve > 0.01){
    float sp = noise(frag*0.06 + uTime*0.3);
    mask *= smoothstep(uDissolve*0.9, uDissolve*0.4, sp);
  }

  vec3 bg = palette(k*0.4) * 0.08;
  vec3 fg = palette(k*0.7 + 0.2);
  return mix(bg, fg, mask);
}

vec3 renderRain(vec2 frag, vec2 res){
  float cell = max(uCellSize, 8.0);
  vec2 gp = frag / cell;
  vec2 col = vec2(floor(gp.x), 0.0);
  float colSeed = hash(col + floor(uSeed*0.01));
  float speed = (0.3 + 0.9 * colSeed) * uSpeed * cell * 4.0;
  float shift = uTime * speed;
  vec2 cellPos = vec2(floor(gp.x), floor(gp.y - shift/cell));
  vec2 local = (fract(vec2(gp.x, gp.y - shift/cell)) - 0.5) * 2.0;
  float k = hash(cellPos + 7.7);

  float d = glyph(local, k + floor(uTime * 3.0 * (0.4 + colSeed))*0.13);
  float mask = 1.0 - smoothstep(-uSoftness, uSoftness, d - (uWeight-0.5)*0.3);

  // vertical fade to give the "head is bright" look
  float rowFade = fract(gp.y - shift/cell + colSeed*10.0);
  float head = smoothstep(0.0, 0.15, 1.0 - rowFade);
  float tail = smoothstep(1.0, 0.2, rowFade);

  vec3 bg = vec3(0.01);
  vec3 fg = palette(0.2 + colSeed*0.1);
  vec3 headCol = mix(fg, vec3(1.0), 0.6);
  vec3 col2 = mix(bg, mix(fg*tail, headCol, head), mask);
  return col2;
}

vec3 renderMarquee(vec2 frag, vec2 res){
  // horizontal ribbons of glyphs sliding
  float rowH = max(uCellSize*1.4, 20.0);
  float rowIdx = floor(frag.y / rowH);
  float rowSeed = hash(vec2(rowIdx, floor(uSeed*0.01)));
  float dir = (rowSeed > 0.5) ? 1.0 : -1.0;
  float speed = (0.4 + 1.2*rowSeed) * uSpeed * 100.0 * dir;
  float x = frag.x + uTime * speed;
  float cell = max(uCellSize, 10.0);
  vec2 cellPos = vec2(floor(x/cell), rowIdx);
  vec2 local = vec2(fract(x/cell) - 0.5, (fract(frag.y/rowH) - 0.5)) * 2.0;
  local.y += 0.15 * sin(x*0.02 + rowIdx*1.7);
  local.y += uMelt * 0.4 * sin(uTime + rowIdx);

  float k = hash(cellPos + 3.3);
  float d = glyph(local, k + rowSeed*0.6);
  float mask = 1.0 - smoothstep(-uSoftness, uSoftness, d - (uWeight-0.5)*0.3);
  vec3 bg = palette(rowSeed*0.3) * 0.05;
  vec3 fg = palette(rowSeed*0.5 + 0.2);
  return mix(bg, fg, mask);
}

vec3 renderCloud(vec2 frag, vec2 res){
  // scattered floating glyphs in a word-cloud arrangement
  vec3 acc = vec3(0.0);
  vec2 uv = (frag / res - 0.5) * vec2(res.x/res.y, 1.0);
  int N = 22;
  for (int i = 0; i < 22; i++){
    float fi = float(i);
    float rs = hash(vec2(fi, floor(uSeed*0.01)));
    float rs2 = hash(vec2(fi*1.7, 3.3));
    float size = (0.06 + 0.14 * rs);
    vec2 c = vec2(rs - 0.5, rs2 - 0.5) * 1.4;
    // drift
    c += vec2(sin(uTime*(0.15 + rs*0.3) + fi), cos(uTime*(0.12 + rs2*0.3) + fi*1.3)) * (0.02 + uJitter*0.06);
    vec2 local = (uv - c) / size;
    float k = hash(vec2(fi*3.7, 9.1));
    float d = glyph(local, k);
    float mask = 1.0 - smoothstep(-uSoftness*4.0, uSoftness*4.0, d - (uWeight-0.5)*0.3);
    mask *= mix(0.6, 1.0, 0.5 + 0.5*sin(uTime*uSpeed + fi));
    if (uDissolve > 0.01){
      float sp = noise(uv*20.0 + fi + uTime*0.3);
      mask *= smoothstep(uDissolve*0.9, uDissolve*0.4, sp);
    }
    acc += palette(k*0.5 + 0.2) * mask;
  }
  return acc;
}

void main(){
  vec2 res = uResolution;
  vec2 frag = vUv * res;
  int variant = int(clamp(uVariant, 0.0, 3.0));

  vec3 col;
  if (variant == 0) col = renderGrid(frag, res);
  else if (variant == 1) col = renderRain(frag, res);
  else if (variant == 2) col = renderMarquee(frag, res);
  else col = renderCloud(frag, res);

  col = pow(col, vec3(uContrast));
  float dv = length(vUv - 0.5);
  col *= mix(1.0, smoothstep(0.9, 0.15, dv), uVignette);
  outColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);
}
`;

export const typographicOrganismsPipeline: Pipeline = {
  id: "typographic-organisms",
  vs: BASE_VS,
  fs: FS,
  uniforms: [
    "uVariant", "uCellSize", "uWeight", "uJitter",
    "uDissolve", "uMelt", "uFracture",
    "uSpeed", "uBreath", "uGrowth", "uSoftness",
    "uHue", "uContrast", "uVignette",
  ],
  project(artwork) {
    return {
      uVariant: paramNum(artwork, "form", "form.variant", 0),
      uCellSize: paramNum(artwork, "form", "form.cellSize", 32),
      uWeight: paramNum(artwork, "form", "form.weight", 0.55),
      uJitter: paramNum(artwork, "form", "form.jitter", 0.3),
      uDissolve: paramNum(artwork, "form", "form.dissolve", 0),
      uMelt: paramNum(artwork, "form", "form.melt", 0),
      uFracture: paramNum(artwork, "form", "form.fracture", 0),
      uSpeed: paramNum(artwork, "motion", "motion.speed", 0.4),
      uBreath: paramNum(artwork, "motion", "motion.breath", 0.4),
      uGrowth: paramNum(artwork, "motion", "motion.growth", 0.3),
      uSoftness: paramNum(artwork, "material", "material.softness", 0.02),
      uHue: paramNum(artwork, "color", "color.hue", 0.15),
      uContrast: paramNum(artwork, "color", "color.contrast", 1.1),
      uVignette: paramNum(artwork, "output", "output.vignette", 0.2),
    };
  },
};
