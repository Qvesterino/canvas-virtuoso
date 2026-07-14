## Reality check

The uploaded docs describe a very large product (~30k lines of spec across 10 documents) covering a full WebGL/WebGPU shader-art studio with 5 artwork families, 9 creative systems, mutation/remix engines, audio reactivity, temporal-memory feedback, deterministic export, persistence + migration, history, locks, modulation, adaptive quality, diagnostics, and a canvas-first workspace with Discover/Sculpt/Expert modes.

That is realistically weeks of engineering, not a single build turn. If I try to "implement everything" in one pass I will produce exactly what the master prompt forbids: stubs, placeholder systems, and shortcut ownership. I'd rather build it correctly in vertical slices you can actually run and judge after each slice.

## Proposed slice plan

Each slice ends with a working, visibly-improved app. No slice is a stub.

### Slice 1 — Foundation shell + Artwork Domain + one live family
- Canvas-first shell (85–90% canvas, floating/collapsible panels, dark instrument aesthetic, Discover/Sculpt/Expert mode switch)
- Design system in `src/styles.css` (dark, atmospheric, oklch tokens; no ad-hoc colors)
- Artwork Domain: full data model (systems, entities, parameters w/ dot-paths, structured seeds, locks, modulation routes, output intent, family extensions, revision, lineage, content hash) as the single source of creative truth
- Command bus + event log; UI dispatches commands, never mutates state
- Renderer Core (WebGL2) with context lifecycle, frame orchestration, last-valid-frame preservation, shader compile/validate-before-swap
- Render Pipeline + Shader Program Manager
- **Living Fields** family end-to-end (real shader, real parameters wired through the domain)
- Time/Playback service (deterministic clock)
- Capability + WebGL-missing fallback message (sandbox has no GPU — you'll need to test in your real browser)

### Slice 2 — Creative loop
- Project Orchestrator + Persistence (JSON schema, versioned, migration-safe, unknown-field preservation, autosave separate from save)
- History + Snapshots (undo/redo, named snapshots, branching)
- Lock & Constraint System (system/parameter/group, operation-scoped)
- Recipe/Preset library + Artwork Library with live previews
- Remaining 4 families (Material Forms, Temporal Paintings, Typographic Organisms, Spatial Illusions) — each with its own pipeline and shaders

### Slice 3 — Creative behavior
- Mutation Engine (Subtle/Evolve/Radical, Proposal-based, lock-aware, family-scoped, seeded)
- Randomization + Remix engines
- Modulation Engine (base vs. effective values, curves, smoothing, no writeback)
- Audio Analysis (mic + file, FFT, transients)
- Interaction Input service

### Slice 4 — Rendering depth + export
- Temporal Memory Runtime (feedback buffers, warm-up, freeze, clear, safety limits)
- Performance/Capability Manager (quality tiers, adaptive resolution — never mutates Artwork)
- Deterministic Export Pipeline (stills + animation, own clock, warm-up)

### Slice 5 — Polish
- Diagnostics & Recovery, Onboarding, Preferences, Qvester Handoff Gateway contracts

## Technical notes
- TanStack Start template stays; canvas + domain live client-side. No backend needed until Slice 2 optionally adds Lovable Cloud for cross-device project sync — local IndexedDB is enough for the documented save/load spec.
- WebGL2 first, WGSL/WebGPU boundaries respected so Slice 4+ can add a WebGPU backend without touching the Artwork Domain.
- **Sandbox preview has no GPU adapter** — I'll implement a clean "WebGPU/WebGL not available" fallback surface, but real visual verification has to happen in your browser.

## What I need from you
1. **Confirm the slice approach.** Approving this plan means Slice 1 only this turn; I'll ask before starting each subsequent slice.
2. **Storage:** local-only (IndexedDB) for now, or enable Lovable Cloud from Slice 2 for cross-device project sync?
3. **Renderer:** WebGL2 first as documented, or jump straight to WebGPU (smaller browser support, blocks Safari <18)?
