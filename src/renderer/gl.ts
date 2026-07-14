export function createGL(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  return canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
}

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
): { shader: WebGLShader } | { error: string } {
  const shader = gl.createShader(type);
  if (!shader) return { error: "shader-alloc-failed" };
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "unknown compile error";
    gl.deleteShader(shader);
    return { error: info };
  }
  return { shader };
}

export function buildProgram(
  gl: WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string,
): { program: WebGLProgram } | { error: string } {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  if ("error" in vs) return { error: `vs: ${vs.error}` };
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if ("error" in fs) {
    gl.deleteShader(vs.shader);
    return { error: `fs: ${fs.error}` };
  }
  const program = gl.createProgram();
  if (!program) return { error: "program-alloc-failed" };
  gl.attachShader(program, vs.shader);
  gl.attachShader(program, fs.shader);
  gl.linkProgram(program);
  gl.deleteShader(vs.shader);
  gl.deleteShader(fs.shader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "unknown link error";
    gl.deleteProgram(program);
    return { error: info };
  }
  return { program };
}

export function createFullscreenQuad(gl: WebGL2RenderingContext): {
  vao: WebGLVertexArrayObject;
  dispose: () => void;
} {
  const vao = gl.createVertexArray()!;
  const buf = gl.createBuffer()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return {
    vao,
    dispose: () => {
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
    },
  };
}