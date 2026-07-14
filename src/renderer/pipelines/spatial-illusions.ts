import { BASE_VS, paramNum, type Pipeline } from "./types";

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uVariant;
uniform float uDepth;
uniform float uTwist;
uniform float uRings;
uniform float uRepeat;
uniform float uCameraSway;
uniform float uSpeed;
uniform float uWarble;
uniform float uBloom;
uniform float uFog;
uniform float uHue;
uniform float uContrast;
uniform float uVignette;
uniform float uMirrors;
uniform float uSymmetry;
uniform float uRipple;
uniform float uRotation;
uniform float uKernel;
uniform float uCells;
uniform float uProjection;
uniform float uTempo;

vec3 palette(float t){
  vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0);
  vec3 d = vec3(uHue, uHue + 0.33, uHue + 0.66);
  return a + b * cos(6.28318 * (c*t + d));
}
mat2 rot2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

float hash21(vec2 p){
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash21(i), b = hash21(i+vec2(1,0));
  float c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

// -------- Kaleidoscope (variant 4) — mirrors, symmetry, ripple, rotation, kernel
vec3 kaleidoscope(vec2 uv, float t){
  float rot = t * uRotation * 0.6 + uSeed * 0.0003;
  vec2 p = rot2(rot) * uv;
  float r = length(p);
  // Radial ripple that warps the sampling radius.
  r += sin(r * (6.0 + uRings*0.4) - t*1.4) * uRipple * 0.08;
  float a = atan(p.y, p.x);
  float n = max(uMirrors, 2.0);
  float wedge = 6.28318 / n;
  // Fold angle into a single mirrored wedge.
  a = mod(a, wedge);
  a = abs(a - wedge*0.5);
  // Soft symmetry — high symmetry = crisp mirrors, low = smeared.
  float soft = mix(0.35, 0.0, clamp(uSymmetry, 0.0, 1.0));
  a += (vnoise(vec2(r*4.0, t*0.5)) - 0.5) * soft;
  vec2 q = vec2(cos(a), sin(a)) * r;

  int k = int(clamp(uKernel, 0.0, 3.0));
  float pattern;
  if (k == 0){
    // Stripes radiating outward.
    pattern = 0.5 + 0.5 * sin(q.x * (8.0 + uRings*0.6) + t*0.8);
  } else if (k == 1){
    // Petals — rings modulated by angle.
    float rings = 0.5 + 0.5 * sin(r*(10.0 + uRings*0.3) - t*1.2);
    float petals = 0.5 + 0.5 * cos(a * n * 2.0 + t*0.7);
    pattern = mix(rings, petals, 0.5);
  } else if (k == 2){
    // Crystal shards — hard voronoi-ish cells.
    vec2 g = floor(q * (3.0 + uRings*0.3));
    vec2 f = fract(q * (3.0 + uRings*0.3)) - 0.5;
    float d = length(f);
    pattern = smoothstep(0.5, 0.0, d) + hash21(g) * 0.4;
  } else {
    // Galaxy — swirl of noise around the origin.
    float swirl = atan(q.y, q.x) + length(q) * (2.5 + uTwist);
    pattern = vnoise(vec2(swirl*1.2, length(q)*3.0 - t*0.3));
  }

  // Bright core & darkening ring, so it reads as a *thing*, not a gradient.
  float core = smoothstep(0.6, 0.0, r);
  float halo = smoothstep(0.15, 0.6, r) * smoothstep(1.2, 0.6, r);

  vec3 col = palette(pattern * 0.8 + r * 0.2 + t*0.03);
  col *= 0.35 + 0.9 * pattern;
  col += core * palette(t*0.1) * uBloom * 0.9;
  col += halo * palette(pattern + 0.3) * 0.15;
  col = mix(col, vec3(0.02,0.02,0.03), uFog * smoothstep(0.4, 1.4, r));
  return col;
}

// -------- Hypercube grid (variant 5) — tesseract wireframe projection
float sdBoxFrame(vec3 p, vec3 b, float e){
  p = abs(p) - b;
  vec3 q = abs(p + e) - e;
  return min(min(
    length(max(vec3(p.x, q.y, q.z), 0.0)) + min(max(p.x, max(q.y, q.z)), 0.0),
    length(max(vec3(q.x, p.y, q.z), 0.0)) + min(max(q.x, max(p.y, q.z)), 0.0)),
    length(max(vec3(q.x, q.y, p.z), 0.0)) + min(max(q.x, max(q.y, p.z)), 0.0));
}
float sceneHyper(vec3 p){
  float rep = max(1.6 / max(uCells, 1.0), 0.35) * max(uRepeat, 0.6);
  vec3 q = p;
  // Separate tempo scaler so Cube Cascade vs Tesseract Grid can beat at
  // their own rate independent of camera motion.speed. uSpeed drives the
  // rig, uTempo scales the *internal* rotation clock only.
  float ts = uTime * max(uSpeed, 0.0) * max(uTempo, 0.0);
  float ca = cos(ts*0.35), sa = sin(ts*0.35);
  q.xy = mat2(ca, -sa, sa, ca) * q.xy;
  float cb = cos(ts*0.25 + uTwist), sb = sin(ts*0.25 + uTwist);
  q.xz = mat2(cb, -sb, sb, cb) * q.xz;
  q = mod(q + rep*0.5, rep) - rep*0.5;
  float outer = sdBoxFrame(q, vec3(rep*0.42), 0.03);
  // Inner projected cube — the 4D→3D "shadow" that pulses in scale.
  float pulse = 1.0 + uProjection * (0.4 + 0.35*sin(ts*1.2));
  float inner = sdBoxFrame(q * pulse, vec3(rep*0.24), 0.02) / pulse;
  return min(outer, inner);
}

// -------- SDFs
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.0)) + min(max(q.x, max(q.y,q.z)),0.0); }
float sdCyl(vec3 p, float r, float h){
  vec2 d = vec2(length(p.xz) - r, abs(p.y) - h);
  return min(max(d.x, d.y), 0.0) + length(max(d,0.0));
}
float sdCross(vec3 p, float s){
  float d1 = sdBox(p, vec3(1e4, s, s));
  float d2 = sdBox(p, vec3(s, 1e4, s));
  float d3 = sdBox(p, vec3(s, s, 1e4));
  return min(d1, min(d2, d3));
}

