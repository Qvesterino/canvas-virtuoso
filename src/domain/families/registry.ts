import type { FamilyId, SystemId, ParamSpec } from "../artwork/types";
import { livingFieldsFamily } from "./living-fields";

export interface FamilyDefinition {
  id: FamilyId;
  name: string;
  tagline: string;
  supportedSystems: SystemId[];
  requiredSystems: SystemId[];
  schema: Partial<Record<SystemId, ParamSpec[]>>;
  implemented: boolean;
}

export const FAMILY_REGISTRY: Record<FamilyId, FamilyDefinition> = {
  "living-fields": livingFieldsFamily,
  "material-forms": {
    id: "material-forms",
    name: "Material Forms",
    tagline: "Sculpted volumes of imagined matter.",
    supportedSystems: ["form", "material", "light", "color", "atmosphere", "output"],
    requiredSystems: ["form", "material", "output"],
    schema: {},
    implemented: false,
  },
  "temporal-paintings": {
    id: "temporal-paintings",
    name: "Temporal Paintings",
    tagline: "Memory-driven brush strokes across time.",
    supportedSystems: ["form", "motion", "memory", "color", "output"],
    requiredSystems: ["memory", "output"],
    schema: {},
    implemented: false,
  },
  "typographic-organisms": {
    id: "typographic-organisms",
    name: "Typographic Organisms",
    tagline: "Living letterforms that breathe.",
    supportedSystems: ["form", "motion", "material", "color", "output"],
    requiredSystems: ["form", "output"],
    schema: {},
    implemented: false,
  },
  "spatial-illusions": {
    id: "spatial-illusions",
    name: "Spatial Illusions",
    tagline: "Impossible geometries and optical depth.",
    supportedSystems: ["form", "motion", "light", "atmosphere", "color", "output"],
    requiredSystems: ["form", "output"],
    schema: {},
    implemented: false,
  },
};

export function getFamily(id: FamilyId): FamilyDefinition {
  return FAMILY_REGISTRY[id];
}

export function listFamilies(): FamilyDefinition[] {
  return Object.values(FAMILY_REGISTRY);
}