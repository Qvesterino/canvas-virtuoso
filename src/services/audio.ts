// Microphone-driven audio analyser. Exposes normalised low / mid / high /
// level values updated on rAF. The renderer reads these each frame via the
// signals bus; UI reads `enabled`/`error` to render the toggle state.

type Listener = () => void;

class AudioService {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private raf = 0;
  private listeners = new Set<Listener>();

  enabled = false;
  error: string | null = null;
  level = 0;
  low = 0;
  mid = 0;
  high = 0;

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  async enable(): Promise<boolean> {
    if (this.enabled) return true;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      this.error = "Microphone API not available.";
      this.emit();
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      this.ctx = ctx;
      this.analyser = analyser;
      this.stream = stream;
      this.data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      this.enabled = true;
      this.error = null;
      this.loop();
      this.emit();
      return true;
    } catch (err) {
      this.error = (err as Error).message || "Microphone permission denied.";
      this.emit();
      return false;
    }
  }

  disable() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
    this.data = null;
    this.enabled = false;
    this.level = this.low = this.mid = this.high = 0;
    this.emit();
  }

  private loop = () => {
    if (!this.enabled || !this.analyser || !this.data) return;
    this.analyser.getByteFrequencyData(this.data);
    const bins = this.data.length;
    const lowEnd = Math.max(1, Math.floor(bins * 0.1));
    const midEnd = Math.max(lowEnd + 1, Math.floor(bins * 0.4));
    let l = 0;
    let m = 0;
    let h = 0;
    let total = 0;
    for (let i = 0; i < bins; i++) {
      const v = this.data[i] / 255;
      total += v;
      if (i < lowEnd) l += v;
      else if (i < midEnd) m += v;
      else h += v;
    }
    this.low = l / lowEnd;
    this.mid = m / (midEnd - lowEnd);
    this.high = h / (bins - midEnd);
    this.level = total / bins;
    this.raf = requestAnimationFrame(this.loop);
  };
}

export const audioService = new AudioService();