import { useEffect, useState } from "react";
import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import type { RendererStatus } from "../renderer/core";

// Global renderer-status broadcaster. The Renderer already emits status
// updates through its hooks; CanvasHost bridges those into this module so
// the HUD can render fps/context info without owning the renderer.
type Listener = (s: RendererStatus) => void;
const listeners = new Set<Listener>();
let latest: RendererStatus = { kind: "idle" };

export function publishRendererStatus(status: RendererStatus) {
  latest = status;
  for (const l of listeners) l(status);
}

function useRendererStatus(): RendererStatus {
  const [s, setS] = useState<RendererStatus>(latest);
  useEffect(() => {
    const l: Listener = (n) => setS(n);
    listeners.add(l);
    setS(latest);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return s;
}

export function DiagnosticsHud() {
  const status = useRendererStatus();
  const open = useAppState((s) => s.diagnosticsOpen);
  const artwork = useActiveArtwork();
  const audio = useAppState((s) => s.audioEnabled);
  const frozen = useAppState((s) => s.memoryFrozen);

  const fps = status.kind === "running" ? status.fps : 0;
  const dot =
    status.kind === "running"
      ? fps >= 45
        ? "bg-primary"
        : fps >= 24
          ? "bg-signal"
          : "bg-destructive"
      : "bg-muted-foreground/40";

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-30">
      <button
        onClick={() => dispatch({ type: "toggleDiagnostics" })}
        className="panel-surface flex items-center gap-2 px-2 py-1 hover:bg-white/[0.03]"
        title="Diagnostics"
      >
        <span className={["inline-block h-1.5 w-1.5 rounded-full", dot].join(" ")} />
        <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {status.kind === "running" ? `${fps} fps` : status.kind}
        </span>
      </button>
      {open && (
        <div className="panel-surface mt-2 w-[260px] p-3 text-[10px] text-mono text-muted-foreground">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-eyebrow text-foreground">Diagnostics</span>
            <span className={["h-1.5 w-1.5 rounded-full", dot].join(" ")} />
          </div>
          <Row k="status" v={status.kind} />
          {status.kind === "running" && <Row k="family" v={status.family} />}
          {status.kind === "running" && <Row k="fps" v={String(status.fps)} />}
          {(status.kind === "degraded" || status.kind === "no-context") && (
            <div className="mt-1 rounded border border-panel-border p-1.5 text-destructive">
              {status.reason}
            </div>
          )}
          <div className="my-2 h-px bg-panel-border" />
          <Row k="artwork" v={artwork.name} />
          <Row k="revision" v={String(artwork.revision)} />
          <Row k="seed" v={String(artwork.artworkSeed)} />
          <Row k="systems" v={String(Object.keys(artwork.systems).length)} />
          <Row k="routes" v={String(artwork.modulationRoutes.length)} />
          <Row k="locks" v={String(artwork.locks.length)} />
          <div className="my-2 h-px bg-panel-border" />
          <Row k="audio" v={audio ? "on" : "off"} />
          <Row k="memory" v={frozen ? "frozen" : "live"} />
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span>{k}</span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}