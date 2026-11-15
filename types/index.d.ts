import { type Config } from "./core/config";
import type { LinkDef } from "./core/link";
import type { Action, LinkState } from "./core/states";
import type { Rect } from "./core/types";
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
    on(ev: "state", cb: (s: {
        id: string;
        state: LinkState;
    }) => void): () => void;
    /** Só no modo manual: avança um quadro até `nowMs` (relógio virtual). */
    advance(nowMs: number): void;
    /** Só no modo manual: o motor rodando na thread principal (para inspeção em testes). */
    readonly runner: Runner | null;
    destroy(): void;
}
export declare function createSinapses(canvas: HTMLCanvasElement, o: SinapsesOptions): Sinapses;
