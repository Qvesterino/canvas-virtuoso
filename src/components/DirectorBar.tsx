import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parsePartialJson } from "ai";
import { getFamily } from "../domain/families/registry";
import { PALETTES } from "../domain/palettes/library";
import { applyPartialPlan, createPlannerCursor } from "../domain/director/planner";
import type { ArtworkPlan } from "../domain/director/schema";

type ModelChoice = "terra" | "luna";

interface StreamState {
  status: "idle" | "streaming" | "done" | "error";
  plan: Partial<ArtworkPlan> | null;
  error?: string;
  raw?: string;
}

const EXAMPLE_PROMPTS = [
  "A deep cathedral of translucent obsidian, slow breathing, mild bass reactivity.",
  "Ink storm swirling on wet paper — indigo and bone, painterly and quiet.",
  "Cosmic nebula folding into itself, aurora colours, patient and vast.",
  "Tesseract lattice pulsing at half tempo, neon glow, tight repeats.",
  "Kaleidoscope of eight mirrored petals, crystal shards, warm ember light.",
];

export function DirectorBar() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelChoice>("terra");
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<StreamState>({ status: "idle", plan: null });
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const submit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || state.status === "streaming") return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const cursor = createPlannerCursor();
    let cur = cursor;

    setState({ status: "streaming", plan: null });

    try {
      const res = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, model }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "director request failed");
        setState({ status: "error", plan: null, error: msg || `HTTP ${res.status}` });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // parsePartialJson tolerates half-emitted JSON.
        const parsed = await parsePartialJson(buffer);
        if (parsed.value && typeof parsed.value === "object") {
          const partial = parsed.value as Partial<ArtworkPlan>;
          cur = applyPartialPlan(cur, partial);
          setState({ status: "streaming", plan: partial, raw: buffer });
        }
      }

      // Final pass on the fully assembled buffer.
      const finalParsed = await parsePartialJson(buffer);
      if (finalParsed.value && typeof finalParsed.value === "object") {
        cur = applyPartialPlan(cur, finalParsed.value as Partial<ArtworkPlan>);
        setState({ status: "done", plan: finalParsed.value as Partial<ArtworkPlan>, raw: buffer });
      } else {
        setState({ status: "done", plan: null, raw: buffer });
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setState({
        status: "error",
        plan: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [prompt, model, state.status]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, status: s.status === "streaming" ? "done" : s.status }));
  }, []);

  const useExample = useCallback((ex: string) => {
    setPrompt(ex);
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const plan = state.plan;
  const family = plan?.family ? getFamily(plan.family) : null;
  const variantName =
    family && typeof plan?.variant === "number"
      ? family.variantNames?.[Math.round(plan.variant)]
      : undefined;
  const paletteName = plan?.paletteId
    ? PALETTES.find((p) => p.id === plan.paletteId)?.name
    : undefined;
  const paramCount = Array.isArray(plan?.parameters) ? plan!.parameters!.length : 0;
  const rationale = useMemo(
    () => (Array.isArray(plan?.rationale) ? (plan!.rationale as string[]).filter((r) => typeof r === "string" && r.length > 0) : []),
    [plan],
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center px-4">
      <div
        className="panel-surface pointer-events-auto w-full max-w-2xl overflow-hidden transition-all"
        style={{ borderColor: state.status === "streaming" ? "hsl(var(--primary) / 0.6)" : undefined }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-mono text-[10px] uppercase tracking-wider text-primary">
            Director
          </span>
          <span className="h-3 w-px bg-panel-border" />
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder="Describe a visual world…"
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setModel(model === "terra" ? "luna" : "terra")}
              className="rounded px-2 py-1 text-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              title={
                model === "terra"
                  ? "Terra — deeper plan (slower). Click for Luna draft mode."
                  : "Luna — fast draft. Click for Terra quality."
              }
            >
              {model}
            </button>
            {state.status === "streaming" ? (
              <button
                onClick={stop}
                className="rounded-md bg-primary/15 px-3 py-1 text-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/25"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => void submit()}
                disabled={!prompt.trim()}
                className="rounded-md bg-primary px-3 py-1 text-mono text-[10px] uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
              >
                Compose
              </button>
            )}
          </div>
        </div>

        {/* Streaming plan trace — the "thinking made visible" surface. */}
        {(plan || state.status === "streaming" || state.error) && (
          <div className="border-t border-panel-border px-3 py-2">
            {state.error ? (
              <div className="text-mono text-[10px] text-destructive/90">
                {state.error}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <PlanPill label="family" value={family?.name} pending={state.status === "streaming" && !family} />
                <PlanPill label="variant" value={variantName} pending={state.status === "streaming" && !variantName} />
                <PlanPill label="palette" value={paletteName} pending={state.status === "streaming" && !paletteName} />
                <PlanPill
                  label="params"
                  value={paramCount > 0 ? String(paramCount) : undefined}
                  pending={state.status === "streaming" && paramCount === 0}
                />
                {state.status === "streaming" && (
                  <span className="ml-auto text-mono text-[10px] text-primary/80">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> composing…
                  </span>
                )}
              </div>
            )}
            {rationale.length > 0 && (
              <ul className="mt-2 space-y-1">
                {rationale.map((r, i) => (
                  <li key={i} className="text-xs leading-snug text-muted-foreground">
                    <span className="text-primary/60">›</span> {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {expanded && state.status === "idle" && !plan && (
          <div className="border-t border-panel-border px-3 py-2">
            <div className="text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Try
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => useExample(ex)}
                  className="rounded-md border border-panel-border bg-white/[0.02] px-2 py-1 text-left text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanPill({
  label,
  value,
  pending,
}: {
  label: string;
  value: string | undefined;
  pending: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-mono text-[10px] uppercase tracking-wider transition-colors",
        value
          ? "border-primary/40 bg-primary/10 text-primary"
          : pending
            ? "border-panel-border bg-white/[0.02] text-muted-foreground/60"
            : "border-panel-border bg-transparent text-muted-foreground/40",
      ].join(" ")}
    >
      <span className="opacity-60">{label}</span>
      <span>{value ?? (pending ? "…" : "—")}</span>
    </div>
  );
}
