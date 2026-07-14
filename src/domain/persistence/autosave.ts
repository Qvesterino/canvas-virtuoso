import { subscribe, getState, dispatch } from "../artwork/store";
import { loadMostRecent, saveProject } from "./idb";
import { createProject } from "../artwork/factories";

let started = false;

export async function bootstrapPersistence(): Promise<void> {
  if (started) return;
  started = true;

  const existing = await loadMostRecent();
  if (existing && existing.artworks && existing.activeArtworkId in existing.artworks) {
    dispatch({ type: "hydrateProject", project: existing });
  } else {
    // No stored project — create a fresh randomised one so the user sees
    // something new on first load rather than the deterministic seed.
    const fresh = createProject("living-fields");
    dispatch({ type: "hydrateProject", project: fresh });
  }

  let lastSaved = -1;
  let pending: ReturnType<typeof setTimeout> | null = null;

  subscribe(() => {
    const s = getState();
    if (!s.hydrated) return;
    const rev = s.project.updatedAt;
    if (rev === lastSaved) return;
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      const cur = getState();
      lastSaved = cur.project.updatedAt;
      saveProject(cur.project);
    }, 400);
  });
}
