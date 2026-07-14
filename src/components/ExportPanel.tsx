import { useState } from "react";
import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import {
  downloadBlob,
  exportAnimation,
  exportStill,
} from "../renderer/export";

type Format = "still" | "animation";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artwork";
}

export function ExportPanel() {
  const open = useAppState((s) => s.exportOpen);
  const artwork = useActiveArtwork();
  const [format, setFormat] = useState<Format>("still");
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [fps, setFps] = useState(30);
  const [seconds, setSeconds] = useState(6);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const close = () => dispatch({ type: "setExportOpen", open: false });

  async function run() {
    setBusy(true);
    setError(null);
    setProgress(null);
    try {
      if (format === "still") {
        const blob = await exportStill(artwork, { kind: "still", width, height });
        downloadBlob(blob, `${slug(artwork.name)}-r${artwork.revision}.png`);
      } else {
        const blob = await exportAnimation(artwork, {
          kind: "animation",
          width,
          height,
          fps,
          seconds,
          onProgress: (done, total) => setProgress({ done, total }),
        });
        downloadBlob(blob, `${slug(artwork.name)}-r${artwork.revision}.webm`);
      }
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="panel-surface w-[420px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-eyebrow">Export</div>
            <div className="text-sm font-medium">{artwork.name}</div>
          </div>
          <button
            onClick={close}
            disabled={busy}
            className="rounded px-2 py-1 text-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            Close
          </button>
        </div>

        <div className="mb-4 flex items-center gap-1 rounded-md border border-panel-border p-1">
          {(["still", "animation"] as Format[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={[
                "flex-1 rounded px-3 py-1.5 text-mono text-[10px] uppercase tracking-wider",
                format === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {f === "still" ? "Still · PNG" : "Animation · WebM"}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">Width</span>
            <input
              type="number"
              value={width}
              min={128}
              max={3840}
              step={16}
              onChange={(e) => setWidth(Math.max(128, Math.min(3840, +e.target.value || 0)))}
              className="rounded border border-panel-border bg-transparent px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">Height</span>
            <input
              type="number"
              value={height}
              min={128}
              max={3840}
              step={16}
              onChange={(e) => setHeight(Math.max(128, Math.min(3840, +e.target.value || 0)))}
              className="rounded border border-panel-border bg-transparent px-2 py-1"
            />
          </label>
          {format === "animation" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">FPS</span>
                <input
                  type="number"
                  value={fps}
                  min={12}
                  max={60}
                  onChange={(e) => setFps(Math.max(12, Math.min(60, +e.target.value || 30)))}
                  className="rounded border border-panel-border bg-transparent px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">Seconds</span>
                <input
                  type="number"
                  value={seconds}
                  min={1}
                  max={60}
                  onChange={(e) => setSeconds(Math.max(1, Math.min(60, +e.target.value || 6)))}
                  className="rounded border border-panel-border bg-transparent px-2 py-1"
                />
              </label>
            </>
          )}
        </div>

        <p className="mb-4 text-xs text-muted-foreground">
          Renders on an offscreen canvas with a fixed-step clock and a warm-up pass, so
          re-rendering the same artwork produces the same frames.
        </p>

        {progress && (
          <div className="mb-3">
            <div className="mb-1 text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Frame {progress.done} / {progress.total}
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-panel-border">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive-foreground">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={close}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            Cancel
          </button>
          <button
            onClick={run}
            disabled={busy}
            className="rounded-md bg-primary/20 px-4 py-1.5 text-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/30 disabled:opacity-40"
          >
            {busy ? "Rendering…" : format === "still" ? "Export PNG" : "Render WebM"}
          </button>
        </div>
      </div>
    </div>
  );
}