// Sinapses: fios animados em canvas que ligam nós de uma interface e mostram o estado de cada ligação.
import { CONFIG_DEFAULT, sanitizeConfig, type Config } from "./core/config";
import type { LinkDef } from "./core/link";
import type { Action, LinkState } from "./core/states";
import type { Rect } from "./core/types";
import type { Viewport } from "./render/canvas2d";
import type { Command, Event, InitData, ToWorker } from "./runtime/protocol";
import { Runner } from "./runtime/runner";

export * from "./core/config";
export * from "./core/states";
export type { LinkDef } from "./core/link";
export type { Rect } from "./core/types";
export { rect } from "./core/types";

export interface SinapsesOptions {
  /** Nós: elementos da página (medidos a cada quadro, relativos ao canvas) ou retângulos fixos. */
  nodes: Record<string, HTMLElement | Rect>;
  links: LinkDef[];
  config?: Partial<Config>;
  /** Física e desenho num Web Worker (padrão: sim, quando o navegador suporta OffscreenCanvas). */
  worker?: boolean;
  /**
   * Modo manual (testes e capturas): nada roda sozinho; chame `advance(ms)` para avançar um quadro no relógio
   * virtual. Força a thread principal.
   */
  manual?: boolean;
}

export interface PerfInfo {
  /** Custo médio de cada quadro (física + desenho), em ms. */
  ms: number;
  /** Quadros desenhados por segundo (60 em uso, 30 em repouso total). */
  fps: number;
}

export interface Sinapses {
  /** "worker" ou "main": onde a física e o desenho estão rodando. */
  readonly mode: "worker" | "main";
  readonly config: Readonly<Config>;
  /** Estado atual de cada ligação (atualizado pelos eventos). */
  state(id: string): LinkState | undefined;
  act(id: string, action: Action): void;
  setState(id: string, state: LinkState): void;
  /** Sequência de estados: [atraso em ms a partir de agora, estado][]. */
  sequence(id: string, steps: [number, LinkState][]): void;
  setConfig(partial: Partial<Config>): void;
  /** Avisa que um nó está sendo arrastado (os fios ficam mais firmes e o mouse não os empurra). */
  setDragging(dragging: boolean): void;
  /** Mede os nós de novo agora (útil depois de mover um nó por código). */
  measure(): void;
  on(ev: "perf", cb: (p: PerfInfo) => void): () => void;
  on(ev: "state", cb: (s: { id: string; state: LinkState }) => void): () => void;
  /** Só no modo manual: avança um quadro até `nowMs` (relógio virtual). */
  advance(nowMs: number): void;
  /** Só no modo manual: o motor rodando na thread principal (para inspeção em testes). */
  readonly runner: Runner | null;
  destroy(): void;
}

const isElement = (v: HTMLElement | Rect): v is HTMLElement => typeof (v as HTMLElement).getBoundingClientRect === "function";

