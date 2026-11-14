import { clamp } from "../core/math";
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
export class Loop {
  private last: number;
  private acc = 0;
  private gdt = 0;
  private dAcc = 1;
  private calmT = 0;
  calm = false;
  nDraw = 0;
  /** Último instante com mouse, teclado ou toque (s). */
  lastAct = -99;
  /** A janela tem foco. */
  focus = true;

  constructor(public engine: Engine, public renderer: FrameRenderer | null, nowMs: number) {
    this.last = nowMs / 1000;
  }

  /** Avança até `nowMs`. Devolve null se não havia nada a fazer neste quadro do monitor. */
  frame(nowMs: number): FrameResult | null {
    const E = this.engine;
    E.runTimers(nowMs);
    const time = nowMs / 1000, dt = Math.min(0.1, time - this.last);
    this.last = time;
    this.acc += dt;
    this.gdt += dt;
    this.dAcc += dt;
    const div = this.calm ? 1 / 30 : 1 / 60, due = this.dAcc >= div * 0.9;
    if (this.acc < 1 / 60 && !due) return null;
    E.geometry(Math.min(0.1, this.gdt));
    this.gdt = 0;
    let n = 0;
    while (this.acc >= 1 / 60 && n < 5) {
      E.step(time, 1 / 60);
      this.acc -= 1 / 60;
      n++;
    }
    if (n === 5) this.acc = 0;
    if (due) {
      this.dAcc = clamp(this.dAcc - div, 0, div);
      E.frameMarks(time);
      if (this.renderer) {
        const dots = this.renderer.draw(E, time, this.acc * 60);
        this.nDraw++;
        const calmNow = !this.focus || (dots === 0 && time - this.lastAct >= 2 && E.quiet(time));
        if (!calmNow) this.calmT = time;
        this.calm = time - this.calmT > 1;
      } else this.nDraw++;
    }
    return { drew: due };
  }
}
