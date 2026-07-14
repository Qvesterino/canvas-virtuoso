// Modulation signal catalog. Each entry describes a live signal that can
// drive parameters. Values are normalised so a route's `depth` is scaled
// against the parameter's real range, not against arbitrary units.

export interface ModulationSourceDescriptor {
  id: string;
  label: string;
  /** natural range emitted at runtime. */
  range: "unit" | "bipolar";
  group: "time" | "audio";
}

export const MODULATION_SOURCES: ModulationSourceDescriptor[] = [
  { id: "time.slow", label: "Time · Slow", range: "unit", group: "time" },
  { id: "time.fast", label: "Time · Fast", range: "bipolar", group: "time" },
  { id: "time.beat", label: "Time · Beat", range: "unit", group: "time" },
  { id: "audio.level", label: "Audio · Level", range: "unit", group: "audio" },
  { id: "audio.low", label: "Audio · Bass", range: "unit", group: "audio" },
  { id: "audio.mid", label: "Audio · Mid", range: "unit", group: "audio" },
  { id: "audio.high", label: "Audio · Air", range: "unit", group: "audio" },
];

export function labelForSource(id: string): string {
  return MODULATION_SOURCES.find((s) => s.id === id)?.label ?? id;
}