import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import { palettesForFamily } from "../domain/palettes/library";

export function PalettePanel() {
  const mode = useAppState((s) => s.mode);
  const artwork = useActiveArtwork();
  const activeId = useAppState((s) => s.activePaletteId);
  if (mode === "discover") return null;
  const palettes = palettesForFamily(artwork.family);

  return (
    <div className="pointer-events-auto absolute bottom-20 left-1/2 z-10 -translate-x-1/2">
      <div className="panel-surface flex items-center gap-2 px-3 py-2">
        <span className="text-eyebrow shrink-0">Palette</span>
        <span className="h-4 w-px bg-panel-border" />
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {palettes.map((p) => {
            const active = activeId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => dispatch({ type: "applyPalette", palette: p })}
                title={`${p.name} — ${p.mood}`}
                className={[
                  "group flex shrink-0 items-center gap-2 rounded-md border px-2 py-1 transition-colors",
                  active
                    ? "border-primary/50 bg-primary/10"
                    : "border-transparent hover:border-panel-border hover:bg-white/[0.03]",
                ].join(" ")}
              >
                <span className="flex overflow-hidden rounded-sm">
                  {p.swatch.map((c) => (
                    <span
                      key={c}
                      className="h-4 w-2"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}