import type { FamilyDefinition } from "./registry";
import type { ParamSpec, SystemId } from "../artwork/types";

const form: ParamSpec[] = [
  { path: "form.brush", label: "Brush Size", kind: "scalar", min: 0.1, max: 2, step: 0.01, default: 0.6 },
  { path: "form.strokes", label: "Strokes", kind: "scalar", min: 1, max: 6, step: 1, default: 3 },
];

const motion: ParamSpec[] = [
  { path: "motion.flow", label: "Flow", kind: "scalar", min: 0, max: 1.5, step: 0.01, default: 0.5 },
  { path: "motion.chaos", label: "Chaos", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.35 },
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
};
