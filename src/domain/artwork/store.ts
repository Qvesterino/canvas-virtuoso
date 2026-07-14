import { useSyncExternalStore } from "react";
import type {
  Artwork,
  Project,
  ParamPath,
  ParamValue,
  SystemId,
  WorkspaceMode,
  FamilyId,
  Recipe,
  Snapshot,
  ModulationRoute,
  LockEntry,
} from "./types";
import { createProject, createArtwork, newSnapshotId } from "./factories";
import { mutateArtwork as engineMutate, randomizeArtwork as engineRandomize, remixArtworks } from "../mutation/engine";
import { getFamily, type FamilyDefinition } from "../families/registry";
import { resolvePalette, type Palette } from "../palettes/library";
import { findMacro } from "../macros/definitions";

const MAX_HISTORY = 50;
const MAX_CHANGELOG = 40;

/** Stable 32-bit hash of a recipe id — used when a Recipe has no explicit
 *  seed so repeated clicks on the same recipe reproduce the same artwork. */
function hashRecipeSeed(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h & 0x7fffffff) || 1;
}

export type ChangeKind =
  | "mutate"
  | "randomize"
  | "recipe"
  | "remix"
  | "reseed"
  | "palette"
  | "macro";

export interface ChangelogParamDelta {
  path: ParamPath;
  label: string;
  system: SystemId;
  from: number;
  to: number;
  identity: boolean;
  /** "variant" flips read as words in the UI; "scalar" is a value nudge. */
  kind: "variant" | "scalar";
  /** For variant flips: human labels of before/after. */
  fromLabel?: string;
  toLabel?: string;
}

export interface ChangelogEntry {
  id: string;
  at: number;
  kind: ChangeKind;
  /** Short header, e.g. "Mutate", "Applied Nebula". */
  label: string;
  /** One-line summary of the most notable change (variant flip, etc). */
  headline?: string;
  changes: ChangelogParamDelta[];
  seedChanged: boolean;
  reseededSystems: SystemId[];
  identityCount: number;
  totalChanges: number;
}

export interface AppState {
  project: Project;
  history: { past: Artwork[]; future: Artwork[] };
  mode: WorkspaceMode;
  inspectedSystem: SystemId;
  playing: boolean;
  hydrated: boolean;
  audioEnabled: boolean;
  memoryFrozen: boolean;
  memoryClearNonce: number;
  exportOpen: boolean;
  onboardingDismissed: boolean;
  diagnosticsOpen: boolean;
  activePaletteId: string | null;
  changelog: ChangelogEntry[];
  changelogOpen: boolean;
}

export type Command =
  | { type: "setParameter"; system: SystemId; path: ParamPath; value: ParamValue }
  | { type: "setSystemEnabled"; system: SystemId; enabled: boolean }
  | { type: "setSystemBypassed"; system: SystemId; bypassed: boolean }
  | { type: "setMode"; mode: WorkspaceMode }
  | { type: "inspectSystem"; system: SystemId }
  | { type: "setPlaying"; playing: boolean }
  | { type: "renameArtwork"; name: string }
  | { type: "reseedArtwork" }
  | { type: "switchFamily"; family: FamilyId }
  | { type: "newArtwork"; family: FamilyId }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saveSnapshot"; name: string }
  | { type: "restoreSnapshot"; snapshotId: string }
  | { type: "deleteSnapshot"; snapshotId: string }
  | { type: "toggleLock"; target: string }
  | { type: "applyRecipe"; recipe: Recipe }
  | { type: "mutateArtwork"; strength?: number }
  | { type: "randomizeArtwork" }
  | { type: "remixWithSnapshot"; snapshotId: string; blend?: number }
  | { type: "addModulationRoute"; target: ParamPath; source: string }
  | { type: "removeModulationRoute"; id: string }
  | { type: "updateModulationRoute"; id: string; patch: Partial<Omit<ModulationRoute, "id">> }
  | { type: "setAudioEnabled"; enabled: boolean }
  | { type: "setMemoryFrozen"; frozen: boolean }
  | { type: "clearMemory" }
  | { type: "setExportOpen"; open: boolean }
  | { type: "hydrateProject"; project: Project }
  | { type: "markHydrated" }
  | { type: "applyPalette"; palette: Palette }
  | { type: "applyMacro"; macroId: string; value: number }
  | { type: "dismissOnboarding" }
  | { type: "revealOnboarding" }
  | { type: "toggleDiagnostics" }
  | { type: "toggleChangelog" }
  | { type: "setChangelogOpen"; open: boolean }
  | { type: "clearChangelog" }
  | { type: "clearIdentityLocks" };

