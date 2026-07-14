import { useEffect, useRef, useState } from "react";
import { Renderer, type RendererStatus } from "../renderer/core";
import { getState } from "../domain/artwork/store";
import { publishRendererStatus } from "./DiagnosticsHud";

export function CanvasHost() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<RendererStatus>({ kind: "idle" });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new Renderer(canvas, {
      onStatusChange: (s) => {
        setStatus(s);
        publishRendererStatus(s);
      },
      getArtwork: () => {
        const s = getState();
        return s.project.artworks[s.project.activeArtworkId];
      },
      isPlaying: () => getState().playing,
      isMemoryFrozen: () => getState().memoryFrozen,
      getMemoryClearNonce: () => getState().memoryClearNonce,
    });
    renderer.init();
    return () => renderer.dispose();
  }, []);

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ background: "var(--canvas-void)" }}
      />
      {status.kind === "no-context" && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="panel-surface max-w-md p-6 text-center">
            <p className="text-eyebrow mb-2">Rendering unavailable</p>
            <p className="text-sm text-panel-foreground">{status.reason}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Open Shader Art Lab in a modern desktop browser (Chrome, Firefox, Edge, Safari 17+).
            </p>
          </div>
        </div>
      )}
      {status.kind === "degraded" && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <div className="panel-surface px-4 py-2 text-xs text-mono">
            {status.reason}
          </div>
        </div>
      )}
    </div>
  );
}