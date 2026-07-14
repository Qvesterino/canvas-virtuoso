import { useState } from "react";
import {
  dispatch,
  useActiveArtwork,
  useAppState,
  isParamLocked,
} from "../domain/artwork/store";
import { getFamily } from "../domain/families/registry";
import type { ParamSpec, SystemId } from "../domain/artwork/types";

// A compact, family-aware "Art Controls" surface. It shows only the
// parameters that are meaningful for the *currently selected* variant of
// the family — e.g. Kaleidoscope-only Mirror/Kernel controls, or
// Hypercube-only Cells/Projection. Generic knobs sit in the Inspector;
// the identity controls sit here.
export function ArtControlsPanel() {
  const mode = useAppState((s) => s.mode);
  const artwork = useActiveArtwork();
  const family = getFamily(artwork.family);
  const [collapsed, setCollapsed] = useState(false);

  if (mode === "discover") return null;
  const variantPath = family.variantParam;
  if (!variantPath) return null;

  const variantSpec = (family.schema.form ?? []).find((s) => s.path === variantPath);
  if (!variantSpec || variantSpec.kind !== "scalar") return null;
  const currentVariant = Math.round(
    (artwork.systems.form?.parameters[variantPath] as number | undefined) ??
      (variantSpec.default as number),
  );

  // Collect all identity + variant-scoped controls for the current variant.
  const controls: { system: SystemId; spec: ParamSpec }[] = [];
  for (const sysId of Object.keys(family.schema) as SystemId[]) {
    const specs = family.schema[sysId] ?? [];
    for (const spec of specs) {
      if (!spec.identity && !spec.variantOf) continue;
      if (spec.variantOf && !spec.variantOf.includes(currentVariant)) continue;
      controls.push({ system: sysId, spec });
    }
  }

  const identityLocked = artwork.locks.some((l) => l.reason === "identity");

  return (
    <div
      className={[
        "pointer-events-auto absolute left-4 top-20 z-10 flex flex-col",
        collapsed ? "w-[52px]" : "w-[290px]",
      ].join(" ")}
    >
      <div className="panel-surface flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-eyebrow">Art Controls</span>
              <span className="text-mono text-[10px] text-muted-foreground">
                {family.variantNames?.[currentVariant] ?? `Variant ${currentVariant}`}
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {!collapsed && (
          <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-3">
            {/* Variant selector — the recipe's identity kernel */}
            {family.variantNames && (
              <div className="mb-3">
                <div className="mb-1 text-eyebrow">Architecture</div>
                <div className="flex flex-wrap gap-1">
                  {family.variantNames.map((name, i) => {
                    const active = i === currentVariant;
                    const locked = isParamLocked(artwork, variantPath);
                    return (
                      <button
                        key={i}
                        disabled={locked && !active}
                        onClick={() =>
                          dispatch({
                            type: "setParameter",
                            system: "form",
                            path: variantPath,
                            value: i,
                          })
                        }
                        className={[
                          "rounded-md px-2 py-1 text-[10px] text-mono uppercase tracking-wider transition-colors",
                          active
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground",
                          locked && !active ? "opacity-30 cursor-not-allowed" : "",
                        ].join(" ")}
                        title={locked && !active ? "Break identity lock to change" : name}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {controls
                .filter((c) => c.spec.path !== variantPath)
                .map(({ system, spec }) => {
                  const value =
                    (artwork.systems[system]?.parameters[spec.path] as number | undefined) ??
                    (spec.default as number);
                  const locked = isParamLocked(artwork, spec.path);
                  const isDiscrete = (spec.step ?? 0) >= 1;
                  return (
                    <div key={spec.path}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-xs font-medium">
                          <button
                            type="button"
                            onClick={() =>
                              dispatch({ type: "toggleLock", target: spec.path })
                            }
                            className={[
                              "text-[10px] leading-none",
                              locked
                                ? "text-signal"
                                : "text-muted-foreground/50 hover:text-foreground",
                            ].join(" ")}
                            title={locked ? "Unlock parameter" : "Lock parameter"}
                          >
                            {locked ? "●" : "○"}
                          </button>
                          {spec.label}
                          {spec.identity && (
                            <span className="ml-1 rounded bg-signal/15 px-1 text-[8px] text-mono uppercase tracking-wider text-signal">
                              id
                            </span>
                          )}
                        </label>
                        <span className="text-mono text-[10px] text-muted-foreground">
                          {isDiscrete ? Math.round(value) : value.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={spec.min}
                        max={spec.max}
                        step={spec.step}
                        value={value}
                        disabled={locked}
                        onChange={(e) =>
                          dispatch({
                            type: "setParameter",
                            system,
                            path: spec.path,
                            value: Number(e.target.value),
                          })
                        }
                        className="w-full accent-primary disabled:opacity-40"
                      />
                      {spec.hint && mode === "expert" && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {spec.hint}
                        </div>
                      )}
                    </div>
                  );
                })}
              {controls.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No family-specific controls for this variant.
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-panel-border pt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-eyebrow">Identity</span>
                {identityLocked ? (
                  <button
                    onClick={() => dispatch({ type: "clearIdentityLocks" })}
                    className="rounded px-1.5 py-0.5 text-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    title="Remove recipe identity locks — mutation & randomise can rewrite structure again"
                  >
                    Break
                  </button>
                ) : (
                  <span className="text-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                    Open
                  </span>
                )}
              </div>
              <div className="text-[10px] leading-snug text-muted-foreground">
                {identityLocked
                  ? "Structural identity is preserved. Mutate, Randomise and Palette will keep variant, kernel and counts fixed while nudging expression."
                  : "Apply a recipe to freeze this piece's structural identity. Recipes lock variant, kernel and counts so palette and micro-mutation can't erase the shape."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}