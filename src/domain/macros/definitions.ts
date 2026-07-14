// Sculpt-mode Macros. A macro is a high-level, family-scoped knob that
// drives multiple underlying parameters via linear interpolation from a
// "low" pose to a "high" pose. Macros always respect parameter locks and
// are one-shot commands — they do not maintain live state on the artwork.

import type { FamilyId, ParamPath, SystemId } from "../artwork/types";

export interface MacroEffect {
  system: SystemId;
  path: ParamPath;
  low: number;
  high: number;
}

export interface Macro {
  id: string;
  label: string;
  hint: string;
  family: FamilyId;
  /** Default anchor value in [0..1]. */
  neutral: number;
  effects: MacroEffect[];
}

const livingFieldsMacros: Macro[] = [
  {
    id: "lf.energy",
    label: "Energy",
    hint: "Overall motion and turbulence.",
    family: "living-fields",
    neutral: 0.35,
    effects: [
      { system: "motion", path: "motion.speed", low: 0.02, high: 1.6 },
      { system: "motion", path: "motion.turbulence", low: 0.05, high: 1.8 },
      { system: "form", path: "form.warp", low: 0.2, high: 1.7 },
    ],
  },
  {
    id: "lf.density",
    label: "Density",
    hint: "How tightly the field packs.",
    family: "living-fields",
    neutral: 0.4,
    effects: [
      { system: "form", path: "form.density", low: 0.6, high: 5.5 },
      { system: "form", path: "form.detail", low: 2, high: 6 },
    ],
  },
  {
    id: "lf.warmth",
    label: "Warmth",
    hint: "Cool blue → hot red.",
    family: "living-fields",
    neutral: 0.5,
    effects: [
      { system: "color", path: "color.hue", low: 0.62, high: 0.03 },
      { system: "color", path: "color.contrast", low: 0.9, high: 1.55 },
    ],
  },
  {
    id: "lf.glow",
    label: "Glow",
    hint: "Bloom, luminosity and grain.",
    family: "living-fields",
    neutral: 0.5,
    effects: [
      { system: "light", path: "light.bloom", low: 0.1, high: 0.95 },
      { system: "color", path: "color.luminosity", low: 0.6, high: 1.5 },
      { system: "light", path: "light.grain", low: 0.0, high: 0.16 },
    ],
  },
];

const materialFormsMacros: Macro[] = [
  {
    id: "mf.mass",
    label: "Mass",
    hint: "Size and clustering of the body.",
    family: "material-forms",
    neutral: 0.5,
    effects: [
      { system: "form", path: "form.size", low: 0.25, high: 1.1 },
      { system: "form", path: "form.cluster", low: 1, high: 5 },
      { system: "form", path: "form.smoothness", low: 0.05, high: 0.45 },
    ],
  },
  {
    id: "mf.metal",
    label: "Metal",
    hint: "Dielectric matte → polished metal.",
    family: "material-forms",
    neutral: 0.5,
    effects: [
      { system: "material", path: "material.metalness", low: 0, high: 1 },
      { system: "material", path: "material.roughness", low: 0.9, high: 0.05 },
    ],
  },
  {
    id: "mf.shimmer",
    label: "Shimmer",
    hint: "Iridescence and lighting drama.",
    family: "material-forms",
    neutral: 0.3,
    effects: [
      { system: "material", path: "material.iridescence", low: 0, high: 1 },
      { system: "light", path: "light.intensity", low: 0.5, high: 1.6 },
      { system: "atmosphere", path: "atmosphere.fog", low: 0.05, high: 0.55 },
    ],
  },
];

const temporalPaintingsMacros: Macro[] = [
  {
    id: "tp.memory",
    label: "Memory",
    hint: "How long strokes linger.",
    family: "temporal-paintings",
    neutral: 0.7,
    effects: [
      { system: "memory", path: "memory.persistence", low: 0.25, high: 0.99 },
      { system: "memory", path: "memory.feedback", low: 0.4, high: 1 },
    ],
  },
  {
    id: "tp.wet",
    label: "Wetness",
    hint: "How much pigment bleeds.",
    family: "temporal-paintings",
    neutral: 0.4,
    effects: [
      { system: "memory", path: "memory.bleed", low: 0.02, high: 0.85 },
      { system: "form", path: "form.brush", low: 0.15, high: 1.7 },
    ],
  },
  {
    id: "tp.chaos",
    label: "Chaos",
    hint: "Order → violent turbulence.",
    family: "temporal-paintings",
    neutral: 0.35,
    effects: [
      { system: "motion", path: "motion.chaos", low: 0.02, high: 1 },
      { system: "motion", path: "motion.flow", low: 0.15, high: 1.4 },
      { system: "form", path: "form.strokes", low: 1, high: 6 },
    ],
  },
];

const typographicOrganismsMacros: Macro[] = [
  {
    id: "to.scale",
    label: "Scale",
    hint: "Tiny grid → poster block.",
    family: "typographic-organisms",
    neutral: 0.35,
    effects: [
      { system: "form", path: "form.cellSize", low: 12, high: 78 },
      { system: "form", path: "form.weight", low: 0.25, high: 0.95 },
    ],
  },
  {
    id: "to.pulse",
    label: "Pulse",
    hint: "Marching speed and breath.",
    family: "typographic-organisms",
    neutral: 0.5,
    effects: [
      { system: "motion", path: "motion.speed", low: 0.05, high: 1.6 },
      { system: "motion", path: "motion.breath", low: 0.05, high: 0.95 },
    ],
  },
  {
    id: "to.mess",
    label: "Disorder",
    hint: "Neat grid → scattered swarm.",
    family: "typographic-organisms",
    neutral: 0.3,
    effects: [
      { system: "form", path: "form.jitter", low: 0, high: 0.95 },
      { system: "material", path: "material.softness", low: 0.005, high: 0.16 },
    ],
  },
];

const spatialIllusionsMacros: Macro[] = [
  {
    id: "si.depth",
    label: "Depth",
    hint: "Flat panel → bottomless well.",
    family: "spatial-illusions",
    neutral: 0.4,
    effects: [
      { system: "form", path: "form.depth", low: 0.5, high: 2.9 },
      { system: "atmosphere", path: "atmosphere.fog", low: 0.1, high: 0.9 },
      { system: "output", path: "output.vignette", low: 0.2, high: 0.8 },
    ],
  },
  {
    id: "si.spin",
    label: "Spin",
    hint: "Twist and speed of the vortex.",
    family: "spatial-illusions",
    neutral: 0.5,
    effects: [
      { system: "form", path: "form.twist", low: -1.4, high: 1.4 },
      { system: "motion", path: "motion.speed", low: -1.5, high: 1.5 },
    ],
  },
  {
    id: "si.pattern",
    label: "Pattern",
    hint: "Few rings → dense interference.",
    family: "spatial-illusions",
    neutral: 0.4,
    effects: [
      { system: "form", path: "form.rings", low: 3, high: 24 },
      { system: "motion", path: "motion.warble", low: 0.02, high: 0.95 },
    ],
  },
];

const ALL: Macro[] = [
  ...livingFieldsMacros,
  ...materialFormsMacros,
  ...temporalPaintingsMacros,
  ...typographicOrganismsMacros,
  ...spatialIllusionsMacros,
];

export function macrosForFamily(family: FamilyId): Macro[] {
  return ALL.filter((m) => m.family === family);
}

export function findMacro(id: string): Macro | undefined {
  return ALL.find((m) => m.id === id);
}