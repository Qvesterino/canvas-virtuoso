import { dispatch, useAppState } from "../domain/artwork/store";
import type { ChangelogEntry } from "../domain/artwork/store";

function timeAgo(ts: number, now: number): string {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function fmt(n: number, discrete: boolean): string {
  if (discrete) return String(Math.round(n));
  return Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2);
}

function EntryRow({ entry }: { entry: ChangelogEntry }) {
  const now = Date.now();
  const shown = entry.changes.slice(0, 4);
  const extra = entry.changes.length - shown.length;
  return (
    <li className="border-b border-panel-border/60 px-3 py-2 last:border-b-0">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-mono text-[9px] uppercase tracking-wider text-primary">
            {entry.label}
          </span>
          {entry.identityCount > 0 && (
            <span className="rounded bg-signal/15 px-1 text-mono text-[8px] uppercase tracking-wider text-signal">
              identity ×{entry.identityCount}
            </span>
          )}
          {entry.reseededSystems.length > 0 && (
            <span
              className="rounded bg-primary/15 px-1 text-mono text-[8px] uppercase tracking-wider text-primary"
              title={`Re-seeded: ${entry.reseededSystems.join(", ")}`}
            >
              reseed
            </span>
          )}
        </div>
        <span className="text-mono text-[9px] text-muted-foreground">
          {timeAgo(entry.at, now)}
        </span>
      </div>
      {entry.headline && (
        <div className="mt-0.5 text-xs text-foreground/90">{entry.headline}</div>
      )}
      {shown.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {shown.map((c) => {
            const discrete = c.kind === "variant";
            return (
              <li
                key={c.path}
                className="flex items-baseline justify-between gap-2 text-[10px] text-muted-foreground"
              >
                <span
                  className={[
                    "truncate",
                    c.identity ? "text-signal/90" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {c.identity ? "◆ " : "· "}
                  {c.label}
                </span>
                <span className="shrink-0 text-mono text-[10px]">
                  {c.fromLabel && c.toLabel ? (
                    <>
                      {c.fromLabel} → <span className="text-foreground">{c.toLabel}</span>
                    </>
                  ) : (
                    <>
                      {fmt(c.from, discrete)} →{" "}
                      <span className="text-foreground">{fmt(c.to, discrete)}</span>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {extra > 0 && (
        <div className="mt-1 text-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
          +{extra} more
        </div>
      )}
    </li>
  );
}

export function ChangelogPanel() {
  const open = useAppState((s) => s.changelogOpen);
  const entries = useAppState((s) => s.changelog);

  if (!open) return null;
  return (
    <div className="pointer-events-auto absolute bottom-20 right-4 z-20 flex w-[340px] flex-col">
      <div className="panel-surface flex max-h-[60vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
          <div className="flex flex-col leading-tight">
            <span className="text-eyebrow">Changelog</span>
            <span className="text-mono text-[10px] text-muted-foreground">
              {entries.length === 0 ? "No changes yet" : `${entries.length} events`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => dispatch({ type: "clearChangelog" })}
              disabled={entries.length === 0}
              className="rounded px-1.5 py-0.5 text-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Clear changelog"
            >
              Clear
            </button>
            <button
              onClick={() => dispatch({ type: "setChangelogOpen", open: false })}
              className="rounded px-1.5 py-0.5 text-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
        {entries.length === 0 ? (
          <div className="px-3 py-6 text-[11px] leading-relaxed text-muted-foreground">
            Every Mutate, Randomise, Recipe, Palette, Macro and Reseed will
            appear here — variant flips and re-seeds are highlighted so you
            can see <em>why</em> the artwork just changed.
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}