export function createSinapses(canvas: HTMLCanvasElement, o: SinapsesOptions): Sinapses {
  let config = sanitizeConfig(o.config ?? {}, CONFIG_DEFAULT);
  const ids = Object.keys(o.nodes);
  const states = new Map(o.links.map((l) => [l.id, l.state ?? ("flow" as LinkState)]));
  const perfCbs = new Set<(p: PerfInfo) => void>(), stateCbs = new Set<(s: { id: string; state: LinkState }) => void>();
  const onEvent = (e: Event) => {
    if (e.t === "perf") perfCbs.forEach((cb) => cb({ ms: e.ms, fps: e.fps }));
    else {
      states.set(e.id, e.state);
      stateCbs.forEach((cb) => cb({ id: e.id, state: e.state }));
    }
  };

  const view = (): Viewport => ({ width: canvas.clientWidth || canvas.width, height: canvas.clientHeight || canvas.height, dpr: globalThis.devicePixelRatio || 1 });
  const lastRects = new Map<string, Rect>();
  const measureRects = (): [string, Rect][] => {
    const cr = canvas.getBoundingClientRect(), out: [string, Rect][] = [];
    for (const id of ids) {
      const v = o.nodes[id];
      let r: Rect;
      if (isElement(v)) {
        const b = v.getBoundingClientRect();
        r = { left: b.left - cr.left, top: b.top - cr.top, right: b.right - cr.left, bottom: b.bottom - cr.top, width: b.width, height: b.height };
      } else r = v;
      const p = lastRects.get(id);
      if (!p || p.left !== r.left || p.top !== r.top || p.width !== r.width || p.height !== r.height) {
        lastRects.set(id, r);
        out.push([id, r]);
      }
    }
    return out;
  };

  const init: InitData = { view: view(), nodes: ids, links: o.links, config };
  const useWorker = !o.manual && o.worker !== false && typeof Worker !== "undefined" && "transferControlToOffscreen" in canvas;
  let worker: Worker | null = null, runner: Runner | null = null, manualNow = 0;
  let send: (m: Command) => void;

  if (useWorker) {
    worker = new Worker(new URL("./runtime/worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<Event>) => onEvent(e.data);
    const off = canvas.transferControlToOffscreen();
    const msg: ToWorker = { t: "init", canvas: off, init };
    worker.postMessage(msg, [off]);
    send = (m) => worker!.postMessage(m);
  } else {
    const now = o.manual ? () => manualNow : () => performance.now();
    runner = new Runner(canvas, init, onEvent, now, o.manual ? null : (cb) => requestAnimationFrame(cb));
    send = (m) => runner!.handle(m);
  }

  // a página mede os nós a cada quadro e envia só o que mudou
  let rafId = 0, alive = true;
  const measure = () => {
    const r = measureRects();
    if (r.length) send({ t: "rects", rects: r });
  };
  const pump = () => {
    if (!alive) return;
    measure();
    rafId = requestAnimationFrame(pump);
  };
  measure();
  if (!o.manual) rafId = requestAnimationFrame(pump);
  if (runner && !o.manual) runner.start();

  // entradas: ponteiro (relativo ao canvas), atividade, foco, hover sobre nós e tamanho do canvas
  const listeners: [EventTarget, string, EventListener][] = [];
  const listen = (t: EventTarget, ev: string, fn: EventListener) => {
    t.addEventListener(ev, fn, { passive: true });
    listeners.push([t, ev, fn]);
  };
  listen(window, "pointermove", ((e: PointerEvent) => {
    const cr = canvas.getBoundingClientRect();
    send({ t: "input", input: { ptr: { x: e.clientX - cr.left, y: e.clientY - cr.top, on: true }, activity: true } });
  }) as EventListener);
  listen(document, "pointerleave", () => send({ t: "input", input: { ptr: { x: -999, y: -999, on: false } } }));
  for (const ev of ["pointerdown", "keydown", "input", "wheel"]) listen(window, ev, () => send({ t: "input", input: { activity: true } }));
  listen(window, "focus", () => send({ t: "input", input: { focus: true } }));
  listen(window, "blur", () => send({ t: "input", input: { focus: false } }));
  send({ t: "input", input: { focus: typeof document.hasFocus === "function" ? document.hasFocus() : true } });
  for (const id of ids) {
    const v = o.nodes[id];
    if (!isElement(v)) continue;
    listen(v, "mouseenter", () => send({ t: "input", input: { hover: id } }));
    listen(v, "mouseleave", () => send({ t: "input", input: { hover: null } }));
  }
  const onResize = () => send({ t: "view", view: view() });
  listen(window, "resize", onResize);
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
  ro?.observe(canvas);

  function on(ev: "perf" | "state", cb: never): () => void {
    const set = (ev === "perf" ? perfCbs : stateCbs) as Set<unknown>;
    set.add(cb);
    return () => set.delete(cb);
  }

  return {
    mode: useWorker ? "worker" : "main",
    get config() { return config; },
    get runner() { return o.manual ? runner : null; },
    state: (id) => states.get(id),
    act: (id, action) => send({ t: "act", id, action }),
    setState: (id, state) => send({ t: "state", id, state }),
    sequence: (id, steps) => send({ t: "sequence", id, steps }),
    setConfig: (partial) => {
      config = sanitizeConfig({ ...config, ...partial }, config);
      send({ t: "config", config: partial });
    },
    setDragging: (dragging) => send({ t: "input", input: { dragging } }),
    measure,
    on: on as Sinapses["on"],
    advance: (nowMs) => {
      if (!o.manual || !runner) return;
      manualNow = nowMs;
      measure();
      runner.frame(nowMs);
    },
    destroy: () => {
      alive = false;
      cancelAnimationFrame(rafId);
      for (const [t, ev, fn] of listeners) t.removeEventListener(ev, fn);
      ro?.disconnect();
      if (worker) {
        worker.postMessage({ t: "destroy" } satisfies ToWorker);
        worker.terminate();
      }
      runner?.stop();
    },
  };
}
