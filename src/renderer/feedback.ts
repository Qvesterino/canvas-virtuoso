// Ping-pong feedback framebuffers for temporal-memory pipelines.
// Two color textures; one is sampled as `uPrev` while the other receives
// the current frame. After each frame the roles swap. Both can be cleared
// to black on demand and are re-allocated when the render size changes.

export interface FeedbackBuffers {
  read: WebGLTexture;
  write: WebGLTexture;
  readFbo: WebGLFramebuffer;
  writeFbo: WebGLFramebuffer;
  width: number;
  height: number;
}

function makeTex(gl: WebGL2RenderingContext, w: number, h: number): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

function attach(gl: WebGL2RenderingContext, tex: WebGLTexture): WebGLFramebuffer {
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return fbo;
}

export function createFeedback(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
): FeedbackBuffers {
  const read = makeTex(gl, w, h);
  const write = makeTex(gl, w, h);
  const readFbo = attach(gl, read);
  const writeFbo = attach(gl, write);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const fb: FeedbackBuffers = { read, write, readFbo, writeFbo, width: w, height: h };
  clearFeedback(gl, fb);
  return fb;
}

export function disposeFeedback(gl: WebGL2RenderingContext, fb: FeedbackBuffers) {
  gl.deleteTexture(fb.read);
  gl.deleteTexture(fb.write);
  gl.deleteFramebuffer(fb.readFbo);
  gl.deleteFramebuffer(fb.writeFbo);
}

export function clearFeedback(gl: WebGL2RenderingContext, fb: FeedbackBuffers) {
  for (const target of [fb.readFbo, fb.writeFbo]) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

export function swapFeedback(fb: FeedbackBuffers) {
  const tmpTex = fb.read;
  fb.read = fb.write;
  fb.write = tmpTex;
  const tmpFbo = fb.readFbo;
  fb.readFbo = fb.writeFbo;
  fb.writeFbo = tmpFbo;
}

export const BLIT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
out vec4 outColor;
void main(){ outColor = texture(uTex, vUv); }
`;