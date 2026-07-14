import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import { macrosForFamily } from "../domain/macros/definitions";

// A macro slider is a synthetic control: its "value" isn't stored on the
// artwork. Each drag dispatches applyMacro which projects the value across
// several underlying parameters. On mount we anchor the slider at the
// macro's neutral point.
export function MacroPanel() {
  const mode = useAppState((s) => s.mode);
  const artwork = useActiveArtwork();
  const macros = macrosForFamily(artwork.family);
  if (mode !== "sculpt" || macros.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-20 z-10 -translate-x-1/2">
      <div className="panel-surface flex items-center gap-3 px-3 py-2">
        <span className="text-eyebrow">Macros</span>
        <span className="h-4 w-px bg-panel-border" />
        <div className="flex items-center gap-4">
          {macros.map((m) => (
            <label
              key={m.id}
              className="flex min-w-[120px] flex-col gap-1"
              title={m.hint}
            >
              <span className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.005}
                defaultValue={m.neutral}
                onChange={(e) =>
                  dispatch({
                    type: "applyMacro",
                    macroId: m.id,
                    value: Number(e.target.value),
                  })
                }
                className="w-32 accent-primary"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}