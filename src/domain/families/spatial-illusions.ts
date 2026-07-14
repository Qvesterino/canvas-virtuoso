import type { FamilyDefinition } from "./registry";
import type { ParamSpec, SystemId } from "../artwork/types";

const form: ParamSpec[] = [
  { path: "form.variant", label: "Architecture", kind: "scalar", min: 0, max: 5, step: 1, default: 0, hint: "0 Ring tunnel · 1 Hall of columns · 2 Menger fractal · 3 Cathedral vault · 4 Kaleidoscope · 5 Hypercube grid." },
  { path: "form.depth", label: "Depth", kind: "scalar", min: 0.4, max: 3, step: 0.01, default: 1.2 },
  { path: "form.twist", label: "Twist", kind: "scalar", min: -1.5, max: 1.5, step: 0.01, default: 0.5 },
  { path: "form.rings", label: "Rings", kind: "scalar", min: 2, max: 24, step: 1, default: 10 },
  { path: "form.repeat", label: "Repeat", kind: "scalar", min: 0.6, max: 4, step: 0.01, default: 1.6, hint: "Spacing of repeated architecture." },
  { path: "form.cameraSway", label: "Camera Sway", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.35 },
  // ── Kaleidoscope (variant 4) ────────────────────────────────────────
  { path: "form.mirrors", label: "Mirrors", kind: "scalar", min: 2, max: 16, step: 1, default: 6, hint: "Radial symmetry order — number of mirror wedges." },
  { path: "form.symmetry", label: "Symmetry", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.85, hint: "Sharpness of the mirrored reflections." },
  { path: "form.ripple", label: "Ripple", kind: "scalar", min: 0, max: 1.5, step: 0.01, default: 0.4, hint: "Radial wave distortion." },
  { path: "form.rotation", label: "Rotation", kind: "scalar", min: -2, max: 2, step: 0.01, default: 0.25, hint: "Spin of the kaleidoscope core." },
  { path: "form.kernel", label: "Kernel", kind: "scalar", min: 0, max: 3, step: 1, default: 1, hint: "Which motif fills each wedge: 0 stripes · 1 petals · 2 crystals · 3 galaxy." },
  // ── Hypercube grid (variant 5) ──────────────────────────────────────
  { path: "form.cells", label: "Cells", kind: "scalar", min: 1, max: 8, step: 1, default: 4, hint: "Grid tessellation density." },
  { path: "form.projection", label: "Projection", kind: "scalar", min: 0, max: 1.5, step: 0.01, default: 0.7, hint: "4D→3D projection strength." },
];

const motion: ParamSpec[] = [
  { path: "motion.speed", label: "Speed", kind: "scalar", min: -2, max: 2, step: 0.01, default: 0.35 },
  { path: "motion.warble", label: "Warble", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.25 },
];

const light: ParamSpec[] = [
  { path: "light.bloom", label: "Bloom", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.55 },
];

const atmosphere: ParamSpec[] = [
  { path: "atmosphere.fog", label: "Fog", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.5 },
];

const color: ParamSpec[] = [
  { path: "color.hue", label: "Hue", kind: "scalar", min: 0, max: 1, step: 0.001, default: 0.68 },
  { path: "color.contrast", label: "Contrast", kind: "scalar", min: 0.4, max: 2, step: 0.01, default: 1.2 },
];

const output: ParamSpec[] = [
  { path: "output.vignette", label: "Vignette", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.45 },
];

const schema: Partial<Record<SystemId, ParamSpec[]>> = { form, motion, light, atmosphere, color, output };

export const spatialIllusionsFamily: FamilyDefinition = {
  id: "spatial-illusions",
  name: "Spatial Illusions",
  tagline: "Impossible geometries and optical depth.",
  supportedSystems: ["form", "motion", "light", "atmosphere", "color", "output"],
  requiredSystems: ["form", "output"],
  schema,
  implemented: true,
};
