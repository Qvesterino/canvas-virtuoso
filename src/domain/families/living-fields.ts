import type { FamilyDefinition } from "./registry";
import type { ParamSpec, SystemId } from "../artwork/types";

const form: ParamSpec[] = [
  { path: "form.variant", label: "Topology", kind: "scalar", min: 0, max: 3, step: 1, default: 0, hint: "0 Cosmic clouds · 1 Curl advection · 2 Ridged veins · 3 Reaction cells." },
  { path: "form.density", label: "Density", kind: "scalar", min: 0.4, max: 6, step: 0.01, default: 2.2, hint: "How tightly the field is woven." },
  { path: "form.detail", label: "Detail", kind: "scalar", min: 1, max: 6, step: 1, default: 4, hint: "Octaves of internal structure." },
  { path: "form.warp", label: "Warp", kind: "scalar", min: 0, max: 2, step: 0.01, default: 0.85, hint: "How much the field folds into itself." },
  { path: "form.scale", label: "Scale", kind: "scalar", min: 0.3, max: 3, step: 0.01, default: 1, hint: "Zoom of the underlying field." },
  { path: "form.structure", label: "Structure", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.55, hint: "Large-scale coherence vs fine noise." },
];

const motion: ParamSpec[] = [
  { path: "motion.speed", label: "Speed", kind: "scalar", min: 0, max: 2, step: 0.01, default: 0.35, hint: "Overall temporal pace." },
  { path: "motion.turbulence", label: "Turbulence", kind: "scalar", min: 0, max: 2, step: 0.01, default: 0.6, hint: "How restless the currents feel." },
  { path: "motion.drift", label: "Drift", kind: "scalar", min: -1, max: 1, step: 0.01, default: 0.15, hint: "Directional bias of the flow." },
];

const color: ParamSpec[] = [
  { path: "color.hue", label: "Hue", kind: "scalar", min: 0, max: 1, step: 0.001, default: 0.55, hint: "Primary chromatic anchor." },
  { path: "color.spread", label: "Spread", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.35, hint: "How far the palette wanders." },
  { path: "color.contrast", label: "Contrast", kind: "scalar", min: 0.2, max: 2, step: 0.01, default: 1.05 },
  { path: "color.luminosity", label: "Luminosity", kind: "scalar", min: 0.2, max: 1.6, step: 0.01, default: 0.95 },
];

const light: ParamSpec[] = [
  { path: "light.bloom", label: "Bloom", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.55, hint: "Soft luminance halo." },
  { path: "light.grain", label: "Grain", kind: "scalar", min: 0, max: 0.15, step: 0.002, default: 0.015, hint: "Subtle sensor grain — never dominant." },
];

const output: ParamSpec[] = [
  { path: "output.vignette", label: "Vignette", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.35 },
];

const schema: Partial<Record<SystemId, ParamSpec[]>> = { form, motion, color, light, output };

export const livingFieldsFamily: FamilyDefinition = {
  id: "living-fields",
  name: "Living Fields",
  tagline: "Flowing, breathing organic fields of energy.",
  supportedSystems: ["form", "motion", "color", "light", "atmosphere", "memory", "output"],
  requiredSystems: ["form", "motion", "color", "output"],
  schema,
  implemented: true,
};