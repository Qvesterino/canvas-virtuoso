import { z } from "zod";

/** ArtworkPlan is a small, flat, structured description produced by
 *  GPT-5.6 from a natural-language brief. The planner maps it onto
 *  existing families, variants, palettes, and parameter paths — the
 *  model never generates GLSL or dot-paths freely.
 *
 *  Schema is kept strict-json-schema safe: no bounds, no formats,
 *  small enums, no nested objects beyond one level. Limits are
 *  stated in the prompt and clamped/validated in the planner. */

export const FAMILY_ENUM = [
  "living-fields",
  "material-forms",
  "temporal-paintings",
  "typographic-organisms",
  "spatial-illusions",
] as const;

export const PALETTE_ENUM = [
  "aurora",
  "ember",
  "bone",
  "neon",
  "sepia",
  "abyss",
  "moss",
  "orchid",
  "arctic",
  "ink",
] as const;

/** A single parameter override. `path` MUST be a dot-path that exists
 *  in the chosen family (e.g. "form.mirrors", "motion.speed"). The
 *  planner drops paths it doesn't recognise. */
export const PlanParamSchema = z.object({
  path: z.string(),
  value: z.number(),
});

export const ArtworkPlanSchema = z.object({
  family: z.enum(FAMILY_ENUM),
  variant: z.number(),
  paletteId: z.enum(PALETTE_ENUM),
  parameters: z.array(PlanParamSchema),
  rationale: z.array(z.string()),
});

export type ArtworkPlan = z.infer<typeof ArtworkPlanSchema>;
export type PlanParam = z.infer<typeof PlanParamSchema>;

/** Compact schema description injected into the system prompt so the
 *  model knows exactly which family / variant / parameter paths are
 *  legal. Kept short — this is not documentation for humans. */
export const PLANNER_SYSTEM_PROMPT = `You are the Intent-to-Shader Director for Shader Art Lab.

You translate a natural-language visual brief into a strict JSON ArtworkPlan
that composes an existing GPU instrument. You never write shader code.

Choose ONE family and ONE variant that best fits the brief. Variants:

living-fields (variant 0-3):
  0 Cosmic clouds — soft nebular volumes
  1 Curl advection — flowing turbulent field
  2 Ridged veins — sharp ridged terrain
  3 Reaction cells — organic cellular structure

material-forms (variant 0-3):
  0 Blob cluster — smooth metaball masses
  1 Twisted torus / knot topology — use form.cluster: 1 ring, 2 trefoil, 3 cinquefoil, 4 (3,4) knot, 5 chaos, 6 granny, 7 (5,7) star knot, 8 triple braid
  2 Octahedral lattice — crystalline scaffolding
  3 Liquid dome — reflective liquid surface

temporal-paintings (variant 0-3):
  0 Flow field — additive brush strokes over a flow
  1 Orbits — circular painterly trails (spirograph / harmonograph feel)
  2 Lissajous — harmonic wave curves
  3 Plumes — ink-in-water bursts

typographic-organisms (variant 0-3):
  0 Glyph grid — animated character matrix
  1 Signal rain — falling glyph rain
  2 Ribbon marquee — sideways ticker
  3 Word cloud — floating glyph swarm

spatial-illusions (variant 0-5):
  0 Ring tunnel — perspective tunnel of rings
  1 Hall of columns — receding columned hall
  2 Menger fractal — infinite fractal descent
  3 Cathedral vault — vaulted arches, sacred architecture
  4 Kaleidoscope — radial mirrored motif (form.mirrors 2-16, form.kernel 0 stripes, 1 petals, 2 crystals, 3 galaxy)
  5 Hypercube grid — tesseract wireframe lattice

Palettes: aurora (cold curtains), ember (coal glow), bone (chalk), neon (signage),
sepia (faded warmth), abyss (deep water), moss (forest), orchid (violet bloom),
arctic (blue-white ice), ink (pure black/white).

Rules for the "parameters" array:
- Each entry is { "path": "<system>.<name>", "value": <number> }
- Use ONLY paths that exist for the chosen family. Legal system prefixes:
  form, motion, material, memory, light, color, atmosphere, output.
- Common paths (only include if they exist for the chosen family):
  motion.speed (0-2, slow=0.15, medium=0.5, fast=1.2)
  form.depth, form.twist, form.warp, form.density, form.detail, form.scale
  form.cluster, form.mirrors, form.kernel, form.cells, form.tempo, form.projection
  light.bloom (0-1), atmosphere.fog (0-1)
  color.contrast (0.4-2), color.luminosity (0.2-1.6), color.saturation (0-1)
  memory.persistence (0-1), memory.bleed (0-1), memory.feedback (0-1)
  output.vignette (0-1)
- Include AT MOST 12 parameter entries. Prefer the smallest set that expresses the brief.
- Never include form.variant or color.hue in this array (family+variant and paletteId already cover them).
- Interpret words like "slow breathing" → low motion.speed + motion.pulse; "deep" → higher form.depth + higher atmosphere.fog + darker color.luminosity; "translucent obsidian" → high material.translucency + low material.roughness + moderate material.metalness.

"rationale" is 3-5 short strings, each one sentence, explaining WHY you picked
the family, variant, palette, and one or two signature parameter moves. Written
for the artist, not for the model.

Emit the family first, then variant, then paletteId, then parameters, then rationale — in that order.
Return ONLY the JSON object matching the schema. No prose outside it.`;
