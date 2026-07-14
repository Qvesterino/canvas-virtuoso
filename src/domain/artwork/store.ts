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
} from "./types";
import { createProject, createArtwork, newSnapshotId } from "./factories";
import { mutateArtwork as engineMutate, randomizeArtwork as engineRandomize, remixArtworks } from "../mutation/engine";
import { getFamily } from "../families/registry";
import { resolvePalette, type Palette } from "../palettes/library";
import { findMacro } from "../macros/definitions";

const MAX_HISTORY = 50;

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
  | { type: "toggleDiagnostics" };

type Listener = () => void;

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
      return mutateArtwork(state, (a) => ({
        ...a,
        artworkSeed: Math.floor(Math.random() * 2 ** 31),
      }));
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
      if (cmd.recipe.family !== state.project.artworks[state.project.activeArtworkId].family) {
        return state;
      }
      return mutateArtwork(state, (a) => {
        const systems = { ...a.systems };
        for (const change of cmd.recipe.changes) {
          if (isLocked(a, change.path) || isLocked(a, `system:${change.system}`)) continue;
          const sys = systems[change.system];
          if (!sys) continue;
          systems[change.system] = {
            ...sys,
            parameters: { ...sys.parameters, [change.path]: change.value },
          };
        }
        return { ...a, systems, lineage: { ...a.lineage, recipeId: cmd.recipe.id } };
      });
    }
    case "mutateArtwork": {
      return mutateArtwork(state, (a) => engineMutate(a, cmd.strength ?? 0.5));
    }
    case "randomizeArtwork": {
      return mutateArtwork(state, (a) => engineRandomize(a));
    }
    case "remixWithSnapshot": {
      const snap = state.project.snapshots.find((s) => s.id === cmd.snapshotId);
      if (!snap) return state;
      return mutateArtwork(state, (a) => remixArtworks(a, snap.artwork, cmd.blend ?? 0.5));
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
    case "toggleDiagnostics": {
      return { ...state, diagnosticsOpen: !state.diagnosticsOpen };
    }
    case "applyPalette": {
      const family = getFamily(state.project.artworks[state.project.activeArtworkId].family);
      const changes = resolvePalette(cmd.palette, family.schema);
      if (changes.length === 0) return { ...state, activePaletteId: cmd.palette.id };
      const next = mutateArtwork(state, (a) => {
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
      });
      return { ...next, activePaletteId: cmd.palette.id };
    }
    case "applyMacro": {
      const macro = findMacro(cmd.macroId);
      if (!macro) return state;
      const v = Math.max(0, Math.min(1, cmd.value));
      return mutateArtwork(state, (a) => {
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
      });
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