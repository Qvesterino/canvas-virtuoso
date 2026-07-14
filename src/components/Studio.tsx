import { useEffect, useState } from "react";
import { CanvasHost } from "./CanvasHost";
import { TopBar } from "./TopBar";
import { BottomDock } from "./BottomDock";
import { InspectorPanel } from "./InspectorPanel";
import { LibraryPanel } from "./LibraryPanel";
import { ExportPanel } from "./ExportPanel";
import { dispatch, getState } from "../domain/artwork/store";
import { bootstrapPersistence } from "../domain/persistence/autosave";

export function Studio() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    void bootstrapPersistence();

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if (meta && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        dispatch({ type: "redo" });
      } else if (e.key === " " && !meta) {
        e.preventDefault();
        dispatch({ type: "setPlaying", playing: !getState().playing });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: "var(--canvas-void)" }}
    >
      <div className="absolute inset-0">{hydrated && <CanvasHost />}</div>
      <TopBar />
      {hydrated && <LibraryPanel />}
      <InspectorPanel />
      <BottomDock />
      {hydrated && <ExportPanel />}
    </div>
  );
}