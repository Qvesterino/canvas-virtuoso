import type { FamilyId } from "../../domain/artwork/types";
import type { Pipeline } from "./types";
import { livingFieldsPipeline } from "./living-fields";
import { materialFormsPipeline } from "./material-forms";
import { temporalPaintingsPipeline } from "./temporal-paintings";
import { typographicOrganismsPipeline } from "./typographic-organisms";
import { spatialIllusionsPipeline } from "./spatial-illusions";

export const PIPELINES: Record<FamilyId, Pipeline> = {
  "living-fields": livingFieldsPipeline,
  "material-forms": materialFormsPipeline,
  "temporal-paintings": temporalPaintingsPipeline,
  "typographic-organisms": typographicOrganismsPipeline,
  "spatial-illusions": spatialIllusionsPipeline,
};

export function getPipeline(id: FamilyId): Pipeline {
  return PIPELINES[id];
}

export type { Pipeline } from "./types";
