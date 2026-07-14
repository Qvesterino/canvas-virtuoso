// Modulation resolver — takes the artwork's declared parameters and the
// current live signal snapshot, and returns a new artwork with parameters
// projected through active routes. The base artwork is never mutated; the
// returned object is only used by the renderer for the current frame.

import type { Artwork, ModulationRoute, SystemId } from "../artwork/types";
import { getFamily } from "../families/registry";
import type { SignalSnapshot } from "../../services/signals";

function curve(x: number, kind: ModulationRoute["curve"]): number {
  switch (kind) {
    case "expo":
      return Math.sign(x) * x * x;
    case "sine":
      return Math.sin(x * Math.PI * 0.5);
    default:
      return x;
  }
}

function polarize(x: number, polarity: ModulationRoute["polarity"]): number {
  switch (polarity) {
    case "positive":
      return Math.max(0, x);
    case "negative":
      return -Math.max(0, x);
    default:
      return x;
  }
}

export function applyModulation(a: Artwork, signals: SignalSnapshot): Artwork {
  if (a.modulationRoutes.length === 0) return a;
  const fam = getFamily(a.family);
  let systems = a.systems;
  let changed = false;
  for (const route of a.modulationRoutes) {
    const sysId = route.target.split(".")[0] as SystemId;
    const sys = systems[sysId];
    if (!sys || sys.bypassed || !sys.enabled) continue;
    const specs = fam.schema[sysId];
    const spec = specs?.find((s) => s.path === route.target);
    if (!spec || spec.kind !== "scalar" || spec.min === undefined || spec.max === undefined) continue;
    const base = (sys.parameters[route.target] ?? spec.default) as number;
    const raw = signals[route.source] ?? 0;
    const s = polarize(curve(raw, route.curve), route.polarity);
    const range = spec.max - spec.min;
    const v = Math.min(spec.max, Math.max(spec.min, base + range * route.depth * s));
    if (!changed) {
      systems = { ...systems };
      changed = true;
    }
    systems[sysId] = {
      ...sys,
      parameters: { ...sys.parameters, [route.target]: v },
    };
  }
  return changed ? { ...a, systems } : a;
}

export function routeForTarget(a: Artwork, target: string): ModulationRoute | undefined {
  return a.modulationRoutes.find((r) => r.target === target);
}