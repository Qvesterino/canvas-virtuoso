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
  /** Dot-path of the scalar that selects an implementation variant
   *  (e.g. "form.variant"). Consumed by the Art Controls panel to
   *  hide parameters that are inert for the current variant. */
  variantParam?: string;
  /** Human labels for each integer value of `variantParam`. Index
   *  matches the scalar value. Used by Art Controls and the mutation
   *  changelog so variant flips read as words, not numbers. */
  variantNames?: string[];
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