import { useSyncExternalStore } from "react";
import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import { listFamilies } from "../domain/families/registry";
import type { FamilyId } from "../domain/artwork/types";
import { audioService } from "../services/audio";

function useAudioLevel(): number {
  return useSyncExternalStore(
    (cb) => audioService.subscribe(cb),
    () => audioService.level,
    () => 0,
  );
}

export function BottomDock() {
  const playing = useAppState((s) => s.playing);
  const audioEnabled = useAppState((s) => s.audioEnabled);
  const artwork = useActiveArtwork();
  const level = useAudioLevel();

  async function toggleAudio() {
    if (audioEnabled) {
      audioService.disable();
      dispatch({ type: "setAudioEnabled", enabled: false });
    } else {
      const ok = await audioService.enable();
      dispatch({ type: "setAudioEnabled", enabled: ok });
    }
  }

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
        <span className="h-4 w-px bg-panel-border" />
        <button
          onClick={() => dispatch({ type: "mutateArtwork", strength: 0.5 })}
          className="rounded-md px-3 py-1.5 text-xs text-mono uppercase tracking-wider text-foreground hover:bg-white/5"
          title="Nudge every parameter — a genetic variation of the current artwork"
        >
          Mutate
        </button>
        <button
          onClick={() => dispatch({ type: "randomizeArtwork" })}
          className="rounded-md px-3 py-1.5 text-xs text-mono uppercase tracking-wider text-foreground hover:bg-white/5"
          title="Randomise every parameter across its full range"
        >
          Randomise
        </button>
        <span className="h-4 w-px bg-panel-border" />
        <button
          onClick={toggleAudio}
          className={[
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-mono uppercase tracking-wider hover:bg-white/5",
            audioEnabled ? "text-signal" : "text-foreground",
          ].join(" ")}
          title={audioEnabled ? "Disable microphone input" : "Enable microphone as modulation source"}
        >
          <span
            className={[
              "inline-block h-1.5 w-1.5 rounded-full",
              audioEnabled ? "bg-signal shadow-[0_0_8px] shadow-signal" : "bg-muted-foreground/40",
            ].join(" ")}
          />
          Audio
          {audioEnabled && (
            <span className="relative ml-1 h-1 w-10 overflow-hidden rounded-full bg-panel-border">
              <span
                className="absolute inset-y-0 left-0 bg-signal"
                style={{ width: `${Math.min(100, level * 220)}%` }}
              />
            </span>
          )}
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