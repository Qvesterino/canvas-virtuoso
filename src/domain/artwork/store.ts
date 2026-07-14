import { useSyncExternalStore } from "react";
import type {
  Artwork,
  Project,
  ParamPath,
  ParamValue,
  SystemId,
  WorkspaceMode,
  FamilyId,
} from "./types";
import { createProject, createArtwork } from "./factories";

export interface AppState {
  project: Project;
  mode: WorkspaceMode;
  inspectedSystem: SystemId;
  playing: boolean;
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
  | { type: "newArtwork"; family: FamilyId };

type Listener = () => void;

function activeArtwork(project: Project): Artwork {
  return project.artworks[project.activeArtworkId];
}

function updateActiveArtwork(
  project: Project,
  update: (a: Artwork) => Artwork,
): Project {
  const current = activeArtwork(project);
  const next = update(current);
  if (next === current) return project;
  next.revision = current.revision + 1;
  next.updatedAt = Date.now();
  return {
    ...project,
    updatedAt: next.updatedAt,
    artworks: { ...project.artworks, [next.id]: next },
  };
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
      const project = updateActiveArtwork(state.project, (a) => {
        const sys = a.systems[cmd.system];
        if (!sys) return a;
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
      return { ...state, project };
    }
    case "setSystemEnabled": {
      const project = updateActiveArtwork(state.project, (a) => {
        const sys = a.systems[cmd.system];
        if (!sys || sys.enabled === cmd.enabled) return a;
        return {
          ...a,
          systems: { ...a.systems, [cmd.system]: { ...sys, enabled: cmd.enabled } },
        };
      });
      return { ...state, project };
    }
    case "setSystemBypassed": {
      const project = updateActiveArtwork(state.project, (a) => {
        const sys = a.systems[cmd.system];
        if (!sys || sys.bypassed === cmd.bypassed) return a;
        return {
          ...a,
          systems: { ...a.systems, [cmd.system]: { ...sys, bypassed: cmd.bypassed } },
        };
      });
      return { ...state, project };
    }
    case "renameArtwork": {
      const project = updateActiveArtwork(state.project, (a) =>
        a.name === cmd.name ? a : { ...a, name: cmd.name },
      );
      return { ...state, project };
    }
    case "reseedArtwork": {
      const project = updateActiveArtwork(state.project, (a) => ({
        ...a,
        artworkSeed: Math.floor(Math.random() * 2 ** 31),
      }));
      return { ...state, project };
    }
    case "switchFamily":
    case "newArtwork": {
      const artwork = createArtwork(cmd.family, "New Artwork");
      return {
        ...state,
        inspectedSystem: "form",
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
  project: createProject("living-fields"),
  mode: "sculpt",
  inspectedSystem: "form",
  playing: true,
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