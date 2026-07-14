import { useState } from "react";
import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import { getFamily } from "../domain/families/registry";
import type { ParamValue, SystemId } from "../domain/artwork/types";

const SYSTEM_ORDER: SystemId[] = [
  "form", "motion", "forces", "material", "light", "atmosphere", "memory", "color", "output",
];

export function InspectorPanel() {
  const mode = useAppState((s) => s.mode);
  const inspected = useAppState((s) => s.inspectedSystem);
  const artwork = useActiveArtwork();
  const family = getFamily(artwork.family);
  const [collapsed, setCollapsed] = useState(false);

  if (mode === "discover") return null;

  const availableSystems = SYSTEM_ORDER.filter((s) => artwork.systems[s]);
  const specs = family.schema[inspected] ?? [];
  const system = artwork.systems[inspected];

  return (
    <div
      className={[
        "pointer-events-auto absolute right-4 top-20 z-10 flex max-h-[calc(100vh-9rem)] flex-col",
        collapsed ? "w-[52px]" : "w-[320px]",
      ].join(" ")}
    >
      <div className="panel-surface flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
          {!collapsed && <span className="text-eyebrow">Inspector</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "‹" : "›"}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="flex flex-wrap gap-1 border-b border-panel-border p-2">
              {availableSystems.map((s) => (
                <button
                  key={s}
                  onClick={() => dispatch({ type: "inspectSystem", system: s })}
                  className={[
                    "rounded-md px-2 py-1 text-[10px] text-mono uppercase tracking-wider transition-colors",
                    s === inspected
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {system && (
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-eyebrow">{inspected}</div>
                    <div className="text-[10px] text-muted-foreground text-mono">
                      seed {system.seed}
                    </div>
                  </div>
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={!system.bypassed}
                      onChange={(e) =>
                        dispatch({
                          type: "setSystemBypassed",
                          system: inspected,
                          bypassed: !e.target.checked,
                        })
                      }
                      className="accent-primary"
                    />
                    active
                  </label>
                </div>
              )}

              {specs.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No parameters exposed for this system in the current family.
                </div>
              )}

              <div className="space-y-3">
                {specs.map((spec) => {
                  const value =
                    system?.parameters[spec.path] ?? (spec.default as ParamValue);
                  if (spec.kind === "scalar" && typeof value === "number") {
                    return (
                      <div key={spec.path}>
                        <div className="mb-1 flex items-baseline justify-between">
                          <label className="text-xs font-medium">{spec.label}</label>
                          <span className="text-mono text-[10px] text-muted-foreground">
                            {value.toFixed(spec.step && spec.step < 0.1 ? 3 : 2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={spec.min}
                          max={spec.max}
                          step={spec.step}
                          value={value}
                          onChange={(e) =>
                            dispatch({
                              type: "setParameter",
                              system: inspected,
                              path: spec.path,
                              value: Number(e.target.value),
                            })
                          }
                          className="w-full accent-primary"
                        />
                        {spec.hint && mode === "expert" && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {spec.hint}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}