// ---- variants
// 0 — Ring tunnel (procedural post-effect style, not raymarched)
vec3 tunnelRings(vec2 uv, float t){
  vec2 p = uv;
  float r = length(p);
  float a = atan(p.y, p.x);
  float w = sin(a*3.0 + uTime*1.3) * uWarble * 0.05;
  r += w;
  float z = uDepth / max(r, 0.001) + uTime*uSpeed;
  float ta = a + z*uTwist*0.3 + uSeed*0.0005;
  float ringCount = max(uRings, 2.0);
  float ring = fract(z * 0.5);
  float ridge = smoothstep(0.02, 0.5, abs(ring - 0.5));
  float stripes = 0.5 + 0.5*sin(ta*ringCount);
  float pattern = mix(ridge, stripes, 0.5);
  float depthFade = 1.0 - smoothstep(0.0, 1.6, r);
  vec3 col = palette(pattern*0.7 + z*0.02) * (0.2 + 0.9*depthFade);
  col += pow(depthFade, 3.0) * uBloom * palette(z*0.05);
  col = mix(col, vec3(0.02,0.02,0.03), uFog * (1.0 - depthFade));
  return col;
}

// 1 — Hall of columns (raymarched)
float sceneHall(vec3 p){
  // repeated columns along XZ, floor and ceiling
  float rep = max(uRepeat, 0.6);
  vec3 q = p;
  q.xz = mod(q.xz + rep*0.5, rep) - rep*0.5;
  float col = sdCyl(q, 0.18 + 0.05*sin(p.y*0.4 + uTime*0.5), 6.0);
  float floorD = p.y + 1.2;
  float ceilD = 1.2 - p.y;
  return min(col, min(floorD, ceilD));
}

// 2 — Menger fractal
float sceneMenger(vec3 p){
  float d = sdBox(p, vec3(1.2));
  float s = 1.0;
  for (int m = 0; m < 4; m++){
    vec3 a = mod(p*s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = 1.0 - 3.0*abs(a);
    float c = (min(max(r.x, r.y), min(max(r.y,r.z), max(r.z,r.x)))) / s;
    d = max(d, c);
  }
  return d;
}

// 3 — Cathedral: arches and vaults via repeated boxes with negated cylinders
float sceneCathedral(vec3 p){
  float rep = max(uRepeat, 0.8);
  vec3 q = p;
  q.z = mod(q.z + rep*0.5, rep) - rep*0.5;
  float pillar = sdBox(vec3(q.x - sign(q.x)*1.0, q.y*0.8, q.z), vec3(0.14, 1.6, 0.14));
  // Arch cutouts
  vec3 a1 = vec3(q.x, q.y - 0.6, q.z);
  a1.y *= 1.4;
  float arch = length(a1) - 0.9;
  float wall = sdBox(vec3(q.x, q.y, q.z), vec3(1.2, 1.4, 0.08));
  float wallCut = max(wall, -arch);
  float floorD = p.y + 1.3;
  float ceilD = sdBox(vec3(p.x, p.y - 1.6, q.z), vec3(1.4, 0.1, 0.6)) - 0.05;
  return min(min(pillar, wallCut), min(floorD, ceilD));
}

float sceneRM(vec3 p){
  int v = int(clamp(uVariant, 0.0, 5.0));
  if (v == 1) return sceneHall(p);
  if (v == 2) return sceneMenger(p);
  if (v == 3) return sceneCathedral(p);
  return sceneHyper(p);
}
vec3 normalRM(vec3 p){
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    sceneRM(p+e.xyy) - sceneRM(p-e.xyy),
    sceneRM(p+e.yxy) - sceneRM(p-e.yxy),
    sceneRM(p+e.yyx) - sceneRM(p-e.yyx)));
}

