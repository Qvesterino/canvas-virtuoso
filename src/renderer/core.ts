import { buildProgram, createFullscreenQuad, createGL } from "./gl";
import {
  LIVING_FIELDS_FS,
  LIVING_FIELDS_VS,
  projectLivingFields,
  type LivingFieldsUniforms,
} from "./pipelines/living-fields";
import type { Artwork } from "../domain/artwork/types";
import { TimeSource } from "../services/time";

export type RendererStatus =
  | { kind: "idle" }
  | { kind: "running"; family: string; fps: number }
  | { kind: "no-context"; reason: string }
  | { kind: "degraded"; reason: string };

export interface RendererHooks {
  onStatusChange: (status: RendererStatus) => void;
  getArtwork: () => Artwork;
  isPlaying: () => boolean;
}

export class Renderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private quad: ReturnType<typeof createFullscreenQuad> | null = null;
  private time = new TimeSource();
  private raf = 0;
  private hooks: RendererHooks;
  private canvas: HTMLCanvasElement;
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private lastFrameOk = false;
  private status: RendererStatus = { kind: "idle" };
  private frameCount = 0;
  private fpsWindowStart = 0;
  private ro: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, hooks: RendererHooks) {
    this.canvas = canvas;
    this.hooks = hooks;
  }

  private setStatus(s: RendererStatus) {
    this.status = s;
    this.hooks.onStatusChange(s);
  }

  init(): boolean {
    const gl = createGL(this.canvas);
    if (!gl) {
      this.setStatus({
        kind: "no-context",
        reason: "WebGL2 is not available in this browser or environment.",
      });
      return false;
    }
    this.gl = gl;
    this.canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    this.canvas.addEventListener("webglcontextrestored", this.onContextRestored, false);

    const build = buildProgram(gl, LIVING_FIELDS_VS, LIVING_FIELDS_FS);
    if ("error" in build) {
      this.setStatus({ kind: "degraded", reason: `Shader compile failed: ${build.error}` });
      return false;
    }
    this.program = build.program;
    this.quad = createFullscreenQuad(gl);
    this.cacheUniforms();
    this.time.reset();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas);
    this.resize();
    this.setStatus({ kind: "running", family: "living-fields", fps: 0 });
    this.raf = requestAnimationFrame(this.loop);
    return true;
  }

  private cacheUniforms() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    const names = [
      "uResolution", "uTime", "uDensity", "uDetail", "uWarp",
      "uSpeed", "uTurbulence", "uDrift",
      "uHue", "uSpread", "uContrast", "uLuminosity",
      "uBloom", "uGrain", "uVignette", "uSeed",
    ];
    this.uniforms.clear();
    for (const n of names) this.uniforms.set(n, gl.getUniformLocation(this.program, n));
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.raf);
    this.setStatus({ kind: "degraded", reason: "GPU context lost. Attempting recovery…" });
  };

  private onContextRestored = () => {
    if (!this.gl) return;
    const build = buildProgram(this.gl, LIVING_FIELDS_VS, LIVING_FIELDS_FS);
    if ("error" in build) {
      this.setStatus({ kind: "degraded", reason: `Recovery failed: ${build.error}` });
      return;
    }
    this.program = build.program;
    this.quad = createFullscreenQuad(this.gl);
    this.cacheUniforms();
    this.setStatus({ kind: "running", family: "living-fields", fps: 0 });
    this.raf = requestAnimationFrame(this.loop);
  };

  resize() {
    if (!this.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private applyUniforms(u: LivingFieldsUniforms, t: number) {
    const gl = this.gl!;
    const set1f = (name: string, v: number) => {
      const loc = this.uniforms.get(name);
      if (loc) gl.uniform1f(loc, v);
    };
    const set2f = (name: string, a: number, b: number) => {
      const loc = this.uniforms.get(name);
      if (loc) gl.uniform2f(loc, a, b);
    };
    set2f("uResolution", this.canvas.width, this.canvas.height);
    set1f("uTime", t);
    set1f("uDensity", u.density);
    set1f("uDetail", u.detail);
    set1f("uWarp", u.warp);
    set1f("uSpeed", u.speed);
    set1f("uTurbulence", u.turbulence);
    set1f("uDrift", u.drift);
    set1f("uHue", u.hue);
    set1f("uSpread", u.spread);
    set1f("uContrast", u.contrast);
    set1f("uLuminosity", u.luminosity);
    set1f("uBloom", u.bloom);
    set1f("uGrain", u.grain);
    set1f("uVignette", u.vignette);
    set1f("uSeed", u.seed);
  }

  private loop = (now: number) => {
    if (!this.gl || !this.program || !this.quad) return;
    this.time.setRunning(this.hooks.isPlaying());
    const t = this.time.tick(now);

    try {
      const artwork = this.hooks.getArtwork();
      const u = projectLivingFields(artwork);
      const gl = this.gl;
      gl.useProgram(this.program);
      this.applyUniforms(u, t);
      gl.bindVertexArray(this.quad.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
      this.lastFrameOk = true;
    } catch (err) {
      if (this.lastFrameOk) {
        this.setStatus({
          kind: "degraded",
          reason: `Frame skipped: ${(err as Error).message}`,
        });
      }
    }

    this.frameCount++;
    if (this.fpsWindowStart === 0) this.fpsWindowStart = now;
    if (now - this.fpsWindowStart > 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.fpsWindowStart));
      this.frameCount = 0;
      this.fpsWindowStart = now;
      if (this.status.kind === "running") {
        this.setStatus({ kind: "running", family: this.status.family, fps });
      }
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    if (this.gl && this.program) this.gl.deleteProgram(this.program);
    this.quad?.dispose();
    this.gl = null;
    this.program = null;
    this.quad = null;
  }
}