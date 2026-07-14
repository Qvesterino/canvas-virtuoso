import { useMemo } from "react";
import { dispatch, useActiveArtwork, useAppState } from "../domain/artwork/store";
import { recipesForFamily } from "../domain/recipes/library";
import { palettesForFamily, PALETTES } from "../domain/palettes/library";
import { listFamilies } from "../domain/families/registry";
import type { FamilyId } from "../domain/artwork/types";

// Discover mode: a canvas-first, low-decision browsing surface. The user
// sees a large focus tile (current artwork) and can shuffle families,
// recipes and palettes with a single click. Sculpt/expert controls are
// intentionally hidden so the mode stays curatorial, not editorial.
export function DiscoverPanel() {
  const mode = useAppState((s) => s.mode);
  const artwork = useActiveArtwork();
  const recipes = useMemo(() => recipesForFamily(artwork.family), [artwork.family]);
  const palettes = palettesForFamily(artwork.family);

  if (mode !== "discover") return null;

  const surprise = () => {
    const families = listFamilies().filter((f) => f.implemented);
    const family = families[Math.floor(Math.random() * families.length)].id as FamilyId;
    dispatch({ type: "switchFamily", family });
    // apply a random recipe of that family, then a random palette
    const rs = recipesForFamily(family);
    if (rs.length) {
      const recipe = rs[Math.floor(Math.random() * rs.length)];
      dispatch({ type: "applyRecipe", recipe });
    }
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    dispatch({ type: "applyPalette", palette });
    dispatch({ type: "reseedArtwork" });
  };

  return (
    <>
      <div className="pointer-events-auto absolute left-4 top-20 z-10 w-[280px]">
        <div className="panel-surface flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
            <span className="text-eyebrow">Discover</span>
            <button
              onClick={surprise}
              className="rounded-md bg-primary/15 px-2 py-1 text-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/25"
              title="A new family, recipe, palette and seed"
            >
              Surprise me
            </button>
          </div>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-2">
            <div className="mb-1 text-[10px] text-mono uppercase tracking-wider text-muted-foreground">
              Recipes · {artwork.family.replace("-", " ")}
            </div>
            <div className="space-y-1">
              {recipes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => dispatch({ type: "applyRecipe", recipe: r })}
                  className="w-full rounded-md border border-transparent px-2 py-2 text-left hover:border-panel-border hover:bg-white/[0.03]"
                >
                  <div className="text-xs font-medium">{r.name}</div>
                  <div className="text-[10px] text-muted-foreground">{r.tagline}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 mb-1 text-[10px] text-mono uppercase tracking-wider text-muted-foreground">
              Palettes
            </div>
            <div className="grid grid-cols-2 gap-1">
              {palettes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => dispatch({ type: "applyPalette", palette: p })}
                  className="rounded-md border border-transparent p-1.5 text-left hover:border-panel-border hover:bg-white/[0.03]"
                  title={p.mood}
                >
                  <span className="flex overflow-hidden rounded-sm">
                    {p.swatch.map((c) => (
                      <span key={c} className="h-4 flex-1" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="mt-1 block text-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-auto absolute right-4 top-20 z-10 w-[220px]">
        <div className="panel-surface p-3">
          <div className="text-eyebrow mb-2">Families</div>
          <div className="flex flex-col gap-1">
            {listFamilies().map((f) => (
              <button
                key={f.id}
                disabled={!f.implemented}
                onClick={() => dispatch({ type: "switchFamily", family: f.id })}
                className={[
                  "rounded-md px-2 py-1.5 text-left transition-colors",
                  f.id === artwork.family
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
                  !f.implemented ? "opacity-40 cursor-not-allowed" : "",
                ].join(" ")}
              >
                <div className="text-xs font-medium">{f.name}</div>
                <div className="text-[10px] text-muted-foreground">{f.tagline}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}