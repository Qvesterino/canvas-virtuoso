// Shader Art Lab — Artwork Domain types.
//
// The Artwork is the single source of creative truth. It is a structured,
// versioned, reproducible description of a living procedural composition.
// The renderer INTERPRETS this data; it does not own it. UI issues commands
// against this model and never mutates fields directly.

export type FamilyId =
  | "living-fields"
  | "material-forms"
  | "temporal-paintings"
  | "typographic-organisms"
  | "spatial-illusions";

export type SystemId =
  | "form"
  | "motion"
  | "forces"
  | "material"
  | "light"
  | "atmosphere"
  | "memory"
  | "color"
  | "output";

/** A canonical dot-path identifier for a parameter, e.g. "motion.speed". */
export type ParamPath = string;

export type ParamValue = number | boolean | string | number[];

export interface ParamSpec {
  path: ParamPath;
  label: string;
  kind: "scalar" | "toggle" | "choice" | "color" | "vector";
  min?: number;
  max?: number;
  step?: number;
  choices?: { value: string; label: string }[];
  default: ParamValue;
  /** Short creative description shown in the inspector. */
  hint?: string;
}

export interface CreativeSystemState {
  systemId: SystemId;
  /** Semver-ish schema version for this system's parameter shape. */
  definitionVersion: string;
  /** Which implementation/pipeline realises this system for the active family. */
  implementationId: string;
  enabled: boolean;
  bypassed: boolean;
  parameters: Record<ParamPath, ParamValue>;
  /** Structured seed for reproducible mutation within the system. */
  seed: number;
  /** Family-specific extension bag, keyed by family id. */
  familyExtensions: Record<string, Record<string, unknown>>;
}

export interface ModulationRoute {
  id: string;
  /** Source signal identifier — e.g. "time.beat", "audio.low". Reserved for later slices. */
  source: string;
  /** Target parameter dot-path. */
  target: ParamPath;
  depth: number;
  polarity: "positive" | "bipolar" | "negative";
  curve: "linear" | "expo" | "sine";
  smoothing: number;
}

export interface LockEntry {
  path: ParamPath | `system:${SystemId}`;
  /** Which operations this lock applies to. */
  scope: {
    mutation: boolean;
    randomization: boolean;
    remix: boolean;
    recipe: boolean;
  };
  reason?: string;
}

export interface OutputIntent {
  aspect: "square" | "portrait" | "landscape" | "widescreen" | "custom";
  customRatio?: [number, number];
  targetLongEdge: number; // export longest edge in px
  colorSpace: "srgb" | "display-p3";
  frameRate: number;
  loopSeconds: number;
}

export interface ArtworkLineage {
  parentArtworkId?: string;
  recipeId?: string;
  createdFrom: "blank" | "recipe" | "remix" | "mutation" | "import";
}

export interface Artwork {
  id: string;
  revision: number;
  schemaVersion: 1;
  family: FamilyId;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Structured artwork-level seed; systems derive their seed from this. */
  artworkSeed: number;
  systems: Partial<Record<SystemId, CreativeSystemState>>;
  locks: LockEntry[];
  modulationRoutes: ModulationRoute[];
  output: OutputIntent;
  lineage: ArtworkLineage;
  /** Preserved unknown fields from older/newer schemas — never dropped. */
  reserved?: Record<string, unknown>;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  activeArtworkId: string;
  artworks: Record<string, Artwork>;
  snapshots: Snapshot[];
  schemaVersion: 1;
}

/** Human-facing mode of the workspace — a level of disclosure, not a new artwork. */
export type WorkspaceMode = "discover" | "sculpt" | "expert";

export interface Snapshot {
  id: string;
  name: string;
  createdAt: number;
  artworkId: string;
  /** Frozen artwork snapshot. */
  artwork: Artwork;
}

export interface Recipe {
  id: string;
  name: string;
  family: FamilyId;
  tagline: string;
  changes: { system: SystemId; path: ParamPath; value: ParamValue }[];
}