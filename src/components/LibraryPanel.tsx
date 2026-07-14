import { useState } from "react";
import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import { recipesForFamily } from "../domain/recipes/library";

export function LibraryPanel() {
  const artwork = useActiveArtwork();
  const snapshots = useAppState((s) => s.project.snapshots);
  const mode = useAppState((s) => s.mode);
  const [tab, setTab] = useState<"recipes" | "snapshots">("recipes");
  const [collapsed, setCollapsed] = useState(false);
  const recipes = recipesForFamily(artwork.family);

  if (mode === "discover") return null;

  return (
    <div
      className={[
        "pointer-events-auto absolute left-4 top-20 z-10 flex max-h-[calc(100vh-9rem)] flex-col",
        collapsed ? "w-[52px]" : "w-[260px]",
      ].join(" ")}
    >
      <div className="panel-surface flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
          {!collapsed && <span className="text-eyebrow">Library</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        {!collapsed && (
          <>
            <div className="flex border-b border-panel-border">
              {(["recipes", "snapshots"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={[
                    "flex-1 px-3 py-2 text-[10px] text-mono uppercase tracking-wider transition-colors",
                    tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {tab === "recipes" && (
                <>
                  {recipes.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">
                      No recipes yet for this family.
                    </div>
                  )}
                  <div className="space-y-1">
                    {recipes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => dispatch({ type: "applyRecipe", recipe: r })}
                        className="w-full rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:border-panel-border hover:bg-white/[0.03]"
                      >
                        <div className="text-xs font-medium">{r.name}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {r.tagline}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {tab === "snapshots" && (
                <>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "saveSnapshot",
                        name: `${artwork.name} · rev ${artwork.revision}`,
                      })
                    }
                    className="mb-2 w-full rounded-md bg-primary/15 px-2 py-1.5 text-xs text-primary text-mono uppercase tracking-wider hover:bg-primary/20"
                  >
                    + Save snapshot
                  </button>
                  {snapshots.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">
                      No snapshots yet. Save one to freeze the current artwork.
                    </div>
                  )}
                  <div className="space-y-1">
                    {snapshots.map((s) => (
                      <div
                        key={s.id}
                        className="group flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-panel-border hover:bg-white/[0.03]"
                      >
                        <button
                          onClick={() =>
                            dispatch({ type: "restoreSnapshot", snapshotId: s.id })
                          }
                          className="flex-1 text-left"
                          title="Restore snapshot"
                        >
                          <div className="text-xs truncate">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground text-mono">
                            {new Date(s.createdAt).toLocaleTimeString()}
                          </div>
                        </button>
                        <button
                          onClick={() =>
                            dispatch({ type: "deleteSnapshot", snapshotId: s.id })
                          }
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs"
                          title="Delete snapshot"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
