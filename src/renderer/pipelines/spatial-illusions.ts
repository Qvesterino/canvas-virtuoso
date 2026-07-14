import { BASE_VS, paramNum, type Pipeline } from "./types";

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uDepth;
uniform float uTwist;
uniform float uRings;
uniform float uSpeed;
uniform float uWarble;
uniform float uBloom;
uniform float uFog;
uniform float uHue;
uniform float uContrast;
uniform float uVignette;

vec3 palette(float t){
  vec3 a = vec3(0.5), b = vec3(0.5), c = vec3(1.0);
  vec3 d = vec3(uHue, uHue + 0.33, uHue + 0.66);
  return a + b * cos(6.28318 * (c*t + d));
}

void main(){
  vec2 uv = (vUv - 0.5) * vec2(uResolution.x/uResolution.y, 1.0);
  float r = length(uv);
  float a = atan(uv.y, uv.x);

  // Warble the ring for a wobble in space
  float w = sin(a * 3.0 + uTime * 1.3) * uWarble * 0.05;
  r += w;

  // Tunnel depth coordinate
  float z = uDepth / max(r, 0.001) + uTime * uSpeed;
  // Twist per depth slice
  float ta = a + z * uTwist * 0.3 + uSeed * 0.0005;

  float ringCount = max(uRings, 2.0);
  float ring = fract(z * 0.5) ;
  float ridge = smoothstep(0.02, 0.5, abs(ring - 0.5)) ;

  float stripes = 0.5 + 0.5 * sin(ta * ringCount);
  float pattern = mix(ridge, stripes, 0.5);

  float depthFade = 1.0 - smoothstep(0.0, 1.6, r);
  vec3 col = palette(pattern * 0.7 + z * 0.02) * (0.2 + 0.9 * depthFade);
  col += pow(depthFade, 3.0) * uBloom * palette(z * 0.05);
  col = mix(col, vec3(0.02, 0.02, 0.03), uFog * (1.0 - depthFade));
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
    "uDepth", "uTwist", "uRings",
    "uSpeed", "uWarble",
    "uBloom", "uFog",
    "uHue", "uContrast", "uVignette",
  ],
  project(artwork) {
    return {
      uDepth: paramNum(artwork, "form", "form.depth", 1.2),
      uTwist: paramNum(artwork, "form", "form.twist", 0.5),
      uRings: paramNum(artwork, "form", "form.rings", 10),
      uSpeed: paramNum(artwork, "motion", "motion.speed", 0.35),
      uWarble: paramNum(artwork, "motion", "motion.warble", 0.25),
      uBloom: paramNum(artwork, "light", "light.bloom", 0.55),
      uFog: paramNum(artwork, "atmosphere", "atmosphere.fog", 0.5),
      uHue: paramNum(artwork, "color", "color.hue", 0.68),
      uContrast: paramNum(artwork, "color", "color.contrast", 1.2),
      uVignette: paramNum(artwork, "output", "output.vignette", 0.45),
    };
  },
};
