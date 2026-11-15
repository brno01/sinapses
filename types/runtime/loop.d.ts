import type { Engine } from "../core/engine";
/** Desenha um quadro e devolve quantos pontinhos ficaram visíveis (usado para saber se há movimento rápido). */
export interface FrameRenderer {
    draw(engine: Engine, time: number, fa: number): number;
}
export interface FrameResult {
    /** Custo deste quadro (ms), medido por quem chama. */
    drew: boolean;
}
/**
 * Laço de quadros: física em passos fixos de 1/60 s, desenho limitado a 60 quadros/s (monitores de 120/144 Hz não
 * desenham à toa) e 30 depois de 1 s de repouso total. Sem renderer (testes), a cadência fica sempre em 60.
 */
export declare class Loop {
    engine: Engine;
    renderer: FrameRenderer | null;
    private last;
    private acc;
    private gdt;
    private dAcc;
    private calmT;
    calm: boolean;
    nDraw: number;
    /** Último instante com mouse, teclado ou toque (s). */
    lastAct: number;
    /** A janela tem foco. */
    focus: boolean;
    constructor(engine: Engine, renderer: FrameRenderer | null, nowMs: number);
    /** Avança até `nowMs`. Devolve null se não havia nada a fazer neste quadro do monitor. */
    frame(nowMs: number): FrameResult | null;
}
