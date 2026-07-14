import type { Recipe } from "../artwork/types";

export const RECIPES: Recipe[] = [
  {
    id: "lf-nebula",
    family: "living-fields",
    name: "Nebula",
    tagline: "Deep, slow, luminous cosmic clouds.",
    changes: [
      { system: "form", path: "form.density", value: 1.6 },
      { system: "form", path: "form.warp", value: 1.4 },
      { system: "form", path: "form.detail", value: 5 },
      { system: "motion", path: "motion.speed", value: 0.12 },
      { system: "motion", path: "motion.turbulence", value: 0.4 },
      { system: "color", path: "color.hue", value: 0.72 },
      { system: "color", path: "color.spread", value: 0.55 },
      { system: "light", path: "light.bloom", value: 0.8 },
    ],
  },
  {
    id: "lf-magma",
    family: "living-fields",
    name: "Magma",
    tagline: "Hot, viscous, restless flow.",
    changes: [
      { system: "form", path: "form.density", value: 3.4 },
      { system: "form", path: "form.warp", value: 0.6 },
      { system: "motion", path: "motion.speed", value: 0.55 },
      { system: "motion", path: "motion.turbulence", value: 1.2 },
      { system: "color", path: "color.hue", value: 0.05 },
      { system: "color", path: "color.spread", value: 0.3 },
      { system: "color", path: "color.contrast", value: 1.4 },
      { system: "light", path: "light.bloom", value: 0.7 },
    ],
  },
  {
    id: "mf-chrome",
    family: "material-forms",
    name: "Chrome",
    tagline: "Polished metallic sculpture.",
    changes: [
      { system: "material", path: "material.metalness", value: 1 },
      { system: "material", path: "material.roughness", value: 0.1 },
      { system: "form", path: "form.size", value: 0.55 },
      { system: "color", path: "color.hue", value: 0.6 },
    ],
  },
  {
    id: "mf-clay",
    family: "material-forms",
    name: "Wet Clay",
    tagline: "Soft matte body.",
    changes: [
      { system: "material", path: "material.metalness", value: 0 },
      { system: "material", path: "material.roughness", value: 0.9 },
      { system: "form", path: "form.size", value: 0.7 },
      { system: "color", path: "color.hue", value: 0.08 },
    ],
  },
  {
    id: "tp-watercolor",
    family: "temporal-paintings",
    name: "Watercolour",
    tagline: "Bleeding pigment on wet paper.",
    changes: [
      { system: "memory", path: "memory.persistence", value: 0.9 },
      { system: "form", path: "form.brush", value: 0.7 },
      { system: "motion", path: "motion.flow", value: 0.3 },
      { system: "color", path: "color.hue", value: 0.55 },
    ],
  },
  {
    id: "to-glyph-choir",
    family: "typographic-organisms",
    name: "Glyph Choir",
    tagline: "Marching letters in unison.",
    changes: [
      { system: "form", path: "form.cellSize", value: 22 },
      { system: "form", path: "form.weight", value: 0.6 },
      { system: "motion", path: "motion.speed", value: 0.5 },
      { system: "color", path: "color.hue", value: 0.15 },
    ],
  },
  {
    id: "si-portal",
    family: "spatial-illusions",
    name: "Portal",
    tagline: "Deep tunnel with warped light.",
    changes: [
      { system: "form", path: "form.depth", value: 1.6 },
      { system: "form", path: "form.twist", value: 0.9 },
      { system: "motion", path: "motion.speed", value: 0.4 },
      { system: "color", path: "color.hue", value: 0.78 },
    ],
  },
];

export function recipesForFamily(family: string): Recipe[] {
  return RECIPES.filter((r) => r.family === family);
}
