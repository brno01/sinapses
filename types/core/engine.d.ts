import { type Config } from "./config";
import { type LinkDef } from "./link";
import type { Action, LinkState } from "./states";
import type { Ctx, Link, Rect, Spore } from "./types";
export interface EngineOptions {
    /** Ids dos nós, na ordem em que aparecem (a ordem define a prioridade no desvio). */
    nodes: string[];
    links: LinkDef[];
    config?: Partial<Config>;
}
/**
 * Motor: nós, ligações e física. Não conhece DOM nem canvas; o tempo entra em milissegundos (`nowMs`) para que as
 * sequências (ligar, desligar, testar...) disparem no mesmo quadro em qualquer ambiente.
 */
export declare class Engine implements Ctx {
    cfg: Config;
    NP: number;
    tn: number;
    spores: Spore[];
    ptr: {
        x: number;
        y: number;
        on: boolean;
    };
    dragging: boolean;
    hover: string | null;
    links: Link[];
    nodeIds: string[];
    rects: Map<string, Rect>;
    /** Chamado sempre que uma ligação troca de estado. */
    onState: ((link: Link) => void) | null;
    private timers;
    constructor(o: EngineOptions);
    link(id: string): Link | undefined;
    setRect(id: string, r: Rect): void;
    /** Aplica ajustes. Quantidade de fios e pontos por fio recriam só os fios afetados. */
    setConfig(partial: Partial<Config>): void;
    private rebuild;
    /** Troca o estado de uma ligação na hora, cancelando sequências pendentes. */
    setState(id: string, st: LinkState, nowMs: number): void;
    /** Sequência de estados: cada passo é [atraso em ms a partir de agora, estado]. Cancela a sequência anterior. */
    sequence(id: string, steps: [number, LinkState][], nowMs: number): void;
    /** Ações dos botões. Ligar e desligar são sequências; teste, atualização e anomalia voltam a "em uso" sozinhos. */
    act(id: string, a: Action, nowMs: number): void;
    private go;
    private later;
    private stop;
    /** Dispara as sequências vencidas. */
    runTimers(nowMs: number): void;
    /** Pontas, desvio e suavização de todas as ligações. */
    geometry(dt: number): void;
    /** Um passo fixo da física em todas as ligações. */
    step(time: number, dt: number): void;
    /** Marcas que dependem do quadro desenhado: fim do crescimento ao ligar (dispara a ondulação) e esporos vencidos. */
    frameMarks(time: number): void;
    /** Nada se movendo rápido: sem arraste, tentáculos, esporos ou mudança de estado recente. */
    quiet(time: number): boolean;
}
