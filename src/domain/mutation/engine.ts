// Mutation, randomisation and remix engines. All three take an Artwork and
// return a new Artwork whose scalar parameters have been rewritten while
// respecting locks. They are pure functions — the store wraps them in a
// history-aware command so undo/redo works naturally.

import type { Artwork, SystemId } from "../artwork/types";
import { getFamily } from "../families/registry";
import { mulberry32, randSeed } from "../rng";

function isLocked(a: Artwork, path: string): boolean {
  const sys = path.split(".")[0];
  return a.locks.some((l) => l.path === path || l.path === `system:${sys}`);
}

function quantize(v: number, step?: number): number {
  if (!step) return v;
  if (step >= 1) return Math.round(v / step) * step;
  return v;
}

// Systems that primarily change *structure* — these get louder mutation
// so results are recognisably different, not just re-tinted.
const STRUCTURAL_SYSTEMS: SystemId[] = ["form", "motion", "material", "memory"];

// Parameter paths that describe an implementation/topology choice. When
// mutated we don't nudge them — we *jump* to a neighbouring discrete value
// so the piece genuinely reshapes itself.
const TOPOLOGY_PATHS = new Set<string>([
  "form.variant",
  "form.cluster",
  "form.strokes",
  "form.sources",
  "form.rings",
  "form.mirrors",
  "form.detail",
]);

export function mutateArtwork(
  a: Artwork,
  strength = 0.5,
  seed = randSeed(),
): Artwork {
  const rng = mulberry32(seed);
  const fam = getFamily(a.family);
  const systems = { ...a.systems };
  // Probability the mutation performs a *structural* jump on top of the
  // usual nudging — flipping variants, swapping topology, re-seeding.
  const structuralJump = rng() < Math.min(0.85, 0.25 + strength * 0.7);
  for (const sysId of Object.keys(systems) as SystemId[]) {
    const sys = systems[sysId];
    if (!sys) continue;
    if (isLocked(a, `system:${sysId}`)) continue;
    const specs = fam.schema[sysId] ?? [];
    const params = { ...sys.parameters };
    const isStructural = STRUCTURAL_SYSTEMS.includes(sysId);
    // Louder for structure, gentler for colour/light so identity survives.
    const sysScale = isStructural ? 0.55 : 0.18;
    for (const spec of specs) {
      if (spec.kind !== "scalar" || spec.min === undefined || spec.max === undefined) continue;
      if (isLocked(a, spec.path)) continue;
      const base = (params[spec.path] ?? spec.default) as number;
      const range = spec.max - spec.min;
      let v: number;
      if (TOPOLOGY_PATHS.has(spec.path) && structuralJump) {
        // Discrete jump: pick a *different* legal value in range.
        const step = spec.step && spec.step > 0 ? spec.step : 1;
        const slots = Math.max(1, Math.round(range / step));
        const currentSlot = Math.round((base - spec.min) / step);
        // Bias jumps to be at least 1 slot away.
        let nextSlot = Math.floor(rng() * (slots + 1));
        if (nextSlot === currentSlot) nextSlot = (nextSlot + 1) % (slots + 1);
        v = spec.min + nextSlot * step;
      } else {
        const noise = (rng() * 2 - 1) * strength * range * sysScale;
        v = base + noise;
      }
      v = quantize(v, spec.step);
      v = Math.min(spec.max, Math.max(spec.min, v));
      params[spec.path] = v;
    }
    // Re-seed structural systems on a structural jump so procedural
    // placements (blob centres, stroke seeds, kaleidoscope offsets…)
    // actually differ instead of just wiggling.
    const nextSeed = structuralJump && isStructural
      ? Math.floor(rng() * 2 ** 31)
      : sys.seed;
    systems[sysId] = { ...sys, parameters: params, seed: nextSeed };
  }
  const artworkSeed = structuralJump
    ? Math.floor(rng() * 2 ** 31)
    : a.artworkSeed;
  return {
    ...a,
    artworkSeed,
    systems,
    lineage: { ...a.lineage, createdFrom: "mutation" },
  };
}

export function randomizeArtwork(a: Artwork, seed = randSeed()): Artwork {
  const rng = mulberry32(seed);
  const fam = getFamily(a.family);
  const systems = { ...a.systems };
  for (const sysId of Object.keys(systems) as SystemId[]) {
    const sys = systems[sysId];
    if (!sys) continue;
    if (isLocked(a, `system:${sysId}`)) continue;
    const specs = fam.schema[sysId] ?? [];
    const params = { ...sys.parameters };
    for (const spec of specs) {
      if (spec.kind !== "scalar" || spec.min === undefined || spec.max === undefined) continue;
      if (isLocked(a, spec.path)) continue;
      let v = spec.min + rng() * (spec.max - spec.min);
      v = quantize(v, spec.step);
      params[spec.path] = v;
    }
    systems[sysId] = { ...sys, parameters: params };
  }
  return {
    ...a,
    artworkSeed: Math.floor(rng() * 2 ** 31),
    systems,
    lineage: { ...a.lineage, createdFrom: "mutation" },
  };
}

export function remixArtworks(a: Artwork, b: Artwork, blend: number): Artwork {
  if (a.family !== b.family) return a;
  const t = Math.min(1, Math.max(0, blend));
  const fam = getFamily(a.family);
  const systems = { ...a.systems };
  for (const sysId of Object.keys(systems) as SystemId[]) {
    const sys = systems[sysId];
    const other = b.systems[sysId];
    if (!sys || !other) continue;
    if (isLocked(a, `system:${sysId}`)) continue;
    const specs = fam.schema[sysId] ?? [];
    const params = { ...sys.parameters };
    for (const spec of specs) {
      if (isLocked(a, spec.path)) continue;
      const av = params[spec.path];
      const bv = other.parameters[spec.path];
      if (typeof av === "number" && typeof bv === "number") {
        let v = av * (1 - t) + bv * t;
        v = quantize(v, spec.step);
        if (spec.min !== undefined) v = Math.max(spec.min, v);
        if (spec.max !== undefined) v = Math.min(spec.max, v);
        params[spec.path] = v;
      }
    }
    systems[sysId] = { ...sys, parameters: params };
  }
  return {
    ...a,
    systems,
    lineage: { ...a.lineage, createdFrom: "remix", parentArtworkId: b.id },
  };
}