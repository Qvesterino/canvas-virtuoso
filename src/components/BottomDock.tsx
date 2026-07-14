import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import { listFamilies } from "../domain/families/registry";
import type { FamilyId } from "../domain/artwork/types";

export function BottomDock() {
  const playing = useAppState((s) => s.playing);
  const artwork = useActiveArtwork();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-4">
      <div className="panel-surface pointer-events-auto flex items-center gap-1 p-1">
        <button
          onClick={() => dispatch({ type: "setPlaying", playing: !playing })}
          className="rounded-md px-3 py-1.5 text-xs text-mono uppercase tracking-wider text-foreground hover:bg-white/5"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <span className="h-4 w-px bg-panel-border" />
        <button
          onClick={() => dispatch({ type: "reseedArtwork" })}
          className="rounded-md px-3 py-1.5 text-xs text-mono uppercase tracking-wider text-foreground hover:bg-white/5"
          title="Randomise the artwork seed — same parameters, new instance"
        >
          Reseed
        </button>
      </div>

      <div className="panel-surface pointer-events-auto flex max-w-[620px] items-center gap-1 overflow-x-auto p-1">
        {listFamilies().map((f) => {
          const active = f.id === artwork.family;
          return (
            <button
              key={f.id}
              disabled={!f.implemented}
              onClick={() =>
                dispatch({ type: "switchFamily", family: f.id as FamilyId })
              }
              className={[
                "shrink-0 rounded-md px-3 py-1.5 text-left transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
                !f.implemented ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
              title={f.implemented ? f.tagline : `${f.name} — coming soon`}
            >
              <div className="text-mono text-[10px] uppercase tracking-wider">
                {f.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}