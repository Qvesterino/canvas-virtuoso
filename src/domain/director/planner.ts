import { dispatch, getState } from "../artwork/store";
import { getFamily } from "../families/registry";
import { PALETTES } from "../palettes/library";
import type { FamilyId, ParamPath, SystemId } from "../artwork/types";
import type { ArtworkPlan, PlanParam } from "./schema";
import { FAMILY_ENUM, PALETTE_ENUM } from "./schema";

/** Which system a dot-path belongs to. Returns undefined for unknown prefixes. */
function systemOfPath(path: ParamPath): SystemId | undefined {
  const [head] = path.split(".");
  const known: SystemId[] = [
    "form", "motion", "forces", "material", "light",
    "atmosphere", "memory", "color", "output",
  ];
  return (known as string[]).includes(head) ? (head as SystemId) : undefined;
}

/** Look up the ParamSpec for a given path in the given family. */
function findSpec(family: FamilyId, path: ParamPath) {
  const fam = getFamily(family);
  for (const specs of Object.values(fam.schema)) {
    if (!specs) continue;
    const hit = specs.find((s) => s.path === path);
    if (hit) return hit;
  }
  return undefined;
}

function clampToSpec(family: FamilyId, path: ParamPath, value: number): number | null {
  const spec = findSpec(family, path);
  if (!spec || spec.kind !== "scalar") return null;
  const min = spec.min ?? -Infinity;
  const max = spec.max ?? Infinity;
  let v = Math.max(min, Math.min(max, value));
  if ((spec.step ?? 0) >= 1) v = Math.round(v);
  return v;
}

/** State the client keeps between partial-plan updates so we only
 *  dispatch commands for what actually changed. */
export interface PlannerCursor {
  family?: FamilyId;
  variant?: number;
  paletteId?: string;
  paramValues: Map<ParamPath, number>;
}

export function createPlannerCursor(): PlannerCursor {
  return { paramValues: new Map() };
}

function isValidFamily(x: unknown): x is FamilyId {
  return typeof x === "string" && (FAMILY_ENUM as readonly string[]).includes(x);
}

function isValidPalette(x: unknown): x is string {
  return typeof x === "string" && (PALETTE_ENUM as readonly string[]).includes(x);
}

/** A partial plan is applied progressively as the model streams it.
 *  Each field is applied only when it becomes stable (non-null and
 *  different from what we already applied). Returns an updated cursor. */
export function applyPartialPlan(
  cursor: PlannerCursor,
  partial: Partial<ArtworkPlan> | undefined,
): PlannerCursor {
  if (!partial) return cursor;
  let next = cursor;

  // 1. Family — switch first so subsequent variant / params land on the
  //    right schema.
  if (isValidFamily(partial.family) && partial.family !== next.family) {
    const active = getState().project;
    const currentFamily = active.artworks[active.activeArtworkId].family;
    if (currentFamily !== partial.family) {
      dispatch({ type: "switchFamily", family: partial.family });
    }
    next = { ...next, family: partial.family, paramValues: new Map() };
  }

  // 2. Variant — set form.variant on the active family.
  const activeFamily = next.family ?? getActiveFamily();
  if (
    typeof partial.variant === "number" &&
    Number.isFinite(partial.variant) &&
    partial.variant !== next.variant
  ) {
    const clamped = clampToSpec(activeFamily, "form.variant", partial.variant);
    if (clamped != null) {
      dispatch({
        type: "setParameter",
        system: "form",
        path: "form.variant",
        value: clamped,
      });
      next = { ...next, variant: clamped };
    }
  }

  // 3. Palette — signature colour statement.
  if (isValidPalette(partial.paletteId) && partial.paletteId !== next.paletteId) {
    const palette = PALETTES.find((p) => p.id === partial.paletteId);
    if (palette) {
      dispatch({ type: "applyPalette", palette });
      next = { ...next, paletteId: palette.id };
    }
  }

  // 4. Parameters — apply only ones we haven't already applied to
  //    the same value. Silently drop invalid paths.
  if (Array.isArray(partial.parameters)) {
    const seen = new Map<ParamPath, number>(next.paramValues);
    for (const entry of partial.parameters as PlanParam[]) {
      if (!entry || typeof entry.path !== "string") continue;
      if (typeof entry.value !== "number" || !Number.isFinite(entry.value)) continue;
      // Guard against the model re-emitting form.variant here.
      if (entry.path === "form.variant") continue;
      const system = systemOfPath(entry.path);
      if (!system) continue;
      const clamped = clampToSpec(activeFamily, entry.path, entry.value);
      if (clamped == null) continue;
      if (seen.get(entry.path) === clamped) continue;
      dispatch({ type: "setParameter", system, path: entry.path, value: clamped });
      seen.set(entry.path, clamped);
    }
    next = { ...next, paramValues: seen };
  }

  return next;
}

function getActiveFamily(): FamilyId {
  const s = getState().project;
  return s.artworks[s.activeArtworkId].family;
}
