import type { Recipe, ParamPath } from "../artwork/types";

/** Soft normalisation limits. A recipe touching one of these paths whose
 *  value falls outside the range is flagged as a potential "dead" or
 *  "runaway" preset. These are guidelines, not hard clamps — the diagnostics
 *  panel surfaces violations so the recipe author can fix them. */
export interface NormLimit {
  min: number;
  max: number;
  /** Human-readable category shown in the HUD. */
  category: "intensity" | "contrast" | "luminosity" | "motion" | "atmosphere";
  /** Short reason the limit exists. */
  reason: string;
}

export const NORM_LIMITS: Record<ParamPath, NormLimit> = {
  "light.intensity": {
    min: 0.3, max: 1.6,
    category: "intensity",
    reason: "Below 0.3 the scene reads as black; above 1.6 it burns out.",
  },
  "light.bloom": {
    min: 0.0, max: 1.0,
    category: "intensity",
    reason: "Bloom > 1 saturates highlights into flat white.",
  },
  "color.contrast": {
    min: 0.7, max: 1.9,
    category: "contrast",
    reason: "Contrast < 0.7 flattens the image; > 1.9 crushes to two-tone.",
  },
  "color.luminosity": {
    min: 0.6, max: 1.35,
    category: "luminosity",
    reason: "Luminosity < 0.6 goes near-black; > 1.35 blows out.",
  },
  "color.saturation": {
    min: 0.15, max: 1.0,
    category: "luminosity",
    reason: "Saturation < 0.15 renders as monochrome.",
  },
  "motion.speed": {
    min: 0.04, max: 1.5,
    category: "motion",
    reason: "Speed < 0.04 looks frozen; > 1.5 is nauseating.",
  },
  "atmosphere.fog": {
    min: 0.0, max: 0.9,
    category: "atmosphere",
    reason: "Fog > 0.9 washes the entire frame to grey.",
  },
};

export interface RecipeIssue {
  recipeId: string;
  recipeName: string;
  path: ParamPath;
  value: number;
  category: NormLimit["category"];
  limit: { min: number; max: number };
  reason: string;
  side: "below" | "above";
}

/** Check a recipe against NORM_LIMITS. Returns [] when everything is in
 *  range. Only scalar (numeric) changes are checked. */
export function validateRecipe(recipe: Recipe): RecipeIssue[] {
  const out: RecipeIssue[] = [];
  for (const c of recipe.changes) {
    const lim = NORM_LIMITS[c.path];
    if (!lim) continue;
    if (typeof c.value !== "number") continue;
    const v = c.value;
    if (v < lim.min) {
      out.push({
        recipeId: recipe.id, recipeName: recipe.name, path: c.path, value: v,
        category: lim.category, limit: { min: lim.min, max: lim.max },
        reason: lim.reason, side: "below",
      });
    } else if (v > lim.max) {
      out.push({
        recipeId: recipe.id, recipeName: recipe.name, path: c.path, value: v,
        category: lim.category, limit: { min: lim.min, max: lim.max },
        reason: lim.reason, side: "above",
      });
    }
  }
  return out;
}