type Listener = () => void;

/** Structural identity paths — recipes freeze these on apply so the
 *  piece keeps its recognisable shape while other params stay editable. */
const FALLBACK_IDENTITY_PATHS = new Set<string>([
  "form.variant",
  "form.kernel",
  "form.mirrors",
  "form.cells",
  "form.rings",
  "form.cluster",
  "form.strokes",
  "form.sources",
  "form.layout",
]);

function familyIdentityPaths(family: FamilyDefinition): Set<string> {
  const set = new Set<string>();
  for (const specs of Object.values(family.schema)) {
    if (!specs) continue;
    for (const spec of specs) if (spec.identity) set.add(spec.path);
  }
  return set;
}

function specForPath(family: FamilyDefinition, path: ParamPath) {
  for (const specs of Object.values(family.schema)) {
    if (!specs) continue;
    const hit = specs.find((s) => s.path === path);
    if (hit) return hit;
  }
  return undefined;
}

function variantLabel(family: FamilyDefinition, value: number): string | undefined {
  const names = family.variantNames;
  if (!names) return undefined;
  const i = Math.round(value);
  return names[i];
}

function diffArtworks(
  prev: Artwork,
  next: Artwork,
  family: FamilyDefinition,
): { changes: ChangelogParamDelta[]; reseededSystems: SystemId[] } {
  const changes: ChangelogParamDelta[] = [];
  const reseededSystems: SystemId[] = [];
  const identityPaths = familyIdentityPaths(family);
  for (const sysId of Object.keys(next.systems) as SystemId[]) {
    const a = prev.systems[sysId];
    const b = next.systems[sysId];
    if (!b) continue;
    if (a && a.seed !== b.seed) reseededSystems.push(sysId);
    const specs = family.schema[sysId] ?? [];
    for (const spec of specs) {
      if (spec.kind !== "scalar") continue;
      const av = a?.parameters[spec.path];
      const bv = b.parameters[spec.path];
      if (typeof bv !== "number") continue;
      const before = typeof av === "number" ? av : (spec.default as number);
      if (before === bv) continue;
      const range = (spec.max ?? 1) - (spec.min ?? 0) || 1;
      const isVariant =
        (spec.step ?? 0) >= 1 && (identityPaths.has(spec.path) || FALLBACK_IDENTITY_PATHS.has(spec.path));
      // Ignore invisibly-tiny scalar nudges (< 0.5% of range) unless variant.
      if (!isVariant && Math.abs(bv - before) < range * 0.005) continue;
      changes.push({
        path: spec.path,
        label: spec.label,
        system: sysId,
        from: before,
        to: bv,
        identity: !!spec.identity || FALLBACK_IDENTITY_PATHS.has(spec.path),
        kind: isVariant ? "variant" : "scalar",
        fromLabel:
          isVariant && spec.path === family.variantParam
            ? variantLabel(family, before)
            : undefined,
        toLabel:
          isVariant && spec.path === family.variantParam
            ? variantLabel(family, bv)
            : undefined,
      });
    }
  }
  // Sort: identity first (variant flips lead), then largest deltas.
  changes.sort((a, b) => {
    if (a.identity !== b.identity) return a.identity ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "variant" ? -1 : 1;
    return Math.abs(b.to - b.from) - Math.abs(a.to - a.from);
  });
  return { changes, reseededSystems };
}

function makeHeadline(
  family: FamilyDefinition,
  entry: Pick<ChangelogEntry, "changes" | "reseededSystems" | "seedChanged">,
): string | undefined {
  const variantFlip = entry.changes.find(
    (c) => c.kind === "variant" && c.path === family.variantParam,
  );
  if (variantFlip && variantFlip.fromLabel && variantFlip.toLabel) {
    return `${variantFlip.fromLabel} → ${variantFlip.toLabel}`;
  }
  const otherVariant = entry.changes.find((c) => c.kind === "variant");
  if (otherVariant) {
    return `${otherVariant.label} ${Math.round(otherVariant.from)} → ${Math.round(otherVariant.to)}`;
  }
  const identity = entry.changes.find((c) => c.identity);
  if (identity) return `${identity.label} shifted`;
  if (entry.seedChanged || entry.reseededSystems.length > 0) {
    return entry.reseededSystems.length > 0
      ? `Re-seeded ${entry.reseededSystems.join(" · ")}`
      : "Re-seeded";
  }
  return undefined;
}