vec3 renderRaymarched(vec2 uv){
  // camera moves forward through repeat units
  float t = uTime * uSpeed;
  int vr = int(clamp(uVariant, 0.0, 5.0));
  // The Menger fractal fills a 1.2-radius cube around the origin — starting
  // the camera at z≈0 puts every ray immediately inside a solid, which
  // returned a hit at ro with a zero normal and rendered as black.
  // Pull the camera back so we descend TOWARD the fractal instead.
  float zStart = (vr == 2) ? -3.5 : 0.0;
  vec3 ro = vec3(sin(t*0.3)*uCameraSway*0.6, 0.15*sin(t*0.4)*uCameraSway, zStart + t*0.6);
  vec3 fwd = normalize(vec3(sin(t*0.15)*uCameraSway*0.15, -0.05, 1.0));
  vec3 right = normalize(cross(vec3(0,1,0), fwd));
  vec3 up = cross(fwd, right);
  vec3 rd = normalize(fwd*1.4 + right*uv.x + up*uv.y);

  float tHit = 0.0;
  float minD = 1e3;
  bool hit = false;
  vec3 p = ro;
  for (int i = 0; i < 128; i++){
    p = ro + rd*tHit;
    float d = sceneRM(p);
    minD = min(minD, d);
    if (d < 0.001){ hit = true; break; }
    tHit += d * 0.9;
    if (tHit > 40.0) break;
  }

  vec3 base = vec3(0.02, 0.025, 0.035);
  if (hit){
    vec3 n = normalRM(p);
    vec3 L = normalize(vec3(0.4, 0.8, -0.3));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float ambient = 0.15;
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    float depthT = clamp(tHit / 30.0, 0.0, 1.0);
    vec3 col = palette(depthT*0.6 + p.z*0.03) * (ambient + 0.9*diff);
    col += fres * palette(0.2 + depthT) * uBloom * 0.5;
    // volumetric fog along ray
    float fog = 1.0 - exp(-depthT * (1.5 + uFog*4.0));
    col = mix(col, palette(0.7)*0.15 + vec3(0.02,0.02,0.03), fog);
    return col;
  }
  // sky / end-of-corridor glow
  float glow = exp(-minD * (2.0 + uFog*4.0));
  return base + palette(0.5) * glow * uBloom;
}

void main(){
  vec2 uv = (vUv - 0.5) * vec2(uResolution.x/uResolution.y, 1.0);
  int variant = int(clamp(uVariant, 0.0, 5.0));
  vec3 col;
  if (variant == 0)      col = tunnelRings(uv, uTime);
  else if (variant == 4) col = kaleidoscope(uv, uTime);
  else                    col = renderRaymarched(uv);

  col = pow(col, vec3(uContrast));
  float d = length(vUv - 0.5);
  col *= mix(1.0, smoothstep(0.9, 0.15, d), uVignette);
  outColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);
}
`;

export const spatialIllusionsPipeline: Pipeline = {
  id: "spatial-illusions",
  vs: BASE_VS,
  fs: FS,
  uniforms: [
    "uVariant", "uDepth", "uTwist", "uRings", "uRepeat", "uCameraSway",
    "uSpeed", "uWarble",
    "uBloom", "uFog",
    "uHue", "uContrast", "uVignette",
    "uMirrors", "uSymmetry", "uRipple", "uRotation", "uKernel",
    "uCells", "uProjection", "uTempo",
  ],
  project(artwork) {
    return {
      uVariant: paramNum(artwork, "form", "form.variant", 0),
      uDepth: paramNum(artwork, "form", "form.depth", 1.2),
      uTwist: paramNum(artwork, "form", "form.twist", 0.5),
      uRings: paramNum(artwork, "form", "form.rings", 10),
      uRepeat: paramNum(artwork, "form", "form.repeat", 1.6),
      uCameraSway: paramNum(artwork, "form", "form.cameraSway", 0.35),
      uSpeed: paramNum(artwork, "motion", "motion.speed", 0.35),
      uWarble: paramNum(artwork, "motion", "motion.warble", 0.25),
      uBloom: paramNum(artwork, "light", "light.bloom", 0.55),
      uFog: paramNum(artwork, "atmosphere", "atmosphere.fog", 0.5),
      uHue: paramNum(artwork, "color", "color.hue", 0.68),
      uContrast: paramNum(artwork, "color", "color.contrast", 1.2),
      uVignette: paramNum(artwork, "output", "output.vignette", 0.45),
      uMirrors: paramNum(artwork, "form", "form.mirrors", 6),
      uSymmetry: paramNum(artwork, "form", "form.symmetry", 0.85),
      uRipple: paramNum(artwork, "form", "form.ripple", 0.4),
      uRotation: paramNum(artwork, "form", "form.rotation", 0.25),
      uKernel: paramNum(artwork, "form", "form.kernel", 1),
      uCells: paramNum(artwork, "form", "form.cells", 4),
      uProjection: paramNum(artwork, "form", "form.projection", 0.7),
      uTempo: paramNum(artwork, "form", "form.tempo", 1.0),
    };
  },
};
