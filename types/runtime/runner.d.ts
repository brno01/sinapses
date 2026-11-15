import { Engine } from "../core/engine";
import { Canvas2DRenderer, type AnyCanvas } from "../render/canvas2d";
import { Loop } from "./loop";
import type { Command, Event, InitData } from "./protocol";
/**
 * Motor + desenho + laço de quadros. Roda igual no Worker (OffscreenCanvas) e na thread principal (canvas comum).
 * `now` é o relógio em ms; `schedule` agenda o próximo quadro (requestAnimationFrame ou equivalente).
 */
export declare class Runner {
    private emit;
    private now;
    private schedule;
    readonly engine: Engine;
    readonly renderer: Canvas2DRenderer;
    readonly loop: Loop;
    private running;
    private pEma;
    private pLast;
    private pN;
    constructor(canvas: AnyCanvas, init: InitData, emit: (e: Event) => void, now: () => number, schedule: ((cb: () => void) => unknown) | null);
    handle(m: Command): void;
    /** Um quadro em `nowMs`. Usado pelo laço automático e pelo modo manual (testes). */
    frame(nowMs: number): void;
    start(): void;
    stop(): void;
    private perf;
}
