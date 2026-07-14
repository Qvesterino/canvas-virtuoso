import type { Project } from "../artwork/types";

const DB_NAME = "shader-art-lab";
const DB_VERSION = 1;
const STORE = "projects";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("updatedAt", "updatedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function saveProject(project: Project): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.put(project));
  } catch (err) {
    console.warn("[persistence] save failed", err);
  }
}

export async function loadProject(id: string): Promise<Project | null> {
  try {
    const result = await withStore<Project | undefined>("readonly", (s) => s.get(id));
    return result ?? null;
  } catch {
    return null;
  }
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  try {
    const projects = await withStore<Project[]>("readonly", (s) => s.getAll() as IDBRequest<Project[]>);
    return projects
      .map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function loadMostRecent(): Promise<Project | null> {
  const list = await listProjects();
  if (list.length === 0) return null;
  return loadProject(list[0].id);
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.delete(id));
  } catch (err) {
    console.warn("[persistence] delete failed", err);
  }
}
