import type {
  Artwork,
  CreativeSystemState,
  FamilyId,
  ParamValue,
  Project,
  SystemId,
} from "./types";
import { getFamily } from "../families/registry";

let idCounter = 0;
function rid(prefix: string): string {
  idCounter++;
  const rand = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${prefix}_${rand}${idCounter.toString(36)}`;
}

function hash32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export interface CreateArtworkOptions {
  seed?: number;
  id?: string;
  createdAt?: number;
}

export function createArtwork(
  family: FamilyId,
  name = "Untitled Artwork",
  opts: CreateArtworkOptions = {},
): Artwork {
  const def = getFamily(family);
  const now = opts.createdAt ?? Date.now();
  const artworkSeed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);

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
    id: opts.id ?? rid("art"),
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

export function createProject(
  family: FamilyId = "living-fields",
  opts: { deterministic?: boolean } = {},
): Project {
  if (opts.deterministic) {
    const artwork = createArtwork(family, "First Field", {
      seed: 1,
      id: "art_initial",
      createdAt: 0,
    });
    return {
      id: "prj_initial",
      name: "Untitled Project",
      createdAt: 0,
      updatedAt: 0,
      activeArtworkId: artwork.id,
      artworks: { [artwork.id]: artwork },
      snapshots: [],
      schemaVersion: 1,
    };
  }
  const artwork = createArtwork(family, "First Field");
  return {
    id: rid("prj"),
    name: "Untitled Project",
    createdAt: artwork.createdAt,
    updatedAt: artwork.updatedAt,
    activeArtworkId: artwork.id,
    artworks: { [artwork.id]: artwork },
    snapshots: [],
    schemaVersion: 1,
  };
}

export function newSnapshotId(): string {
  return rid("snap");
}