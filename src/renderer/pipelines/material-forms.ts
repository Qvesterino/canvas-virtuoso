import { BASE_VS, paramNum, type Pipeline } from "./types";

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uSize;
uniform float uSmoothness;
uniform float uCluster;
uniform float uMetalness;
uniform float uRoughness;
uniform float uIridescence;
uniform float uLightAngle;
uniform float uLightIntensity;
uniform float uHue;
uniform float uSaturation;
uniform float uFog;
uniform float uVignette;

float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sphere(vec3 p, float r){ return length(p) - r; }

float scene(vec3 p){
  float t = uTime * 0.35;
  float d = sphere(p, uSize);
  int n = int(clamp(uCluster, 1.0, 5.0));
  for (int i = 1; i < 6; i++){
    if (i >= n) break;
    float fi = float(i);
    vec3 offs = vec3(
      sin(t * (0.6 + fi * 0.13) + uSeed * 0.001 + fi),
      cos(t * (0.5 + fi * 0.11) + uSeed * 0.0007 + fi * 1.7),
      sin(t * (0.7 + fi * 0.09) + fi * 2.3)
    ) * (uSize * 0.9);
    d = smin(d, sphere(p - offs, uSize * (0.55 + 0.15 * sin(fi + t))), uSmoothness);
  }
  return d;
}

vec3 normal(vec3 p){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)
  ));
}

vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(){
  vec2 uv = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  vec3 ro = vec3(0.0, 0.0, -2.4);
  vec3 rd = normalize(vec3(uv, 1.4));

  float tHit = 0.0;
  bool hit = false;
  for (int i = 0; i < 96; i++){
    vec3 p = ro + rd * tHit;
    float d = scene(p);
    if (d < 0.001){ hit = true; break; }
    tHit += d;
    if (tHit > 6.0) break;
  }

  vec3 col = vec3(0.03, 0.035, 0.05);
  if (hit){
    vec3 p = ro + rd * tHit;
    vec3 n = normal(p);
    vec3 L = normalize(vec3(cos(uLightAngle), 0.7, sin(uLightAngle)));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    vec3 h = normalize(L - rd);
    float spec = pow(clamp(dot(n, h), 0.0, 1.0), mix(200.0, 4.0, uRoughness));

    vec3 base = hsv2rgb(vec3(uHue + uIridescence * n.x * 0.4, uSaturation, 1.0));
    vec3 metal = mix(vec3(1.0), base, 0.3);
    vec3 diffuse = base * (0.25 + 0.75 * diff);
    vec3 specular = mix(vec3(1.0), metal, uMetalness) * spec * uLightIntensity;
    col = mix(diffuse, specular + diffuse * 0.15, uMetalness);

    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    col += fres * hsv2rgb(vec3(fract(uHue + 0.5), 0.8, 1.0)) * uIridescence * 0.5;
  }

  col = mix(col, vec3(0.03, 0.035, 0.05), uFog * smoothstep(1.5, 4.5, tHit));
  float d = length(vUv - 0.5);
  col *= mix(1.0, smoothstep(0.85, 0.2, d), uVignette);
  outColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);
}
`;

export const materialFormsPipeline: Pipeline = {
  id: "material-forms",
  vs: BASE_VS,
  fs: FS,
  uniforms: [
    "uSize", "uSmoothness", "uCluster",
    "uMetalness", "uRoughness", "uIridescence",
    "uLightAngle", "uLightIntensity",
    "uHue", "uSaturation", "uFog", "uVignette",
  ],
  project(artwork) {
    return {
      uSize: paramNum(artwork, "form", "form.size", 0.6),
      uSmoothness: paramNum(artwork, "form", "form.smoothness", 0.18),
      uCluster: paramNum(artwork, "form", "form.cluster", 3),
      uMetalness: paramNum(artwork, "material", "material.metalness", 0.4),
      uRoughness: paramNum(artwork, "material", "material.roughness", 0.35),
      uIridescence: paramNum(artwork, "material", "material.iridescence", 0.2),
      uLightAngle: paramNum(artwork, "light", "light.angle", 1.2),
      uLightIntensity: paramNum(artwork, "light", "light.intensity", 1.0),
      uHue: paramNum(artwork, "color", "color.hue", 0.62),
      uSaturation: paramNum(artwork, "color", "color.saturation", 0.55),
      uFog: paramNum(artwork, "atmosphere", "atmosphere.fog", 0.25),
      uVignette: paramNum(artwork, "output", "output.vignette", 0.35),
    };
  },
};
