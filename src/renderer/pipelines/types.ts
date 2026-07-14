import type { Artwork, FamilyId } from "../../domain/artwork/types";

export type UniformValue =
  | number
  | [number, number]
  | [number, number, number]
  | [number, number, number, number];

export interface Pipeline {
  id: FamilyId;
  vs: string;
  fs: string;
  /** Pipeline-owned uniforms, excluding base uResolution/uTime/uSeed. */
  uniforms: readonly string[];
  project(artwork: Artwork): Record<string, UniformValue>;
}

export function paramNum(
  artwork: Artwork,
  system: string,
  path: string,
  fallback: number,
): number {
  const sys = artwork.systems[system as keyof typeof artwork.systems];
  if (!sys || sys.bypassed || !sys.enabled) return fallback;
  const v = sys.parameters[path];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export const BASE_VS = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;
