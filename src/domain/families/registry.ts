import type { FamilyId, SystemId, ParamSpec } from "../artwork/types";
import { livingFieldsFamily } from "./living-fields";
import { materialFormsFamily } from "./material-forms";
import { temporalPaintingsFamily } from "./temporal-paintings";
import { typographicOrganismsFamily } from "./typographic-organisms";
import { spatialIllusionsFamily } from "./spatial-illusions";

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
  "material-forms": materialFormsFamily,
  "temporal-paintings": temporalPaintingsFamily,
  "typographic-organisms": typographicOrganismsFamily,
  "spatial-illusions": spatialIllusionsFamily,
};

export function getFamily(id: FamilyId): FamilyDefinition {
  return FAMILY_REGISTRY[id];
}

export function listFamilies(): FamilyDefinition[] {
  return Object.values(FAMILY_REGISTRY);
}