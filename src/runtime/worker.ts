// Ponto de entrada do Web Worker: recebe o OffscreenCanvas e roda motor, física e desenho fora da thread principal.
import { Runner } from "./runner";
import type { Event, ToWorker } from "./protocol";

interface WorkerScope {
  postMessage(m: Event): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
  requestAnimationFrame?: (cb: () => void) => number;
}

const scope = self as unknown as WorkerScope;
let runner: Runner | null = null;
// requestAnimationFrame existe em workers no Chrome e no Firefox; nos demais, um intervalo de ~60 quadros/s
const schedule = (cb: () => void): unknown => (scope.requestAnimationFrame ? scope.requestAnimationFrame(cb) : setTimeout(cb, 1000 / 60));

scope.onmessage = (e) => {
  const m = e.data;
  if (m.t === "init") {
    runner = new Runner(m.canvas, m.init, (ev) => scope.postMessage(ev), () => performance.now(), schedule);
    runner.start();
  } else if (m.t === "destroy") {
    runner?.stop();
    runner = null;
    close();
  } else runner?.handle(m);
};
