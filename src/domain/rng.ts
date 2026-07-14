// Small deterministic PRNGs used by mutation, remix and randomisation.
// Every creative operation that "invents" values must run through one of
// these so results are reproducible from a seed.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}