import { buildProgram, createFullscreenQuad, createGL } from "./gl";
import { getPipeline, type Pipeline } from "./pipelines";
import type { UniformValue } from "./pipelines/types";
import type { Artwork, FamilyId } from "../domain/artwork/types";
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
  private activeFamily: FamilyId | null = null;
  private pipeline: Pipeline | null = null;

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

    this.quad = createFullscreenQuad(gl);
    const artwork = this.hooks.getArtwork();
    if (!this.usePipeline(artwork.family)) return false;
    this.time.reset();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas);
    this.resize();
    this.setStatus({ kind: "running", family: this.activeFamily ?? "living-fields", fps: 0 });
    this.raf = requestAnimationFrame(this.loop);
    return true;
  }

  private cacheUniforms() {
    if (!this.gl || !this.program || !this.pipeline) return;
    const gl = this.gl;
    this.uniforms.clear();
    const base = ["uResolution", "uTime", "uSeed"];
    for (const n of base) this.uniforms.set(n, gl.getUniformLocation(this.program, n));
    for (const n of this.pipeline.uniforms) {
      this.uniforms.set(n, gl.getUniformLocation(this.program, n));
    }
  }

  private usePipeline(family: FamilyId): boolean {
    if (!this.gl) return false;
    const pipeline = getPipeline(family);
    if (!pipeline) return false;
    const build = buildProgram(this.gl, pipeline.vs, pipeline.fs);
    if ("error" in build) {
      this.setStatus({ kind: "degraded", reason: `Shader compile failed: ${build.error}` });
      return false;
    }
    if (this.program) this.gl.deleteProgram(this.program);
    this.program = build.program;
    this.pipeline = pipeline;
    this.activeFamily = family;
    this.cacheUniforms();
    return true;
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.raf);
    this.setStatus({ kind: "degraded", reason: "GPU context lost. Attempting recovery…" });
  };

  private onContextRestored = () => {
    if (!this.gl) return;
    this.quad = createFullscreenQuad(this.gl);
    const family = this.hooks.getArtwork().family;
    if (!this.usePipeline(family)) return;
    this.setStatus({ kind: "running", family, fps: 0 });
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

  private setUniform(name: string, value: UniformValue) {
    const gl = this.gl!;
    const loc = this.uniforms.get(name);
    if (!loc) return;
    if (typeof value === "number") gl.uniform1f(loc, value);
    else if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
    else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
    else gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
  }

  private loop = (now: number) => {
    if (!this.gl || !this.program || !this.quad) return;
    this.time.setRunning(this.hooks.isPlaying());
    const t = this.time.tick(now);

    try {
      const artwork = this.hooks.getArtwork();
      if (artwork.family !== this.activeFamily) {
        if (!this.usePipeline(artwork.family)) return;
      }
      const gl = this.gl;
      gl.useProgram(this.program);
      this.setUniform("uResolution", [this.canvas.width, this.canvas.height]);
      this.setUniform("uTime", t);
      this.setUniform("uSeed", artwork.artworkSeed);
      const values = this.pipeline!.project(artwork);
      for (const name of this.pipeline!.uniforms) {
        const v = values[name];
        if (v !== undefined) this.setUniform(name, v);
      }
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
        this.setStatus({ kind: "running", family: this.activeFamily ?? this.status.family, fps });
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