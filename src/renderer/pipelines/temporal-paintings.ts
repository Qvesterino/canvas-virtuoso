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

// 4 — Ink calligraphy: sharp anisotropic strokes with dry-brush texture.
vec3 sourceInk(vec2 p, float t){
  vec3 acc = vec3(0.0);
  int n = int(clamp(uStrokes, 1.0, 5.0));
  for (int i = 0; i < 5; i++){
    if (i >= n) break;
    float fi = float(i);
    float ang = hash(vec2(fi, 3.1)) * 6.28318;
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 nrm = vec2(-dir.y, dir.x);
    float phase = mod(t*0.4 + fi*0.7, 2.0) - 1.0;
    vec2 c = dir * phase * 0.9 + nrm * (hash(vec2(fi, 9.3)) - 0.5) * 0.5;
    vec2 rel = p - c;
    float along = dot(rel, dir);
    float across = dot(rel, nrm);
    float len = 0.18 + uBrush * 0.45;
    float body = smoothstep(0.02 + uBrush*0.05, 0.0, abs(across))
               * smoothstep(len, 0.0, abs(along));
    float dry = 0.4 + 0.6 * noise(vec2(along*40.0 + fi, across*20.0));
    body *= dry;
    vec3 tint = mix(vec3(0.015), palette(fi*0.1 + uHue), 0.4);
    acc += tint * body;
  }
  return acc;
}

// 5 — Fresco stipple: chalky pigment patches with grainy edges.
vec3 sourceFresco(vec2 p, float t){
  vec3 acc = vec3(0.0);
  int n = int(clamp(uSources, 1.0, 8.0));
  for (int i = 0; i < 8; i++){
    if (i >= n) break;
    float fi = float(i);
    vec2 c = vec2(cos(t*0.15 + fi), sin(t*0.12 + fi*1.7)) * 0.5;
    c += (vec2(hash(vec2(fi,1.1)), hash(vec2(fi,2.2))) - 0.5) * 0.7;
    float r = 0.14 + 0.14*hash(vec2(fi,4.4)) + uBrush*0.1;
    float d = length(p - c);
    float grain = noise((p - c)*22.0 + fi*13.0);
    float body = smoothstep(r, r*0.25, d) * (0.35 + 0.65*grain);
    vec3 tint = palette(fi*0.08 + uHue) * vec3(1.1, 0.95, 0.75);
    acc += tint * body;
  }
  return acc;
}

// 6 — Impasto: thick curl-driven ribbons with lit ridges.
vec3 sourceImpasto(vec2 p, float t){
  vec3 acc = vec3(0.0);
  float e = 0.01;
  vec2 flow = vec2(fbm(p*1.6 + vec2(t*0.2, 0.0)) - fbm(p*1.6 + vec2(t*0.2, e)),
                   fbm(p*1.6 + vec2(0.0, t*0.2)) - fbm(p*1.6 + vec2(e, t*0.2)));
  int n = int(clamp(uStrokes, 1.0, 4.0));
  for (int i = 0; i < 4; i++){
    if (i >= n) break;
    float fi = float(i);
    vec2 q = p - flow * (0.4 + fi*0.15) * (1.0 + uChaos);
    float band = sin(q.x*5.0 + q.y*(3.0 + fi) + fbm(q*2.0 + fi)*3.0 + t*0.3);
    float ridge = smoothstep(0.6, 1.0, band);
    float lit = 0.5 + 0.5 * sin(band*3.14 + 1.5);
    vec3 tint = palette(fi*0.18 + fbm(q)*uSpread + uHue);
    acc += tint * ridge * (0.35 + 0.9*lit) * (0.6 + uBrush*0.6);
  }
  return acc;
}

// 7 — Harmonograph: damped pendulum trace.
vec3 sourceHarmono(vec2 p, float t){
  vec3 acc = vec3(0.0);
  int n = int(clamp(uSources, 1.0, 4.0));
  for (int i = 0; i < 4; i++){
    if (i >= n) break;
    float fi = float(i);
    float f1 = 2.0 + fi*0.3, f2 = 3.0 + fi*0.47;
    float f3 = 2.7 + fi*0.19, f4 = 3.3 + fi*0.23;
    float ph = fi * 1.7 + uSeed*0.0005;
    float damp = 0.03 + uChaos*0.08;
    for (int k = 0; k < 24; k++){
      float dt = float(k) * 0.045;
      float tt = t - dt;
      float d1 = exp(-damp * abs(tt));
      vec2 c = vec2(
        sin(tt*f1 + ph)*d1 + sin(tt*f2 + ph*1.3)*d1*0.7,
        sin(tt*f3 + ph*0.7)*d1 + sin(tt*f4 + ph*1.1)*d1*0.7
      ) * 0.42;
      float b = brush(p, c, 0.006 + uBrush*0.02) * (1.0 - float(k)*0.035);
      acc += palette(fi*0.15 + uHue + dt*0.5) * b;
    }
  }
  return acc;
}

