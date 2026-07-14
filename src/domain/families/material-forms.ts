import type { FamilyDefinition } from "./registry";
import type { ParamSpec, SystemId } from "../artwork/types";

const form: ParamSpec[] = [
  { path: "form.variant", label: "Form", kind: "scalar", min: 0, max: 3, step: 1, default: 0, identity: true, hint: "0 Blob cluster · 1 Twisted torus · 2 Octahedral lattice · 3 Liquid dome." },
  { path: "form.size", label: "Size", kind: "scalar", min: 0.2, max: 1.2, step: 0.01, default: 0.6, hint: "Overall mass of the sculpted body." },
  { path: "form.smoothness", label: "Smoothness", kind: "scalar", min: 0.02, max: 0.5, step: 0.005, default: 0.18, hint: "How gently masses blend into each other." },
  { path: "form.cluster", label: "Cluster", kind: "scalar", min: 1, max: 5, step: 1, default: 3, identity: true, hint: "How many sub-forms merge." },
  { path: "form.deform", label: "Deform", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.25, hint: "Surface displacement and breathing." },
  { path: "form.twist", label: "Twist", kind: "scalar", min: -2, max: 2, step: 0.01, default: 0.4, hint: "Axial twist through the body." },
  { path: "form.cameraDist", label: "Distance", kind: "scalar", min: 1.6, max: 5, step: 0.01, default: 2.6 },
  { path: "form.cameraOrbit", label: "Orbit", kind: "scalar", min: -3.14, max: 3.14, step: 0.01, default: 0.4 },
  { path: "form.cameraTilt", label: "Tilt", kind: "scalar", min: -1.2, max: 1.2, step: 0.01, default: 0.15 },
];

const material: ParamSpec[] = [
  { path: "material.metalness", label: "Metalness", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.4 },
  { path: "material.roughness", label: "Roughness", kind: "scalar", min: 0.02, max: 1, step: 0.01, default: 0.35 },
  { path: "material.iridescence", label: "Iridescence", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.2 },
  { path: "material.translucency", label: "Translucency", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.15, hint: "Subsurface light bleed." },
  { path: "material.clearcoat", label: "Clearcoat", kind: "scalar", min: 0, max: 1, step: 0.01, default: 0.35 },
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
  variantParam: "form.variant",
  variantNames: ["Blob cluster", "Twisted torus", "Octahedral lattice", "Liquid dome"],
};
