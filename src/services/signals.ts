// Signal bus — assembles the per-frame snapshot of every modulation
// source. Called by the renderer immediately before parameter projection.

import { audioService } from "./audio";

export type SignalSnapshot = Record<string, number>;

export function sampleSignals(t: number): SignalSnapshot {
  return {
    t,
    "time.slow": Math.sin(t * 0.3) * 0.5 + 0.5,
    "time.fast": Math.sin(t * 2.4),
    "time.beat": (t * 2) % 1,
    "audio.level": audioService.level,
    "audio.low": audioService.low,
    "audio.mid": audioService.mid,
    "audio.high": audioService.high,
  };
}