// 8 — Spirograph: epicycloid gear traces.
vec3 sourceSpiro(vec2 p, float t){
  vec3 acc = vec3(0.0);
  int n = int(clamp(uSources, 1.0, 4.0));
  for (int i = 0; i < 4; i++){
    if (i >= n) break;
    float fi = float(i);
    float R = 0.42 + fi*0.04;
    float r = 0.10 + 0.045*fi;
    float d = 0.14 + 0.06*fi;
    float sp = 0.6 + uFlow*0.8;
    for (int k = 0; k < 32; k++){
      float dt = float(k) * 0.03;
      float tt = (t - dt) * sp;
      vec2 c = vec2(
        (R - r) * cos(tt) + d * cos((R - r)/r * tt + fi),
        (R - r) * sin(tt) - d * sin((R - r)/r * tt + fi)
      );
      float b = brush(p, c, 0.005 + uBrush*0.015) * (1.0 - float(k)*0.025);
      acc += palette(fi*0.2 + uHue + float(k)*0.02) * b;
    }
  }
  return acc;
}

// 9 — Phase portrait: Clifford-style 2D attractor.
vec3 sourcePhase(vec2 p, float t){
  vec3 acc = vec3(0.0);
  float a = -1.4 + 0.4*sin(t*0.1);
  float b =  1.6 + 0.3*cos(t*0.13);
  float cc = 1.0 + 0.3*sin(t*0.09);
  float dd = 0.7 + 0.3*cos(t*0.11);
  int steps = int(clamp(uSources * 12.0, 24.0, 96.0));
  vec2 z = vec2(0.1, 0.0);
  for (int k = 0; k < 96; k++){
    if (k >= steps) break;
    vec2 nz = vec2(sin(a*z.y) + cc*cos(a*z.x),
                   sin(b*z.x) + dd*cos(b*z.y));
    z = nz;
    vec2 c2 = z * 0.32;
    float bb = brush(p, c2, 0.006 + uBrush*0.015);
    acc += palette(float(k)*0.012 + uHue) * bb;
  }
  return acc;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x/uResolution.y, 1.0);
  float t = uTime * (0.15 + uFlow*0.5) + uSeed * 0.0007;
  int variant = int(clamp(uVariant, 0.0, 9.0));

  vec3 fresh;
  if      (variant == 0) fresh = sourceFlow(p, t);
  else if (variant == 1) fresh = sourceOrbits(p, t);
  else if (variant == 2) fresh = sourceLissajous(p, t);
  else if (variant == 3) fresh = sourcePlumes(p, t);
  else if (variant == 4) fresh = sourceInk(p, t);
  else if (variant == 5) fresh = sourceFresco(p, t);
  else if (variant == 6) fresh = sourceImpasto(p, t);
  else if (variant == 7) fresh = sourceHarmono(p, t);
  else if (variant == 8) fresh = sourceSpiro(p, t);
  else                    fresh = sourcePhase(p, t);

  // pulse
  float pulse = 1.0 + uPulse * 0.6 * sin(uTime * 2.5);
  // Deposit budget per frame — visibly builds trails without white-out.
  fresh *= pulse * 0.14;

  // Faint palette-tinted background so cold-start / empty regions read
  // as canvas rather than dead black.
  vec3 wash = palette(fbm(p*0.4 + t*0.05) * uSpread + uHue) * 0.025;

  // Feedback: sample previous frame with drift so trails flow.
  vec2 drift = (vec2(fbm(p*0.6 + vec2(0.0, t)),
                     fbm(p*0.6 + vec2(7.3, -t))) - 0.5) * (0.004 + uBleed*0.02);
  vec3 prev = texture(uPrev, uv + drift).rgb;

  // Additive-with-decay: strokes accumulate over time (visible trails)
  // but a soft tonemap at the end guarantees no runaway to white.
  float decay = mix(0.86, 0.995, clamp(uPersistence, 0.0, 1.0)) * clamp(uFeedback, 0.0, 1.0);
  vec3 col = prev * decay + fresh * uIntensity + wash;

  // Reinhard-ish soft rolloff — highlights compress, mids stay punchy.
  col = col / (1.0 + col * 0.55);
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
