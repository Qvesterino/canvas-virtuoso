import type { FamilyDefinition } from "./registry";
import type { ParamSpec, SystemId } from "../artwork/types";

const form: ParamSpec[] = [
  { path: "form.variant", label: "Layout", kind: "scalar", min: 0, max: 3, step: 1, default: 0, hint: "0 Glyph grid · 1 Signal rain · 2 Ribbon marquee · 3 Word cloud." },
  { path: "form.cellSize", label: "Cell Size", kind: "scalar", min: 12, max: 80, step: 1, default: 32, hint: "How large each glyph is." },
  { path: "form.weight", label: "Weight", kind: "scalar", min: 0.1, max: 1, step: 0.01, default: 0.55 },
  { path: "form.jitter", label: "Jitter", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.3 },
  { path: "form.dissolve", label: "Dissolve", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0, hint: "Break glyphs into particles." },
  { path: "form.melt", label: "Melt", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0, hint: "Vertical drip and sag." },
  { path: "form.fracture", label: "Fracture", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0, hint: "Break letterforms along axes." },
];

const motion: ParamSpec[] = [
  { path: "motion.speed", label: "Speed", kind: "scalar", min: 0, max: 2, step: 0.01, default: 0.4 },
  { path: "motion.breath", label: "Breath", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.4, hint: "Rhythmic scale pulsation." },
  { path: "motion.growth", label: "Growth", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.3, hint: "How glyphs emerge and recede." },
];

const material: ParamSpec[] = [
  { path: "material.softness", label: "Softness", kind: "scalar", min: 0.001, max: 0.2, step: 0.001, default: 0.02 },
];

const color: ParamSpec[] = [
  { path: "color.hue", label: "Hue", kind: "scalar", min: 0, max: 1, step: 0.001, default: 0.15 },
  { path: "color.contrast", label: "Contrast", kind: "scalar", min: 0.4, max: 2, step: 0.01, default: 1.1 },
];

const output: ParamSpec[] = [
  { path: "output.vignette", label: "Vignette", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.2 },
];

const schema: Partial<Record<SystemId, ParamSpec[]>> = { form, motion, material, color, output };

export const typographicOrganismsFamily: FamilyDefinition = {
  id: "typographic-organisms",
  name: "Typographic Organisms",
  tagline: "Living letterforms that breathe.",
  supportedSystems: ["form", "motion", "material", "color", "output"],
  requiredSystems: ["form", "output"],
  schema,
  implemented: true,
};
