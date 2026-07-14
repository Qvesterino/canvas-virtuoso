import { dispatch, useAppState } from "../domain/artwork/store";

export function OnboardingOverlay() {
  const dismissed = useAppState((s) => s.onboardingDismissed);
  if (dismissed) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md"
      style={{ background: "color-mix(in oklch, var(--canvas-void) 65%, transparent)" }}
    >
      <div className="panel-surface max-w-[540px] p-8">
        <div className="text-eyebrow mb-2">Shader Art Lab</div>
        <h2 className="mb-4 text-2xl font-medium leading-tight">
          A living instrument for procedural imagery.
        </h2>
        <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
          Five artwork families, curated recipes and palettes, macros that
          reshape entire compositions, audio-reactive modulation, temporal
          memory, and deterministic export. Everything you touch is a real
          parameter on a real artwork — nothing is fake.
        </p>
        <div className="mb-6 grid grid-cols-3 gap-3 text-[11px] leading-relaxed">
          <Tip title="Discover">Browse families, recipes and palettes.</Tip>
          <Tip title="Sculpt">Macros and locks for guided shaping.</Tip>
          <Tip title="Expert">Every parameter and modulation route.</Tip>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch({ type: "dismissOnboarding" })}
            className="rounded-md bg-primary/20 px-4 py-2 text-mono text-[11px] uppercase tracking-wider text-primary hover:bg-primary/30"
          >
            Enter the lab
          </button>
          <div className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Space · play/pause  ·  ⌘Z · undo
          </div>
        </div>
      </div>
    </div>
  );
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-panel-border bg-white/[0.02] p-3">
      <div className="text-mono text-[10px] uppercase tracking-wider text-primary">{title}</div>
      <div className="mt-1 text-muted-foreground">{children}</div>
    </div>
  );
}