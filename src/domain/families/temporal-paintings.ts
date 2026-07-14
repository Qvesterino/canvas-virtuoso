import type { FamilyDefinition } from "./registry";
import type { ParamSpec, SystemId } from "../artwork/types";

const form: ParamSpec[] = [
  { path: "form.variant", label: "Source", kind: "scalar", min: 0, max: 3, step: 1, default: 0, identity: true, hint: "0 Flow field · 1 Orbits · 2 Lissajous · 3 Plumes." },
  { path: "form.brush", label: "Brush Size", kind: "scalar", min: 0.1, max: 2, step: 0.01, default: 0.6 },
  { path: "form.strokes", label: "Strokes", kind: "scalar", min: 1, max: 6, step: 1, default: 3, identity: true },
  { path: "form.sources", label: "Sources", kind: "scalar", min: 1, max: 8, step: 1, default: 4, identity: true, hint: "Number of live paint emitters." },
  { path: "form.intensity", label: "Intensity", kind: "scalar", min: 0.1, max: 2.5, step: 0.01, default: 1.0, hint: "How strongly fresh paint deposits." },
];

const motion: ParamSpec[] = [
  { path: "motion.flow", label: "Flow", kind: "scalar", min: 0, max: 1.5, step: 0.01, default: 0.5 },
  { path: "motion.chaos", label: "Chaos", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.35 },
  { path: "motion.pulse", label: "Pulse", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.3, hint: "Rhythmic brightness pulse of sources." },
];

const memory: ParamSpec[] = [
  { path: "memory.persistence", label: "Persistence", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.72, hint: "How long strokes linger." },
  { path: "memory.bleed", label: "Bleed", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.4 },
  { path: "memory.feedback", label: "Feedback", kind: "scalar", min: 0, max: 1, step: 0.01, default: 1.0, hint: "Amount of the previous frame folded back in." },
];

const color: ParamSpec[] = [
  { path: "color.hue", label: "Hue", kind: "scalar", min: 0, max: 1, step: 0.001, default: 0.4 },
  { path: "color.spread", label: "Spread", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.5 },
  { path: "color.contrast", label: "Contrast", kind: "scalar", min: 0.3, max: 2, step: 0.01, default: 1.1 },
];

const output: ParamSpec[] = [
  { path: "output.vignette", label: "Vignette", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.25 },
];

const schema: Partial<Record<SystemId, ParamSpec[]>> = { form, motion, memory, color, output };

export const temporalPaintingsFamily: FamilyDefinition = {
  id: "temporal-paintings",
  name: "Temporal Paintings",
  tagline: "Memory-driven brush strokes across time.",
  supportedSystems: ["form", "motion", "memory", "color", "output"],
  requiredSystems: ["memory", "output"],
  schema,
  implemented: true,
  variantParam: "form.variant",
  variantNames: ["Flow field", "Orbits", "Lissajous", "Plumes"],
};
