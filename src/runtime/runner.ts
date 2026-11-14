import { Engine } from "../core/engine";
import { Canvas2DRenderer, type AnyCanvas } from "../render/canvas2d";
import { Loop } from "./loop";
import type { Command, Event, InitData } from "./protocol";

/**
 * Motor + desenho + laço de quadros. Roda igual no Worker (OffscreenCanvas) e na thread principal (canvas comum).
 * `now` é o relógio em ms; `schedule` agenda o próximo quadro (requestAnimationFrame ou equivalente).
 */
export class Runner {
  readonly engine: Engine;
  readonly renderer: Canvas2DRenderer;
  readonly loop: Loop;
  private running = false;
  private pEma = 0;
  private pLast = 0;
  private pN = 0;

  constructor(
    canvas: AnyCanvas,
    init: InitData,
    private emit: (e: Event) => void,
    private now: () => number,
    private schedule: ((cb: () => void) => unknown) | null,
  ) {
    this.engine = new Engine({ nodes: init.nodes, links: init.links, config: init.config });
    this.renderer = new Canvas2DRenderer(canvas, init.view);
    this.loop = new Loop(this.engine, this.renderer, now());
    this.engine.onState = (c) => this.emit({ t: "state", id: c.id, state: c.st });
  }

  handle(m: Command): void {
    const E = this.engine, nowMs = this.now();
    switch (m.t) {
      case "rects":
        for (const [id, r] of m.rects) E.setRect(id, r);
        break;
      case "view":
        this.renderer.resize(m.view);
        break;
      case "config":
        E.setConfig(m.config);
        break;
      case "act":
        E.act(m.id, m.action, nowMs);
        break;
      case "state":
        E.setState(m.id, m.state, nowMs);
        break;
      case "sequence":
        E.sequence(m.id, m.steps, nowMs);
        break;
      case "input": {
        const i = m.input;
        if (i.ptr) E.ptr = { ...i.ptr };
        if (i.hover !== undefined) E.hover = i.hover;
        if (i.dragging !== undefined) E.dragging = i.dragging;
        if (i.focus !== undefined) this.loop.focus = i.focus;
        if (i.activity) this.loop.lastAct = nowMs / 1000;
        break;
      }
    }
  }

  /** Um quadro em `nowMs`. Usado pelo laço automático e pelo modo manual (testes). */
  frame(nowMs: number): void {
    const q0 = this.now();
    const r = this.loop.frame(nowMs);
    if (r) this.perf(this.now() - q0);
  }

  start(): void {
    if (this.running || !this.schedule) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      this.frame(this.now());
      this.schedule!(tick);
    };
    this.schedule(tick);
  }

  stop(): void {
    this.running = false;
  }

  private perf(ms: number): void {
    this.pEma = this.pEma ? this.pEma * 0.95 + ms * 0.05 : ms;
    const t = this.now();
    if (!this.pLast) {
      this.pLast = t;
      this.pN = this.loop.nDraw;
      return;
    }
    if (t - this.pLast < 500) return;
    const fps = Math.round(((this.loop.nDraw - this.pN) * 1000) / (t - this.pLast));
    this.pN = this.loop.nDraw;
    this.pLast = t;
    this.emit({ t: "perf", ms: Math.max(0, this.pEma), fps });
  }
}
