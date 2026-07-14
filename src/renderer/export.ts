// Deterministic export pipeline.
//
// Runs the active pipeline on its own offscreen canvas with a fixed-step
// clock, so a re-render at the same seed + params produces the same frames
// regardless of live playback state or dropped frames. Supports PNG stills
// and WebM animation captured via MediaRecorder.

import { buildProgram, createFullscreenQuad, createGL } from "./gl";
import { getPipeline } from "./pipelines";
import { BASE_VS } from "./pipelines/types";
import {
  BLIT_FS,
  clearFeedback,
  createFeedback,
  disposeFeedback,
  swapFeedback,
  type FeedbackBuffers,
} from "./feedback";
import type { Artwork } from "../domain/artwork/types";

export interface StillExportOptions {
  kind: "still";
  width: number;
  height: number;
  /** Frames rendered before capture to warm feedback / motion. */
  warmupFrames?: number;
  /** Time offset (seconds) sampled for the still. */
  timeOffset?: number;
}

export interface AnimationExportOptions {
  kind: "animation";
  width: number;
  height: number;
  fps: number;
  seconds: number;
  warmupFrames?: number;
  onProgress?: (done: number, total: number) => void;
}

export type ExportOptions = StillExportOptions | AnimationExportOptions;

function renderFrame(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  quad: ReturnType<typeof createFullscreenQuad>,
  uniforms: Map<string, WebGLUniformLocation | null>,
  artwork: Artwork,
  time: number,
  width: number,
  height: number,
  feedback: FeedbackBuffers | null,
  prevLoc: WebGLUniformLocation | null,
  blitProgram: WebGLProgram,
  blitLoc: WebGLUniformLocation | null,
) {
  const pipeline = getPipeline(artwork.family);

  if (feedback) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, feedback.writeFbo);
    gl.viewport(0, 0, feedback.width, feedback.height);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
  }

  gl.useProgram(program);
  const setU = (name: string, value: number | number[]) => {
    const loc = uniforms.get(name);
    if (!loc) return;
    if (typeof value === "number") gl.uniform1f(loc, value);
    else if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
    else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
    else gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
  };
  setU("uResolution", [width, height]);
  setU("uTime", time);
  setU("uSeed", artwork.artworkSeed);

  if (feedback && prevLoc) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, feedback.read);
    gl.uniform1i(prevLoc, 0);
  }

  const values = pipeline.project(artwork);
  for (const name of pipeline.uniforms) {
    const v = values[name];
    if (v !== undefined) setU(name, v as number | number[]);
  }
  gl.bindVertexArray(quad.vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);

  if (feedback) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(blitProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, feedback.write);
    if (blitLoc) gl.uniform1i(blitLoc, 0);
    gl.bindVertexArray(quad.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    swapFeedback(feedback);
  }
}

function setupSession(artwork: Artwork, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const gl = createGL(canvas);
  if (!gl) throw new Error("WebGL2 unavailable for export");
  const pipeline = getPipeline(artwork.family);
  const build = buildProgram(gl, pipeline.vs, pipeline.fs);
  if ("error" in build) throw new Error(`Export shader compile failed: ${build.error}`);
  const blit = buildProgram(gl, BASE_VS, BLIT_FS);
  if ("error" in blit) throw new Error(`Export blit compile failed: ${blit.error}`);
  const quad = createFullscreenQuad(gl);
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  for (const n of ["uResolution", "uTime", "uSeed", ...pipeline.uniforms]) {
    uniforms.set(n, gl.getUniformLocation(build.program, n));
  }
  const prevLoc = pipeline.feedback ? gl.getUniformLocation(build.program, "uPrev") : null;
  const blitLoc = gl.getUniformLocation(blit.program, "uTex");
  const feedback = pipeline.feedback ? createFeedback(gl, width, height) : null;
  if (feedback) clearFeedback(gl, feedback);
  const dispose = () => {
    if (feedback) disposeFeedback(gl, feedback);
    quad.dispose();
    gl.deleteProgram(build.program);
    gl.deleteProgram(blit.program);
  };
  return {
    canvas,
    gl,
    program: build.program,
    blitProgram: blit.program,
    quad,
    uniforms,
    prevLoc,
    blitLoc,
    feedback,
    dispose,
  };
}

export async function exportStill(
  artwork: Artwork,
  opts: StillExportOptions,
): Promise<Blob> {
  const s = setupSession(artwork, opts.width, opts.height);
  try {
    const warmup = opts.warmupFrames ?? 60;
    const dt = 1 / 60;
    for (let i = 0; i < warmup; i++) {
      renderFrame(
        s.gl, s.program, s.quad, s.uniforms, artwork,
        i * dt, opts.width, opts.height, s.feedback, s.prevLoc,
        s.blitProgram, s.blitLoc,
      );
    }
    const captureT = warmup * dt + (opts.timeOffset ?? 0);
    renderFrame(
      s.gl, s.program, s.quad, s.uniforms, artwork,
      captureT, opts.width, opts.height, s.feedback, s.prevLoc,
      s.blitProgram, s.blitLoc,
    );
    s.gl.finish();
    return await new Promise<Blob>((resolve, reject) => {
      s.canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
        "image/png",
      );
    });
  } finally {
    s.dispose();
  }
}

export async function exportAnimation(
  artwork: Artwork,
  opts: AnimationExportOptions,
): Promise<Blob> {
  const s = setupSession(artwork, opts.width, opts.height);
  const stream = s.canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & {
    requestFrame?: () => void;
  };
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  try {
    const warmup = opts.warmupFrames ?? 90;
    const dt = 1 / opts.fps;
    // Warm-up (no recording yet).
    for (let i = 0; i < warmup; i++) {
      renderFrame(
        s.gl, s.program, s.quad, s.uniforms, artwork,
        i * dt, opts.width, opts.height, s.feedback, s.prevLoc,
        s.blitProgram, s.blitLoc,
      );
    }
    s.gl.finish();

    recorder.start();
    const total = Math.max(1, Math.round(opts.fps * opts.seconds));
    for (let i = 0; i < total; i++) {
      const t = (warmup + i) * dt;
      renderFrame(
        s.gl, s.program, s.quad, s.uniforms, artwork,
        t, opts.width, opts.height, s.feedback, s.prevLoc,
        s.blitProgram, s.blitLoc,
      );
      s.gl.finish();
      if (track.requestFrame) track.requestFrame();
      opts.onProgress?.(i + 1, total);
      // Yield to the encoder so it can consume the frame.
      await new Promise((r) => setTimeout(r, 1000 / opts.fps));
    }
    recorder.stop();
    return await done;
  } finally {
    s.dispose();
    stream.getTracks().forEach((t) => t.stop());
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}