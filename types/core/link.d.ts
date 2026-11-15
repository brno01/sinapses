import { type LinkState } from "./states";
import type { Ctx, Link } from "./types";
/** Definição de uma ligação. */
export interface LinkDef {
    id: string;
    from: string;
    to: string;
    /** Quantidade base de fios (multiplicada pelo ajuste Quantidade). */
    strands: number;
    /** Espaçamento entre fios junto aos nós (px). */
    spacing?: number;
    /** Semente: muda a personalidade dos fios. */
    seed?: number;
    state?: LinkState;
}
export declare function createLink(def: LinkDef, E: Ctx): Link;
/** Aproxima os parâmetros da ligação dos valores do estado atual, de forma exponencial. */
export declare function ease(E: Ctx, c: Link, dt: number): void;
/** Pontas de cada fio nas bordas dos nós, velocidade de arraste, desvio de nós e suavização do estado. */
export declare function geoC(E: Ctx, c: Link, dt: number): void;
/** Troca o estado da ligação no instante `now` (s). Volta os fios rompidos ao inteiro quando o novo estado é vivo. */
export declare function go(E: Ctx, c: Link, st: LinkState, now: number): void;
