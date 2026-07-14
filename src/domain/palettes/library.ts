// Curated palette library. A palette is a signature colour statement that
// can be applied over any family — it drives the family's colour system's
// hue/spread/contrast/luminosity/saturation parameters where they exist.
// Palettes never touch structural or motion parameters and always respect
// parameter locks.

import type { FamilyId, ParamPath, ParamValue, SystemId } from "../artwork/types";

export interface Palette {
  id: string;
  name: string;
  mood: string;
  swatch: string[]; // hex — for UI only, the shader palette is procedural
  /** Value overrides applied to the color system where the parameter exists. */
  color: Partial<Record<
    "color.hue" | "color.spread" | "color.contrast" | "color.luminosity" | "color.saturation",
    number
  >>;
  /** Optional per-family light/atmosphere hints, applied only when present. */
  ambient?: Partial<Record<
    "light.bloom" | "atmosphere.fog" | "light.intensity" | "output.vignette",
    number
  >>;
}

export const PALETTES: Palette[] = [
  {
    id: "aurora",
    name: "Aurora",
    mood: "Cold luminous curtains",
    swatch: ["#0b1a2e", "#1e6f5c", "#37cea5", "#a3f7bf"],
    color: { "color.hue": 0.44, "color.spread": 0.65, "color.contrast": 1.15, "color.luminosity": 1.1, "color.saturation": 0.7 },
    ambient: { "light.bloom": 0.85, "output.vignette": 0.35 },
  },
  {
    id: "ember",
    name: "Ember",
    mood: "Coal, ash and glow",
    swatch: ["#0a0605", "#3a0a02", "#c8330f", "#f7c76e"],
    color: { "color.hue": 0.03, "color.spread": 0.45, "color.contrast": 1.55, "color.luminosity": 0.85, "color.saturation": 0.75 },
    ambient: { "light.bloom": 0.7, "output.vignette": 0.55 },
  },
  {
    id: "bone",
    name: "Bone",
    mood: "Chalk, plaster, ivory",
    swatch: ["#e8e2d3", "#c9bfa6", "#7b7360", "#2a2620"],
    color: { "color.hue": 0.11, "color.spread": 0.18, "color.contrast": 0.9, "color.luminosity": 1.05, "color.saturation": 0.15 },
    ambient: { "light.bloom": 0.5, "output.vignette": 0.25 },
  },
  {
    id: "neon",
    name: "Neon",
    mood: "After-hours signage",
    swatch: ["#08020e", "#ff2d95", "#00e5ff", "#f6ff36"],
    color: { "color.hue": 0.86, "color.spread": 0.85, "color.contrast": 1.7, "color.luminosity": 1.05, "color.saturation": 1 },
    ambient: { "light.bloom": 0.9, "output.vignette": 0.6 },
  },
  {
    id: "sepia",
    name: "Sepia",
    mood: "Faded photographic warmth",
    swatch: ["#1c130b", "#59371a", "#a8763c", "#e6cfa0"],
    color: { "color.hue": 0.08, "color.spread": 0.3, "color.contrast": 1, "color.luminosity": 0.95, "color.saturation": 0.45 },
    ambient: { "output.vignette": 0.5 },
  },
  {
    id: "abyss",
    name: "Abyss",
    mood: "Deep water, pressure, cold",
    swatch: ["#02040a", "#061634", "#0b3a63", "#3c85b8"],
    color: { "color.hue": 0.6, "color.spread": 0.25, "color.contrast": 1.3, "color.luminosity": 0.8, "color.saturation": 0.55 },
    ambient: { "light.bloom": 0.55, "atmosphere.fog": 0.7, "output.vignette": 0.65 },
  },
  {
    id: "moss",
    name: "Moss",
    mood: "Damp forest floor",
    swatch: ["#0d1108", "#22331a", "#4f6b2f", "#a6b876"],
    color: { "color.hue": 0.29, "color.spread": 0.35, "color.contrast": 1.05, "color.luminosity": 0.9, "color.saturation": 0.5 },
    ambient: { "atmosphere.fog": 0.35 },
  },
  {
    id: "orchid",
    name: "Orchid",
    mood: "Violet bloom in low light",
    swatch: ["#120818", "#3a1150", "#8a2ca0", "#f0a4d6"],
    color: { "color.hue": 0.79, "color.spread": 0.55, "color.contrast": 1.2, "color.luminosity": 1, "color.saturation": 0.7 },
    ambient: { "light.bloom": 0.75 },
  },
  {
    id: "arctic",
    name: "Arctic",
    mood: "Blue-white ice field",
    swatch: ["#e6f2f7", "#a5c9d8", "#5b8ea6", "#122b3a"],
    color: { "color.hue": 0.55, "color.spread": 0.2, "color.contrast": 1.35, "color.luminosity": 1.15, "color.saturation": 0.4 },
    ambient: { "light.bloom": 0.65, "output.vignette": 0.2 },
  },
  {
    id: "ink",
    name: "Ink",
    mood: "Pure black on paper white",
    swatch: ["#f8f6f0", "#c5bfae", "#2a2a2a", "#000000"],
    color: { "color.hue": 0.0, "color.spread": 0.05, "color.contrast": 1.9, "color.luminosity": 1, "color.saturation": 0.05 },
    ambient: { "output.vignette": 0.15 },
  },
];

// ---------------------------------------------------------------------------

export type PaletteChange = { system: SystemId; path: ParamPath; value: ParamValue };

/** Resolve a palette against a family's schema — returns only changes whose
 *  target parameter actually exists in that family. */
export function resolvePalette(
  palette: Palette,
  familySchema: Partial<Record<SystemId, { path: string }[]>>,
): PaletteChange[] {
  const changes: PaletteChange[] = [];
  const has = (system: SystemId, path: string) =>
    !!familySchema[system]?.some((s) => s.path === path);

  for (const [path, value] of Object.entries(palette.color)) {
    if (has("color", path)) {
      changes.push({ system: "color", path, value: value as number });
    }
  }
  if (palette.ambient) {
    for (const [path, value] of Object.entries(palette.ambient)) {
      const system = path.split(".")[0] as SystemId;
      if (has(system, path)) {
        changes.push({ system, path, value: value as number });
      }
    }
  }
  return changes;
}

export function palettesForFamily(_family: FamilyId): Palette[] {
  // Every palette is family-agnostic — resolution filters unsupported params.
  return PALETTES;
}