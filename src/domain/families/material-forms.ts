import type { FamilyDefinition } from "./registry";
import type { ParamSpec, SystemId } from "../artwork/types";

const form: ParamSpec[] = [
  { path: "form.size", label: "Size", kind: "scalar", min: 0.2, max: 1.2, step: 0.01, default: 0.6, hint: "Overall mass of the sculpted body." },
  { path: "form.smoothness", label: "Smoothness", kind: "scalar", min: 0.02, max: 0.5, step: 0.005, default: 0.18, hint: "How gently masses blend into each other." },
  { path: "form.cluster", label: "Cluster", kind: "scalar", min: 1, max: 5, step: 1, default: 3, hint: "How many sub-forms merge." },
];

const material: ParamSpec[] = [
  { path: "material.metalness", label: "Metalness", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.4 },
  { path: "material.roughness", label: "Roughness", kind: "scalar", min: 0.02, max: 1, step: 0.01, default: 0.35 },
  { path: "material.iridescence", label: "Iridescence", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.2 },
];

const light: ParamSpec[] = [
  { path: "light.angle", label: "Angle", kind: "scalar", min: 0, max: 6.28, step: 0.01, default: 1.2 },
  { path: "light.intensity", label: "Intensity", kind: "scalar", min: 0.2, max: 2, step: 0.01, default: 1 },
];

const color: ParamSpec[] = [
  { path: "color.hue", label: "Hue", kind: "scalar", min: 0, max: 1, step: 0.001, default: 0.62 },
  { path: "color.saturation", label: "Saturation", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.55 },
];

const atmosphere: ParamSpec[] = [
  { path: "atmosphere.fog", label: "Fog", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.25 },
];

const output: ParamSpec[] = [
  { path: "output.vignette", label: "Vignette", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.35 },
];

const schema: Partial<Record<SystemId, ParamSpec[]>> = { form, material, light, color, atmosphere, output };

export const materialFormsFamily: FamilyDefinition = {
  id: "material-forms",
  name: "Material Forms",
  tagline: "Sculpted volumes of imagined matter.",
  supportedSystems: ["form", "material", "light", "color", "atmosphere", "output"],
  requiredSystems: ["form", "material", "output"],
  schema,
  implemented: true,
};
