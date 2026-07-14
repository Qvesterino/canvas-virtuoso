import type { Artwork } from "../../domain/artwork/types";

export const LIVING_FIELDS_VS = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const LIVING_FIELDS_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uDensity;
uniform float uDetail;
uniform float uWarp;
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
uniform float uSeed;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, int octaves){
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += amp * valueNoise(p);
    p = p * 2.02 + vec2(37.0, 17.0);
    amp *= 0.5;
  }
  return v;
}

vec3 palette(float t){
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.5);
  vec3 c = vec3(1.0);
  vec3 d = vec3(uHue, uHue + 0.33, uHue + 0.66);
  return a + b * cos(6.28318 * (c * t + d));
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float t = uTime * uSpeed + uSeed * 0.001;

  vec2 q = vec2(
    fbm(p * uDensity + vec2(0.0, t * 0.6), int(uDetail)),
    fbm(p * uDensity + vec2(5.2, -t * 0.5), int(uDetail))
  );
  vec2 r = vec2(
    fbm(p * uDensity + 4.0 * q + vec2(1.7 + t * uTurbulence, 9.2), int(uDetail)),
    fbm(p * uDensity + 4.0 * q + vec2(8.3, 2.8 - t * uTurbulence), int(uDetail))
  );
  float f = fbm(p * uDensity + uWarp * 4.0 * r + vec2(uDrift * t, 0.0), int(uDetail));

  float shade = smoothstep(0.15, 0.95, f);
  shade = pow(shade, uContrast);

  vec3 col = palette(f * uSpread + uHue) * uLuminosity;
  col *= mix(0.4, 1.2, shade);

  float halo = smoothstep(0.4, 1.1, f);
  col += halo * uBloom * palette(f * uSpread + uHue + 0.1) * 0.6;

  float d = length(uv - 0.5);
  col *= mix(1.0, smoothstep(0.85, 0.2, d), uVignette);

  float g = hash(gl_FragCoord.xy + uTime * 60.0) - 0.5;
  col += g * uGrain;

  outColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}
`;

export interface LivingFieldsUniforms {
  density: number; detail: number; warp: number;
  speed: number; turbulence: number; drift: number;
  hue: number; spread: number; contrast: number; luminosity: number;
  bloom: number; grain: number; vignette: number;
  seed: number;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function projectLivingFields(artwork: Artwork): LivingFieldsUniforms {
  const p = (system: string, path: string, fallback: number): number => {
    const sys = artwork.systems[system as keyof typeof artwork.systems];
    if (!sys || sys.bypassed || !sys.enabled) return fallback;
    return num(sys.parameters[path], fallback);
  };
  return {
    density: p("form", "form.density", 2.2),
    detail: p("form", "form.detail", 4),
    warp: p("form", "form.warp", 0.85),
    speed: p("motion", "motion.speed", 0.35),
    turbulence: p("motion", "motion.turbulence", 0.6),
    drift: p("motion", "motion.drift", 0.15),
    hue: p("color", "color.hue", 0.55),
    spread: p("color", "color.spread", 0.35),
    contrast: p("color", "color.contrast", 1.05),
    luminosity: p("color", "color.luminosity", 0.95),
    bloom: p("light", "light.bloom", 0.55),
    grain: p("light", "light.grain", 0.04),
    vignette: p("output", "output.vignette", 0.35),
    seed: artwork.artworkSeed,
  };
}