function makeChangelogEntry(
  kind: ChangeKind,
  label: string,
  prev: Artwork,
  next: Artwork,
  family: FamilyDefinition,
): ChangelogEntry | null {
  const { changes, reseededSystems } = diffArtworks(prev, next, family);
  const seedChanged = prev.artworkSeed !== next.artworkSeed;
  if (changes.length === 0 && !seedChanged && reseededSystems.length === 0) return null;
  const entry: ChangelogEntry = {
    id: `cl_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`,
    at: Date.now(),
    kind,
    label,
    changes,
    seedChanged,
    reseededSystems,
    identityCount: changes.filter((c) => c.identity).length,
    totalChanges: changes.length,
  };
  entry.headline = makeHeadline(family, entry);
  return entry;
}

function activeArtwork(project: Project): Artwork {
  return project.artworks[project.activeArtworkId];
}

function pushHistory(
  history: AppState["history"],
  prev: Artwork,
): AppState["history"] {
  const past = [...history.past, prev];
  if (past.length > MAX_HISTORY) past.shift();
  return { past, future: [] };
}

function mutateArtwork(
  state: AppState,
  update: (a: Artwork) => Artwork,
): AppState {
  const current = activeArtwork(state.project);
  const next = update(current);
  if (next === current) return state;
  next.revision = current.revision + 1;
  next.updatedAt = Date.now();
  return {
    ...state,
    history: pushHistory(state.history, current),
    project: {
      ...state.project,
      updatedAt: next.updatedAt,
      artworks: { ...state.project.artworks, [next.id]: next },
    },
  };
}

function isLocked(artwork: Artwork, target: string): boolean {
  return artwork.locks.some((l) => l.path === target);
}

function pushChangelog(state: AppState, entry: ChangelogEntry | null): AppState {
  if (!entry) return state;
  return {
    ...state,
    changelog: [entry, ...state.changelog].slice(0, MAX_CHANGELOG),
  };
}

/** Run `updater`, and if the active artwork changed, record a changelog
 *  entry describing the delta. */
function withChangelog(
  state: AppState,
  kind: ChangeKind,
  label: string,
  updater: (s: AppState) => AppState,
): AppState {
  const prev = activeArtwork(state.project);
  const next = updater(state);
  if (next === state) return state;
  const nextArt = activeArtwork(next.project);
  if (nextArt.id !== prev.id) return next; // artwork switch — no diff
  const family = getFamily(nextArt.family);
  return pushChangelog(next, makeChangelogEntry(kind, label, prev, nextArt, family));
}

