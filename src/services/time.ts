export class TimeSource {
  private lastWall = 0;
  private accumulated = 0;
  private running = true;

  reset() {
    this.accumulated = 0;
    this.lastWall = performance.now();
  }

  tick(now: number): number {
    if (this.lastWall === 0) this.lastWall = now;
    const dt = (now - this.lastWall) / 1000;
    this.lastWall = now;
    if (this.running) this.accumulated += dt;
    return this.accumulated;
  }

  setRunning(running: boolean) {
    if (this.running === running) return;
    this.running = running;
    this.lastWall = performance.now();
  }

  get time(): number {
    return this.accumulated;
  }
}