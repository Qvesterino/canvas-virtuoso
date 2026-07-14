import { useState } from "react";
import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import { getFamily } from "../domain/families/registry";
import type { ParamValue, SystemId } from "../domain/artwork/types";
import { MODULATION_SOURCES } from "../domain/modulation/sources";
import { routeForTarget } from "../domain/modulation/engine";

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
  const systemLocked = artwork.locks.some((l) => l.path === `system:${inspected}`);
  const isPathLocked = (path: string) =>
    artwork.locks.some((l) => l.path === path) || systemLocked;

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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        dispatch({ type: "toggleLock", target: `system:${inspected}` })
                      }
                      className={[
                        "rounded px-1.5 py-0.5 text-[10px] text-mono uppercase tracking-wider",
                        systemLocked
                          ? "bg-signal/20 text-signal"
                          : "text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                      title={systemLocked ? "Unlock system" : "Lock system"}
                    >
                      {systemLocked ? "locked" : "lock"}
                    </button>
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
                  const locked = isPathLocked(spec.path);
                  if (spec.kind === "scalar" && typeof value === "number") {
                    const route = routeForTarget(artwork, spec.path);
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
                                locked ? "text-signal" : "text-muted-foreground/50 hover:text-foreground",
                              ].join(" ")}
                              title={locked ? "Unlock parameter" : "Lock parameter"}
                            >
                              {locked ? "●" : "○"}
                            </button>
                            {spec.label}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (route) {
                                  dispatch({ type: "removeModulationRoute", id: route.id });
                                } else {
                                  dispatch({
                                    type: "addModulationRoute",
                                    target: spec.path,
                                    source: "time.slow",
                                  });
                                }
                              }}
                              className={[
                                "rounded px-1 text-mono text-[9px] uppercase tracking-wider",
                                route
                                  ? "bg-signal/20 text-signal"
                                  : "text-muted-foreground/60 hover:text-foreground",
                              ].join(" ")}
                              title={route ? "Remove modulation" : "Modulate this parameter"}
                            >
                              ~
                            </button>
                            <span className="text-mono text-[10px] text-muted-foreground">
                              {value.toFixed(spec.step && spec.step < 0.1 ? 3 : 2)}
                            </span>
                          </div>
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
                              system: inspected,
                              path: spec.path,
                              value: Number(e.target.value),
                            })
                          }
                          className="w-full accent-primary disabled:opacity-40"
                        />
                        {route && (
                          <div className="mt-1 flex items-center gap-1.5 rounded border border-panel-border/60 bg-white/[0.02] px-1.5 py-1">
                            <select
                              value={route.source}
                              onChange={(e) =>
                                dispatch({
                                  type: "updateModulationRoute",
                                  id: route.id,
                                  patch: { source: e.target.value },
                                })
                              }
                              className="min-w-0 flex-1 rounded bg-transparent text-[10px] text-mono text-muted-foreground focus:outline-none"
                            >
                              {MODULATION_SOURCES.map((s) => (
                                <option key={s.id} value={s.id} className="bg-panel-surface">
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={route.depth}
                              onChange={(e) =>
                                dispatch({
                                  type: "updateModulationRoute",
                                  id: route.id,
                                  patch: { depth: Number(e.target.value) },
                                })
                              }
                              className="w-16 accent-signal"
                              title="Depth"
                            />
                            <select
                              value={route.polarity}
                              onChange={(e) =>
                                dispatch({
                                  type: "updateModulationRoute",
                                  id: route.id,
                                  patch: { polarity: e.target.value as typeof route.polarity },
                                })
                              }
                              className="rounded bg-transparent text-[10px] text-mono text-muted-foreground focus:outline-none"
                              title="Polarity"
                            >
                              <option value="bipolar" className="bg-panel-surface">±</option>
                              <option value="positive" className="bg-panel-surface">+</option>
                              <option value="negative" className="bg-panel-surface">−</option>
                            </select>
                          </div>
                        )}
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