function apply(state: AppState, cmd: Command): AppState {
  switch (cmd.type) {
    case "setMode":
      return state.mode === cmd.mode ? state : { ...state, mode: cmd.mode };
    case "inspectSystem":
      return state.inspectedSystem === cmd.system
        ? state
        : { ...state, inspectedSystem: cmd.system };
    case "setPlaying":
      return state.playing === cmd.playing ? state : { ...state, playing: cmd.playing };
    case "setParameter": {
      return mutateArtwork(state, (a) => {
        const sys = a.systems[cmd.system];
        if (!sys) return a;
        if (isLocked(a, cmd.path) || isLocked(a, `system:${cmd.system}`)) return a;
        if (sys.parameters[cmd.path] === cmd.value) return a;
        return {
          ...a,
          systems: {
            ...a.systems,
            [cmd.system]: {
              ...sys,
              parameters: { ...sys.parameters, [cmd.path]: cmd.value },
            },
          },
        };
      });
    }
    case "setSystemEnabled": {
      return mutateArtwork(state, (a) => {
        const sys = a.systems[cmd.system];
        if (!sys || sys.enabled === cmd.enabled) return a;
        return {
          ...a,
          systems: { ...a.systems, [cmd.system]: { ...sys, enabled: cmd.enabled } },
        };
      });
    }
    case "setSystemBypassed": {
      return mutateArtwork(state, (a) => {
        const sys = a.systems[cmd.system];
        if (!sys || sys.bypassed === cmd.bypassed) return a;
        return {
          ...a,
          systems: { ...a.systems, [cmd.system]: { ...sys, bypassed: cmd.bypassed } },
        };
      });
    }
    case "renameArtwork": {
      return mutateArtwork(state, (a) =>
        a.name === cmd.name ? a : { ...a, name: cmd.name },
      );
    }
    case "reseedArtwork": {
      return withChangelog(state, "reseed", "Reseed", (s) =>
        mutateArtwork(s, (a) => ({
          ...a,
          artworkSeed: Math.floor(Math.random() * 2 ** 31),
        })),
      );
    }
    case "toggleLock": {
      return mutateArtwork(state, (a) => {
        const exists = a.locks.some((l) => l.path === cmd.target);
        const locks = exists
          ? a.locks.filter((l) => l.path !== cmd.target)
          : [
              ...a.locks,
              {
                path: cmd.target,
                scope: { mutation: true, randomization: true, remix: true, recipe: true },
              },
            ];
        return { ...a, locks };
      });
    }
    case "applyRecipe": {
      const activeFam = state.project.artworks[state.project.activeArtworkId].family;
      if (cmd.recipe.family !== activeFam) return state;
      const family = getFamily(activeFam);
      const familyIds = familyIdentityPaths(family);
      const touched = cmd.recipe.changes.map((c) => c.path);
      const explicitIdentity = cmd.recipe.identityPaths;
      const identityForRecipe = new Set<string>(
        explicitIdentity ??
          touched.filter((p) => familyIds.has(p) || FALLBACK_IDENTITY_PATHS.has(p)),
      );
      // A recipe is a DETERMINISTIC starting composition: clicking Abyss
      // twice must produce the same artwork. We rebuild from family
      // defaults with a stable per-recipe seed instead of patching the
      // current artwork, so no leftover state from the previous recipe
      // bleeds through.
      const recipeSeed = cmd.recipe.seed ?? hashRecipeSeed(cmd.recipe.id);
      return withChangelog(state, "recipe", `Applied ${cmd.recipe.name}`, (s) =>
        mutateArtwork(s, (a) => {
          const fresh = createArtwork(a.family, a.name, {
            id: a.id,
            seed: recipeSeed,
            createdAt: a.createdAt,
          });
          const systems = { ...fresh.systems };
          for (const change of cmd.recipe.changes) {
            const sys = systems[change.system];
            if (!sys) continue;
            systems[change.system] = {
              ...sys,
              parameters: { ...sys.parameters, [change.path]: change.value },
            };
          }
          const identityLocks: LockEntry[] = Array.from(identityForRecipe).map((path) => ({
            path,
            reason: "identity",
            scope: { mutation: true, randomization: true, remix: true, recipe: false },
          }));
          return {
            ...fresh,
            revision: a.revision,
            systems,
            locks: identityLocks,
            modulationRoutes: a.modulationRoutes,
            output: a.output,
            lineage: { ...fresh.lineage, createdFrom: "recipe", recipeId: cmd.recipe.id },
          };
        }),
      );
    }
    case "mutateArtwork": {
      return withChangelog(state, "mutate", "Mutate", (s) =>
        mutateArtwork(s, (a) => engineMutate(a, cmd.strength ?? 0.5)),
      );
    }
    case "randomizeArtwork": {
      return withChangelog(state, "randomize", "Randomise", (s) =>
        mutateArtwork(s, (a) => engineRandomize(a)),
      );
    }
    case "remixWithSnapshot": {
      const snap = state.project.snapshots.find((s) => s.id === cmd.snapshotId);
      if (!snap) return state;
      return withChangelog(state, "remix", `Remix ${snap.name}`, (s) =>
        mutateArtwork(s, (a) => remixArtworks(a, snap.artwork, cmd.blend ?? 0.5)),
      );
    }
    case "addModulationRoute": {
      return mutateArtwork(state, (a) => {
        const existing = a.modulationRoutes.find((r) => r.target === cmd.target);
        if (existing && existing.source === cmd.source) return a;
        const route: ModulationRoute = {
          id: `mod_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`,
          source: cmd.source,
          target: cmd.target,
          depth: 0.4,
          polarity: "bipolar",
          curve: "linear",
          smoothing: 0,
        };
        const routes = existing
          ? a.modulationRoutes.map((r) => (r.id === existing.id ? { ...r, source: cmd.source } : r))
          : [...a.modulationRoutes, route];
        return { ...a, modulationRoutes: routes };
      });
    }
    case "removeModulationRoute": {
      return mutateArtwork(state, (a) => {
        if (!a.modulationRoutes.some((r) => r.id === cmd.id)) return a;
        return { ...a, modulationRoutes: a.modulationRoutes.filter((r) => r.id !== cmd.id) };
      });
    }
    case "updateModulationRoute": {
      return mutateArtwork(state, (a) => {
        let changed = false;
        const routes = a.modulationRoutes.map((r) => {
          if (r.id !== cmd.id) return r;
          changed = true;
          return { ...r, ...cmd.patch };
        });
        return changed ? { ...a, modulationRoutes: routes } : a;
      });
    }
    case "setAudioEnabled": {
      return state.audioEnabled === cmd.enabled ? state : { ...state, audioEnabled: cmd.enabled };
    }
    case "setMemoryFrozen": {
      return state.memoryFrozen === cmd.frozen ? state : { ...state, memoryFrozen: cmd.frozen };
    }
    case "clearMemory": {
      return { ...state, memoryClearNonce: state.memoryClearNonce + 1 };
    }
    case "setExportOpen": {
      return state.exportOpen === cmd.open ? state : { ...state, exportOpen: cmd.open };
    }
    case "undo": {
      if (state.history.past.length === 0) return state;
      const past = state.history.past.slice(0, -1);
      const prev = state.history.past[state.history.past.length - 1];
      const current = activeArtwork(state.project);
      return {
        ...state,
        history: { past, future: [current, ...state.history.future].slice(0, MAX_HISTORY) },
        project: {
          ...state.project,
          updatedAt: Date.now(),
          activeArtworkId: prev.id,
          artworks: { ...state.project.artworks, [prev.id]: prev },
        },
      };
    }
    case "redo": {
      if (state.history.future.length === 0) return state;
      const [next, ...future] = state.history.future;
      const current = activeArtwork(state.project);
      return {
        ...state,
        history: { past: [...state.history.past, current].slice(-MAX_HISTORY), future },
        project: {
          ...state.project,
          updatedAt: Date.now(),
          activeArtworkId: next.id,
          artworks: { ...state.project.artworks, [next.id]: next },
        },
      };
    }
    case "saveSnapshot": {
      const a = activeArtwork(state.project);
      const snap: Snapshot = {
        id: newSnapshotId(),
        name: cmd.name || `Snapshot ${state.project.snapshots.length + 1}`,
        createdAt: Date.now(),
        artworkId: a.id,
        artwork: JSON.parse(JSON.stringify(a)),
      };
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: snap.createdAt,
          snapshots: [snap, ...state.project.snapshots].slice(0, 100),
        },
      };
    }
    case "restoreSnapshot": {
      const snap = state.project.snapshots.find((s) => s.id === cmd.snapshotId);
      if (!snap) return state;
      const restored: Artwork = {
        ...JSON.parse(JSON.stringify(snap.artwork)),
        updatedAt: Date.now(),
      };
      const current = activeArtwork(state.project);
      return {
        ...state,
        history: pushHistory(state.history, current),
        project: {
          ...state.project,
          updatedAt: restored.updatedAt,
          activeArtworkId: restored.id,
          artworks: { ...state.project.artworks, [restored.id]: restored },
        },
      };
    }
    case "deleteSnapshot": {
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          snapshots: state.project.snapshots.filter((s) => s.id !== cmd.snapshotId),
        },
      };
    }
    case "hydrateProject": {
      return {
        ...state,
        hydrated: true,
        history: { past: [], future: [] },
        inspectedSystem: "form",
        project: cmd.project,
      };
    }
    case "markHydrated": {
      return state.hydrated ? state : { ...state, hydrated: true };
    }
    case "dismissOnboarding": {
      if (state.onboardingDismissed) return state;
      try {
        localStorage.setItem("shader-lab.onboarded", "1");
      } catch {}
      return { ...state, onboardingDismissed: true };
    }
    case "revealOnboarding": {
      return state.onboardingDismissed ? { ...state, onboardingDismissed: false } : state;
    }
    case "toggleDiagnostics": {
      return { ...state, diagnosticsOpen: !state.diagnosticsOpen };
    }
    case "toggleChangelog": {
      return { ...state, changelogOpen: !state.changelogOpen };
    }
    case "setChangelogOpen": {
      return state.changelogOpen === cmd.open ? state : { ...state, changelogOpen: cmd.open };
    }
    case "clearChangelog": {
      return state.changelog.length === 0 ? state : { ...state, changelog: [] };
    }
    case "clearIdentityLocks": {
      const a = activeArtwork(state.project);
      if (!a.locks.some((l) => l.reason === "identity")) return state;
      const next: Artwork = {
        ...a,
        locks: a.locks.filter((l) => l.reason !== "identity"),
        revision: a.revision + 1,
        updatedAt: Date.now(),
      };
      return {
        ...state,
        project: {
          ...state.project,
          updatedAt: next.updatedAt,
          artworks: { ...state.project.artworks, [next.id]: next },
        },
      };
    }
    case "applyPalette": {
      const family = getFamily(state.project.artworks[state.project.activeArtworkId].family);
      const changes = resolvePalette(cmd.palette, family.schema);
      if (changes.length === 0) return { ...state, activePaletteId: cmd.palette.id };
      const next = withChangelog(state, "palette", `Palette · ${cmd.palette.name}`, (s) =>
        mutateArtwork(s, (a) => {
          const systems = { ...a.systems };
          for (const change of changes) {
            if (isLocked(a, change.path) || isLocked(a, `system:${change.system}`)) continue;
            const sys = systems[change.system];
            if (!sys) continue;
            systems[change.system] = {
              ...sys,
              parameters: { ...sys.parameters, [change.path]: change.value },
            };
          }
          return { ...a, systems };
        }),
      );
      return { ...next, activePaletteId: cmd.palette.id };
    }
    case "applyMacro": {
      const macro = findMacro(cmd.macroId);
      if (!macro) return state;
      const v = Math.max(0, Math.min(1, cmd.value));
      return withChangelog(state, "macro", `Macro · ${macro.label}`, (s) =>
        mutateArtwork(s, (a) => {
        if (a.family !== macro.family) return a;
        const systems = { ...a.systems };
        for (const eff of macro.effects) {
          if (isLocked(a, eff.path) || isLocked(a, `system:${eff.system}`)) continue;
          const sys = systems[eff.system];
          if (!sys) continue;
          const value = eff.low + (eff.high - eff.low) * v;
          systems[eff.system] = {
            ...sys,
            parameters: { ...sys.parameters, [eff.path]: value },
          };
        }
        return { ...a, systems };
      }),
      );
    }
    case "switchFamily":
    case "newArtwork": {
      const artwork = createArtwork(cmd.family, "New Artwork");
      return {
        ...state,
        inspectedSystem: "form",
        history: { past: [], future: [] },
        activePaletteId: null,
        project: {
          ...state.project,
          updatedAt: Date.now(),
          activeArtworkId: artwork.id,
          artworks: { ...state.project.artworks, [artwork.id]: artwork },
        },
      };
    }
    default:
      return state;
  }
}

let state: AppState = {
  project: createProject("living-fields", { deterministic: true }),
  history: { past: [], future: [] },
  mode: "sculpt",
  inspectedSystem: "form",
  playing: true,
  hydrated: false,
  audioEnabled: false,
  memoryFrozen: false,
  memoryClearNonce: 0,
  exportOpen: false,
  onboardingDismissed: true, // SSR-safe default; client re-reads in effect
  diagnosticsOpen: false,
  activePaletteId: null,
  changelog: [],
  changelogOpen: false,
};

const listeners = new Set<Listener>();

export function dispatch(cmd: Command): void {
  const next = apply(state, cmd);
  if (next === state) return;
  state = next;
  for (const l of listeners) l();
}

export function getState(): AppState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => selector(state),
    () => selector(state),
  );
}

export function useActiveArtwork(): Artwork {
  return useAppState((s) => s.project.artworks[s.project.activeArtworkId]);
}

export function isParamLocked(artwork: Artwork, path: string): boolean {
  return artwork.locks.some((l) => l.path === path || l.path === `system:${path.split(".")[0]}`);
}