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
  const family = getFamily(artwork.family);

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
      </div>

      <div className="panel-surface pointer-events-auto flex items-center overflow-hidden p-1">
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