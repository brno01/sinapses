import type { Engine } from "../core/engine";
import type { FrameRenderer } from "../runtime/loop";
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export interface Viewport {
    /** Largura e altura em pixels CSS. */
    width: number;
    height: number;
    /** Densidade de pixels do monitor; o canvas usa no mínimo 2× para suavizar fios mais finos que um pixel. */
    dpr: number;
}
/** Desenha as ligações num canvas 2D. Cada fio é uma fita de largura variável com borda suave. */
export declare class Canvas2DRenderer implements FrameRenderer {
    private canvas;
    private view;
    private ctx;
    private scale;
    private E;
    private dots;
    /** Raio dos cantos dos nós (o desenho não entra neles). */
    nodeRadius: number;
    constructor(canvas: AnyCanvas, view: Viewport);
    resize(view: Viewport): void;
    draw(E: Engine, time: number, fa: number): number;
    private rg;
    /** Ponto `u` (0–1) do fio desenhado, por spline Catmull-Rom sobre as posições interpoladas. */
    private pos;
    /** Contágio no ponto `u` de um fio saudável. */
    private infAt;
    /** Fita contínua de largura variável entre s0 e s1 (um único polígono por trecho, sem emendas). */
    private ribbon;
    private dot;
    /** Pontinhos dos pulsos: pequenos e rápidos, movimento contínuo. No bloqueio, viram faíscas vermelhas antes do cadeado. */
    private pulses;
    /** Fio rompido: cada metade é uma curva própria; na quebra, as pontas tentam se reencontrar. */
    private drawCut;
    /** Pulsos de cada metade rompida correm até a ponta e tentam alcançar a outra metade. */
    private seekDots;
    private branch;
    /** Ramificações na ponta de cada tentáculo; na anomalia, os dedos apontam para o fio saudável e o abraçam ao encostar. */
    private fingers;
    /** Quando um nó cobre a ligação e não há por onde desviar, os fios se agarram à borda dele. */
    private grips;
    /** Cadeado no centro do feixe: na seção transversal que passa pelo meio do fio central, a meio caminho entre os fios mais externos. */
    private lockAt;
    private lock;
}
