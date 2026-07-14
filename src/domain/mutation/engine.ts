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

export function mutateArtwork(
  a: Artwork,
  strength = 0.5,
  seed = randSeed(),
): Artwork {
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
      const base = (params[spec.path] ?? spec.default) as number;
      const range = spec.max - spec.min;
      const noise = (rng() * 2 - 1) * strength * range * 0.2;
      let v = base + noise;
      v = quantize(v, spec.step);
      v = Math.min(spec.max, Math.max(spec.min, v));
      params[spec.path] = v;
    }
    systems[sysId] = { ...sys, parameters: params };
  }
  return { ...a, systems, lineage: { ...a.lineage, createdFrom: "mutation" } };
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