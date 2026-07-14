import { BASE_VS, paramNum, type Pipeline } from "./types";

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uVariant;
uniform float uBrush;
uniform float uStrokes;
uniform float uSources;
uniform float uIntensity;
uniform float uFlow;
uniform float uChaos;
uniform float uPulse;
uniform float uPersistence;
uniform float uBleed;
uniform float uHue;
uniform float uSpread;
uniform float uContrast;
uniform float uVignette;
uniform sampler2D uPrev;
uniform float uFeedback;

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
  for (int i = 0; i < 5; i++){ v += amp*noise(p); p = p*2.03 + 11.0; amp *= 0.5; }
  return v;
}
vec3 palette(float t){
  vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0);
  vec3 d = vec3(uHue, uHue + 0.28, uHue + 0.6);
  return a + b * cos(6.28318 * (c*t + d));
}

// A soft brush deposit centered at c with radius r.
float brush(vec2 p, vec2 c, float r){
  float d = length(p - c);
  return smoothstep(r, 0.0, d);
}

// ---- Source variants — each returns (colorContribution)
vec3 sourceFlow(vec2 p, float t){
  vec3 acc = vec3(0.0);
  int n = int(clamp(uStrokes, 1.0, 4.0));
  for (int i = 0; i < 4; i++){
    if (i >= n) break;
    float fi = float(i);
    float dt = fi * 0.4;
    vec2 flow = vec2(fbm(p*(1.0+uBleed) + vec2(0.0, t-dt)),
                     fbm(p*(1.0+uBleed) + vec2(5.2,-t+dt)));
    vec2 pp = p + (flow - 0.5) * uChaos * 1.5;
    float f = fbm(pp*(1.0 + uBrush*2.0) + vec2(t*0.2,-t*0.15) + fi*3.1);
    vec3 col = palette(f*uSpread + uHue + fi*0.05);
    acc += col * smoothstep(0.1, 0.9, f) * (0.7 + 0.3*sin(t + fi));
  }
  return acc / max(float(n), 1.0);
}
vec3 sourceOrbits(vec2 p, float t){
  vec3 acc = vec3(0.0);
  int n = int(clamp(uSources, 1.0, 8.0));
  for (int i = 0; i < 8; i++){
    if (i >= n) break;
    float fi = float(i);
    float r = 0.25 + 0.35 * fract(fi * 0.371 + uSeed*0.001);
    float sp = (0.4 + 0.6*hash(vec2(fi, 3.1))) * (0.6 + uFlow);
    float ph = fi * 1.7 + uSeed*0.0005;
    vec2 c = vec2(cos(t*sp + ph), sin(t*sp*1.13 + ph*1.4)) * r;
    float b = brush(p, c, 0.02 + uBrush*0.12);
    vec3 col = palette(fi*0.13 + uHue);
    acc += col * b;
  }
  return acc;
}
vec3 sourceLissajous(vec2 p, float t){
  vec3 acc = vec3(0.0);
  int n = int(clamp(uSources, 1.0, 8.0));
  for (int i = 0; i < 8; i++){
    if (i >= n) break;
    float fi = float(i);
    float a = 2.0 + mod(fi, 4.0);
    float b = 3.0 + mod(fi*1.7, 5.0);
    float sp = 0.3 + 0.15*fi + uFlow*0.5;
    vec2 c = vec2(sin(t*sp*a + fi), sin(t*sp*b + fi*1.7)) * 0.55;
    // draw a trailing ribbon by sampling a few timepoints
    for (int k = 0; k < 6; k++){
      float dt = float(k) * 0.05;
      vec2 c2 = vec2(sin((t-dt)*sp*a + fi), sin((t-dt)*sp*b + fi*1.7)) * 0.55;
      float bb = brush(p, c2, 0.008 + uBrush*0.03) * (1.0 - float(k)*0.15);
      acc += palette(fi*0.11 + uHue + dt) * bb;
    }
  }
  return acc;
}
vec3 sourcePlumes(vec2 p, float t){
  // rising smoke plumes from bottom
  vec3 acc = vec3(0.0);
  int n = int(clamp(uSources, 1.0, 8.0));
  for (int i = 0; i < 8; i++){
    if (i >= n) break;
    float fi = float(i);
    float x0 = -0.7 + 1.4*fract(fi*0.317 + uSeed*0.0003);
    float rise = mod(t*(0.15 + 0.15*hash(vec2(fi,7.7))) + fi*0.3, 1.6) - 0.8;
    float wob = sin(t*0.7 + fi + rise*4.0) * (0.12 + uChaos*0.25);
    vec2 c = vec2(x0 + wob*rise*0.5, -0.6 + rise);
    float b = brush(p, c, 0.03 + uBrush*0.15 + max(rise, 0.0)*0.1);
    // fade with height
    float k = smoothstep(0.7, -0.5, rise);
    acc += palette(fi*0.09 + uHue + rise*0.2) * b * k;
  }
  return acc;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x/uResolution.y, 1.0);
  float t = uTime * (0.15 + uFlow*0.5) + uSeed * 0.0007;
  int variant = int(clamp(uVariant, 0.0, 3.0));

  vec3 fresh;
  if (variant == 0) fresh = sourceFlow(p, t);
  else if (variant == 1) fresh = sourceOrbits(p, t);
  else if (variant == 2) fresh = sourceLissajous(p, t);
  else fresh = sourcePlumes(p, t);

  // pulse
  float pulse = 1.0 + uPulse * 0.6 * sin(uTime * 2.5);
  fresh *= uIntensity * pulse;

  // subtle background wash so canvas never looks black on cold start
  vec3 wash = palette(fbm(p*0.4 + t*0.05) * uSpread + uHue) * 0.06;
  fresh += wash;

  // Feedback: sample previous frame with drift so trails flow.
  vec2 drift = (vec2(fbm(p*0.6 + vec2(0.0, t)),
                     fbm(p*0.6 + vec2(7.3, -t))) - 0.5) * (0.004 + uBleed*0.02);
  vec3 prev = texture(uPrev, uv + drift).rgb;
  float k = clamp(uPersistence, 0.0, 0.985) * uFeedback;
  // Weighted blend: converges to `fresh` but slowly, so trails read as
  // strokes accumulating over time instead of runaway addition (which
  // saturated the whole canvas white after a few seconds at high
  // persistence). A tiny floor decay stops static energy from getting
  // trapped in dead pixels.
  vec3 col = mix(fresh, prev, k);
  col = max(col - vec3(0.0015), 0.0);
  col = min(col, vec3(1.5));

  col = pow(col, vec3(uContrast));

  float d = length(uv - 0.5);
  col *= mix(1.0, smoothstep(0.9, 0.15, d), uVignette);
  outColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);
}
`;

export const temporalPaintingsPipeline: Pipeline = {
  id: "temporal-paintings",
  vs: BASE_VS,
  fs: FS,
  feedback: true,
  uniforms: [
    "uVariant", "uBrush", "uStrokes", "uSources", "uIntensity",
    "uFlow", "uChaos", "uPulse",
    "uPersistence", "uBleed",
    "uHue", "uSpread", "uContrast", "uVignette",
    "uFeedback",
  ],
  project(artwork) {
    return {
      uVariant: paramNum(artwork, "form", "form.variant", 0),
      uBrush: paramNum(artwork, "form", "form.brush", 0.6),
      uStrokes: paramNum(artwork, "form", "form.strokes", 3),
      uSources: paramNum(artwork, "form", "form.sources", 4),
      uIntensity: paramNum(artwork, "form", "form.intensity", 1.0),
      uFlow: paramNum(artwork, "motion", "motion.flow", 0.5),
      uChaos: paramNum(artwork, "motion", "motion.chaos", 0.35),
      uPulse: paramNum(artwork, "motion", "motion.pulse", 0.3),
      uPersistence: paramNum(artwork, "memory", "memory.persistence", 0.72),
      uBleed: paramNum(artwork, "memory", "memory.bleed", 0.4),
      uFeedback: paramNum(artwork, "memory", "memory.feedback", 1.0),
      uHue: paramNum(artwork, "color", "color.hue", 0.4),
      uSpread: paramNum(artwork, "color", "color.spread", 0.5),
      uContrast: paramNum(artwork, "color", "color.contrast", 1.1),
      uVignette: paramNum(artwork, "output", "output.vignette", 0.25),
    };
  },
};
