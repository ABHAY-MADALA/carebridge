import { Timer } from "three/src/core/Timer.js";

/** R3F 9.7 still requires Clock's shape. Use supported Timer internally until
 * R3F's stable release migrates. No global Three mutation or warning filtering.
 * No document connection: matches Clock's wall-time behavior after idle. */
export class TimerClock {
  autoStart = true;
  running = false;
  startTime = 0;
  oldTime = 0;
  elapsedTime = 0;
  private timer = new Timer();
  start() {
    this.startTime = performance.now();
    this.oldTime = this.startTime;
    this.elapsedTime = 0;
    this.timer.reset();
    this.running = true;
  }
  stop() { this.getElapsedTime(); this.running = false; this.autoStart = false; }
  getDelta() {
    if (this.autoStart && !this.running) { this.start(); return 0; }
    if (!this.running) return 0;
    this.timer.update();
    const delta = this.timer.getDelta();
    this.elapsedTime += delta;
    this.oldTime = performance.now();
    return delta;
  }
  getElapsedTime() { this.getDelta(); return this.elapsedTime; }
}
