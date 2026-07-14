import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import type { WorkspaceMode } from "../domain/artwork/types";
import { getFamily } from "../domain/families/registry";

const MODES: { id: WorkspaceMode; label: string; hint: string }[] = [
  { id: "discover", label: "Discover", hint: "Browse & mutate" },
  { id: "sculpt", label: "Sculpt", hint: "Shape the artwork" },
  { id: "expert", label: "Expert", hint: "Full control" },
];

export function TopBar() {
  const mode = useAppState((s) => s.mode);
  const artwork = useActiveArtwork();
  const canUndo = useAppState((s) => s.history.past.length > 0);
  const canRedo = useAppState((s) => s.history.future.length > 0);
  const memoryFrozen = useAppState((s) => s.memoryFrozen);
  const family = getFamily(artwork.family);
  const hasMemory = !!artwork.systems.memory;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
      <div className="panel-surface pointer-events-auto flex items-center gap-3 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_10px] shadow-primary" />
          <span className="text-eyebrow">Shader Art Lab</span>
        </div>
        <span className="h-4 w-px bg-panel-border" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{artwork.name}</span>
          <span className="text-mono text-[10px] text-muted-foreground">
            {family.name} · rev {artwork.revision}
          </span>
        </div>
        <span className="h-4 w-px bg-panel-border" />
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => dispatch({ type: "undo" })}
            disabled={!canUndo}
            className="rounded px-2 py-1 text-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30"
            title="Undo (⌘Z)"
          >
            Undo
          </button>
          <button
            onClick={() => dispatch({ type: "redo" })}
            disabled={!canRedo}
            className="rounded px-2 py-1 text-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30"
            title="Redo (⇧⌘Z)"
          >
            Redo
          </button>
        </div>
      </div>

      <div className="panel-surface pointer-events-auto flex items-center gap-1 p-1">
        {hasMemory && (
          <>
            <button
              onClick={() => dispatch({ type: "setMemoryFrozen", frozen: !memoryFrozen })}
              className={[
                "rounded-md px-3 py-1.5 text-mono text-[10px] uppercase tracking-wider hover:bg-white/5",
                memoryFrozen ? "text-signal" : "text-muted-foreground",
              ].join(" ")}
              title="Stop writing new frames into the feedback buffer"
            >
              {memoryFrozen ? "Frozen" : "Freeze"}
            </button>
            <button
              onClick={() => dispatch({ type: "clearMemory" })}
              className="rounded-md px-3 py-1.5 text-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-white/5"
              title="Clear the feedback buffer"
            >
              Clear
            </button>
            <span className="h-4 w-px bg-panel-border" />
          </>
        )}
        <button
          onClick={() => dispatch({ type: "setExportOpen", open: true })}
          className="rounded-md px-3 py-1.5 text-mono text-[10px] uppercase tracking-wider text-foreground hover:bg-white/5"
          title="Deterministic export"
        >
          Export
        </button>
        <span className="h-4 w-px bg-panel-border" />
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => dispatch({ type: "setMode", mode: m.id })}
            className={[
              "group relative rounded-md px-3 py-1.5 text-xs transition-colors",
              mode === m.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
            title={m.hint}
          >
            <span className="text-mono tracking-wider uppercase">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}