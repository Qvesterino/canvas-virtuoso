import type {
  Artwork,
  CreativeSystemState,
  FamilyId,
  ParamValue,
  Project,
  SystemId,
} from "./types";
import { getFamily } from "../families/registry";

function rid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function hash32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function createArtwork(family: FamilyId, name = "Untitled Artwork"): Artwork {
  const def = getFamily(family);
  const now = Date.now();
  const artworkSeed = Math.floor(Math.random() * 2 ** 31);

  const systems: Partial<Record<SystemId, CreativeSystemState>> = {};
  const buildSystem = (systemId: SystemId): CreativeSystemState | null => {
    const specs = def.schema[systemId];
    if (!specs) return null;
    const parameters: Record<string, ParamValue> = {};
    for (const spec of specs) parameters[spec.path] = spec.default;
    return {
      systemId,
      definitionVersion: "1.0.0",
      implementationId: `${family}:${systemId}`,
      enabled: true,
      bypassed: false,
      parameters,
      seed: hash32(`${artworkSeed}:${systemId}`),
      familyExtensions: {},
    };
  };

  for (const systemId of def.requiredSystems) {
    const s = buildSystem(systemId);
    if (s) systems[systemId] = s;
  }
  for (const systemId of def.supportedSystems) {
    if (systems[systemId]) continue;
    const s = buildSystem(systemId);
    if (s) systems[systemId] = s;
  }

  return {
    id: rid("art"),
    revision: 1,
    schemaVersion: 1,
    family,
    name,
    createdAt: now,
    updatedAt: now,
    artworkSeed,
    systems,
    locks: [],
    modulationRoutes: [],
    output: {
      aspect: "landscape",
      targetLongEdge: 2560,
      colorSpace: "srgb",
      frameRate: 60,
      loopSeconds: 12,
    },
    lineage: { createdFrom: "blank" },
  };
}

export function createProject(family: FamilyId = "living-fields"): Project {
  const artwork = createArtwork(family, "First Field");
  return {
    id: rid("prj"),
    name: "Untitled Project",
    createdAt: artwork.createdAt,
    updatedAt: artwork.updatedAt,
    activeArtworkId: artwork.id,
    artworks: { [artwork.id]: artwork },
    schemaVersion: 1,
  };
}